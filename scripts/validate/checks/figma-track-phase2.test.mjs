// @ts-check
/**
 * Content/real-wrapper regression test for Phase 2 ("MCP-access spike") of
 * the figma-implementation-track feature — a purely documentation phase
 * (docs/decisions.md, docs/context/architecture.md,
 * docs/context/integrations.md; no new check module, command, or agent).
 *
 * Source PRD: PRPs/prds/figma-implementation-track.prd.md
 * Source plan: PRPs/plans/completed/figma-implementation-track-phase-2-mcp-access-spike.plan.md
 *
 * Existing-coverage scan performed before authoring: this phase's own plan
 * Files-to-Change table lists three documentation files only — no
 * scripts/validate/checks/*.mjs module changed (confirmed against the plan
 * body). Cross-checked every registered check module's own scan surface
 * (scripts/validate/index.mjs's CHECKS array; read each of the nine
 * scripts/validate/checks/*.mjs source files before authoring) against the
 * three edited files: only path-existence.mjs's SCAN_ROOTS
 * (['plugins/relay', 'docs']) walks docs/ recursively and therefore reads
 * these three files' content for its class-1/2/3 reference extraction; none
 * of the other eight checks (version-parity, native-validate,
 * registration-parity, dispatch-graph, frontmatter-schema, artifact-naming,
 * bootstrap-parity, gating-structure) read docs/decisions.md,
 * docs/context/architecture.md, or docs/context/integrations.md at all.
 * scripts/validate/checks/path-existence.test.mjs's own two existing
 * real-wrapper tests (the AC-5 dangling-`.py`-reference synthetic fixture,
 * and the AC-10 "never emits a finding under plugins/prp-core" scoped
 * invariant) do NOT assert that `runPathExistenceCheck()` returns ok:true
 * with zero findings against the real, current repository tree as a whole —
 * EXISTING_TEST_COVERS does not apply to that broader property. This file
 * supplies exactly that missing-property delta, without duplicating either
 * existing path-existence.test.mjs assertion (this test installs no
 * synthetic fixture, and it does not filter findings down to a
 * prp-core-scoped subset — it inspects the whole real result).
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 2 plan:
 * PRPs/plans/completed/figma-implementation-track-phase-2-mcp-access-spike.plan.md
 *
 * Traceability (PRPs/prds/figma-implementation-track.prd.md Acceptance
 * Criteria — in-scope for phase 2 per the plan's own Acceptance Criteria
 * section: AC-1 only, via plan AC-A1. AC-2 through AC-5 are
 * OUT_OF_PHASE_SCOPE, deferred to later phases of the Implementation Phases
 * table):
 *
 *   AC-1 / AC-A1 ("Given this phase's three documentation-only edits, when
 *     npm run validate runs, then it passes with zero new findings — no new
 *     gated emission site, no new command, no new agent is introduced by
 *     this phase") — this phase introduces no new check module, command, or
 *     agent (confirmed structurally from the plan's Files to Change table),
 *     so the AC's "then" clause reduces to a single mechanically-checkable
 *     fact: the one registered check whose scan surface actually includes
 *     these three files' new prose (path-existence) still returns ok:true
 *     with zero findings against the real, already-implemented repository
 *     tree — i.e. this phase's new content (the dated decisions.md entry,
 *     the architecture.md cross-reference sentence, and the
 *     integrations.md Figma MCP section) introduces no dangling
 *     `scripts/…`, `${CLAUDE_PLUGIN_ROOT}/…`, or markdown-link reference.
 *
 * Run: node --test scripts/validate/checks/figma-track-phase2.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runPathExistenceCheck } from './path-existence.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

// ---------------------------------------------------------------------------
// AC-1 / AC-A1 — this phase's three documentation-only edits introduce zero
// new path-existence findings against the real, current repository tree.
// ---------------------------------------------------------------------------

// This test asserts the real repo tree is clean via runPathExistenceCheck(),
// which walks the same SCAN_ROOTS (docs/, plugins/relay/) that
// path-existence.test.mjs's AC-5 test transiently mutates. node:test runs
// test files concurrently by default, so without synchronization this
// assertion can observe that other file's fixture mid-write/mid-cleanup and
// fail intermittently — a filesystem race, not a regression in this phase's
// content. withScanRootLock (scan-root-lock.mjs) serializes this scan
// against any other test holding the same lock.
test(
  'AC-1/AC-A1: runPathExistenceCheck() returns ok:true with zero findings against the real repo tree after this phase\'s docs/decisions.md, docs/context/architecture.md, and docs/context/integrations.md edits (the only one of the 9 registered npm-run-validate checks whose scan surface reads these three files\' content; confirms the phase stays inert — no dangling reference introduced)',
  async () => {
    const result = await withScanRootLock(() => runPathExistenceCheck());

    assert.equal(result.name, 'path-existence');
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  }
);
