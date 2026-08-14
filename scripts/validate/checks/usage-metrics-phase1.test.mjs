// @ts-check
/**
 * Content-invariant tests for Phase 1 ("Codebook + field contract") of the
 * usage-metrics feature — the single packaged resource
 * `plugins/relay/resources/usage-metrics-schema.md`, which defines the four
 * TSV relations (verdict, rubric, run, scan), their closed field contract,
 * their enum domains, and the deliberate exclusions.
 *
 * Same idiom as figma-visual-first-track-phase1.test.mjs: the deliverable is
 * prose/template markdown with no runtime surface, so the meaningful test is a
 * content invariant — does the document actually state the contract every
 * downstream phase and every future consumer will rely on? These assertions
 * are derived from the plan's own AC-A1..AC-A5 (source PRD AC-7, AC-4, AC-8,
 * AC-3, AC-1 respectively), authored test-after per `docs/context/methodology.md`
 * (`tdd: false`, `test_frameworks: ["node:test"]`).
 *
 * Deliberately NOT asserted here: that the materializer produces conforming
 * files. No materializer exists yet — that is Phase 2. This file tests the
 * contract document, not an implementation of it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Read a repository file with line endings normalized to LF.
 *
 * This repo is developed on Windows and carries no repo-wide
 * `.gitattributes`, so git's autocrlf converts markdown and source to CRLF
 * on checkout. Assertions here test CONTENT, not bytes, so a test that
 * depends on the checkout's line endings is testing the wrong thing — and
 * would pass in a working tree the author never round-tripped through git
 * while failing in every fresh clone. Normalizing on read is the fix; the
 * one place bytes genuinely matter (the raw-control-byte check) reads the
 * Buffer directly and is deliberately left alone.
 * @param {string} relPath @returns {string}
 */
function readText(relPath) {
  return readFileSync(resolve(relPath), 'utf8').split('\r\n').join('\n');
}


const SCHEMA_PATH = 'plugins/relay/resources/usage-metrics-schema.md';

/** @param {string} relPath @returns {string} */
function readRepoFile(relPath) {
  return readText(relPath);
}

/**
 * Extract one `## Relation: <name>` section's body, up to the next `## `
 * heading at column 0.
 * @param {string} content @param {string} relation @returns {string}
 */
function relationSection(content, relation) {
  const start = content.indexOf(`## Relation: ${relation}\n`);
  assert.notEqual(start, -1, `expected a "## Relation: ${relation}" section in ${SCHEMA_PATH}`);
  const rest = content.slice(start + 1);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

const RELATIONS = ['verdict', 'rubric', 'run', 'scan'];

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-7) — the field contract is closed: every value is an
// enumerated code, a non-negative integer, an ISO-8601 UTC instant, or the
// single `-` sentinel; no free-text column exists in any relation.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-7): the schema exists and states a closed four-value field contract with a single sentinel', () => {
  assert.ok(existsSync(resolve(SCHEMA_PATH)), `expected ${SCHEMA_PATH} to exist`);
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(content, /^## Field contract$/m, 'expected a "## Field contract" section');
  assert.match(content, /non-negative integer/, 'expected the integer domain to be named');
  assert.match(content, /ISO-8601/, 'expected the instant format to be named');
  assert.match(
    content,
    /`-` is the only sentinel/,
    'expected the single-sentinel rule to be stated explicitly, not implied'
  );
  assert.match(
    content,
    /No free-text column exists in any relation/,
    'expected the no-free-text rule — it is the privacy mechanism, so it must be contractual prose rather than a convention'
  );
  assert.match(
    content,
    /No value may contain a tab, a CR, or a newline/,
    'expected the no-tab/CR/newline rule, which is what makes unquoted TSV safe to parse'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-4) — every relation carries `proj`, so rows from two projects
// concatenated into one file remain attributable to their origin.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-4): all four relations document a proj column so concatenated cross-project shards stay attributable', () => {
  const content = readRepoFile(SCHEMA_PATH);

  for (const relation of RELATIONS) {
    const section = relationSection(content, relation);
    assert.match(
      section,
      /^\| `proj` \|/m,
      `expected the ${relation} relation's Field semantics table to document a proj column — without it, a concatenated multi-project corpus cannot be sliced per project`
    );
  }
});

test('AC-A2 (PRD AC-4): project identity is a stable readable id, explicitly not a path hash or a git remote', () => {
  const content = readRepoFile(SCHEMA_PATH);
  const section = relationSection(content, 'verdict');

  assert.match(
    section,
    /Never a path hash, never the git remote/,
    'expected the proj derivation to rule out a path hash (which splits one project into two populations when the repo moves) and the git remote'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-8) — `deg` is documented on the verdict AND rubric relations,
// with the read-time exclusion rule and the never-rewrite rule.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-8): both verdict and rubric document a deg column', () => {
  const content = readRepoFile(SCHEMA_PATH);

  for (const relation of ['verdict', 'rubric']) {
    const section = relationSection(content, relation);
    assert.match(
      section,
      /^\| `deg` \|/m,
      `expected the ${relation} relation to document a deg column — a per-rid failure rate must be able to exclude degraded rows without joining back to verdict`
    );
  }
});

test('AC-A3 (PRD AC-8): degraded rows are excluded at read time and their source is never rewritten', () => {
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(
    content,
    /excluded at read time/,
    'expected the read-time exclusion rule for degraded rows'
  );
  assert.match(
    content,
    /never rewritten|never edited to repair it/,
    'expected the never-rewrite rule — the 2026-07-31 precedent is that degradation stays visible rather than being silently healed'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-3) — each relation's natural composite key is documented, and
// content-hashing a progressively-written source is forbidden.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-3): every relation has a documented natural composite key', () => {
  const content = readRepoFile(SCHEMA_PATH);

  for (const relation of RELATIONS) {
    assert.match(
      content,
      new RegExp(`^\\| \`${relation}\` \\| \`\\(proj`, 'm'),
      `expected a composite-key row for the ${relation} relation, keyed from proj`
    );
  }
});

test('AC-A4 (PRD AC-3): content-hashing a progressively-written source is forbidden, naming orchestrator-run.json', () => {
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(
    content,
    /Content-hashing a progressively-written source is forbidden/,
    'expected the prohibition as contractual prose'
  );
  assert.match(
    content,
    /`orchestrator-run\.json` is appended to as each stage completes, then written\s+back after the fact/,
    'expected the concrete case to be named — the prohibition is only actionable if the reader knows which source mutates'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-1) — the schema version lives in the shard filename, additive
// columns do not bump it, and a breaking change never rewrites existing shards.
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-1): the schema version lives in the filename, never in a per-row column', () => {
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(content, /^## Versioning$/m, 'expected a "## Versioning" section');
  assert.match(
    content,
    /schema version lives in the filename, never in a per-row column/,
    'expected the version-in-filename rule stated explicitly'
  );
  assert.match(
    content,
    /Existing `v1` shards are never rewritten, never\s+migrated, and never deleted by the materializer/,
    'expected the never-rewrite guarantee for a breaking change'
  );
});

test('AC-A5 (PRD AC-1): an undated shard is mandated for rows whose source carries no usable timestamp', () => {
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(
    content,
    /The `undated` shard is mandatory, not a fallback/,
    'expected the undated shard to be mandatory — orchestrator-run.json stage entries carry no timestamp at all, so a month-sharded relation without it has no computable destination for most rows'
  );
});

// ---------------------------------------------------------------------------
// Cross-cutting: the open/closed enum split, which is what stops a future
// reader from treating a newly-added rubric id as corrupt data.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-7): enum domains separate closed sets from open sets and name the resolution authority', () => {
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(content, /^## Enum domains$/m, 'expected an "## Enum domains" section');
  assert.match(content, /\*\*Closed domains\.\*\*/, 'expected the closed-domain group');
  assert.match(content, /\*\*Open domains\.\*\*/, 'expected the open-domain group');
  assert.match(
    content,
    /must treat it as a check added after the shard was written, never as corrupt data/,
    'expected the explicit reader rule for an unknown rubric id — rubric ids grew 8 to 27 by recorded decision, so an unknown id is expected, not anomalous'
  );
});

test('AC-A1 (PRD AC-7): the two real producer literals for the oscillation halt are both recorded, not normalized away', () => {
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(content, /FAILED_OSCILLATION\b/, 'expected the relay-test literal');
  assert.match(content, /FAILED_OSCILLATION_DETECTED/, 'expected the relay-implement / relay-execute literal');
  assert.match(
    content,
    /These are two distinct literals in the corpus/,
    'expected the drift to be recorded as a reading caveat rather than silently unified'
  );
});

test('the exclusions section names what is absent and, separately, what is deliberately kept', () => {
  const content = readRepoFile(SCHEMA_PATH);

  assert.match(content, /^## What is NOT in the schema$/m, 'expected the exclusions section');
  assert.match(content, /No prose, reason strings, or review messages/, 'expected prose exclusion');
  assert.match(content, /No file paths/, 'expected path exclusion');
  assert.match(content, /No personal identity of any kind/, 'expected identity exclusion');
  assert.match(
    content,
    /documented-not-redacted/,
    'expected the residual project-identifying slugs to be named as documented-not-redacted rather than the artifact being claimed anonymous'
  );
});
