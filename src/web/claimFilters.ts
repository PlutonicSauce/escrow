import type { ClaimStatus } from "../models/claims.js";

export type UiClaimFilter =
  | "attention"
  | "failed"
  | "warnings"
  | "blocked"
  | "inconclusive"
  | "passed"
  | "advisory"
  | "overridden"
  | "all";

export const ATTENTION_CLAIM_STATUSES = [
  "failed",
  "warning",
  "blocked",
  "inconclusive",
] as const satisfies readonly ClaimStatus[];

export const UI_CLAIM_FILTERS = [
  { name: "attention", label: "Needs attention" },
  { name: "failed", label: "Failed" },
  { name: "warnings", label: "Warnings" },
  { name: "blocked", label: "Blocked" },
  { name: "inconclusive", label: "Inconclusive" },
  { name: "passed", label: "Passed" },
  { name: "advisory", label: "Advisory" },
  { name: "overridden", label: "Overridden" },
  { name: "all", label: "Show all" },
] as const satisfies readonly { name: UiClaimFilter; label: string }[];

export function getDefaultClaimFilter(
  claims: readonly { status: ClaimStatus }[],
): UiClaimFilter {
  return claims.some((claim) =>
    ATTENTION_CLAIM_STATUSES.includes(
      claim.status as (typeof ATTENTION_CLAIM_STATUSES)[number],
    ),
  )
    ? "attention"
    : "passed";
}

export function claimMatchesUiFilter(
  status: ClaimStatus,
  filter: UiClaimFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "attention") {
    return ATTENTION_CLAIM_STATUSES.includes(
      status as (typeof ATTENTION_CLAIM_STATUSES)[number],
    );
  }
  return (status === "warning" ? "warnings" : status) === filter;
}
