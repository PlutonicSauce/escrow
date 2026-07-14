import { cp, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createRepositoryReport } from "../../../src/commands/check.js";
import type { CodexProcessRunner } from "../../../src/extraction/codexClient.js";
import { startUiServer, type RunningUiServer } from "../../../src/web/server.js";

const PROJECT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const temporaryDirectories: string[] = [];
const servers: RunningUiServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(async (server) => server.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("local UI workflow", () => {
  it("checks an existing fixture end to end through the HTTP adapter with Codex mocked", async () => {
    const repository = await realpath(
      await mkdtemp(join(tmpdir(), "agentcontract-ui-e2e-")),
    );
    temporaryDirectories.push(repository);
    await cp(join(PROJECT_ROOT, "test/fixtures/package-managers/npm"), repository, {
      recursive: true,
    });
    await mkdir(join(repository, ".git"));
    const codexRunner = vi.fn<CodexProcessRunner>().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        claims: [
          {
            id: "npm-manager",
            type: "package_manager",
            sourceFile: join(repository, "AGENTS.md"),
            lineStart: 1,
            lineEnd: 1,
            normalizedValue: "npm",
            packageManager: "npm",
            confidence: 1,
            extractionReason: "Explicit package-manager instruction.",
          },
        ],
      }),
      stderr: "",
      timedOut: false,
    });
    const server = await startUiServer(
      { repository, port: 0, model: "gpt-test" },
      {
        evaluate: async (path, options) =>
          createRepositoryReport(path, options, {
            generatedAt: () => "2026-07-14T12:00:00.000Z",
            codexRunner,
          }),
      },
    );
    servers.push(server);

    const response = await fetch(`${server.url}/api/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const report = await response.json();

    expect(response.status).toBe(200);
    expect(report.overallStatus).toBe("pass");
    expect(report.summary).toMatchObject({ passed: 1, failed: 0 });
    expect(report.claims[0]).toMatchObject({
      type: "package_manager",
      status: "passed",
      originalText: "Use npm for this repository.",
      scopeDirectory: repository,
    });
    const cliReport = await createRepositoryReport(repository, {}, {
      generatedAt: () => "2026-07-14T12:00:00.000Z",
      codexRunner,
    });
    expect(report.summary).toEqual(cliReport.summary);
    expect(report.overallStatus).toBe(cliReport.overallStatus);
    expect(codexRunner).toHaveBeenCalledTimes(2);

    const json = await fetch(`${server.url}/api/report?format=json`);
    const downloaded = await json.json();
    expect(downloaded.summary).toEqual(report.summary);
  });
});
