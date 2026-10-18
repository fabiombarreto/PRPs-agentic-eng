// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-3 Low-entropy values are not secrets (a harmless session value stays readable, a long high-entropy value is still masked, the token artifact, the declared session cookie and the api_origins cookie are redacted regardless of length or entropy, a part of the target origin is never registered)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-4 IndexedDB keys follow the same floor as values (the short key `token` is not registered, a 40-character random key and a 40-character random value are)
/**
 * Phase 3 (redaction precision and run-evidence privacy), registration half, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-3-redaction-precision-and-run-evidence-privacy.plan.md
 *
 * Layers, all against the REAL runner (never edited):
 *   1. The pure registration policy: shannonEntropy, isRegistrableSessionValue, declaredCookieNamesOf and
 *      splitSessionValues. The numeric floor is a judgment the plan recalibrates after the dogfood, so it is
 *      asserted by relationship (the recorded non-secrets are refused, long random strings are accepted, each
 *      gate is decisive at its own boundary, boundaries derived from the exported constants), never by value.
 *   2. The effect on the redaction table: harmless prose is untouched, a random value is masked.
 *   3. The real runner as an ASYNC child process (a synchronous spawn would block this process's event loop
 *      while it must answer the runner's requests) against a loopback server, with no browser: a saved session
 *      with harmless cookies, a random cookie, a JWT, a declared short cookie, an api_origins cookie, a token
 *      artifact and IndexedDB records. A copy of the runner whose floor is lowered to the old behavior is the
 *      control that proves the end-to-end assertions can fail.
 *
 * Git is never invoked directly here; the child gets a hermetic git environment all the same (no host
 * configuration, no fsmonitor daemon, no discovery above the fixture's parent) in case the temp directory
 * sits inside a work tree.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, copyFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import {
  shannonEntropy,
  isRegistrableSessionValue,
  declaredCookieNamesOf,
  splitSessionValues,
  buildRedactionTable,
  addSecretValues,
  redactText,
  SESSION_VALUE_MIN_LENGTH,
  SESSION_VALUE_MIN_ENTROPY,
} from '../../../plugins/relay/scripts/qa-run.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const REAL_SOURCE = readFileSync(REAL_RUNNER, 'utf8').replace(/\r\n/g, '\n');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261010T101010101Z`;
const SLOW = { timeout: 170000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qafloor-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** An environment under which git reads no host configuration, no global ignore file and never climbs above the fixtures. */
const GIT_ENV = (() => {
  const globalConfig = join(SANDBOX, 'empty.gitconfig');
  const xdg = join(SANDBOX, 'xdg');
  mkdirSync(xdg, { recursive: true });
  writeFileSync(globalConfig, '');
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.fsmonitor',
    GIT_CONFIG_VALUE_0: 'false',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_NOSYSTEM: '1',
    XDG_CONFIG_HOME: xdg,
    GIT_CEILING_DIRECTORIES: realpathSync(tmpdir()),
  };
})();

// The runner registers the value of every environment variable whose NAME looks secret (Layer 1 and Layer 2),
// so the child gets an environment without them: a host variable can never mask text of this fixture.
const SECRET_NAME = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|SIGNING|AUTH)/i;
const EXACT_NAMES = ['DATABASE_URL', 'DB_URL', 'REDIS_URL', 'MONGODB_URI', 'KAFKA_BROKERS', 'AMQP_URL', 'GOOGLE_APPLICATION_CREDENTIALS'];
const CLEAN_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !SECRET_NAME.test(name) && !EXACT_NAMES.includes(name.toUpperCase())),
);

// ---------------------------------------------------------------------------
// Deterministic stand-ins for random secrets (Park-Miller: the products stay exact in a double)
// ---------------------------------------------------------------------------

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
let seed = 20261010;
/** @param {number} n */
const rand = (n) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647;
    s += ALPHA[seed % ALPHA.length];
  }
  return s;
};
const JWT = `eyJ${rand(25)}.${rand(100)}.${rand(70)}`;
const KEY40 = rand(40);
const VAL40 = rand(40);
const IDB_KEY = rand(40);
const CONF30 = rand(30);
const NESTED40 = rand(40);

const ORIGIN = 'http://localhost:3000';

/** @param {string[]} xs @returns {string[]} */
const sorted = (xs) => [...xs].sort();

// ---------------------------------------------------------------------------
// 1. The pure registration policy
// ---------------------------------------------------------------------------

test('AC-3 shannonEntropy is the bits per character of the character histogram: 0 for empty and constant text and for anything that is not a string', () => {
  for (const v of ['', 'z', 'aaaaaaaa']) assert.equal(shannonEntropy(v), 0, JSON.stringify(v));
  for (const v of [null, undefined, 5, {}, ['abcd'], true]) assert.equal(shannonEntropy(v), 0, String(v));
  const near = (/** @type {number} */ got, /** @type {number} */ want) => assert.ok(Math.abs(got - want) < 1e-9, `${got} is not ${want}`);
  near(shannonEntropy('ab'), 1);
  near(shannonEntropy('aabb'), 1);
  near(shannonEntropy('abcd'), 2);
  near(shannonEntropy('abcdefgh'), 3);
  near(shannonEntropy('aaab'), 0.8112781244591328);
});

test('AC-3 the six recorded non-secrets and the other short literals are never registrable, whatever the origin texts', () => {
  for (const v of ['localhost', 'MIDDLE', 'false', '0', '5', '10', 'true', 'null', 'undefined', '1234567']) {
    assert.equal(isRegistrableSessionValue(v), false, v);
    assert.equal(isRegistrableSessionValue(v, []), false, v);
    assert.equal(isRegistrableSessionValue(v, [ORIGIN, 'localhost', '127.0.0.1']), false, v);
  }
});

test('AC-3 a long high-entropy value is registrable (a 200-character JWT, 40- and 30-character random strings) and a long low-variety one is not', () => {
  assert.equal(JWT.length, 200, 'the JWT stand-in must be the 200 characters of the PRD example');
  for (const v of [JWT, KEY40, VAL40, IDB_KEY, CONF30, NESTED40]) assert.equal(isRegistrableSessionValue(v), true, `a ${v.length}-character random value was refused`);
  for (const v of ['0'.repeat(40), '1760000000000', 'aaaaaaaaaaaa', 'abababababab']) {
    assert.equal(isRegistrableSessionValue(v), false, `a ${v.length}-character low-variety value was registrable: ${v}`);
  }
  for (const v of [null, undefined, 5, true, {}, [KEY40]]) assert.equal(isRegistrableSessionValue(v), false, String(v));
});

test('AC-3 the floor is a conjunction: each gate decides on its own at its boundary (boundaries derived from the exported constants)', () => {
  assert.ok(Number.isInteger(SESSION_VALUE_MIN_LENGTH) && SESSION_VALUE_MIN_LENGTH > 1 && SESSION_VALUE_MIN_LENGTH < ALPHA.length);
  assert.ok(typeof SESSION_VALUE_MIN_ENTROPY === 'number' && SESSION_VALUE_MIN_ENTROPY > 0);
  assert.ok(2 ** SESSION_VALUE_MIN_ENTROPY < ALPHA.length - 2, 'the derived alphabets below need a floor under log2 of the alphabet size');
  const symbols = (/** @type {number} */ n) => ALPHA.slice(0, n);
  // Length: exactly the floor's length in distinct characters registers; one fewer does not, although it clears the entropy gate.
  const atLength = symbols(SESSION_VALUE_MIN_LENGTH);
  const oneShort = symbols(SESSION_VALUE_MIN_LENGTH - 1);
  assert.ok(shannonEntropy(oneShort) >= SESSION_VALUE_MIN_ENTROPY, 'precondition: the shorter value clears the entropy gate, so only the length gate can refuse it');
  assert.equal(isRegistrableSessionValue(atLength), true, 'a value of exactly the floor length and high variety was refused');
  assert.equal(isRegistrableSessionValue(oneShort), false, 'a value one character under the floor length was registrable');
  // Entropy: a value long enough for the length gate, at a variety just above and just below the floor.
  const uniform = (/** @type {number} */ k) => symbols(k).repeat(Math.ceil(SESSION_VALUE_MIN_LENGTH / k));
  const above = uniform(Math.ceil(2 ** SESSION_VALUE_MIN_ENTROPY) + 1);
  const below = uniform(Math.floor(2 ** SESSION_VALUE_MIN_ENTROPY) - 1);
  assert.ok(above.length >= SESSION_VALUE_MIN_LENGTH && below.length >= SESSION_VALUE_MIN_LENGTH, 'precondition: both values clear the length gate');
  assert.ok(shannonEntropy(above) >= SESSION_VALUE_MIN_ENTROPY && shannonEntropy(below) < SESSION_VALUE_MIN_ENTROPY, 'precondition: the two values straddle the entropy floor');
  assert.equal(isRegistrableSessionValue(above), true, 'a long value just above the entropy floor was refused');
  assert.equal(isRegistrableSessionValue(below), false, 'a long value just below the entropy floor was registrable');
});

test('AC-3 a part of the target origin is never registrable: the origin, host and port, a URL on it; a secret that merely begins with the host name still is', () => {
  const origins = [ORIGIN, 'localhost', '127.0.0.1'];
  assert.equal(isRegistrableSessionValue(ORIGIN), true, 'precondition: the origin alone clears the floor, so only the origin rule can refuse it');
  assert.equal(isRegistrableSessionValue('localhost:3000'), true, 'precondition: host and port alone clear the floor');
  assert.equal(isRegistrableSessionValue(ORIGIN, origins), false, 'the origin itself was registrable');
  assert.equal(isRegistrableSessionValue('localhost:3000', origins), false, 'host and port were registrable');
  assert.equal(isRegistrableSessionValue(`${ORIGIN}/perfil/aluno`, origins), false, 'a URL on the target origin was registrable');
  assert.equal(isRegistrableSessionValue(`localhost-session-${KEY40.slice(0, 8)}`, origins), true, 'a secret that begins with the host name was refused');
  assert.equal(isRegistrableSessionValue(KEY40, /** @type {any} */ (['', null, 5, undefined, ...origins])), true, 'a junk origin text refused an unrelated value');
});

// ---------------------------------------------------------------------------
// declaredCookieNamesOf and splitSessionValues
// ---------------------------------------------------------------------------

const CFG = {
  baseUrl: ORIGIN,
  roles: { student: { sessionCookie: 'sessionid' }, teacher: { sessionCookie: null } },
  api_origins: {
    api: { url: 'http://localhost:4000', header: 'X-Auth', cookie: 'access-token' },
    files: { url: 'http://localhost:4100' },
  },
};

test('AC-3 declaredCookieNamesOf names the role sessionCookie and the cookie of every api_origins entry, and nothing for a malformed configuration', () => {
  assert.deepEqual(sorted(declaredCookieNamesOf(CFG, 'student')), ['access-token', 'sessionid']);
  assert.deepEqual(declaredCookieNamesOf(CFG, 'teacher'), ['access-token'], 'a role without a session cookie still carries the api_origins cookies');
  assert.deepEqual(declaredCookieNamesOf(CFG, 'nobody'), ['access-token']);
  for (const bad of [null, undefined, 'x', 5, [], {}, { roles: 'x', api_origins: [] }, { roles: [], api_origins: 'x' }, { roles: { student: 'x' }, api_origins: { api: null } }]) {
    assert.deepEqual(declaredCookieNamesOf(bad, 'student'), [], JSON.stringify(bad));
  }
});

/** The saved session of the AC-3 and AC-4 examples. */
const STATE = {
  cookies: [
    { name: 'sid', value: KEY40 },
    { name: 'tenant', value: 'localhost' },
    { name: 'level', value: 'MIDDLE' },
    { name: 'has_term_accepted', value: 'false' },
    { name: 'sessionid', value: 'abcd' },
    { name: 'access-token', value: JWT },
  ],
  origins: [
    {
      origin: ORIGIN,
      localStorage: [
        { name: 'grade', value: '10' },
        { name: 'cfg', value: CONF30 },
      ],
      indexedDB: [{ name: 'app', stores: [{ name: 'kv', records: [{ key: 'token', value: VAL40 }, { key: IDB_KEY, value: 'x' }] }] }],
    },
  ],
};

test('AC-3 splitSessionValues registers a declared source always and every other value only through the floor, keys and values alike', () => {
  const split = splitSessionValues(STATE, 'tok1', declaredCookieNamesOf(CFG, 'student'), [ORIGIN]);
  assert.deepEqual(sorted(split.declared), sorted(['abcd', JWT, 'tok1']), 'the 4-character token, the 4-character declared cookie and the api_origins cookie are always registered');
  assert.deepEqual(
    sorted(split.undeclared),
    sorted([KEY40, CONF30, VAL40, IDB_KEY]),
    `the undeclared values that clear the floor: ${JSON.stringify(split.undeclared.map((v) => v.length))}`,
  );
  for (const harmless of ['localhost', 'MIDDLE', 'false', '10', 'token', 'x']) {
    assert.equal(split.declared.includes(harmless) || split.undeclared.includes(harmless), false, `${harmless} was registered`);
  }
});

test('AC-3 a cookie is registered because a declaration names it, not because of its value: the same state for a role without that declaration drops it', () => {
  const teacher = splitSessionValues(STATE, null, declaredCookieNamesOf(CFG, 'teacher'), [ORIGIN]);
  assert.equal(teacher.declared.includes('abcd'), false, 'the student session cookie was declared for a teacher');
  assert.equal(teacher.undeclared.includes('abcd'), false, 'a 4-character undeclared cookie cleared the floor');
  assert.deepEqual(teacher.declared, [JWT], 'the api_origins cookie applies to every role; there is no token');
});

test('AC-3 a token that is empty or absent registers nothing, and a part of the origin among the stored values is never registered', () => {
  for (const token of [null, '', undefined]) {
    assert.deepEqual(splitSessionValues({ cookies: [], origins: [] }, /** @type {any} */ (token), [], []).declared, [], String(token));
  }
  const state = { cookies: [{ name: 'return_to', value: `${ORIGIN}/perfil/aluno` }], origins: [{ origin: ORIGIN, localStorage: [{ name: 'home', value: ORIGIN }] }] };
  assert.equal(isRegistrableSessionValue(`${ORIGIN}/perfil/aluno`), true, 'precondition: only the origin rule can refuse it');
  assert.deepEqual(splitSessionValues(state, null, [], [ORIGIN]).undeclared, [], 'a URL on the target origin or the origin itself was registered');
  assert.deepEqual(sorted(splitSessionValues(state, null, [], []).undeclared), sorted([`${ORIGIN}/perfil/aluno`, ORIGIN]), 'without an origin text both clear the floor');
});

test('AC-4 IndexedDB: a long random record value and a long random record key are registered, the short key `token` is not, and values follow the same floor', () => {
  const state = {
    cookies: [],
    origins: [
      {
        origin: ORIGIN,
        indexedDB: [
          {
            name: 'appdb',
            version: 1,
            stores: [
              {
                name: 'kv',
                records: [
                  { key: 'token', value: VAL40 },
                  { key: IDB_KEY, value: 'x' },
                  { key: 'short', value: 'abc' },
                  { key: '0'.repeat(30), value: '1'.repeat(30) },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const { declared, undeclared } = splitSessionValues(state, null, [], [ORIGIN]);
  assert.deepEqual(declared, []);
  assert.deepEqual(sorted(undeclared), sorted([VAL40, IDB_KEY]), 'exactly the two random strings are registered');
  for (const v of ['token', 'x', 'short', 'abc', '0'.repeat(30), '1'.repeat(30)]) assert.equal(undeclared.includes(v), false, `a short or low-variety key or value was registered: ${v}`);
});

test('AC-4 IndexedDB: a random string nested inside an object record value is registered too, under the objectStores alias as well', () => {
  const records = [{ key: 3, value: { profile: { tok: NESTED40 } } }];
  for (const storesKey of ['stores', 'objectStores']) {
    const state = { cookies: [], origins: [{ origin: ORIGIN, indexedDB: [{ name: 'appdb', version: 1, [storesKey]: [{ name: 'kv', records }] }] }] };
    const { undeclared } = splitSessionValues(state, null, [], [ORIGIN]);
    assert.ok(undeclared.includes(NESTED40), `the nested value was not registered under ${storesKey}`);
    assert.equal(undeclared.includes('tok'), false);
  }
});

test('AC-3 splitSessionValues never throws on a malformed saved session and registers nothing from it', () => {
  const odd = [
    undefined,
    null,
    'x',
    5,
    [],
    {},
    { cookies: 'x', origins: 5 },
    { cookies: [null, 5, { name: 'a', value: 7 }], origins: [null, { localStorage: 'x' }, { localStorage: [null, { value: 3 }] }, { indexedDB: 'x' }] },
  ];
  for (const state of odd) {
    /** @type {any} */ let split;
    assert.doesNotThrow(() => {
      split = splitSessionValues(state, /** @type {any} */ (7), [], []);
    }, JSON.stringify(state));
    assert.deepEqual(split, { declared: [], undeclared: [] }, JSON.stringify(state));
  }
  const nameless = splitSessionValues({ cookies: [{ name: 5, value: KEY40 }] }, null, ['sid'], []);
  assert.deepEqual(nameless.declared, []);
  assert.deepEqual(nameless.undeclared, [KEY40], 'a cookie with no usable name is an undeclared value and goes through the floor');
});

// ---------------------------------------------------------------------------
// 2. The effect on the redaction table
// ---------------------------------------------------------------------------

test('AC-3 AC-4 the table built from the split leaves harmless prose and URLs byte-intact and masks every registered value', () => {
  const root = mkdtempSync(join(SANDBOX, 'table-'));
  const split = splitSessionValues(STATE, 'tok1', declaredCookieNamesOf(CFG, 'student'), [ORIGIN]);
  const table = buildRedactionTable({ root, env: {}, secretValues: [] });
  addSecretValues(table, [...split.declared, ...split.undeclared]);
  const prose = `Open ${ORIGIN}/perfil as level MIDDLE where has_term_accepted=false and tenant=localhost, grade 10, a token record.`;
  assert.equal(redactText(prose, table), prose, 'a harmless session value corrupted the text the operator reads');
  assert.equal(redactText(`k=${KEY40};`, table), 'k=[REDACTED];', 'an undeclared high-entropy cookie was not redacted');
  assert.equal(redactText(`v=${VAL40};`, table), 'v=[REDACTED];', 'a high-entropy IndexedDB value was not redacted');
  assert.equal(redactText(`i=${IDB_KEY};`, table), 'i=[REDACTED];', 'a high-entropy IndexedDB key was not redacted');
  assert.equal(redactText(`c=${CONF30};`, table), 'c=[REDACTED];', 'a high-entropy localStorage value was not redacted');
  assert.equal(redactText('x abcd y tok1', table), 'x [REDACTED] y [REDACTED]', 'a declared value must be redacted regardless of the floor');
});

test('AC-3 the table keeps its own 4-character minimum for a declared value: a 3-character declared cookie cannot be substring-redacted without corrupting every text', () => {
  const root = mkdtempSync(join(SANDBOX, 'table-min-'));
  const split = splitSessionValues({ cookies: [{ name: 'sessionid', value: 'ab1' }] }, null, ['sessionid'], []);
  assert.deepEqual(split.declared, ['ab1'], 'the split still names it as declared');
  const table = buildRedactionTable({ root, env: {}, secretValues: [] });
  addSecretValues(table, split.declared);
  assert.equal(redactText('the lab1 label', table), 'the lab1 label');
});

// ---------------------------------------------------------------------------
// 3. The real runner end to end (HTTP driver, no browser)
// ---------------------------------------------------------------------------

/** @type {import('node:http').Server} */
let server;
let origin = '';

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    res.writeHead(200, { 'content-type': 'application/json' });
    if (path === '/echo') {
      // The keys are deliberately not named `cookie` or `authorization`: redactJson masks any property of those names wholesale.
      res.end(JSON.stringify({ seen: String(req.headers.cookie ?? ''), bearer: String(req.headers.authorization ?? '') }));
    } else if (path === '/storage') {
      res.end(JSON.stringify({ note: `record ${VAL40} stored under ${IDB_KEY} beside the short key token and profile` }));
    } else {
      res.end('{}');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  origin = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

const TOKEN = 'qqqqqq';
const SESSION_CK = 'abcd1234';
const API_CK = 'aaaaabbbbbcc';
const TITLES = ['Echo the session cookies', 'Read the stored records', 'Check the profile level'];

/**
 * A project whose saved session holds three harmless cookies, a short non-secret, a URL on the target, a random
 * cookie, a JWT, a declared 8-character session cookie, a declared 12-character low-entropy api_origins cookie,
 * a token artifact and IndexedDB records.
 * @returns {{ root: string, runDirAbs: string, manual: string[] }}
 */
function buildProject() {
  const root = mkdtempSync(join(SANDBOX, 'project-'));
  const runDirAbs = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDirAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const manual = [
    `1. Open ${origin}/perfil/aluno and check the level MIDDLE.`,
    '2. Open http://localhost:3000/perfil as tenant localhost and confirm has_term_accepted=false.',
  ];
  const block = (/** @type {string} */ title, /** @type {string[]} */ steps, /** @type {number} */ i) =>
    [`### Case ${i + 1}`, `**Title:** ${title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...steps, ''].join('\n');
  const blocks = [
    block(TITLES[0], ['1. Request the echo endpoint.'], 0),
    block(TITLES[1], ['1. Request the stored records.'], 1),
    block(TITLES[2], manual, 2),
  ];
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(root, 'PRPs', 'auth', 'login.config.json'),
    JSON.stringify({
      baseUrl: origin,
      roles: { student: { mechanism: 'form', sessionCookie: 'sessionid' } },
      api_origins: { api: { url: origin, header: 'X-Api-Auth', cookie: 'api-ck' } },
    }),
  );
  const cookie = (/** @type {string} */ name, /** @type {string} */ value) => ({ name, value, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' });
  const state = {
    cookies: [
      cookie('sid', KEY40),
      cookie('access-token', JWT),
      cookie('sessionid', SESSION_CK),
      cookie('api-ck', API_CK),
      cookie('theme', 'dark-mode-9'),
      cookie('tenant', 'localhost'),
      cookie('level', 'MIDDLE'),
      cookie('has_term_accepted', 'false'),
      cookie('return_to', `${origin}/perfil/aluno`),
    ],
    origins: [
      {
        origin,
        localStorage: [
          { name: 'grade', value: '10' },
          { name: 'cfg', value: CONF30 },
        ],
        indexedDB: [{ name: 'appdb', version: 1, stores: [{ name: 'kv', autoIncrement: false, indexes: [], records: [{ key: 'token', value: VAL40 }, { key: IDB_KEY, value: 'x' }] }] }],
      },
    ],
  };
  const stub = [
    "import { mkdirSync, writeFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "const root = process.argv[process.argv.indexOf('--root') + 1];",
    "const dir = join(root, 'PRPs', 'auth', '.sessions');",
    'mkdirSync(dir, { recursive: true });',
    `writeFileSync(join(dir, 'student.json'), ${JSON.stringify(JSON.stringify(state))});`,
    `writeFileSync(join(dir, 'student.token.json'), ${JSON.stringify(JSON.stringify({ token: TOKEN }))});`,
    '',
  ].join('\n');
  writeFileSync(join(root, 'PRPs', 'auth', 'login-student.mjs'), stub);
  const http = (/** @type {number} */ index, /** @type {string} */ path) => ({
    index,
    title: TITLES[index - 1],
    class: 'automatable',
    driver: 'http',
    role: 'student',
    state: 'none',
    steps: [{ action: 'request', method: 'GET', path, expect_status: 200 }],
  });
  writeFileSync(
    join(runDirAbs, 'plan.json'),
    JSON.stringify({ schema_version: 1, cases: [http(1, '/echo'), http(2, '/storage'), { index: 3, title: TITLES[2], class: 'human-by-nature', reason_code: 'VISUAL_JUDGEMENT' }] }),
  );
  return { root, runDirAbs, manual };
}

/**
 * @param {string} script
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runNode(script, args, cwd) {
  return new Promise((resolveP, rejectP) => {
    const env = { ...CLEAN_ENV, ...GIT_ENV, NODE_PATH: NODE_MODULES };
    const child = spawn(NODE, [script, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 150000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ code, stdout, stderr });
    });
  });
}

/**
 * A temp plugin tree holding a copy of the runner (with the floor constants replaced) and the guard.
 * @param {{ length: number, entropy: number }} floor
 * @returns {string} the copied script path
 */
function runnerWithFloor(floor) {
  const dir = mkdtempSync(join(SANDBOX, 'plugin-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  let src = REAL_SOURCE;
  for (const [pattern, text] of /** @type {[RegExp, string][]} */ ([
    [/export const SESSION_VALUE_MIN_LENGTH = \d+;/g, `export const SESSION_VALUE_MIN_LENGTH = ${floor.length};`],
    [/export const SESSION_VALUE_MIN_ENTROPY = \d+(?:\.\d+)?;/g, `export const SESSION_VALUE_MIN_ENTROPY = ${floor.entropy};`],
  ])) {
    assert.equal((src.match(pattern) ?? []).length, 1, `the floor constant to mutate must occur exactly once: ${pattern}`);
    src = src.replace(pattern, () => text);
  }
  const script = join(dir, 'scripts', 'qa-run.mjs');
  writeFileSync(script, src);
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  return script;
}

/** @param {string} header @returns {Record<string, string>} */
function jarOf(header) {
  /** @type {Record<string, string>} */ const jar = {};
  for (const part of header.split('; ')) {
    const at = part.indexOf('=');
    if (at > 0) jar[part.slice(0, at)] = part.slice(at + 1);
  }
  return jar;
}

/** @param {string} dir @returns {string} the text of every runner-written file under dir (the test-authored plan.json excluded) */
function allText(dir) {
  let text = '';
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) text += allText(p);
    else if (e.name !== 'plan.json') text += `\n${readFileSync(p).toString('latin1')}`;
  }
  return text;
}

/**
 * @param {{ root: string, runDirAbs: string }} p
 * @param {any} results
 * @param {number} i zero-based case position
 * @returns {any}
 */
function evidenceJson(p, results, i) {
  return JSON.parse(readFileSync(join(p.root, ...results.cases[i].evidence[0].split('/')), 'utf8'));
}

test('AC-3 AC-4 end to end: harmless session values and every URL stay intact in evidence and results.json; random values, a JWT and the declared cookies and token are masked', SLOW, async () => {
  const p = buildProject();
  const r = await runNode(REAL_RUNNER, ['run', '--root', p.root, '--feature', FEATURE, '--run-dir', RUN_REL], p.root);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  const res = JSON.parse(readFileSync(join(p.runDirAbs, 'results.json'), 'utf8'));
  assert.equal(res.cases.length, 3);
  assert.equal(res.cases[0].outcome, 'pass', JSON.stringify(res.cases[0]));
  assert.equal(res.cases[1].outcome, 'pass', JSON.stringify(res.cases[1]));

  // The cookies the server received, as the evidence shows them.
  const seen = evidenceJson(p, res, 0).response.body;
  const jar = jarOf(seen.seen);
  for (const name of ['sid', 'access-token', 'sessionid', 'api-ck', 'theme', 'tenant', 'level', 'has_term_accepted', 'return_to']) {
    assert.ok(Object.hasOwn(jar, name), `the cookie ${name} never reached the server, so the fixture proves nothing about it: ${seen.seen}`);
  }
  assert.equal(jar.tenant, 'localhost');
  assert.equal(jar.level, 'MIDDLE');
  assert.equal(jar.has_term_accepted, 'false');
  assert.equal(jar.theme, 'dark-mode-9', 'a short non-secret cookie was masked');
  assert.equal(jar.return_to, `${origin}/perfil/aluno`, 'a URL on the target origin held by a cookie was masked');
  assert.equal(jar.sid, '[REDACTED]', 'an undeclared random cookie was not masked');
  assert.equal(jar['access-token'], '[REDACTED]', 'the JWT was not replaced by [REDACTED]');
  assert.equal(jar.sessionid, '[REDACTED]', 'the declared session cookie, 8 characters, was not masked regardless of the floor');
  assert.equal(jar['api-ck'], '[REDACTED]', 'the api_origins cookie, 12 characters of low entropy, was not masked regardless of the floor');
  assert.equal(seen.bearer, 'Bearer [REDACTED]', 'the 6-character token artifact was not masked regardless of the floor');

  // IndexedDB: the two random strings are masked, the short key and the word `profile` are not.
  assert.equal(
    evidenceJson(p, res, 1).response.body.note,
    'record [REDACTED] stored under [REDACTED] beside the short key token and profile',
  );

  // The verbatim manual steps of the declined case are byte-intact, the URLs included.
  assert.equal(res.cases[2].outcome, 'needs-human');
  assert.equal(res.cases[2].reason_code, 'VISUAL_JUDGEMENT');
  assert.equal(res.cases[2].manual_steps_verbatim, p.manual.join('\n'), 'the verbatim manual steps were altered by redaction');
  for (const kept of [`${origin}/perfil/aluno`, 'level MIDDLE', 'http://localhost:3000/perfil', 'tenant localhost', 'has_term_accepted=false']) {
    assert.ok(res.cases[2].manual_steps_verbatim.includes(kept), `the verbatim steps lost ${kept}`);
  }

  // No secret value is anywhere under the run directory or on the terminal.
  const everything = `${allText(p.runDirAbs)}\n${r.stdout}\n${r.stderr}`;
  for (const secret of [KEY40, JWT, SESSION_CK, API_CK, TOKEN, VAL40, IDB_KEY, CONF30]) {
    assert.equal(everything.includes(secret), false, `a ${secret.length}-character secret reached a run file or the terminal`);
  }
});

test('AC-3 control: the same session through a copy of the runner whose floor is lowered to the old behavior corrupts the harmless values (the assertions above can fail)', SLOW, async () => {
  const p = buildProject();
  const script = runnerWithFloor({ length: 4, entropy: 0 });
  const r = await runNode(script, ['run', '--root', p.root, '--feature', FEATURE, '--run-dir', RUN_REL], p.root);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  const res = JSON.parse(readFileSync(join(p.runDirAbs, 'results.json'), 'utf8'));
  assert.equal(res.cases[0].outcome, 'pass', JSON.stringify(res.cases[0]));
  const jar = jarOf(evidenceJson(p, res, 0).response.body.seen);
  assert.equal(jar.level, '[REDACTED]', 'with a 4-character floor MIDDLE must have been registered and masked');
  assert.equal(jar.has_term_accepted, '[REDACTED]', 'with a 4-character floor false must have been registered and masked');
  const verbatim = String(res.cases[2].manual_steps_verbatim);
  assert.equal(verbatim.includes('level MIDDLE'), false, 'the verbatim steps of the control must be corrupted');
  assert.equal(verbatim.includes('has_term_accepted=false'), false);
});
