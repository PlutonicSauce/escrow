const NON_EXISTENCE_CONTEXT_PATTERNS: readonly RegExp[] = [
  /\b(?:allow(?:ed|list)?|permit(?:ted)?|forbid(?:den)?|prohibit(?:ed)?|disallow(?:ed)?|denylist)\b[^.]{0,80}\b(?:files?|paths?|filenames?|file names?)\b/iu,
  /\b(?:files?|paths?|filenames?|file names?)\b[^.]{0,80}\b(?:allow(?:ed)?|permit(?:ted)?|forbid(?:den)?|prohibit(?:ed)?|disallow(?:ed)?)\b/iu,
  /\b(?:do not|don't|never|must not|may not|cannot|can't)\s+(?:modify|change|edit|touch|delete|rename|write|create)\b/iu,
  /\b(?:may|can)\s+(?:modify|change|edit|touch|delete|rename|write|create)\s+only\b/iu,
  /\bonly\b[^.]{0,100}\bmay be\s+(?:modified|changed|edited|touched|deleted|renamed|written|created)\b/iu,
  /\brepair(?: mode)?\b[^.]{0,120}\b(?:modify|change|edit|touch|write|delete|rename|create)\b/iu,
  /(?:^|[.!?:]\s)(?:examples?|samples?)\s*:/iu,
  /(?:^|[.!?]\s)(?:for example|e\.g\.)\s*[,:—-]/iu,
  /\bas (?:an? )?(?:example|sample)\b/iu,
  /\bsuch as\b/iu,
  /\b(?:optionally|if present|when present|where available|if available)\b/iu,
  /\boptional\s+(?:files?|paths?|directories|folders)\b/iu,
  /\bif\b[^.]{0,80}\bexists?\b/iu,
  /\b(?:write|save|generate|create|emit|export)\b[^.]{0,100}\b(?:to|as|at|into)\b/iu,
  /\b(?:output|destination)\s+(?:files?|paths?|directories|folders)\b/iu,
  /\b(?:use|set|choose|specify)\b.{0,100}\bas (?:the|an?)\s+(?:output|destination)\b/iu,
  /\b(?:files?|paths?|filenames?|file names?)\b[^.]{0,80}\b(?:named|exact names?|naming|suffix|extension|pattern|convention)\b/iu,
  /\b(?:naming|suffix|extension|pattern|convention)\b[^.]{0,80}\b(?:files?|paths?|filenames?|file names?)\b/iu,
  /\b(?:use|choose|specify)\b.{0,100}\bas (?:the|a)\s+(?:filename|file name|name)\b/iu,
];

const EXISTENCE_INTENT_PATTERN =
  /\b(?:read|see|use|review|open|inspect|consult|visit|follow|load|check|run|execute|edit|update|import)\b|\b(?:must exist|is located|are located|is stored|are stored|is found|are found|contains|documents|defines|describes)\b/iu;

function normalizeContext(value: string): string {
  return value.replaceAll("\r\n", "\n").replace(/\s+/gu, " ").trim();
}

export interface PathClaimIntentInput {
  originalText: string;
  contextText: string;
  referencedPath: string;
}

export function hasRequiredPathIntent(input: PathClaimIntentInput): boolean {
  if (!input.originalText.includes(input.referencedPath)) {
    return false;
  }

  const context = normalizeContext(input.contextText);
  if (NON_EXISTENCE_CONTEXT_PATTERNS.some((pattern) => pattern.test(context))) {
    return false;
  }

  return EXISTENCE_INTENT_PATTERN.test(context);
}
