import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { AddressInfo } from "node:net";

import { z } from "zod";

import {
  createRepositoryReport,
  type CheckCommandOptions,
} from "../commands/check.js";
import {
  fixRepository,
  type RepairCommandResult,
} from "../commands/fix.js";
import { discoverInstructions } from "../discovery/discoverInstructions.js";
import { resolveCodexModel } from "../extraction/extractClaims.js";
import type { AgentContractReport } from "../models/reports.js";
import { renderHtmlReport } from "../reporting/htmlReporter.js";
import { renderJsonReport } from "../reporting/jsonReporter.js";
import { renderMarkdownReport } from "../reporting/markdownReporter.js";
import { applyVerifiedPatch } from "../repair/verifyRepair.js";
import { AgentContractError, getErrorMessage } from "../utils/errors.js";
import { AGENTCONTRACT_VERSION } from "../version.js";
import { APP_JAVASCRIPT, INDEX_HTML, STYLES_CSS } from "./assets.js";

const LOOPBACK_HOST = "127.0.0.1";
const MAX_JSON_BODY_BYTES = 16 * 1024;
const DEFAULT_COMMAND_TIMEOUT_SECONDS = 120;
const APPLY_CONFIRMATION = "APPLY_VERIFIED_REPAIR";
const ALLOWED_REPAIR_FILES = new Set(["AGENTS.md", "AGENTS.override.md"]);

const operationOptionsSchema = z
  .object({
    target: z.string().min(1).max(4_096).optional(),
    model: z.string().trim().min(1).max(200).optional(),
    execute: z.boolean().optional(),
    allowNetwork: z.boolean().optional(),
    timeout: z.number().positive().max(86_400).optional(),
  })
  .strict();

const applyRequestSchema = z
  .object({
    previewId: z.string().uuid(),
    confirmation: z.literal(APPLY_CONFIRMATION),
  })
  .strict();

export interface UiServerOptions {
  repository: string;
  target?: string | undefined;
  port?: number | undefined;
  model?: string | undefined;
  execute?: boolean | undefined;
  allowNetwork?: boolean | undefined;
  timeout?: number | undefined;
}

export interface UiServerConfig {
  repository: string;
  target: string;
  model: string;
  execute: boolean;
  allowNetwork: boolean;
  timeout: number;
  version: string;
}

export interface UiRepairPreview {
  previewId: string;
  patch: string | null;
  beforeReport: AgentContractReport;
  afterReport: AgentContractReport | null;
  verified: boolean;
  changedFiles: string[];
}

export interface UiServerDependencies {
  evaluate?:
    | ((repository: string, options: CheckCommandOptions) => Promise<AgentContractReport>)
    | undefined;
  previewRepair?:
    | ((repository: string, options: CheckCommandOptions) => Promise<RepairCommandResult>)
    | undefined;
  applyRepair?:
    | ((repositoryRoot: string, patch: string) => Promise<void>)
    | undefined;
  createId?: (() => string) | undefined;
}

export interface RunningUiServer {
  host: typeof LOOPBACK_HOST;
  port: number;
  url: string;
  config: UiServerConfig;
  close: () => Promise<void>;
}

interface SessionState {
  report?: AgentContractReport | undefined;
  preview?: UiRepairPreview | undefined;
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );
  response.setHeader("Cache-Control", "no-store");
}

function send(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: string,
): void {
  setSecurityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.end(body);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  send(response, status, "application/json; charset=utf-8", `${JSON.stringify(value)}\n`);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "POST requests must use Content-Type: application/json.");
  }

  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    let settled = false;
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      if (settled) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_JSON_BODY_BYTES) {
        settled = true;
        reject(new HttpError(413, "JSON request body exceeds the 16 KiB limit."));
        request.resume();
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(body) as unknown);
      } catch {
        reject(new HttpError(400, "Request body must be valid JSON."));
      }
    });
    request.on("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

class HttpError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function assertLoopbackHost(request: IncomingMessage): void {
  const host = request.headers.host;
  if (host === undefined || !/^127\.0\.0\.1(?::\d{1,5})?$/u.test(host)) {
    throw new HttpError(403, "The local UI accepts requests only for 127.0.0.1.");
  }
}

function parseOperationOptions(value: unknown, config: UiServerConfig): CheckCommandOptions {
  const parsed = operationOptionsSchema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, `Invalid operation options: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }
  return {
    target: parsed.data.target ?? config.target,
    model: parsed.data.model ?? config.model,
    execute: parsed.data.execute ?? config.execute,
    allowNetwork: parsed.data.allowNetwork ?? config.allowNetwork,
    timeout: parsed.data.timeout ?? config.timeout,
  };
}

async function defaultPreviewRepair(
  repository: string,
  options: CheckCommandOptions,
): Promise<RepairCommandResult> {
  return fixRepository(repository, options, {
    generatedAt: () => new Date().toISOString(),
    writeConsole: () => {},
  });
}

async function defaultApplyRepair(repositoryRoot: string, patch: string): Promise<void> {
  const container = await mkdtemp(join(tmpdir(), "escrow-ui-apply-"));
  try {
    await applyVerifiedPatch(repositoryRoot, container, patch);
  } finally {
    await rm(container, { recursive: true, force: true });
  }
}

function repairIsAllowed(result: RepairCommandResult): boolean {
  return (
    result.patch !== undefined &&
    result.afterReport !== undefined &&
    result.changedFiles.length > 0 &&
    result.changedFiles.every((path) => ALLOWED_REPAIR_FILES.has(basename(path)))
  );
}

function reportDownload(
  response: ServerResponse,
  report: AgentContractReport,
  format: string,
): void {
  const formats = {
    json: {
      contentType: "application/json; charset=utf-8",
      fileName: "escrow-report.json",
      content: renderJsonReport(report),
    },
    markdown: {
      contentType: "text/markdown; charset=utf-8",
      fileName: "escrow-report.md",
      content: renderMarkdownReport(report),
    },
    html: {
      contentType: "text/html; charset=utf-8",
      fileName: "escrow-report.html",
      content: renderHtmlReport(report),
    },
  } as const;
  const selected = formats[format as keyof typeof formats];
  if (selected === undefined) {
    throw new HttpError(400, "Report format must be json, markdown, or html.");
  }
  response.setHeader("Content-Disposition", `attachment; filename="${selected.fileName}"`);
  send(response, 200, selected.contentType, selected.content);
}

function createRequestHandler(
  config: UiServerConfig,
  dependencies: UiServerDependencies,
): (request: IncomingMessage, response: ServerResponse) => void {
  const state: SessionState = {};
  const evaluate = dependencies.evaluate ?? createRepositoryReport;
  const previewRepair = dependencies.previewRepair ?? defaultPreviewRepair;
  const applyRepair = dependencies.applyRepair ?? defaultApplyRepair;
  const createId = dependencies.createId ?? randomUUID;

  return (request, response): void => {
    void (async () => {
      assertLoopbackHost(request);
      const url = new URL(request.url ?? "/", `http://${LOOPBACK_HOST}`);

      if (request.method === "GET" && url.pathname === "/") {
        send(response, 200, "text/html; charset=utf-8", INDEX_HTML);
        return;
      }
      if (request.method === "GET" && url.pathname === "/styles.css") {
        send(response, 200, "text/css; charset=utf-8", STYLES_CSS);
        return;
      }
      if (request.method === "GET" && url.pathname === "/app.js") {
        send(response, 200, "text/javascript; charset=utf-8", APP_JAVASCRIPT);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/config") {
        sendJson(response, 200, config);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/check") {
        const options = parseOperationOptions(await readJsonBody(request), config);
        const report = await evaluate(config.repository, options);
        state.report = report;
        state.preview = undefined;
        sendJson(response, 200, report);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/fix/preview") {
        const options = parseOperationOptions(await readJsonBody(request), config);
        const result = await previewRepair(config.repository, options);
        const allowed = repairIsAllowed(result);
        if ((result.patch !== undefined || result.afterReport !== undefined) && !allowed) {
          throw new HttpError(422, "Repair preview was rejected because it was not a verified instruction-only change.");
        }
        const preview: UiRepairPreview = {
          previewId: createId(),
          patch: result.patch ?? null,
          beforeReport: result.beforeReport,
          afterReport: result.afterReport ?? null,
          verified: allowed,
          changedFiles: [...result.changedFiles],
        };
        state.report = result.afterReport ?? result.beforeReport;
        state.preview = allowed ? preview : undefined;
        sendJson(response, 200, preview);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/fix/apply") {
        const parsed = applyRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw new HttpError(400, `Explicit confirmation is required: ${APPLY_CONFIRMATION}.`);
        }
        if (
          state.preview === undefined ||
          !state.preview.verified ||
          state.preview.patch === null ||
          parsed.data.previewId !== state.preview.previewId
        ) {
          throw new HttpError(409, "No matching verified repair preview is available to apply.");
        }
        await applyRepair(config.repository, state.preview.patch);
        state.preview = undefined;
        sendJson(response, 200, { applied: true });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/report") {
        if (state.report === undefined) {
          throw new HttpError(404, "No report is available. Run a scan first.");
        }
        reportDownload(response, state.report, url.searchParams.get("format") ?? "json");
        return;
      }

      throw new HttpError(404, "Route not found.");
    })().catch((error: unknown) => {
      if (response.headersSent) {
        response.end();
        return;
      }
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof AgentContractError
            ? 400
            : 500;
      sendJson(response, status, {
        error:
          status === 500
            ? `Escrow operation failed: ${getErrorMessage(error)}`
            : getErrorMessage(error),
      });
    });
  };
}

export async function startUiServer(
  options: UiServerOptions,
  dependencies: UiServerDependencies = {},
): Promise<RunningUiServer> {
  const discovery = await discoverInstructions(
    options.target === undefined
      ? { repository: options.repository }
      : { repository: options.repository, target: options.target },
  );
  const config: UiServerConfig = {
    repository: discovery.repositoryRoot,
    target: discovery.targetDirectory,
    model: resolveCodexModel(options.model),
    execute: options.execute === true,
    allowNetwork: options.allowNetwork === true,
    timeout: options.timeout ?? DEFAULT_COMMAND_TIMEOUT_SECONDS,
    version: AGENTCONTRACT_VERSION,
  };
  const server = createServer(createRequestHandler(config, dependencies));

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error);
    server.once("error", onError);
    server.listen(options.port ?? 0, LOOPBACK_HOST, () => {
      server.off("error", onError);
      resolve();
    });
  });
  const address = server.address() as AddressInfo | null;
  if (address === null) {
    throw new Error("Local UI server started without a network address.");
  }
  const url = `http://${LOOPBACK_HOST}:${String(address.port)}`;

  return {
    host: LOOPBACK_HOST,
    port: address.port,
    url,
    config,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
        server.closeAllConnections();
      });
    },
  };
}

export { APPLY_CONFIRMATION, LOOPBACK_HOST, MAX_JSON_BODY_BYTES };
