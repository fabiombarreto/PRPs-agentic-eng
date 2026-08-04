// @ts-check
/**
 * Content-invariant tests for the `fix-design-system-config-producer`
 * description-mode bug-fix plan: turns `/relay-design-map`'s P2 precondition
 * from a dead-end HALT-on-absence check into a scaffold-then-HALT producer
 * for `docs/context/design-system.md`, keeps the HALT code byte-consistent
 * across its two enumeration sites, corrects a second, unrelated stale
 * "Phase 6 not shipped" claim at two distinct sites in the same command
 * file, and syncs both the rendered `documentation/reference/commands.html`
 * mirror and a new `documentation/changelog.html` Fixed entry.
 *
 * Source plan (description mode — no source PRD; `## Source PRD` is not
 * present, so there is no `(PRD AC-N)` token on any assertion below, per
 * this repo's shipped `/relay-plan` PRD-less mode contract):
 * PRPs/plans/completed/fix-design-system-config-producer.plan.md
 *
 * Existing-coverage scan performed before authoring: grepped every
 * scripts/validate/checks/*.test.mjs file for `relay-design-map`,
 * `design-system`, `FAILED_DESIGN_SYSTEM_CONFIG`, and `[INFERRED - VALIDATE]`.
 * `figma-track-phase3.test.mjs` covers only `relay-design-map.md`'s
 * inertness (never dispatched by another command) and its Figma-facts
 * evidence-persistence discipline — it never reads P2's body text, the
 * Final-output-surface HALT-code list, Phase D's preflight text, or the
 * Constraints hard-rule-6 text. `figma-track-phase1.test.mjs` covers the
 * four `SKILL.md` `docs/context/design-system.md` registration sites (its
 * four AC-4/AC-A4 tests are UPDATED by this same session — see that file's
 * header comment and this feature's test-suite.diff Lifecycle ledger — to
 * expect the corrected path/wording this plan produces) but never reads
 * `relay-design-map.md` or `documentation/reference/commands.html` at all.
 * No other check module's own test file mentions any of the four search
 * terms above. The scaffold-then-HALT producer body, the HALT-code
 * cross-enumeration consistency, the Phase-6-shipped correction, the
 * `commands.html` mirror, and the new changelog `Fixed` entry are therefore
 * genuinely new observable contracts with zero existing coverage.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED plan:
 * PRPs/plans/completed/fix-design-system-config-producer.plan.md
 *
 * Traceability (plan's own `## Acceptance Criteria` — description mode,
 * AC-A<i> only):
 *
 *   AC-A1 (scaffold-then-HALT producer) — on absence, P2 WRITEs a skeleton
 *     `docs/context/design-system.md` with the five required frontmatter
 *     keys, marks every non-cheaply-inferable field `[INFERRED - VALIDATE]`,
 *     then still HALTs with an accurate, keys-naming message; the old false
 *     `context-builder *update` remediation instruction is gone.
 *   AC-A2 (consumer logic unchanged) — Phase A's frontmatter-parsing prose
 *     (package name, clone path, token module path, Figma library file
 *     key(s), `dev_server` block) is present and unchanged.
 *   AC-A3 (HALT-code enumeration consistency) — every
 *     `FAILED_DESIGN_SYSTEM_CONFIG_*` mention in `relay-design-map.md` is
 *     byte-identical.
 *   AC-A5 (commands.html mirrors P2 + HALT code) — the doc-site mirror
 *     carries the same HALT code and contains neither the old
 *     `context-builder *update` remediation text nor the old "ships in
 *     Phase 6" preflight framing.
 *   AC-A6 (Phase-6-shipped correction, both sites + directory confirmation)
 *     — neither the Phase D preflight text nor the Constraints hard-rule-6
 *     text claims the visual tooling is unshipped, and the directory
 *     demonstrably exists with its four Phase 6 deliverables. (Both text
 *     sites cite it as `${CLAUDE_PLUGIN_ROOT}/scripts/visual/` since
 *     9857be0 / v0.25.1; the on-disk existence check below still resolves
 *     the real repo path `plugins/relay/scripts/visual`.)
 *   AC-A7 delta (new changelog Fixed entry) — a new `Unreleased`/`Fixed`
 *     block exists, positioned between `Added` and the next versioned
 *     release heading, and names the fix with the literal, deterministically
 *     checkable phrase `scaffold-then-HALT`. (The OTHER half of AC-A7 — the
 *     pre-existing `Unreleased`/`Added` entry staying byte-unmodified — is
 *     EXISTING_TEST_COVERS via figma-track-phase1.test.mjs's
 *     `AC-1/AC-A3` changelog test, which already asserts that entry's exact
 *     text; not duplicated here.)
 *
 * Run: node --test scripts/validate/checks/fix-design-system-config-producer.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = 'plugins/relay/commands/relay-design-map.md';
const COMMANDS_HTML_PATH = 'documentation/reference/commands.html';
const CHANGELOG_PATH = 'documentation/changelog.html';
const VISUAL_DIR = 'plugins/relay/scripts/visual';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase1.test.mjs's helper
 * of the same name/shape.
 * @param {string} content
 * @param {string} startNeedle
 * @param {string} endNeedle
 * @returns {string | undefined}
 */
function sliceBetween(content, startNeedle, endNeedle) {
  const startIdx = content.indexOf(startNeedle);
  if (startIdx === -1) return undefined;
  const endIdx = content.indexOf(endNeedle, startIdx + startNeedle.length);
  return endIdx === -1 ? content.slice(startIdx) : content.slice(startIdx, endIdx);
}

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a given source file happens to wrap a sentence. Mirrors
 * figma-track-phase3.test.mjs's helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Same as collapseWs, but additionally strips leading markdown blockquote
 * `>` markers before collapsing — needed for the P2 HALT message, which is
 * authored as a multi-line `>` blockquote.
 * @param {string} str
 * @returns {string}
 */
function collapseBlockquote(str) {
  return str.replace(/^[ \t]*>[ \t]?/gm, '').replace(/\s+/g, ' ').trim();
}

/**
 * Mirrors figma-track-phase1.test.mjs's helper of the same name/shape.
 * Locates the nearest `<h2 id="unreleased">` or `<h2 id="v...">` release
 * heading at or before `needleIdx`, and the position where that release
 * section ends (the next such heading, or end of file). A changelog entry
 * recorded under `Unreleased` moves, verbatim and in the same relative order
 * among its siblings, into a versioned heading exactly once — when a release
 * is cut (`documentation/AGENTS.md` §7.3: `Unreleased` is renamed to the new
 * version, and a fresh empty `Unreleased` block is created above it). This
 * helper lets a content-invariant test confirm an entry is recorded inside a
 * well-formed release section without pinning it to the transient
 * pre-release `Unreleased` position, which a release cut always invalidates.
 * @param {string} content
 * @param {number} needleIdx
 * @returns {{ id: string, start: number, end: number } | undefined}
 */
function findEnclosingReleaseSection(content, needleIdx) {
  const h2Re = /<h2 id="(unreleased|v[0-9][^"]*)">/g;
  let match;
  let enclosing;
  while ((match = h2Re.exec(content))) {
    if (match.index > needleIdx) break;
    enclosing = { id: match[1], start: match.index };
  }
  if (!enclosing) return undefined;
  h2Re.lastIndex = enclosing.start + 1;
  const next = h2Re.exec(content);
  return { id: enclosing.id, start: enclosing.start, end: next ? next.index : content.length };
}

/**
 * Locates the nearest Keep-a-Changelog `<h3 id="...">Added|Changed|
 * Deprecated|Removed|Fixed|Security</h3>` subsection heading
 * (`documentation/AGENTS.md` §7.2) at or before `needleIdx`, regardless of
 * its `id` attribute's prefix — `unreleased-*` before a release cut,
 * `v<X>-<Y>-<Z>-*` after one (ids are renumbered along with the heading text
 * on every cut; see findEnclosingReleaseSection's own doc comment for the
 * h2-level analog). Returns the subsection's plain-text label (e.g.
 * `"Fixed"`), not the id, precisely so a caller does not need to know which
 * form the id currently takes.
 * @param {string} content
 * @param {number} needleIdx
 * @returns {{ label: string, start: number } | undefined}
 */
function findEnclosingSubsection(content, needleIdx) {
  const h3Re = /<h3 id="[^"]*">(Added|Changed|Deprecated|Removed|Fixed|Security)<\/h3>/g;
  let match;
  let enclosing;
  while ((match = h3Re.exec(content))) {
    if (match.index > needleIdx) break;
    enclosing = { label: match[1], start: match.index };
  }
  return enclosing;
}

// ---------------------------------------------------------------------------
// AC-A1 — scaffold-then-HALT producer: on absence, WRITE a skeleton file
// with the five required frontmatter keys, marking non-inferable fields
// [INFERRED - VALIDATE], then still HALT with an accurate, keys-naming
// message; the old false context-builder remediation instruction is gone.
// ---------------------------------------------------------------------------

test('AC-A1: relay-design-map.md P2 scaffolds a starter docs/context/design-system.md with all five required frontmatter keys when the file is absent, instead of a bare HALT', () => {
  const content = readRepoFile(COMMAND_PATH);
  const block = sliceBetween(
    content,
    '### P2 — Design-system config present',
    '## Phase A — Ensure design-system config is loaded'
  );
  assert.ok(block, 'expected an extractable P2 section');
  const collapsed = collapseWs(block);

  assert.match(collapsed, /If absent, scaffold a starter file, then still HALT:/);
  assert.match(
    collapsed,
    /\*\*Write\*\* `docs\/context\/design-system\.md` with YAML frontmatter carrying `package_name`, `local_clone_path`, `tokens_module`, `figma_library_file_keys` \(a list\), and a `dev_server` block \(`command`, `port`\):/
  );

  const inferredValidateCount = (block.match(/\[INFERRED - VALIDATE\]/g) || []).length;
  assert.ok(
    inferredValidateCount >= 6,
    `expected at least 6 [INFERRED - VALIDATE] placeholder markers in P2 (one per non-cheaply-inferable field plus the HALT message's enumeration), found ${inferredValidateCount}`
  );
});

test('AC-A1: relay-design-map.md P2 infers package_name/dev_server.command cheaply from package.json when discoverable, rather than guessing every field', () => {
  const content = readRepoFile(COMMAND_PATH);
  const block = sliceBetween(
    content,
    '### P2 — Design-system config present',
    '## Phase A — Ensure design-system config is loaded'
  );
  assert.ok(block, 'expected an extractable P2 section');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /use its `"name"` field for `package_name`; use a `scripts\.dev` or `scripts\.start` entry \(in that preference order\) for `dev_server\.command` when discoverable\./
  );
  assert.match(
    collapsed,
    /Leave any value that cannot be cheaply inferred unset and mark it with the `\[INFERRED - VALIDATE\]` placeholder instead of guessing/
  );
});

test('AC-A1: relay-design-map.md P2 still HALTs after scaffolding, with an accurate message naming exactly which keys need a human value and instructing a re-run', () => {
  const content = readRepoFile(COMMAND_PATH);
  const block = sliceBetween(
    content,
    '### P2 — Design-system config present',
    '## Phase A — Ensure design-system config is loaded'
  );
  assert.ok(block, 'expected an extractable P2 section');
  const collapsed = collapseBlockquote(block);

  assert.match(
    collapsed,
    /FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE: `docs\/context\/design-system\.md` did not exist, so `\/relay-design-map` scaffolded a starter file at that path with `\[INFERRED - VALIDATE\]` placeholders\./
  );
  assert.match(
    collapsed,
    /keys still need a human value before this command can run: `figma_library_file_keys`, `local_clone_path`, and any other field still marked `\[INFERRED - VALIDATE\]`/
  );
  assert.match(
    collapsed,
    /Fill in the listed keys in `docs\/context\/design-system\.md`, then re-run `\/relay-design-map`\./
  );
  assert.match(collapsed, /Do NOT proceed to Phase A\. Exit non-zero\./);
});

test('AC-A1: relay-design-map.md no longer contains the old false "Run context-builder *update first to generate it" remediation instruction anywhere', () => {
  const content = readRepoFile(COMMAND_PATH);
  assert.ok(
    !/Run `context-builder \*update` first to generate it/.test(content),
    'the old false context-builder remediation instruction must be completely removed'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 — Phase A/B/C/D consumer logic (parsing package name, clone path,
// token module, Figma library file key(s), dev_server block) remains
// present and unchanged.
// ---------------------------------------------------------------------------

test('AC-A2: relay-design-map.md Phase A still parses all five design_system_config fields from docs/context/design-system.md, unchanged by the P2 producer rewrite', () => {
  const content = readRepoFile(COMMAND_PATH);
  const block = sliceBetween(
    content,
    '## Phase A — Ensure design-system config is loaded',
    '## Phase B — Query the Figma library'
  );
  assert.ok(block, 'expected an extractable Phase A section');
  const collapsed = collapseWs(block);

  assert.match(collapsed, /`Read` `docs\/context\/design-system\.md`\. Parse its frontmatter for, at minimum:/);
  assert.match(collapsed, /The design-system package name\./);
  assert.match(collapsed, /The local design-system clone path \(relative to `target_root`\)\./);
  assert.match(collapsed, /The token module path\./);
  assert.match(collapsed, /The Figma library file key\(s\) to query\./);
  assert.match(collapsed, /The `dev_server` block \(start command, expected port\)/);
  assert.match(collapsed, /Hold this parsed config as `design_system_config` for Phase B/);
});

// ---------------------------------------------------------------------------
// AC-A3 — every FAILED_DESIGN_SYSTEM_CONFIG_* enumeration in
// relay-design-map.md is byte-identical, whichever code name was chosen.
// ---------------------------------------------------------------------------

test('AC-A3: every FAILED_DESIGN_SYSTEM_CONFIG_* code mention in relay-design-map.md is byte-identical across the P2 body and the Final output surface HALT-code list', () => {
  const content = readRepoFile(COMMAND_PATH);
  const matches = content.match(/FAILED_DESIGN_SYSTEM_CONFIG_[A-Z]+/g) || [];

  assert.ok(matches.length >= 2, `expected at least 2 FAILED_DESIGN_SYSTEM_CONFIG_* mentions (P2 body + HALT-code list), found ${matches.length}`);
  const distinct = new Set(matches);
  assert.equal(distinct.size, 1, `expected exactly one distinct FAILED_DESIGN_SYSTEM_CONFIG_* code, found ${distinct.size}: ${[...distinct].join(', ')}`);
});

// ---------------------------------------------------------------------------
// AC-A5 — documentation/reference/commands.html mirrors the new
// scaffold-then-HALT P2 behavior and whichever HALT code was chosen,
// verified by an automated cross-file check.
// ---------------------------------------------------------------------------

test('AC-A5: commands.html mirrors relay-design-map.md\'s chosen FAILED_DESIGN_SYSTEM_CONFIG_* HALT code and drops the old context-builder remediation + stale Phase-6 preflight text', () => {
  const commandContent = readRepoFile(COMMAND_PATH);
  const htmlContent = readRepoFile(COMMANDS_HTML_PATH);

  const codeMatch = commandContent.match(/FAILED_DESIGN_SYSTEM_CONFIG_[A-Z]+/);
  assert.ok(codeMatch, 'expected to find a FAILED_DESIGN_SYSTEM_CONFIG_* code in relay-design-map.md to cross-check');
  const code = /** @type {RegExpMatchArray} */ (codeMatch)[0];

  assert.ok(htmlContent.includes(code), `expected commands.html to mirror HALT code ${code}`);
  assert.ok(
    !/run context-builder \*update first/i.test(htmlContent),
    'commands.html must not retain the old context-builder remediation instruction'
  );
  assert.ok(
    !/that tooling ships in Phase 6/i.test(htmlContent),
    'commands.html must not retain the old "that tooling ships in Phase 6" preflight framing'
  );
  assert.match(
    htmlContent,
    /ships as of Phase 6 and is expected present/,
    'commands.html Preflight row should mirror the corrected "ships as of Phase 6" framing'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 — relay-design-map.md no longer claims the visual tooling is
// unshipped, at EITHER site that made the claim, and the directory
// demonstrably exists with its Phase 6 deliverables.
// ---------------------------------------------------------------------------

test('AC-A6: relay-design-map.md contains no "not shipped"/"not-yet-shipped" claim about plugins/relay/scripts/visual/ anywhere (Phase D preflight step 2 AND Constraints hard rule 6)', () => {
  const content = readRepoFile(COMMAND_PATH);
  assert.ok(
    !/not shipped as of this phase|not-yet-shipped/i.test(content),
    'no stale "unshipped" claim about plugins/relay/scripts/visual/ should remain anywhere in relay-design-map.md'
  );
});

// NOTE on the expected path literal: these two assertions originally pinned
// the monorepo-relative `plugins/relay/scripts/visual/`. Commit 9857be0
// ("fix(visual): resolve visual-tooling paths via CLAUDE_PLUGIN_ROOT",
// shipped v0.25.1) deliberately rewrote both sites to
// `${CLAUDE_PLUGIN_ROOT}/scripts/visual/` — the monorepo-relative form
// resolves to nothing in an installed plugin, which is the H0-class defect
// `plugin-root-resolvable.mjs` (check L, R2) now actively forbids. The
// expected literal below tracks that correction; do NOT "fix" it back, or
// `npm run validate` and this file will assert contradictory things.
// The same commit reframed the degradation case from "incomplete checkout"
// to "broken plugin install" — accurate, since an installed plugin is not
// a checkout.

test('AC-A6: relay-design-map.md Phase D preflight step 2 describes the ${CLAUDE_PLUGIN_ROOT}-resolved visual tooling as shipped-and-expected-present, reframing absence as the rare/broken-plugin-install case', () => {
  const content = readRepoFile(COMMAND_PATH);
  const collapsed = collapseWs(content);

  assert.match(
    collapsed,
    /`\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/visual\/` ships as of Phase 6 of the Figma Implementation Track and is expected to be present/
  );
});

test('AC-A6: relay-design-map.md Constraints hard rule 6 reframes the ${CLAUDE_PLUGIN_ROOT}-resolved visual-tooling graceful-degradation clause around a broken plugin install, not an unshipped directory', () => {
  const content = readRepoFile(COMMAND_PATH);
  const collapsed = collapseWs(content);

  assert.match(
    collapsed,
    /graceful degradation for the rare case of a broken plugin install missing the `\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/visual\/` tooling \(shipped as of Phase 6\)\./
  );
});

test('AC-A6: plugins/relay/scripts/visual/ demonstrably exists on disk with all four Phase 6 deliverables, confirming the corrected "shipped" text is accurate', () => {
  for (const fileName of ['provision.mjs', 'capture.mjs', 'compare.mjs', 'package.json']) {
    assert.ok(
      existsSync(resolve(VISUAL_DIR, fileName)),
      `expected ${VISUAL_DIR}/${fileName} to exist on disk`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-A7 (delta) — documentation/changelog.html gains a new Unreleased/Fixed
// entry naming the fix, positioned between Added and the next versioned
// release heading. (The "Added entry stays unmodified" half of AC-A7 is
// EXISTING_TEST_COVERS via figma-track-phase1.test.mjs's AC-1/AC-A3 test.)
// ---------------------------------------------------------------------------

test('AC-A7: changelog.html records a Fixed entry naming the scaffold-then-HALT fix, positioned after the enclosing release\'s Added subsection, inside a well-formed release section (still Unreleased, or the versioned release Unreleased was later cut into — see documentation/AGENTS.md §7.3)', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  const entryMatch = content.match(/scaffold-then-HALT/);
  assert.ok(entryMatch, 'expected the literal, deterministically checkable phrase "scaffold-then-HALT" somewhere in the changelog');
  const entryIdx = /** @type {number} */ (/** @type {RegExpMatchArray} */ (entryMatch).index);

  const releaseSection = findEnclosingReleaseSection(content, entryIdx);
  assert.ok(
    releaseSection,
    'expected the scaffold-then-HALT entry to sit within a well-formed release section (an id="unreleased" or id="v..." heading)'
  );
  assert.ok(
    entryIdx < /** @type {{ end: number }} */ (releaseSection).end,
    'expected the scaffold-then-HALT entry to sit fully within its enclosing release section, not spill past the next one'
  );

  const fixedSubsection = findEnclosingSubsection(content, entryIdx);
  assert.ok(fixedSubsection, 'expected the scaffold-then-HALT entry to sit under some Keep-a-Changelog h3 subsection heading');
  assert.equal(
    /** @type {{ label: string }} */ (fixedSubsection).label,
    'Fixed',
    'expected the scaffold-then-HALT entry to be recorded under a Fixed subsection, not Added/Changed/etc'
  );

  const addedSubsection = findEnclosingSubsection(content, /** @type {{ start: number }} */ (fixedSubsection).start - 1);
  assert.ok(addedSubsection, 'expected an Added subsection to precede the Fixed subsection within the same release');
  assert.equal(
    /** @type {{ label: string }} */ (addedSubsection).label,
    'Added',
    'expected the subsection immediately preceding Fixed within the same release to be Added, matching this changelog\'s established Added-then-Fixed ordering'
  );
  assert.ok(
    /** @type {{ start: number }} */ (addedSubsection).start >= /** @type {{ start: number }} */ (releaseSection).start,
    'expected the preceding Added subsection to belong to the SAME enclosing release, not an earlier one'
  );
});
