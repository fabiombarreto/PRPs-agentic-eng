// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-2 Every case gets an outcome (case detection, CASE_INCOMPLETE, N in / N out)
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-3 Steps are carried verbatim (a thematic break inside a step list never drops steps)
/**
 * Contract tests between the two sibling commands: /relay-qa-report (producer)
 * and plugins/relay/scripts/qa-run.mjs (consumer).
 *
 * Closes the retroactive CHANGES_REQUESTED on commit b5f1a80. The original
 * suite built its input with a parser-friendly helper, so the producer's real
 * output shape was never tested and the two broken paths (a bare `---` inside
 * steps; a one-field real case) had no test. Here:
 *   - the headline test takes its fixture FROM the producer's own spec (the
 *     block between the qa-report-layout-example markers in
 *     plugins/relay/commands/relay-qa-report.md);
 *   - every other assertion class is pinned by a mutation of a COPY of the
 *     script, anchored on a string that must occur exactly once, so a mutation
 *     can never be a silent no-op.
 *
 * Parse-mode tests need no server. The run-mode tests need none either: no
 * baseUrl is declared, so the runner never opens a socket. The child process is
 * spawned ASYNC (a sync spawn would block this process's event loop).
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const REAL_SCRIPT = join(REPO, 'plugins', 'relay', 'scripts', 'qa-run.mjs');
const SPEC_PATH = join(REPO, 'plugins', 'relay', 'commands', 'relay-qa-report.md');
const REAL_SOURCE = readFileSync(REAL_SCRIPT, 'utf8').replace(/\r\n/g, '\n');
const BEGIN = '<!-- qa-report-layout-example:begin -->';
const END = '<!-- qa-report-layout-example:end -->';
const CLOSED_OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];

/** @type {string[]} */
const temps = [];
after(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

/** @returns {string} */
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'qa-layout-'));
  temps.push(d);
  return d;
}

/**
 * @param {string} script
 * @param {string[]} args
 * @param {string} [cwd]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runScript(script, args, cwd) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', rej);
    child.on('close', (code) => res({ code, stdout, stderr }));
  });
}

/**
 * Writes `text` as a report and runs `parse` with the given script.
 * @param {string} text
 * @param {string} [script]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, json: any }>}
 */
async function parseWith(text, script = REAL_SCRIPT) {
  const dir = tmp();
  const report = join(dir, 'qa-report.md');
  writeFileSync(report, text);
  const r = await runScript(script, ['parse', '--report', report]);
  /** @type {any} */ let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // leave null: the assertion that reads it reports the real stderr
  }
  return { ...r, json };
}

/**
 * Copies the script into a temp dir with ONE anchored replacement. The anchor
 * must occur exactly once, otherwise the mutation would be a silent no-op.
 * @param {string} anchor
 * @param {string} replacement
 * @returns {string} path of the mutated copy
 */
function mutatedCopy(anchor, replacement) {
  assert.equal(REAL_SOURCE.split(anchor).length - 1, 1, `mutation anchor must occur exactly once: ${anchor}`);
  const dir = tmp();
  const dest = join(dir, 'qa-run.mjs');
  writeFileSync(dest, REAL_SOURCE.replace(anchor, () => replacement));
  return dest;
}

const SEVEN = [
  '- **Risk level:** High',
  '- **Required state:** none',
  '- **Coverage:** manual',
  '- **Automated test path:** —',
  '- **Manual status:** `pending`',
].join('\n');

/**
 * A complete case whose step list is `stepLines` (already indented), followed by `after`.
 * @param {string} id
 * @param {string[]} stepLines
 * @param {string} [after]
 */
function kase(id, stepLines, after = '') {
  return `### ${id} — Title of ${id}\n\n${SEVEN}\n- **Manual step-by-step:**\n${stepLines.join('\n')}\n${after}`;
}

// ---------------------------------------------------------------------------
// 1. The contract test: the producer's own canonical example
// ---------------------------------------------------------------------------

test('the layout example in the report generator spec parses to exactly its own cases, all seven fields filled, nothing incomplete, no warnings', async () => {
  const spec = readFileSync(SPEC_PATH, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(spec.split(BEGIN).length - 1, 1, 'the begin marker must occur exactly once in relay-qa-report.md');
  assert.equal(spec.split(END).length - 1, 1, 'the end marker must occur exactly once in relay-qa-report.md');
  const between = spec.slice(spec.indexOf(BEGIN) + BEGIN.length, spec.indexOf(END));
  const fence = /^\s*```markdown\n([\s\S]*?)\n```\s*$/.exec(between);
  assert.notEqual(fence, null, 'the example must be one ```markdown fence between the markers');
  const example = /** @type {RegExpExecArray} */ (fence)[1];

  const expectedHeadings = [...example.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
  assert.ok(expectedHeadings.length >= 3, 'the example must contain at least three cases, or this test is vacuous');

  const r = await parseWith(example);
  assert.equal(r.code, 0, `parse exited ${r.code}: ${r.stderr}`);
  assert.deepEqual(
    r.json.cases.map((/** @type {any} */ c) => c.heading),
    expectedHeadings,
  );
  assert.deepEqual(r.json.incomplete, []);
  assert.deepEqual(r.json.warnings, []);
  for (const c of r.json.cases) {
    for (const k of ['title', 'risk', 'required_state', 'coverage', 'automated_test_path', 'manual_status', 'manual_steps_verbatim']) {
      assert.equal(typeof c[k], 'string', `${c.heading}: ${k} must be populated`);
      assert.notEqual(c[k].trim(), '', `${c.heading}: ${k} must not be empty`);
    }
    // The step list holds only numbered steps: no extra labeled bullet, no heading, no bare rule.
    for (const line of c.manual_steps_verbatim.split('\n')) {
      assert.match(line, /^\s+\d+\.\s/, `${c.heading}: unexpected line inside the steps: ${JSON.stringify(line)}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 2. AC-3: a thematic break inside a step list
// ---------------------------------------------------------------------------

const RULES = ['---', '***', '___'];

for (const rule of RULES) {
  test(`a bare ${rule} inside a step list is kept verbatim and the steps after it survive`, async () => {
    const text = kase('T-1', ['  1. first', rule, '  2. second', '  3. third']);
    const r = await parseWith(text);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.json.cases.length, 1);
    assert.equal(r.json.cases[0].manual_steps_verbatim, `  1. first\n${rule}\n  2. second\n  3. third`);
    assert.deepEqual(r.json.incomplete, []);
  });
}

test('mutation: when any bare break ends the block the steps after a rule are dropped (the test above is what catches it)', async () => {
  const text = kase('T-1', ['  1. first', '---', '  2. second', '  3. third']);
  const real = await parseWith(text);
  assert.match(real.json.cases[0].manual_steps_verbatim, /3\. third/);
  const mutated = await parseWith(text, mutatedCopy(' && breakQualifies(i)) {', ') {'));
  assert.equal(mutated.code, 0, mutated.stderr);
  assert.doesNotMatch(mutated.json.cases[0].manual_steps_verbatim, /3\. third/);
  assert.doesNotMatch(mutated.json.cases[0].manual_steps_verbatim, /2\. second/);
});

// ---------------------------------------------------------------------------
// 3. AC-3: a thematic break before a heading, and at end of file
// ---------------------------------------------------------------------------

for (const rule of RULES) {
  test(`a ${rule} followed by a ## heading ends the case; neither the rule nor the heading is in its steps (the dogfood shape)`, async () => {
    const text = `${kase('T-1', ['  1. a', '  2. b'])}\n${rule}\n\n## Phase 2 — Next group\n\n${kase('T-2', ['  1. c'])}`;
    const r = await parseWith(text);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.json.cases.length, 2);
    assert.equal(r.json.cases[0].manual_steps_verbatim, '  1. a\n  2. b');
    assert.equal(r.json.cases[1].manual_steps_verbatim, '  1. c');
  });

  test(`a ${rule} at the end of the file ends the case and is not part of its steps`, async () => {
    const text = `${kase('T-1', ['  1. a', '  2. b'])}\n${rule}\n`;
    const r = await parseWith(text);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.json.cases[0].manual_steps_verbatim, '  1. a\n  2. b');
  });

  test(`a ${rule} followed by blank lines and then a heading still ends the case`, async () => {
    const text = `${kase('T-1', ['  1. a'])}\n${rule}\n\n\n## Group\n`;
    const r = await parseWith(text);
    assert.equal(r.json.cases[0].manual_steps_verbatim, '  1. a');
  });
}

test('mutation: a dashes-only terminator lets a *** or ___ before a heading leak into the steps (the per-rule terminator tests above are what catch it)', async () => {
  const anchor = String.raw`/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) && breakQualifies(i)`;
  const dashesOnly = String.raw`/^\s*-{3,}\s*$/.test(line) && breakQualifies(i)`;
  const mutatedScript = mutatedCopy(anchor, dashesOnly);
  for (const rule of ['***', '___']) {
    const text = `${kase('T-1', ['  1. a', '  2. b'])}\n${rule}\n\n## Phase 2 — Next group\n\n${kase('T-2', ['  1. c'])}`;
    const real = await parseWith(text);
    assert.equal(real.code, 0, real.stderr);
    assert.equal(real.json.cases[0].manual_steps_verbatim, '  1. a\n  2. b', `real script, ${rule}`);
    const mutated = await parseWith(text, mutatedScript);
    assert.equal(mutated.code, 0, mutated.stderr);
    assert.ok(
      mutated.json.cases[0].manual_steps_verbatim.split('\n').includes(rule),
      `mutated copy must carry ${rule} in the steps: ${JSON.stringify(mutated.json.cases[0].manual_steps_verbatim)}`,
    );
  }
  // sanity: the dashes-only copy still terminates on ---, so the mutation narrows only the other two variants
  const dashText = `${kase('T-1', ['  1. a', '  2. b'])}\n---\n\n## Phase 2 — Next group\n`;
  const dash = await parseWith(dashText, mutatedScript);
  assert.equal(dash.json.cases[0].manual_steps_verbatim, '  1. a\n  2. b');
});

// ---------------------------------------------------------------------------
// 4. Where the step list ends
// ---------------------------------------------------------------------------

test('the step list ends at a column-0 labeled bullet; an extra labeled bullet is neither in the steps nor a field', async () => {
  const text = kase('T-1', ['  1. a', '  2. b'], '- **Known gap in the existing checklist run:** read by code only.\n');
  const r = await parseWith(text);
  assert.equal(r.code, 0, r.stderr);
  const c = r.json.cases[0];
  assert.equal(c.manual_steps_verbatim, '  1. a\n  2. b');
  assert.doesNotMatch(JSON.stringify(c), /Known gap|read by code only/);
  assert.deepEqual(r.json.incomplete, []);
});

test('an extra labeled bullet before the step list does not leak its continuation into the previous field', async () => {
  const text = `### T-1 — Title\n\n- **Risk level:** High\n- **Extra thing:** x\n  continuation of extra\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** —\n- **Manual status:** \`pending\`\n- **Manual step-by-step:**\n  1. a\n`;
  const r = await parseWith(text);
  assert.equal(r.json.cases[0].risk, 'High');
  assert.doesNotMatch(JSON.stringify(r.json.cases[0]), /continuation of extra/);
});

test('an INDENTED labeled bullet inside a step stays in the steps and does not overwrite a field', async () => {
  const text = kase('T-1', ['  1. a', '  - **Note:** keep me', '  - **Coverage:** none', '  2. b']);
  const r = await parseWith(text);
  assert.equal(r.code, 0, r.stderr);
  const c = r.json.cases[0];
  assert.equal(c.manual_steps_verbatim, '  1. a\n  - **Note:** keep me\n  - **Coverage:** none\n  2. b');
  assert.equal(c.coverage, 'manual');
});

// ---------------------------------------------------------------------------
// 5. AC-2: what is a case
// ---------------------------------------------------------------------------

test('a ### block with no field is prose and is not counted; a ONE-field ### block is a case listed as incomplete with the missing labels', async () => {
  const text = [
    kase('T-1', ['  1. a']),
    '### Background notes',
    '',
    'Just narrative, no labeled bullets here.',
    '',
    '### T-9 — Lone field',
    '',
    '- **Coverage:** manual',
    '',
  ].join('\n');
  const r = await parseWith(text);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(
    r.json.cases.map((/** @type {any} */ c) => c.heading),
    ['T-1 — Title of T-1', 'T-9 — Lone field'],
  );
  assert.deepEqual(r.json.incomplete, [
    {
      index: 2,
      title: 'T-9 — Lone field',
      missing: ['Risk level', 'Required state', 'Automated test path', 'Manual status', 'Manual step-by-step'],
    },
  ]);
});

test('a prose section carrying two labeled bullets (Coverage, Risk) is counted as an incomplete case, never admitted as a complete one', async () => {
  const text = [
    kase('T-1', ['  1. a']),
    '### Scope notes',
    '',
    '- **Coverage:** most of the login flow',
    '- **Risk:** moderate',
    '',
  ].join('\n');
  const r = await parseWith(text);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.cases.length, 2);
  assert.deepEqual(r.json.incomplete, [
    { index: 2, title: 'Scope notes', missing: ['Required state', 'Automated test path', 'Manual status', 'Manual step-by-step'] },
  ]);
});

test('mutation: a minimum-fields threshold of 2 silently drops the one-field case (the one-field test above is what catches it)', async () => {
  const text = [kase('T-1', ['  1. a']), '### T-9 — Lone field', '', '- **Coverage:** manual', ''].join('\n');
  const real = await parseWith(text);
  assert.equal(real.json.cases.length, 2);
  const mutated = await parseWith(text, mutatedCopy('.filter((p) => p.fieldCount >= 1)', '.filter((p) => p.fieldCount >= 2)'));
  assert.equal(mutated.code, 0, mutated.stderr);
  assert.equal(mutated.json.cases.length, 1);
  assert.deepEqual(mutated.json.incomplete, []);
});

// ---------------------------------------------------------------------------
// 8. Aliases and bullet prefixes
// ---------------------------------------------------------------------------

test('Risk is read as Risk level, and the * and + bullet prefixes work as well as -', async () => {
  const text = [
    '### T-1 — Aliases',
    '',
    '* **Risk:** Critical',
    '+ **Required state:** none',
    '- **Coverage:** manual',
    '* **Automated test path:** —',
    '+ **Manual status:** `pending`',
    '- **Manual step-by-step:**',
    '  1. a',
    '',
  ].join('\n');
  const r = await parseWith(text);
  assert.equal(r.code, 0, r.stderr);
  const c = r.json.cases[0];
  assert.equal(c.risk, 'Critical');
  assert.equal(c.required_state, 'none');
  assert.equal(c.coverage, 'manual');
  assert.equal(c.manual_status, '`pending`');
  assert.equal(c.manual_steps_verbatim, '  1. a');
  assert.deepEqual(r.json.incomplete, []);
});

// ---------------------------------------------------------------------------
// 7. SUMMARY_TABLE_MISMATCH
// ---------------------------------------------------------------------------

const TABLE_HEAD = '| # | Case |\n|---|------|\n';

/** @param {string} heading @param {string[]} rows */
function withTable(heading, rows) {
  return [
    '# Report',
    '',
    heading,
    '',
    TABLE_HEAD + rows.map((id) => `| ${id} | something |`).join('\n'),
    '',
    '## Cases',
    '',
    kase('A-1', ['  1. a']),
    kase('A-2', ['  1. b']),
    kase('A-3', ['  1. c']),
  ].join('\n');
}

test('a case missing from the Summary table and a table row with no case produce SUMMARY_TABLE_MISMATCH with both id lists, and N is unchanged', async () => {
  const r = await parseWith(withTable('## Summary table', ['A-1', 'A-2', 'A-9']));
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.json.cases.length, 3);
  assert.equal(r.json.warnings.length, 1);
  assert.equal(r.json.warnings[0].code, 'SUMMARY_TABLE_MISMATCH');
  assert.deepEqual(r.json.warnings[0].missing_from_table, ['A-3']);
  assert.deepEqual(r.json.warnings[0].missing_from_cases, ['A-9']);
});

test('a Summary table that agrees with the cases produces no warning', async () => {
  const r = await parseWith(withTable('## Summary table', ['A-1', 'A-2', 'A-3']));
  assert.deepEqual(r.json.warnings, []);
  assert.equal(r.json.cases.length, 3);
});

test('without an exact ## Summary table heading no cross-check runs', async () => {
  for (const heading of ['## Summary overview', '### Summary table', '## Summary table of cases']) {
    const r = await parseWith(withTable(heading, ['A-1', 'A-9']));
    assert.equal(r.code, 0, `${heading}: ${r.stderr}`);
    assert.deepEqual(r.json.warnings, [], heading);
  }
});

// ---------------------------------------------------------------------------
// 6 + 7. Run mode
// ---------------------------------------------------------------------------

/**
 * @param {string} reportText
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, results: any }>}
 */
async function runMode(reportText) {
  const root = tmp();
  const runId = '20260101T101010101Z';
  const runDirRel = `PRPs/reports/feat/qa-run/${runId}`;
  mkdirSync(join(root, ...runDirRel.split('/'), 'evidence'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', 'feat', 'qa-report.md'), reportText);
  const r = await runScript(REAL_SCRIPT, ['run', '--root', root, '--feature', 'feat', '--run-dir', runDirRel]);
  /** @type {any} */ let results = null;
  try {
    results = JSON.parse(readFileSync(join(root, ...runDirRel.split('/'), 'results.json'), 'utf8'));
  } catch {
    // the assertion reading `results` reports stderr
  }
  return { ...r, results };
}

test('run mode: an incomplete case is blocked with CASE_INCOMPLETE naming the missing labels; entries still equal cases; outcomes stay in the closed vocabulary', async () => {
  const text = [kase('T-1', ['  1. a']), '### T-9 — Lone field', '', '- **Coverage:** manual', ''].join('\n');
  const r = await runMode(text);
  assert.ok(r.results, `results.json missing; exit ${r.code}; stderr: ${r.stderr}`);
  const parsed = await parseWith(text);
  assert.equal(r.results.cases.length, parsed.json.cases.length);
  assert.equal(r.results.cases.length, 2);
  for (const e of r.results.cases) assert.ok(CLOSED_OUTCOMES.includes(e.outcome), `outcome ${e.outcome} outside the closed vocabulary`);
  const lone = r.results.cases[1];
  assert.equal(lone.outcome, 'blocked');
  assert.equal(lone.reason_code, 'CASE_INCOMPLETE');
  for (const label of ['Risk level', 'Required state', 'Automated test path', 'Manual status', 'Manual step-by-step']) {
    assert.ok(lone.reason.includes(label), `reason must name ${label}: ${lone.reason}`);
  }
  assert.ok(!lone.reason.includes('Coverage'), 'reason must not name a label the case does carry');
  // the complete case is not mislabeled incomplete
  assert.notEqual(r.results.cases[0].reason_code, 'CASE_INCOMPLETE');
  assert.equal(r.results.cases[0].outcome, 'needs-human');
});

test('run mode: SUMMARY_TABLE_MISMATCH is in results.json warnings and on stdout, and N is unchanged', async () => {
  const r = await runMode(withTable('## Summary table', ['A-1', 'A-2', 'A-9']));
  assert.ok(r.results, `results.json missing; exit ${r.code}; stderr: ${r.stderr}`);
  assert.equal(r.results.cases.length, 3);
  assert.equal(r.results.warnings.length, 1);
  assert.equal(r.results.warnings[0].code, 'SUMMARY_TABLE_MISMATCH');
  assert.deepEqual(r.results.warnings[0].missing_from_table, ['A-3']);
  assert.deepEqual(r.results.warnings[0].missing_from_cases, ['A-9']);
  assert.match(r.stdout, /WARNING SUMMARY_TABLE_MISMATCH/);
});

test('run mode: a report with no Summary table mismatch has an empty warnings array', async () => {
  const r = await runMode(withTable('## Summary table', ['A-1', 'A-2', 'A-3']));
  assert.ok(r.results, `results.json missing; stderr: ${r.stderr}`);
  assert.deepEqual(r.results.warnings, []);
  assert.doesNotMatch(r.stdout, /SUMMARY_TABLE_MISMATCH/);
});
