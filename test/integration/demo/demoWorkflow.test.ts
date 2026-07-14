import { execFile } from "node:child_process";
import { cp, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createRepositoryReport } from "../../../src/commands/check.js";
import type { RawExtractedClaim } from "../../../src/models/claims.js";
import type { CodexProcessRunner } from "../../../src/extraction/codexClient.js";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SOURCE_DEMO = join(PROJECT_ROOT, "demo/sample-monorepo");
const temporaryDirectories: string[] = [];

async function createDemoRepository(): Promise<string> {
  const container = await realpath(await mkdtemp(join(tmpdir(), "escrow-demo-test-")));
  temporaryDirectories.push(container);
  const repository = join(container, "sample-monorepo");
  await cp(SOURCE_DEMO, repository, { recursive: true });
  await execFileAsync("git", ["-C", repository, "init", "--quiet"]);
  await execFileAsync("git", ["-C", repository, "config", "user.name", "Escrow Test"]);
  await execFileAsync("git", ["-C", repository, "config", "user.email", "test@example.invalid"]);
  await execFileAsync("git", ["-C", repository, "add", "."]);
  await execFileAsync("git", ["-C", repository, "commit", "--quiet", "-m", "demo baseline"]);
  return repository;
}

function runnerFor(claims: RawExtractedClaim[]): CodexProcessRunner {
  return vi.fn<CodexProcessRunner>().mockResolvedValue({
    exitCode: 0,
    stdout: JSON.stringify({ claims }),
    stderr: "",
    timedOut: false,
  });
}

function rootClaim(
  repository: string,
  claim: Omit<RawExtractedClaim, "sourceFile" | "confidence" | "extractionReason">,
): RawExtractedClaim {
  return {
    ...claim,
    sourceFile: join(repository, "AGENTS.md"),
    confidence: 1,
    extractionReason: "Explicit demo instruction.",
  } as RawExtractedClaim;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Escrow demo workflow", () => {
  it("produces exactly four genuine failures and one passing safe command", async () => {
    const repository = await createDemoRepository();
    const claims: RawExtractedClaim[] = [
      rootClaim(repository, {
        id: "wrong-manager",
        type: "package_manager",
        lineStart: 3,
        lineEnd: 3,
        normalizedValue: "npm",
        packageManager: "npm",
      }),
      rootClaim(repository, {
        id: "missing-doc",
        type: "path_exists",
        lineStart: 4,
        lineEnd: 4,
        normalizedValue: "docs/DELETED_SETUP.md",
        referencedPath: "docs/DELETED_SETUP.md",
      }),
      rootClaim(repository, {
        id: "missing-script",
        type: "package_script",
        lineStart: 5,
        lineEnd: 5,
        normalizedValue: "test",
        command: "pnpm test",
        packageManager: "pnpm",
        packageScript: "test",
      }),
      rootClaim(repository, {
        id: "outdated-framework",
        type: "dependency_present",
        lineStart: 6,
        lineEnd: 6,
        normalizedValue: "Jest",
        dependencyNames: ["jest"],
      }),
      rootClaim(repository, {
        id: "safe-command",
        type: "command_runs",
        lineStart: 7,
        lineEnd: 7,
        normalizedValue: "node scripts/healthcheck.mjs",
        command: "node scripts/healthcheck.mjs",
      }),
    ];

    const report = await createRepositoryReport(
      repository,
      { execute: true },
      { generatedAt: () => "2026-07-14T18:00:00.000Z", codexRunner: runnerFor(claims) },
    );

    expect(report.overallStatus).toBe("fail");
    expect(report.summary).toMatchObject({ passed: 1, failed: 4 });
    expect(report.claims.filter((claim) => claim.status === "failed").map((claim) => claim.type)).toEqual([
      "package_manager",
      "path_exists",
      "package_script",
      "dependency_present",
    ]);
    expect(report.claims.find((claim) => claim.id === "safe-command")).toMatchObject({
      status: "passed",
      commandResult: { status: "passed", exitCode: 0 },
    });
  });

  it("treats the nested pnpm instruction as a valid override, not a conflict", async () => {
    const repository = await createDemoRepository();
    const claims: RawExtractedClaim[] = [
      rootClaim(repository, {
        id: "root-manager",
        type: "package_manager",
        lineStart: 3,
        lineEnd: 3,
        normalizedValue: "npm",
        packageManager: "npm",
      }),
      {
        id: "api-manager",
        type: "package_manager",
        sourceFile: join(repository, "packages/api/AGENTS.override.md"),
        lineStart: 3,
        lineEnd: 3,
        normalizedValue: "pnpm",
        packageManager: "pnpm",
        confidence: 1,
        extractionReason: "Explicit nested package-manager instruction.",
      },
    ];

    const report = await createRepositoryReport(
      repository,
      { target: "packages/api" },
      { generatedAt: () => "2026-07-14T18:00:00.000Z", codexRunner: runnerFor(claims) },
    );

    expect(report.conflicts).toEqual([]);
    expect(report.claims.find((claim) => claim.id === "root-manager")?.status).toBe(
      "overridden",
    );
    expect(report.claims.find((claim) => claim.id === "api-manager")?.status).toBe(
      "passed",
    );
  });

  it("revalidates the repaired demo with no broken instructions", async () => {
    const repository = await createDemoRepository();
    await writeFile(
      join(repository, "AGENTS.md"),
      [
        "# Sample monorepo instructions",
        "",
        "- Use pnpm as the package manager for this repository.",
        "- Run unit tests with `pnpm test:unit`.",
        "- Run `node scripts/healthcheck.mjs` to verify the repository health check.",
        "",
      ].join("\n"),
      "utf8",
    );
    const claims: RawExtractedClaim[] = [
      rootClaim(repository, {
        id: "manager",
        type: "package_manager",
        lineStart: 3,
        lineEnd: 3,
        normalizedValue: "pnpm",
        packageManager: "pnpm",
      }),
      rootClaim(repository, {
        id: "unit-script",
        type: "package_script",
        lineStart: 4,
        lineEnd: 4,
        normalizedValue: "test:unit",
        command: "pnpm test:unit",
        packageManager: "pnpm",
        packageScript: "test:unit",
      }),
      rootClaim(repository, {
        id: "safe-command",
        type: "command_runs",
        lineStart: 5,
        lineEnd: 5,
        normalizedValue: "node scripts/healthcheck.mjs",
        command: "node scripts/healthcheck.mjs",
      }),
    ];

    const report = await createRepositoryReport(
      repository,
      { execute: true },
      { generatedAt: () => "2026-07-14T18:00:00.000Z", codexRunner: runnerFor(claims) },
    );

    expect(report.overallStatus).toBe("pass");
    expect(report.summary).toMatchObject({ passed: 3, failed: 0 });
    expect(report.claims.every((claim) => claim.status === "passed")).toBe(true);
  });
});
