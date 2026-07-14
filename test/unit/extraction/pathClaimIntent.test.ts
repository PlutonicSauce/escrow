import { describe, expect, it } from "vitest";

import { hasRequiredPathIntent } from "../../../src/extraction/pathClaimIntent.js";

describe("hasRequiredPathIntent", () => {
  it.each([
    ["Read `SPEC.md` before changing behavior.", "SPEC.md"],
    ["See `docs/architecture.md` for system boundaries.", "docs/architecture.md"],
    ["Use the files in `templates/` for new pages.", "templates/"],
    ["Review `packages/api/README.md` before editing API code.", "packages/api/README.md"],
    ["Review `docs/examples.md` before adding a fixture.", "docs/examples.md"],
    ["Read `docs/output.md` for report guidance.", "docs/output.md"],
    ["See `docs/naming-conventions.md` for current rules.", "docs/naming-conventions.md"],
  ])("keeps a genuine existing-path requirement: %s", (text, referencedPath) => {
    expect(
      hasRequiredPathIntent({
        originalText: text,
        contextText: text,
        referencedPath,
      }),
    ).toBe(true);
  });

  it.each([
    ["Allowed files:\n- `AGENTS.md`", "- `AGENTS.md`", "AGENTS.md"],
    ["Forbidden files:\n- `package.json`", "- `package.json`", "package.json"],
    [
      "Examples:\n- See `docs/example.md`",
      "- See `docs/example.md`",
      "docs/example.md",
    ],
    [
      "Use `docs/example.md` as an example.",
      "Use `docs/example.md` as an example.",
      "docs/example.md",
    ],
    [
      "Write the generated report to `reports/output.json`.",
      "Write the generated report to `reports/output.json`.",
      "reports/output.json",
    ],
    [
      "Use `reports/output.json` as the output destination.",
      "Use `reports/output.json` as the output destination.",
      "reports/output.json",
    ],
    [
      "Optionally read `LOCAL_NOTES.md` if present.",
      "Optionally read `LOCAL_NOTES.md` if present.",
      "LOCAL_NOTES.md",
    ],
    [
      "Instruction files use the exact name `AGENTS.override.md`.",
      "Instruction files use the exact name `AGENTS.override.md`.",
      "AGENTS.override.md",
    ],
    [
      "Use `AGENTS.override.md` as the filename for nested overrides.",
      "Use `AGENTS.override.md` as the filename for nested overrides.",
      "AGENTS.override.md",
    ],
    [
      "Repair mode may modify only:\n- `AGENTS.md`\n- `AGENTS.override.md`",
      "- `AGENTS.override.md`",
      "AGENTS.override.md",
    ],
  ])(
    "drops a non-existence filename mention: %s",
    (contextText, originalText, referencedPath) => {
      expect(
        hasRequiredPathIntent({ originalText, contextText, referencedPath }),
      ).toBe(false);
    },
  );

  it("requires the referenced path to occur exactly in the selected source", () => {
    expect(
      hasRequiredPathIntent({
        originalText: "Read the specification before editing.",
        contextText: "Read the specification before editing.",
        referencedPath: "SPEC.md",
      }),
    ).toBe(false);
  });
});
