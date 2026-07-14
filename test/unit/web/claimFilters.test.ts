import { describe, expect, it } from "vitest";

import {
  UI_CLAIM_FILTERS,
  claimMatchesUiFilter,
  getDefaultClaimFilter,
} from "../../../src/web/claimFilters.js";

describe("UI claim filtering", () => {
  it("hides advisory cards from the default issue view", () => {
    const claims = [
      { status: "failed" as const },
      { status: "advisory" as const },
      { status: "passed" as const },
    ];
    const defaultFilter = getDefaultClaimFilter(claims);

    expect(defaultFilter).toBe("attention");
    expect(claimMatchesUiFilter("failed", defaultFilter)).toBe(true);
    expect(claimMatchesUiFilter("advisory", defaultFilter)).toBe(false);
    expect(claimMatchesUiFilter("passed", defaultFilter)).toBe(false);
  });

  it("shows passed claims by default when nothing needs attention", () => {
    expect(
      getDefaultClaimFilter([
        { status: "passed" },
        { status: "advisory" },
      ]),
    ).toBe("passed");
  });

  it("provides explicit Advisory and Show all controls", () => {
    expect(UI_CLAIM_FILTERS).toContainEqual({
      name: "advisory",
      label: "Advisory",
    });
    expect(UI_CLAIM_FILTERS).toContainEqual({ name: "all", label: "Show all" });
    expect(claimMatchesUiFilter("advisory", "advisory")).toBe(true);
    expect(claimMatchesUiFilter("advisory", "all")).toBe(true);
  });
});
