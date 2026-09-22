#!/usr/bin/env bash
# Rebuild the pinned code-review regression set used by the 2026-09-21
# code-review evaluation (see report.md in this folder).
#
# Each sample is a standalone git repo: the base commit's tree (minus PRPs/,
# which avoids Windows long-path failures and keeps plan files out of reach)
# committed as HEAD, any earlier phases of the same feature applied and
# committed on top (the per-phase diff.patch files are NOT cumulative), then
# the sampled attempt's diff.patch applied to the working tree and marked
# intent-to-add so `git diff HEAD` shows new files.
#
# Usage: build-samples.sh <relay-repo-root> <out-dir>
# Then review each sample with:  Skill("code-review", "<level> <out-dir>/<id>")
set -euo pipefail
REPO="$1"; OUT="$2"; RP="$REPO/PRPs/reports"
mkdir -p "$OUT"

# id | feature | phase (0 = flat) | attempt | base | prior phases to apply first
SAMPLES='
s1|validation-suite|1|1|ff0c25bd488378be8678fe6409211a7d9eec934d|
s2|validation-suite|1|2|ff0c25bd488378be8678fe6409211a7d9eec934d|
s3|validation-suite|2|1|ff0c25bd488378be8678fe6409211a7d9eec934d|
s4|validation-suite|2|2|ff0c25bd488378be8678fe6409211a7d9eec934d|
s5f|plan-review-materiality|4|1|54a962ea0882b08f6f34d882e7fe8bb3586c7fdd|1 2 3
s6f|implement-phase-docs-sync|2|1|f1f6fdb|1
s9f|plan-review-materiality|3|1|54a962ea0882b08f6f34d882e7fe8bb3586c7fdd|1 2
s10|figma-quota-resilience|6|1|e7a7bd7|
s12|relay-commit-command|2|1|a4f0590dcd05e95891e2514f3e1f1545bf66fdd7|
s13|implement-phase-docs-sync|1|1|f1f6fdb|
'

commit() { git -c user.email=bench@local -c user.name=bench commit -qm "$1"; }

echo "$SAMPLES" | while IFS='|' read -r id feat phase att base priors; do
  [ -z "$id" ] && continue
  d="$OUT/$id"; mkdir -p "$d"
  git -C "$REPO" archive "$base" -- $(git -C "$REPO" ls-tree --name-only "$base" | grep -v '^PRPs$') | tar -x -C "$d"
  ( cd "$d"
    git init -q; git add -A 2>/dev/null; commit "base $base"
    for p in $priors; do
      last=$(ls "$RP/$feat/phase-$p/attempts" | sort -n | tail -1)
      git apply --whitespace=nowarn "$RP/$feat/phase-$p/attempts/$last/diff.patch"
      git add -A 2>/dev/null; commit "prior phase $p attempt $last"
    done
    git apply --whitespace=nowarn "$RP/$feat/phase-$phase/attempts/$att/diff.patch"
    git add -A -N 2>/dev/null
    echo "$id: $(git diff HEAD --name-only | wc -l) files" )
done
