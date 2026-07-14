# Three-minute Escrow UI demo

This script demonstrates the final local UI in about 2:45, under three minutes.
It uses a
disposable Git repository under `.escrow-demo/`; the tracked Escrow checkout
and tracked source fixture remain unchanged.

## Prepare

Run from the Escrow project root:

```bash
npm ci
npm run build
npm link
codex login status
<<<<<<< HEAD

DEMO_HOME="$(mktemp -d)"
BROKEN_REPO="$DEMO_HOME/broken-monorepo"
REPAIR_REPO="$DEMO_HOME/repair-monorepo"
ARTIFACTS="$DEMO_HOME/reports"
MODEL="${ESCROW_DEMO_MODEL:-gpt-5.6-terra}"

cp -R demo/sample-monorepo "$BROKEN_REPO"
cp -R demo/sample-monorepo "$REPAIR_REPO"
mkdir -p "$ARTIFACTS"

for REPO in "$BROKEN_REPO" "$REPAIR_REPO"; do
  git -C "$REPO" init --quiet
  git -C "$REPO" config user.name "AgentContract Demo"
  git -C "$REPO" config user.email "demo@example.invalid"
  git -C "$REPO" add .
  git -C "$REPO" commit --quiet -m "demo baseline"
done

set +e
node dist/index.js check "$BROKEN_REPO" --execute --model "$MODEL" \
  --json "$ARTIFACTS/broken-report.json" \
  --markdown "$ARTIFACTS/broken-report.md" \
  --html "$ARTIFACTS/broken-report.html" \
  >"$ARTIFACTS/broken-console.txt" 2>&1
BROKEN_EXIT=$?

node dist/index.js check "$BROKEN_REPO" --target packages/api \
  --model "$MODEL" >"$ARTIFACTS/nested-console.txt" 2>&1
NESTED_EXIT=$?
set -e

test "$BROKEN_EXIT" -eq 1
test "$NESTED_EXIT" -eq 1

node dist/index.js fix "$REPAIR_REPO" --apply --model "$MODEL" \
  >"$ARTIFACTS/repair-apply.txt" 2>&1

node dist/index.js check "$REPAIR_REPO" --execute --model "$MODEL" \
  --html "$ARTIFACTS/repaired-report.html" \
  >"$ARTIFACTS/repaired-console.txt" 2>&1

git -C "$BROKEN_REPO" status --short
git -C "$REPAIR_REPO" diff --name-only
printf 'BROKEN_REPO=%s\nREPAIR_REPO=%s\nARTIFACTS=%s\nMODEL=%s\n' \
  "$BROKEN_REPO" "$REPAIR_REPO" "$ARTIFACTS" "$MODEL"
=======
npm run demo:reset
escrow ui .escrow-demo/sample-monorepo \
  --model "${ESCROW_DEMO_MODEL:-gpt-5.6-luna}" --execute
>>>>>>> 0453a20 (Add interactive local Escrow interface)
```

Open the printed loopback URL. Before starting the clock, keep these ready:

- `demo/sample-monorepo/AGENTS.md`
- `demo/sample-monorepo/packages/api/AGENTS.override.md`
- the Escrow browser tab
- `demo/sample-reports/broken-report.html` as the offline fallback

## Presentation

### 0:00–0:20 — Stale instructions

Open `demo/sample-monorepo/AGENTS.md`.

Narration:

> Coding agents trust repository instructions, but those instructions drift.
> This file says npm, references a deleted document, calls a missing test
> script, and claims Jest is installed. The repository actually uses pnpm,
> exposes `test:unit`, and declares Vitest.

### 0:20–0:55 — Scan and deterministic evidence

In the UI, click **Scan instructions**.

Narration:

> Escrow discovers the effective instruction chain, then Codex extracts typed
> claims with exact source lines. Deterministic TypeScript—not the model—finds
> four failures: package manager, path, package script, and framework. The safe
> health command passes in a temporary Git worktree.

Point out:

- `These instructions do not match the repository.`
- exactly four failed claims and one passed command
- repository-relative locations such as `AGENTS.md:3`
- the issue-first result view; Advisory and Show all remain available

### 0:55–1:15 — Valid nested override

Open `demo/sample-monorepo/packages/api/AGENTS.override.md`.

Narration:

> This nested pnpm rule is valid. Escrow applies it only inside
> `packages/api`; it is not reported as a conflict. Scope is deterministic and
> never delegated to GPT-5.6.

### 1:15–1:50 — Restricted repair preview

Click **Preview instruction repair**.

Narration:

> Codex receives only the instruction chain, failed claims, deterministic
> evidence, and the exact instruction-file allowlist. Escrow applies the
> proposal in an isolated worktree, rejects every non-instruction change, and
> rejects new failures. Preview does not change the active demo checkout.

Point out the `AGENTS.md`-only diff and before/after totals.

### 1:50–2:10 — Verified revalidation

Click **Revalidate**.

Narration:

> This is the fresh report from the verified repair worktree. No application
> source changed, and the page now says, “No broken instructions were found.”

The visible overall status is PASS. The repair remains a preview unless the
confirmation checkbox and **Apply verified repair** are used.

### 2:10–2:30 — Downloadable evidence

Click **Download HTML** and open the downloaded file.

Narration:

> Console, JSON, Markdown, HTML, and the browser all consume the same report
> object and totals. The HTML is one escaped, self-contained file with no
> server or React runtime.

### 2:30–2:45 — AI boundary

Narration:

> GPT-5.6 is limited to claim extraction and minimal repair proposals. Zod,
> repository validators, command policy, scope, totals, and repair acceptance
> are deterministic. AI interprets language; repository evidence decides
> truth.

## Repeat or restore

Stop the server with Ctrl+C. Restore the exact broken state at any time:

```bash
npm run demo:reset
```

The command removes and recreates only the ignored `.escrow-demo/` directory,
then initializes and commits the copied fixture. Confirm the Escrow checkout
was not changed:

```bash
git status --short
git -C .escrow-demo/sample-monorepo status --short
```

## Fallback if Codex is slow or unavailable

- Show `demo/sample-reports/broken-console.txt` and
  `demo/sample-reports/broken-report.html`; state clearly that they were
  generated earlier from the bundled fixture.
- Use the automated demo workflow test as deterministic evidence:

```bash
npx vitest run test/integration/demo/demoWorkflow.test.ts
```

- Do not present a prerecorded result as a live Codex response. The fixture,
  exact commands, sample artifacts, and reset command remain available for a
  later live rerun.
