import { describe, expect, it } from "vitest";

import {
  OUTSIDE_REPOSITORY_PREFIX,
  formatRepositoryDisplayPath,
} from "../../../src/reporting/displayPaths.js";
import { formatSourceLocation } from "../../../src/reporting/reportFormatting.js";

describe("repository-relative display paths", () => {
  it("formats repository files and the root without changing validation paths", () => {
    expect(formatRepositoryDisplayPath("/repo", "/repo/AGENTS.md")).toBe(
      "AGENTS.md",
    );
    expect(
      formatRepositoryDisplayPath("/repo", "/repo/packages/api/AGENTS.md"),
    ).toBe("packages/api/AGENTS.md");
    expect(formatRepositoryDisplayPath("/repo", "/repo")).toBe(".");
    expect(formatSourceLocation("/repo/AGENTS.md", 16, 16, "/repo")).toBe(
      "AGENTS.md:16",
    );
  });

  it("never presents outside paths as trusted repository-relative paths", () => {
    expect(formatRepositoryDisplayPath("/repo", "/repo-other/AGENTS.md")).toBe(
      `${OUTSIDE_REPOSITORY_PREFIX}/repo-other/AGENTS.md`,
    );
    expect(formatRepositoryDisplayPath("/repo", "../outside/AGENTS.md")).toBe(
      `${OUTSIDE_REPOSITORY_PREFIX}../outside/AGENTS.md`,
    );
  });
});
