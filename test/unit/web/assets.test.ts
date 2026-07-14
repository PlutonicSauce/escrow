import { describe, expect, it } from "vitest";

import {
  APP_JAVASCRIPT,
  INDEX_HTML,
  STYLES_CSS,
} from "../../../src/web/assets.js";

describe("local UI assets", () => {
  it("ships a dependency-free, syntactically valid browser application", () => {
    expect(() => new Function(APP_JAVASCRIPT)).not.toThrow();
    expect(INDEX_HTML).not.toMatch(/https?:\/\//u);
    expect(INDEX_HTML).not.toContain("React");
    expect(APP_JAVASCRIPT).not.toContain("innerHTML");
    expect(STYLES_CSS).toContain("@media");
    expect(INDEX_HTML).toContain("<title>Escrow · Instruction evidence</title>");
    expect(INDEX_HTML).not.toMatch(/AgentContract|ProofCatcher/u);
    expect(APP_JAVASCRIPT).not.toMatch(/AgentContract|ProofCatcher/u);
  });

  it("includes the required controls, evidence views, filters, and repair confirmation", () => {
    for (const id of [
      "repository",
      "target",
      "model",
      "execute",
      "allow-network",
      "scan",
      "instruction-chain",
      "claims",
      "preview-repair",
      "confirm-apply",
      "apply-repair",
    ]) {
      expect(INDEX_HTML).toContain(`id="${id}"`);
    }
    for (const filter of [
      "all",
      "attention",
      "failed",
      "warnings",
      "passed",
      "blocked",
      "inconclusive",
      "advisory",
    ]) {
      expect(APP_JAVASCRIPT).toContain(`"name":"${filter}"`);
    }
    expect(APP_JAVASCRIPT).toContain("filter:'attention'");
    expect(APP_JAVASCRIPT).toContain('"label":"Advisory"');
    expect(APP_JAVASCRIPT).toContain('"label":"Show all"');
    expect(APP_JAVASCRIPT).toContain("attentionStatuses");
    expect(APP_JAVASCRIPT).toContain("state.filter=report.claims.some");
    expect(APP_JAVASCRIPT).toContain("No broken instructions were found.");
    expect(APP_JAVASCRIPT).toContain(
      "These instructions do not match the repository.",
    );
    expect(APP_JAVASCRIPT).toContain("[outside repository] ");
    for (const label of [
      "Download JSON",
      "Download Markdown",
      "Download HTML",
    ]) {
      expect(INDEX_HTML).toContain(label);
    }
    expect(INDEX_HTML.match(/class="download-button"/gu)).toHaveLength(3);
    expect(STYLES_CSS).toContain(".download-button");
    expect(STYLES_CSS).toContain("focus-visible");
    expect(APP_JAVASCRIPT).toContain("textContent");
    expect(APP_JAVASCRIPT).toContain("APPLY_VERIFIED_REPAIR");
  });
});
