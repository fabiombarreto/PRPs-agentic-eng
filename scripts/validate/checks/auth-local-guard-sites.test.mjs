// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md (local-only guard sites of the test-auth kit; 27th validate check)
/**
 * Unit tests for scripts/validate/checks/auth-local-guard-sites.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). The check is a
 * pure function over `{ files }`, so every test hands it a synthetic, hermetic
 * file map. The baseline map satisfies every site; each assertion class is then
 * pinned by mutating ONE thing in that passing baseline and asserting the exact
 * finding that fires. One test additionally runs the real-tree entry point so a
 * drift between the check and the shipped kit sources is caught here too.
 *
 * Assertion classes (verified against the module, not a summary):
 *   1. a site file that is null/absent                  -> "guard site file is missing"
 *   2. a required token missing from a site             -> "guard site lacks required token"
 *   3. a forbidden token present in a site              -> "guard site contains forbidden token"
 *        (retired `--local-host` in setup command + both agents;
 *         `local-hosts` / `login.config.json` in auth-kit.gitignore)
 *   4. template marker count != exactly once            -> "marker ... must appear exactly once"
 *   5. template markers out of order or absent          -> "must appear in that order"
 *   6. findings aggregate (no short-circuit), shape {message,file,line:1}
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkAuthLocalGuardSites, runAuthLocalGuardSitesCheck, GUARD_SITES } from './auth-local-guard-sites.mjs';

const GUARD = 'plugins/relay/scripts/auth-local-guard.mjs';
const TEMPLATE = 'plugins/relay/resources/auth-login.template.mjs';
const SETUP = 'plugins/relay/commands/relay-auth-setup.md';
const SCRIPTS = 'plugins/relay/commands/relay-auth-scripts.md';
const WRITER = 'plugins/relay/agents/auth-model-writer.md';
const REVIEWER = 'plugins/relay/agents/auth-model-reviewer.md';
const IGNORE = 'plugins/relay/resources/auth-kit.gitignore';

// Lifecycle update (2026-10-02, EXISTING_TEST_UPDATED): manual-qa-runner-auth-kit
// Phase 4 appended the runner's two sites to GUARD_SITES; the baseline and
// ALL_SITES now cover them so every per-site class fires for them too.
const QA_RUN = 'plugins/relay/scripts/qa-run.mjs';
const QA_RUN_CMD = 'plugins/relay/commands/relay-qa-run.md';

const ALL_SITES = [GUARD, TEMPLATE, SETUP, SCRIPTS, WRITER, REVIEWER, IGNORE, QA_RUN, QA_RUN_CMD];

const TEMPLATE_BODY =
  "import './auth-local-guard.mjs';\nimport './auth-kit-secrecy.mjs';\n// FAILED_NON_LOCAL_TARGET\n" +
  '// GUARD-SITE\nguard();\n// SECRECY-SITE\nsecrecy();\n// WRITE-SITE\nwrite();\n';

/** Fresh passing baseline every call, so mutations never leak between tests. */
function baseline() {
  /** @type {Record<string, string | null>} */
  const files = {
    [GUARD]: 'new URL(x).hostname FAILED_NON_LOCAL_TARGET PRPs/auth/local-hosts.txt userinfo',
    [TEMPLATE]: TEMPLATE_BODY,
    [SETUP]: 'run auth-local-guard.mjs; on failure FAILED_NON_LOCAL_TARGET',
    [SCRIPTS]: 'run auth-local-guard.mjs; on failure FAILED_NON_LOCAL_TARGET',
    [WRITER]: 'writer prose',
    [REVIEWER]: 'reviewer prose',
    [IGNORE]: 'PRPs/auth/*.json\n',
    [QA_RUN]: "import('./auth-local-guard.mjs'); // GUARD-SITE\ncheckTarget(url); FAILED_NON_LOCAL_TARGET\n",
    [QA_RUN_CMD]: 'run qa-run.mjs, which uses auth-local-guard.mjs; on failure FAILED_NON_LOCAL_TARGET',
  };
  return files;
}

/** @param {string} file @param {string} message */
const finding = (file, message) => ({ message, file, line: 1 });

test('baseline: a file map satisfying every site passes with zero findings and the stable check name', () => {
  const r = checkAuthLocalGuardSites({ files: baseline() });
  assert.equal(r.name, 'auth-local-guard-sites');
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings, []);
});

test('the check enumerates exactly the nine guard-site files (a later phase may append, never silently drop)', () => {
  assert.equal(GUARD_SITES.length, ALL_SITES.length, 'expected the enumerated sites to equal the nine this test baselines');
  const listed = GUARD_SITES.map((s) => s.file);
  for (const f of ALL_SITES) assert.ok(listed.includes(f), `expected ${f} to be an enumerated guard site`);
  assert.equal(listed.length, new Set(listed).size, 'expected no duplicate site entries');
});

for (const file of ALL_SITES) {
  test(`mutation: a null entry for ${file} fires "guard site file is missing" (and only that finding)`, () => {
    const files = baseline();
    files[file] = null;
    const r = checkAuthLocalGuardSites({ files });
    assert.equal(r.ok, false);
    assert.deepEqual(r.findings, [finding(file, `guard site file is missing: ${file}`)]);
  });

  test(`mutation: an absent key for ${file} is treated the same as null`, () => {
    const files = baseline();
    delete files[file];
    const r = checkAuthLocalGuardSites({ files });
    assert.equal(r.ok, false);
    assert.deepEqual(r.findings, [finding(file, `guard site file is missing: ${file}`)]);
  });
}

test('an empty-string site file is present, not missing (null/undefined is the only missing signal)', () => {
  const files = baseline();
  files[WRITER] = '';
  const r = checkAuthLocalGuardSites({ files });
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings, []);
});

/** @type {Array<[string, string[]]>} */
const REQUIRED_NON_MARKER = [
  [GUARD, ['new URL(', 'hostname', 'FAILED_NON_LOCAL_TARGET', 'PRPs/auth/local-hosts.txt', 'userinfo']],
  [TEMPLATE, ['auth-local-guard.mjs', 'auth-kit-secrecy.mjs', 'FAILED_NON_LOCAL_TARGET']],
  [SETUP, ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET']],
  [SCRIPTS, ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET']],
  [QA_RUN, ['auth-local-guard.mjs', 'checkTarget', 'FAILED_NON_LOCAL_TARGET', '// GUARD-SITE']],
  [QA_RUN_CMD, ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET']],
];

for (const [file, tokens] of REQUIRED_NON_MARKER) {
  for (const token of tokens) {
    test(`mutation: dropping required token \`${token}\` from ${file} fires exactly one "lacks required token" finding`, () => {
      const files = baseline();
      const before = /** @type {string} */ (files[file]);
      assert.ok(before.includes(token), 'precondition: baseline carries the token');
      files[file] = before.split(token).join('REDACTED');
      const r = checkAuthLocalGuardSites({ files });
      assert.equal(r.ok, false);
      assert.deepEqual(r.findings, [finding(file, `guard site lacks required token \`${token}\``)]);
    });
  }
}

for (const file of [SETUP, WRITER, REVIEWER, QA_RUN, QA_RUN_CMD]) {
  test(`mutation: the retired \`--local-host\` flag reappearing in ${file} fires "contains forbidden token"`, () => {
    const files = baseline();
    files[file] += '\nPass --local-host example.test to allow a host.\n';
    const r = checkAuthLocalGuardSites({ files });
    assert.equal(r.ok, false);
    assert.deepEqual(r.findings, [finding(file, 'guard site contains forbidden token `--local-host`')]);
  });
}

for (const token of ['local-hosts', 'login.config.json']) {
  test(`mutation: listing \`${token}\` in auth-kit.gitignore fires "contains forbidden token" (tracked files must never be ignored)`, () => {
    const files = baseline();
    files[IGNORE] += `${token}\n`;
    const r = checkAuthLocalGuardSites({ files });
    assert.equal(r.ok, false);
    assert.deepEqual(r.findings, [finding(IGNORE, `guard site contains forbidden token \`${token}\``)]);
  });
}

test('mutation: a duplicated // GUARD-SITE marker fires only the exactly-once finding (order is still fine)', () => {
  const files = baseline();
  files[TEMPLATE] += '// GUARD-SITE\n';
  const r = checkAuthLocalGuardSites({ files });
  assert.deepEqual(r.findings, [finding(TEMPLATE, 'marker `// GUARD-SITE` must appear exactly once')]);
});

test('mutation: a duplicated // SECRECY-SITE marker fires only the exactly-once finding', () => {
  const files = baseline();
  files[TEMPLATE] += '// SECRECY-SITE\n';
  const r = checkAuthLocalGuardSites({ files });
  assert.deepEqual(r.findings, [finding(TEMPLATE, 'marker `// SECRECY-SITE` must appear exactly once')]);
});

test('mutation: a duplicated // WRITE-SITE marker fires only the exactly-once finding', () => {
  const files = baseline();
  files[TEMPLATE] += '// WRITE-SITE\n';
  const r = checkAuthLocalGuardSites({ files });
  assert.deepEqual(r.findings, [finding(TEMPLATE, 'marker `// WRITE-SITE` must appear exactly once')]);
});

for (const marker of ['// GUARD-SITE', '// SECRECY-SITE', '// WRITE-SITE']) {
  test(`mutation: removing the ${marker} marker fires required-token, exactly-once and order findings together`, () => {
    const files = baseline();
    files[TEMPLATE] = /** @type {string} */ (files[TEMPLATE]).replace(`${marker}\n`, '');
    const r = checkAuthLocalGuardSites({ files });
    assert.deepEqual(r.findings, [
      finding(TEMPLATE, `guard site lacks required token \`${marker}\``),
      finding(TEMPLATE, `marker \`${marker}\` must appear exactly once`),
      finding(TEMPLATE, 'the guard, secrecy and write markers must appear in that order'),
    ]);
  });
}

test('mutation: the secrecy marker placed before the guard marker fires only the order finding', () => {
  const files = baseline();
  files[TEMPLATE] = TEMPLATE_BODY.replace(
    '// GUARD-SITE\nguard();\n// SECRECY-SITE\nsecrecy();\n',
    '// SECRECY-SITE\nsecrecy();\n// GUARD-SITE\nguard();\n'
  );
  assert.notEqual(files[TEMPLATE], TEMPLATE_BODY, 'precondition: the swap actually changed the template');
  const r = checkAuthLocalGuardSites({ files });
  assert.deepEqual(r.findings, [finding(TEMPLATE, 'the guard, secrecy and write markers must appear in that order')]);
});

test('mutation: the write marker placed before the secrecy marker fires only the order finding', () => {
  const files = baseline();
  files[TEMPLATE] = TEMPLATE_BODY.replace(
    '// SECRECY-SITE\nsecrecy();\n// WRITE-SITE\nwrite();\n',
    '// WRITE-SITE\nwrite();\n// SECRECY-SITE\nsecrecy();\n'
  );
  assert.notEqual(files[TEMPLATE], TEMPLATE_BODY, 'precondition: the swap actually changed the template');
  const r = checkAuthLocalGuardSites({ files });
  assert.deepEqual(r.findings, [finding(TEMPLATE, 'the guard, secrecy and write markers must appear in that order')]);
});

test('marker rules apply to the login template only: the same duplicated marker in a command file is not flagged', () => {
  const files = baseline();
  files[SETUP] += '\n// GUARD-SITE\n// GUARD-SITE\n';
  const r = checkAuthLocalGuardSites({ files });
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings, []);
});

test('findings aggregate across sites with no short-circuit, each carrying its own file and line 1', () => {
  const files = baseline();
  files[GUARD] = /** @type {string} */ (files[GUARD]).split('userinfo').join('REDACTED');
  files[WRITER] += ' --local-host';
  files[IGNORE] += 'login.config.json\n';
  files[REVIEWER] = null;
  const r = checkAuthLocalGuardSites({ files });
  assert.equal(r.ok, false);
  assert.deepEqual(r.findings, [
    finding(GUARD, 'guard site lacks required token `userinfo`'),
    finding(WRITER, 'guard site contains forbidden token `--local-host`'),
    finding(REVIEWER, `guard site file is missing: ${REVIEWER}`),
    finding(IGNORE, 'guard site contains forbidden token `login.config.json`'),
  ]);
});

test('real tree: the shipped kit sources satisfy every guard-site rule via the file-reading entry point', () => {
  const r = runAuthLocalGuardSitesCheck();
  assert.equal(r.name, 'auth-local-guard-sites');
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
});
