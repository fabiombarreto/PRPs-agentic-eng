#!/usr/bin/env bash
# relay worktree bootstrap — this repository's own instance of the D9
# project-owned hook (docs/decisions.md, 2026-05-11).
#
# Invoked by /relay-worktree as:
#     scripts/worktree-bootstrap.sh <absolute-worktree-path>
# with a 60-second timeout. Failure is non-fatal to worktree creation; stdout
# and stderr are captured, redacted, and written to
# PRPs/reports/<feature>/worktree-bootstrap.log.
#
# SCOPE: the stack-specific half of worktree setup only. Propagating
# .claude/settings.json is the UNIVERSAL half and belongs to /relay-worktree
# Step B.0 — every relay worktree needs it in every project, so leaving it to a
# project-owned script would reintroduce the "forgot to check" ambiguity. This
# script deliberately does not touch .claude/.
#
# This repository's stack is Node/ESM with no build step: `npm run validate`
# and `node --test` need the devDependencies to resolve from inside the
# worktree. Because relay creates worktrees at <repo_root>/.worktrees/<feature>/
# — nested inside the repository — Node's module resolution walks up and finds
# the root node_modules without any copying or linking. This script verifies
# that rather than assuming it, so a future layout change fails loudly here
# instead of silently later, inside a test run.

set -euo pipefail

WORKTREE_PATH="${1:-}"

if [ -z "$WORKTREE_PATH" ]; then
  echo "worktree-bootstrap: FAIL — no worktree path given." >&2
  echo "  usage: scripts/worktree-bootstrap.sh <absolute-worktree-path>" >&2
  exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "worktree-bootstrap: FAIL — not a directory: ${WORKTREE_PATH}" >&2
  exit 1
fi

echo "worktree-bootstrap: target ${WORKTREE_PATH}"

# The one thing this stack needs: the dependency tree the validate suite and the
# node:test corpus import. `ajv` is a real devDependency of this repository
# (scripts/validate imports it), so resolving it proves the tree is reachable —
# not merely that a node_modules directory exists.
if ( cd "$WORKTREE_PATH" && node -e "require.resolve('ajv')" >/dev/null 2>&1 ); then
  echo "worktree-bootstrap: OK — node dependency tree resolves from the worktree"
else
  echo "worktree-bootstrap: FAIL — 'ajv' does not resolve from ${WORKTREE_PATH}." >&2
  echo "  The worktree cannot run 'npm run validate' or 'node --test' in this state." >&2
  echo "  Run 'npm install' at the repository root, or check that the worktree is" >&2
  echo "  still nested under it so node's module resolution can walk up." >&2
  exit 1
fi

echo "worktree-bootstrap: done"
