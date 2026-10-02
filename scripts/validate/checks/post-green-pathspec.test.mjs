// @ts-check
/**
 * Content-invariant tests pinning the post-green-reviewer pathspec fix.
 *
 * Subject: plugins/relay/agents/post-green-reviewer.md
 *
 * Why this exists: the agent's weakening scan used pathspecs that did not match
 * `.test.mjs`, the ONLY test format in this repository. A reviewer whose scan
 * matches nothing reports "no weakening found" on every run (silent vacuity, the
 * same failure shape as the diff-base defect guarded by the `diff-base-form`
 * check). The fix was additive: new `node:test` pathspecs, an empty-match
 * fallback, a `scan_path` note, an untracked-file note, and a single-argument
 * diff form throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Every
 * predicate below is a pure function of the file text. Each assertion class has
 * a mutation test that takes the passing baseline, breaks exactly the guarded
 * property (anchored on a token unique to that property, inside the one region
 * it belongs to) and asserts the predicate now fails, so no guard is decorative.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const AGENT_PATH = 'plugins/relay/agents/post-green-reviewer.md';

const STEP2_START = '### Step 2 — Identify changed test files';
const STEP2_END = '### Step 2.5';
const STEP3D_START = '#### 3d';
const STEP3D_END = '### Step 4';

/** Pathspecs that existed before the fix; other target projects rely on them. */
const PRE_EXISTING_PATHSPECS = [
  '**/test_*.py',
  '**/tests/**/*.py',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.test.js',
  '**/*.spec.js',
  '**/*_test.go',
  '**/tests/**/*.rb',
  '**/*_spec.rb',
];
const ADDED_PATHSPECS = ['**/*.test.mjs', '**/*.test.cjs', '**/*.spec.mjs', '**/*.spec.cjs'];

/** @returns {string} the agent file with line endings normalized to \n */
function readAgent() {
  return readFileSync(resolve(AGENT_PATH), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * @param {string} text @param {string} start @param {string} end
 * @returns {string | undefined}
 */
function region(text, start, end) {
  const s = text.indexOf(start);
  if (s === -1) return undefined;
  const e = text.indexOf(end, s + start.length);
  return e === -1 ? text.slice(s) : text.slice(s, e);
}

/**
 * Applies `fn` to only the region between the two needles and returns the whole
 * mutated text, so a mutation lands in exactly one block.
 * @param {string} text @param {string} start @param {string} end @param {(r: string) => string} fn
 */
function mutateRegion(text, start, end, fn) {
  const s = text.indexOf(start);
  assert.notEqual(s, -1, `mutation precondition: region start "${start}" exists`);
  let e = text.indexOf(end, s + start.length);
  if (e === -1) e = text.length;
  return text.slice(0, s) + fn(text.slice(s, e)) + text.slice(e);
}

/** @param {string} str */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/** @param {string} regionText @returns {string[]} bodies of fenced code blocks */
function fencedBlocks(regionText) {
  const out = [];
  const re = /```[^\n]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(regionText))) out.push(m[1]);
  return out;
}

/**
 * The single-quoted pathspecs of the fenced `git diff <flag> <base_branch> --` block.
 * @param {string | undefined} regionText @param {string} firstLinePrefix
 * @returns {string[]}
 */
function pathspecs(regionText, firstLinePrefix) {
  if (regionText === undefined) return [];
  const block = fencedBlocks(regionText).find((b) => b.trimStart().startsWith(firstLinePrefix));
  if (!block) return [];
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** @param {string} text */
const step2Specs = (text) => pathspecs(region(text, STEP2_START, STEP2_END), 'git diff --name-only <base_branch> --');
/** @param {string} text */
const step3dSpecs = (text) => pathspecs(region(text, STEP3D_START, STEP3D_END), 'git diff --name-status <base_branch> --');

/** @param {string} text @param {string} spec */
const removeQuotedSpec = (text, spec) => text.split(`'${spec}'`).join('');

// ---- predicates for the non-pathspec classes (pure functions of the text) ----

/** Empty-match rule: states the principle, the fallback command, and judging by filename. @param {string} text */
function hasEmptyMatchRule(text) {
  const r = region(text, STEP2_START, STEP2_END);
  if (r === undefined) return false;
  const c = collapseWs(r);
  const principle = c.includes('An empty pathspec match is NOT evidence of "no test changes"');
  const fallsBack = c.includes('fall back to an unfiltered scan and judge by filename');
  const unfilteredBlock = fencedBlocks(r).some((b) => b.trim() === 'git diff --name-status <base_branch>');
  return principle && fallsBack && unfilteredBlock;
}

/** Step 3d must re-run the unfiltered form when Step 2 took the fallback. @param {string} text */
function step3dHonoursFallback(text) {
  const r = region(text, STEP3D_START, STEP3D_END);
  if (r === undefined) return false;
  return collapseWs(r).includes(
    'If Step 2 took the `unfiltered_fallback` path, run `git diff --name-status <base_branch>` unfiltered here too'
  );
}

/** scan_path note shape, within Step 2. @param {string} text */
function recordsScanPath(text) {
  const r = region(text, STEP2_START, STEP2_END);
  if (r === undefined) return false;
  const c = collapseWs(r);
  return /\{"type": "scan_path", "path": "pathspec" \| "unfiltered_fallback"\}/.test(c) && c.includes('`notes[]`');
}

/** Untracked-file rule, within Step 2. @param {string} text */
function reportsUntrackedFiles(text) {
  const r = region(text, STEP2_START, STEP2_END);
  if (r === undefined) return false;
  const c = collapseWs(r);
  return (
    c.includes('git status --porcelain') &&
    c.includes('`??`') &&
    /\{"type": "untracked_test_files", "files": \[\.\.\.\]\}/.test(c)
  );
}

/**
 * Every `git diff ... <base_branch>` invocation in the file (fenced or inline),
 * and the subset that is NOT the single-argument form.
 * @param {string} text
 */
function diffInvocations(text) {
  const all = [...text.matchAll(/git diff[^\n`]*<base_branch>[^\n`]*/g)].map((m) => m[0].trim());
  const single = /^git diff (?:--name-(?:only|status) )?<base_branch>(?: -- .*)?$/;
  return { all, violations: all.filter((i) => !single.test(i)) };
}

const TWO_DOT_HEAD = /\.\.\.?HEAD/;
const TWO_DOT_BASE = /<base(?:_branch)?>\.\.\.?/;

// ---------------------------------------------------------------------------
// Baseline sanity: the regions the rest of this file reasons about exist.
// ---------------------------------------------------------------------------

test('baseline: the Step 2 and Step 3d regions and their fenced pathspec blocks are extractable (guards every other test here against vacuity)', () => {
  const text = readAgent();
  assert.ok(region(text, STEP2_START, STEP2_END), 'expected a Step 2 region');
  assert.ok(region(text, STEP3D_START, STEP3D_END), 'expected a Step 3d region');
  assert.ok(step2Specs(text).length >= PRE_EXISTING_PATHSPECS.length, 'expected the Step 2 pathspec block to be parsed');
  assert.ok(step3dSpecs(text).length >= PRE_EXISTING_PATHSPECS.length, 'expected the Step 3d pathspec block to be parsed');
});

// ---------------------------------------------------------------------------
// Class 1 — `**/*.test.mjs` in BOTH blocks, independently.
// ---------------------------------------------------------------------------

test('`**/*.test.mjs` is in the Step 2 pathspec block AND, independently, in the Step 3d copy', () => {
  const text = readAgent();
  assert.ok(step2Specs(text).includes('**/*.test.mjs'), 'Step 2 block lacks **/*.test.mjs');
  assert.ok(step3dSpecs(text).includes('**/*.test.mjs'), 'Step 3d block lacks **/*.test.mjs');
});

test('mutation: removing `**/*.test.mjs` from ONLY the Step 2 block fails the Step 2 check while Step 3d still passes (the half-fix is detected)', () => {
  const mutated = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => removeQuotedSpec(r, '**/*.test.mjs'));
  assert.ok(!step2Specs(mutated).includes('**/*.test.mjs'));
  assert.ok(step3dSpecs(mutated).includes('**/*.test.mjs'), 'the mutation must not leak into Step 3d');
});

test('mutation: removing `**/*.test.mjs` from ONLY the Step 3d block fails the Step 3d check while Step 2 still passes (the half-fix is detected)', () => {
  const mutated = mutateRegion(readAgent(), STEP3D_START, STEP3D_END, (r) => removeQuotedSpec(r, '**/*.test.mjs'));
  assert.ok(!step3dSpecs(mutated).includes('**/*.test.mjs'));
  assert.ok(step2Specs(mutated).includes('**/*.test.mjs'), 'the mutation must not leak into Step 2');
});

test('the Step 3d pathspec list is a verbatim copy of Step 2\'s (same entries, same order); a spec added to only one block is detected as drift', () => {
  const text = readAgent();
  assert.deepEqual(step3dSpecs(text), step2Specs(text));

  const drifted = mutateRegion(text, STEP3D_START, STEP3D_END, (r) =>
    r.replace("'**/*_spec.rb'", "'**/*_spec.rb' '**/*.extra-drift'")
  );
  assert.notDeepEqual(step3dSpecs(drifted), step2Specs(drifted), 'drift must be observable');
});

// ---------------------------------------------------------------------------
// Class 2 — sibling forms present; pre-existing pathspecs NOT removed.
// ---------------------------------------------------------------------------

for (const [label, specsOf, start, end] of /** @type {const} */ ([
  ['Step 2', step2Specs, STEP2_START, STEP2_END],
  ['Step 3d', step3dSpecs, STEP3D_START, STEP3D_END],
])) {
  test(`${label}: all four node:test pathspecs (.test.mjs, .test.cjs, .spec.mjs, .spec.cjs) are present, and removing any one is detected`, () => {
    const text = readAgent();
    for (const spec of ADDED_PATHSPECS) {
      assert.ok(specsOf(text).includes(spec), `${label} lacks ${spec}`);
      const mutated = mutateRegion(text, start, end, (r) => removeQuotedSpec(r, spec));
      assert.ok(!specsOf(mutated).includes(spec), `mutation removing ${spec} from ${label} must be observable`);
    }
  });

  test(`${label}: every pre-existing pathspec is still present (the fix was additive), and removing any one is detected`, () => {
    const text = readAgent();
    for (const spec of PRE_EXISTING_PATHSPECS) {
      assert.ok(specsOf(text).includes(spec), `${label} dropped the pre-existing pathspec ${spec}`);
      const mutated = mutateRegion(text, start, end, (r) => removeQuotedSpec(r, spec));
      assert.ok(!specsOf(mutated).includes(spec), `mutation removing ${spec} from ${label} must be observable`);
    }
  });
}

// ---------------------------------------------------------------------------
// Class 3 — empty-match rule.
// ---------------------------------------------------------------------------

test('the agent states an empty pathspec match is NOT evidence of "no test changes" and falls back to an unfiltered `git diff --name-status <base>` judged by filename', () => {
  assert.ok(hasEmptyMatchRule(readAgent()));
});

test('mutation: turning "is NOT evidence" into "is evidence" breaks the empty-match rule', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('An empty pathspec match is NOT evidence', 'An empty pathspec match is evidence'));
  assert.ok(!hasEmptyMatchRule(m));
});

test('mutation: dropping the unfiltered fallback command block breaks the empty-match rule', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('```\ngit diff --name-status <base_branch>\n```', ''));
  assert.ok(!hasEmptyMatchRule(m));
});

test('mutation: re-adding a pathspec filter to the "unfiltered" fallback command breaks the empty-match rule', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) =>
    r.replace('```\ngit diff --name-status <base_branch>\n```', "```\ngit diff --name-status <base_branch> -- '**/*.test.ts'\n```")
  );
  assert.ok(!hasEmptyMatchRule(m));
});

test('mutation: replacing "judge by filename" with a pathspec-only fallback breaks the empty-match rule', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('judge by filename', 'trust the empty set'));
  assert.ok(!hasEmptyMatchRule(m));
});

test('Step 3d re-runs the unfiltered form when Step 2 took the fallback path, and dropping that instruction is detected', () => {
  const text = readAgent();
  assert.ok(step3dHonoursFallback(text));
  const m = mutateRegion(text, STEP3D_START, STEP3D_END, (r) => r.replace('If Step 2 took the `unfiltered_fallback` path', 'If Step 2 took any path'));
  assert.ok(!step3dHonoursFallback(m));
});

// ---------------------------------------------------------------------------
// Class 4 — scan_path note.
// ---------------------------------------------------------------------------

test('the agent records which path it took as {"type":"scan_path","path":"pathspec"|"unfiltered_fallback"} in notes[]', () => {
  assert.ok(recordsScanPath(readAgent()));
});

test('mutation: renaming the "scan_path" note type breaks the scan_path record', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('"scan_path"', '"scan_route"'));
  assert.ok(!recordsScanPath(m));
});

test('mutation: dropping the "pathspec" value from the scan_path note breaks the record', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('"pathspec" |', '"glob" |'));
  assert.ok(!recordsScanPath(m));
});

test('mutation: dropping the "unfiltered_fallback" value from the scan_path note breaks the record', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('"unfiltered_fallback"}', '"fallback"}'));
  assert.ok(!recordsScanPath(m));
});

// ---------------------------------------------------------------------------
// Class 5 — untracked test files.
// ---------------------------------------------------------------------------

test('the agent checks `git status --porcelain` for `??` test paths and reports {"type":"untracked_test_files","files":[...]}', () => {
  assert.ok(reportsUntrackedFiles(readAgent()));
});

test('mutation: dropping the `git status --porcelain` check breaks the untracked-file rule', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('git status --porcelain', 'git status'));
  assert.ok(!reportsUntrackedFiles(m));
});

test('mutation: dropping the `??` untracked marker breaks the untracked-file rule', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('`??`', '`M`'));
  assert.ok(!reportsUntrackedFiles(m));
});

test('mutation: renaming the "untracked_test_files" note type breaks the untracked-file rule', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) => r.replace('"untracked_test_files"', '"untracked"'));
  assert.ok(!reportsUntrackedFiles(m));
});

// ---------------------------------------------------------------------------
// Class 6 — single-argument diff form everywhere; two-dot form nowhere.
// ---------------------------------------------------------------------------

test('`git diff <base_branch>..HEAD` (and any ..HEAD / <base>.. range) appears NOWHERE in the agent file', () => {
  const text = readAgent();
  assert.doesNotMatch(text, TWO_DOT_HEAD);
  assert.doesNotMatch(text, TWO_DOT_BASE);
});

test('mutation: a re-introduced `git diff <base_branch>..HEAD` is caught by the ..HEAD guard', () => {
  const m = readAgent() + '\n```\ngit diff <base_branch>..HEAD --name-only\n```\n';
  assert.match(m, TWO_DOT_HEAD);
});

test('mutation: a re-introduced `<base_branch>..main` range is caught by the <base>.. guard', () => {
  const m = readAgent() + '\n```\ngit diff <base_branch>..main\n```\n';
  assert.match(m, TWO_DOT_BASE);
});

test('mutation: the three-dot `<base_branch>...HEAD` form is caught too', () => {
  const m = readAgent() + '\n```\ngit diff <base_branch>...HEAD\n```\n';
  assert.match(m, TWO_DOT_HEAD);
  assert.match(m, TWO_DOT_BASE);
});

test('every `git diff ... <base_branch>` invocation in the file is the single-argument form, and there are at least the five the protocol needs', () => {
  const { all, violations } = diffInvocations(readAgent());
  assert.ok(all.length >= 5, `expected at least 5 diff invocations (Step 2 x2, Step 3, Step 3d x2), found ${all.length}`);
  assert.deepEqual(violations, []);
});

test('mutation: turning the per-file Step 3 diff into a two-dot range is caught by the single-argument-form check', () => {
  const text = readAgent();
  const before = 'git diff <base_branch> -- <file>';
  assert.ok(text.includes(before), 'precondition: the per-file Step 3 invocation exists verbatim');
  const m = text.replace(before, 'git diff <base_branch>..HEAD -- <file>');
  assert.equal(diffInvocations(m).violations.length, 1);
});

test('mutation: turning the Step 2 name-only scan into a three-dot range is caught by the single-argument-form check', () => {
  const m = mutateRegion(readAgent(), STEP2_START, STEP2_END, (r) =>
    r.replace('git diff --name-only <base_branch> --', 'git diff --name-only <base_branch>...HEAD --')
  );
  assert.ok(diffInvocations(m).violations.length >= 1);
});
