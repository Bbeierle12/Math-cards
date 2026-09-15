#!/usr/bin/env bash
# T3 verification: independently re-measure one experiment branch and evaluate
# every merge gate against baseline.
#
# Topology note: experiment branches are based on origin/main and (correctly)
# do NOT contain research/. To run the harness against a candidate we build a
# verification worktree from the HARNESS ref (which has research/) and overlay
# EVERY file the candidate changed that is not in a forbidden path — i.e.
# exactly "main + fix + harness". (Overlaying only services/ let a component
# change escape candidate execution.) The diff-scope gate is still computed
# from the candidate branch's real diff against origin/main, so a candidate
# that touched a forbidden path is caught regardless of the overlay.
#
# Usage: research/harness/verify.sh <exp-branch> <exp-id> <harness-ref>
# Writes: research/out/{verify,checks,verdict}-<id>.json,
#         research/out/patches/<id>.patch, research/out/changed-<id>.txt
# Exit: 0 all gates green, 1 any gate red, 2 setup error.
set -uo pipefail

BRANCH="$1"; ID="$2"; HARNESS_REF="$3"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WT="$(mktemp -d "${TMPDIR:-/tmp}/verify-${ID}-XXXXXX")"

cleanup() { cd "$ROOT" && git worktree remove --force "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT

cd "$ROOT"
mkdir -p research/out/patches

# candidate's real change set vs main — this is what the scope gate judges
git diff --name-only origin/main.."$BRANCH" > "research/out/changed-${ID}.txt"
git diff origin/main.."$BRANCH" > "research/out/patches/${ID}.patch"

# verification worktree from the harness ref (has research/), overlay candidate services/
git worktree add --detach "$WT" "$HARNESS_REF" >/dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$ROOT/node_modules" "$WT/node_modules"

# Overlay every changed file outside the forbidden paths (added/modified files
# are checked out from the candidate; files the candidate deleted are removed).
FORBIDDEN=$(node -e "console.log(require('$ROOT/research/config.json').forbidden_paths.join('\n'))")
while IFS= read -r f; do
  [ -z "$f" ] && continue
  skip=false
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    case "$f" in "$p"*) skip=true;; esac
  done <<< "$FORBIDDEN"
  $skip && continue
  if git cat-file -e "$BRANCH:$f" 2>/dev/null; then
    git -C "$WT" checkout "$BRANCH" -- "$f" >/dev/null 2>&1 || { echo "overlay failed for $f"; exit 2; }
  else
    rm -f "$WT/$f"
  fi
done < "research/out/changed-${ID}.txt"

cd "$WT"
TSC=false; npx tsc --noEmit >/dev/null 2>&1 && TSC=true
TESTS=false; npm test >/dev/null 2>&1 && TESTS=true
# A failed build must never masquerade as a tiny bundle: record success explicitly.
BUILD_OK=false; BUNDLE=0
if npm run build >/dev/null 2>&1 && [ -d "$WT/dist" ]; then
  BUILD_OK=true; BUNDLE=$(du -sb "$WT/dist" | cut -f1)
fi
BASE_BUNDLE=$(node -e "console.log(require('$ROOT/research/out/baseline-checks.json').bundle_bytes)")

RESEARCH_LABEL="verify-${ID}" RESEARCH_OUT="$ROOT/research/out/verify-${ID}.json" \
  npx vitest run --config research/harness/vitest.config.mts >/dev/null 2>&1

node -e "
const fs=require('fs');
const c={tests_pass:$TESTS,tsc_clean:$TSC,build_ok:$BUILD_OK,bundle_bytes:$BUNDLE,baseline_bundle_bytes:$BASE_BUNDLE,measured_at:new Date().toISOString()};
const t='$ROOT/research/out/checks-${ID}.json';
fs.writeFileSync(t+'.tmp',JSON.stringify(c,null,2)); fs.renameSync(t+'.tmp',t);
"

node "$ROOT/research/harness/gates.mjs" \
  --baseline "$ROOT/research/out/baseline.json" \
  --candidate "$ROOT/research/out/verify-${ID}.json" \
  --checks "$ROOT/research/out/checks-${ID}.json" \
  --diff-names "$ROOT/research/out/changed-${ID}.txt" \
  --out "$ROOT/research/out/verdict-${ID}.json"
