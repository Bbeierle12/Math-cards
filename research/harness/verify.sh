#!/usr/bin/env bash
# T3 verification: independently re-measure one experiment branch in a fresh
# worktree and evaluate every merge gate against baseline.
#
# Usage: research/harness/verify.sh <exp-branch> <exp-id> <base-ref>
#   e.g. research/harness/verify.sh exp/exp-a-ascii-ineq exp-a-ascii-ineq <harness-sha>
#
# Writes: research/out/verify-<id>.json   (fidelity metrics, fresh run)
#         research/out/checks-<id>.json   (tests/tsc/bundle)
#         research/out/verdict-<id>.json  (gate verdict)
#         research/out/patches/<id>.patch (candidate diff, for durability)
# Exit: 0 all gates green, 1 any gate red.
set -uo pipefail

BRANCH="$1"; ID="$2"; BASE="$3"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WT="$(mktemp -d "${TMPDIR:-/tmp}/verify-${ID}-XXXXXX")"

cleanup() { cd "$ROOT" && git worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT

cd "$ROOT"
git worktree add "$WT" "$BRANCH" >/dev/null 2>&1 || { echo "worktree add failed"; exit 1; }
ln -s "$ROOT/node_modules" "$WT/node_modules"

mkdir -p "$ROOT/research/out/patches"
git -C "$WT" diff "$BASE"..HEAD > "$ROOT/research/out/patches/${ID}.patch"
git -C "$WT" diff --name-only "$BASE"..HEAD > "$ROOT/research/out/changed-${ID}.txt"

cd "$WT"
TSC=false; npx tsc --noEmit >/dev/null 2>&1 && TSC=true
TESTS=false; npm test >/dev/null 2>&1 && TESTS=true
BUNDLE=0; if npm run build >/dev/null 2>&1; then BUNDLE=$(du -sb "$WT/dist" | cut -f1); fi
BASE_BUNDLE=$(node -e "console.log(require('$ROOT/research/out/baseline-checks.json').bundle_bytes)")

RESEARCH_LABEL="verify-${ID}" RESEARCH_OUT="$ROOT/research/out/verify-${ID}.json" \
  npx vitest run --config research/harness/vitest.config.mts >/dev/null 2>&1

node -e "
const fs=require('fs');
const c={tests_pass:$TESTS,tsc_clean:$TSC,bundle_bytes:$BUNDLE,baseline_bundle_bytes:$BASE_BUNDLE,measured_at:new Date().toISOString()};
fs.writeFileSync('$ROOT/research/out/checks-${ID}.json.tmp',JSON.stringify(c,null,2));
fs.renameSync('$ROOT/research/out/checks-${ID}.json.tmp','$ROOT/research/out/checks-${ID}.json');
"

node "$ROOT/research/harness/gates.mjs" \
  --baseline "$ROOT/research/out/baseline.json" \
  --candidate "$ROOT/research/out/verify-${ID}.json" \
  --checks "$ROOT/research/out/checks-${ID}.json" \
  --diff-names "$ROOT/research/out/changed-${ID}.txt" \
  --out "$ROOT/research/out/verdict-${ID}.json"
