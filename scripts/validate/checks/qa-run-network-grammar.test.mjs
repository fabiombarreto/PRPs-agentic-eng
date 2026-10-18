// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-12 A network-request assertion (the step is a closed flat shape of a method, a url_contains path and a count; it passes only when the page issued exactly that many matching requests during its window; every observed URL is guard-checked; the record keeps method, host and path without query strings)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-10 Absence and state assertions cannot pass vacuously (a count of 0 reuses the absence anchor: it needs an earlier positive step on the same route since the last goto, so it cannot pass on a page that never rendered)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (a classified request is local only when the guard's own host predicate approves its parsed host, and a matching request to any other host is never counted)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the step grammar and the pure helpers, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A1 the window decision, AC-A2 the closed flat shape and its two sequence rules, AC-A3 a matching
 *              non-local request is refused and never counted, AC-A4 a classified request carries no query string and
 *              no fragment)
 *
 * Layers, all against the REAL runner (a copy of it, with the real guard, in a temp plugin tree; never edited), with
 * no browser, no server and no child process:
 *   1. The closed shape of `expect_requests`: every accepted and refused row as a table (the method list, the path
 *      rules and their 200 character bound, the integer count and its bounds, the closed key set, the browser
 *      driver only), totality over hostile JSON, and reasons that carry fixed words and a step position, never the
 *      offending value.
 *   2. The two sequence rules of an entry: an earlier goto, click or fill in the same case, and for a count of 0 the
 *      positive step the absence step needs, on the same route since the last goto.
 *   3. classifyObservedRequest: method, host and the WHOLE path are kept, the query string and the fragment never
 *      reach the result, and the guard's own predicate decides `local` (failing closed).
 *   4. evaluateRequestWindow: the exact count, the method filter, the contains rule on the whole recorded path (a
 *      match that lies only in the tail of a long path counts), the encoded form of a character the URL parser
 *      encodes, and a matching non-local request that blocks instead of counting.
 *   5. settleRequestWindow: the wait precedes the slice, so a request that arrives during the wait is inside it.
 *
 * The real runner and a real Chromium are driven end to end in qa-run-network-count.test.mjs,
 * qa-run-network-guard.test.mjs and qa-run-network-evidence.test.mjs.
 *
 * QA_V2P6_RUNNER_SRC points the runner copy at another file (a mutation control); unset, the real runner is used.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const RUNNER_SRC = process.env.QA_V2P6_RUNNER_SRC ? resolve(process.env.QA_V2P6_RUNNER_SRC) : REAL_RUNNER;

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p6-grammar-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** The runner and the guard, and only those two files, in a temp plugin tree. */
const COPY = (() => {
  const dir = mkdtempSync(join(SANDBOX, 'plugin-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  copyFileSync(RUNNER_SRC, join(dir, 'scripts', 'qa-run.mjs'));
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  return join(dir, 'scripts', 'qa-run.mjs');
})();

/** The runner module and the guard module of the copy, loaded lazily once the sandbox exists. @type {any} */
let R;
/** @type {any} */
let G;
before(async () => {
  R = await import(pathToFileURL(COPY).href);
  G = await import(pathToFileURL(join(dirname(COPY), 'auth-local-guard.mjs')).href);
});

const STEP = { action: 'expect_requests', method: 'POST', url_contains: '/avatar', count: 1 };
/** @param {Record<string, any>} [over] */
const step = (over = {}) => ({ ...STEP, ...over });
const GOTO = { action: 'goto', path: '/p' };
const CLICK = { action: 'click', selector: '#save' };
const HEAD = { action: 'expect_visible', selector: 'h1' };
const ZERO = step({ count: 0 });
/** A value no reason may echo. */
const CANARY = 'CanaryQ4417';

/** @param {any} r @param {string} label */
function assertRefusal(r, label) {
  assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `${label}: ${JSON.stringify(r)}`);
  assert.equal(typeof r.reason, 'string', label);
  assert.notEqual(r.reason, '', label);
}

// ---------------------------------------------------------------------------
// 1. The closed shape
// ---------------------------------------------------------------------------

test('AC-12 the three numbers of the step are exported and pinned, so a change is a deliberate one: a 2 second settle window, a count cap of 100 and 50 listed requests', () => {
  assert.equal(R.EXPECT_REQUESTS_SETTLE_MS, 2000);
  assert.equal(R.EXPECT_REQUESTS_COUNT_MAX, 100);
  assert.equal(R.EXPECT_REQUESTS_EVIDENCE_MAX, 50);
});

test('AC-12 validateStep accepts the flat step with each HTTP method, a count from 0 to the cap and a url_contains of exactly 200 characters', () => {
  for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(R.validateStep('browser', step({ method })), null, method);
  }
  for (const count of [0, 1, 2, 57, R.EXPECT_REQUESTS_COUNT_MAX]) {
    assert.equal(R.validateStep('browser', step({ count })), null, `count ${count}`);
  }
  for (const url_contains of ['/avatar', '/api/v1/users/me/avatar', '/avat%C3%A1r', `/${'a'.repeat(199)}`]) {
    assert.equal(R.validateStep('browser', step({ url_contains })), null, url_contains);
  }
});

test('AC-12 validateStep refuses every shape outside the closed step as PLAN_ENTRY_INVALID with a reason, and no reason echoes the offending value', () => {
  /** @type {[string, string, any][]} label, driver, step */
  const refused = [
    ['a method outside the six', 'browser', step({ method: 'TRACE' })],
    ['a lowercase method', 'browser', step({ method: 'post' })],
    ['OPTIONS', 'browser', step({ method: 'OPTIONS' })],
    ['an empty method', 'browser', step({ method: '' })],
    ['a null method', 'browser', step({ method: null })],
    ['a numeric method', 'browser', step({ method: 7 })],
    ['an array method', 'browser', step({ method: ['POST'] })],
    ['a missing method', 'browser', { action: 'expect_requests', url_contains: '/a', count: 1 }],
    ['a method that is the canary', 'browser', step({ method: CANARY })],
    ['a query string in url_contains', 'browser', step({ url_contains: '/avatar?x=1' })],
    ['a query string that is the canary', 'browser', step({ url_contains: `/avatar?token=${CANARY}` })],
    ['a fragment in url_contains', 'browser', step({ url_contains: '/avatar#x' })],
    ['a url_contains with no leading slash', 'browser', step({ url_contains: 'avatar' })],
    ['a leading double slash that names a host', 'browser', step({ url_contains: `//${CANARY}.example/avatar` })],
    ['a host and port in url_contains', 'browser', step({ url_contains: 'localhost:3000/avatar' })],
    ['a space in url_contains', 'browser', step({ url_contains: '/ava tar' })],
    ['a tab in url_contains', 'browser', step({ url_contains: '/ava\ttar' })],
    ['a line break in url_contains', 'browser', step({ url_contains: '/ava\ntar' })],
    ['an empty url_contains', 'browser', step({ url_contains: '' })],
    ['a url_contains of 201 characters', 'browser', step({ url_contains: `/${'a'.repeat(200)}` })],
    ['a numeric url_contains', 'browser', step({ url_contains: 7 })],
    ['a null url_contains', 'browser', step({ url_contains: null })],
    ['an array url_contains', 'browser', step({ url_contains: ['/a'] })],
    ['a missing url_contains', 'browser', { action: 'expect_requests', method: 'POST', count: 1 }],
    ['a negative count', 'browser', step({ count: -1 })],
    ['a fractional count', 'browser', step({ count: 1.5 })],
    ['a string count', 'browser', step({ count: '1' })],
    ['a count that is the canary', 'browser', step({ count: CANARY })],
    ['a boolean count', 'browser', step({ count: true })],
    ['a null count', 'browser', step({ count: null })],
    ['a count over the cap', 'browser', step({ count: 101 })],
    ['a missing count', 'browser', { action: 'expect_requests', method: 'POST', url_contains: '/a' }],
    ['a selector key', 'browser', step({ selector: '#a' })],
    ['a role and name locator', 'browser', step({ role: 'button', name: 'Salvar' })],
    ['a text locator', 'browser', step({ text: 'Salvar' })],
    ['a session key', 'browser', step({ session: 'none' })],
    ['a key that belongs to another step', 'browser', step({ expect_status: 200 })],
    ['a key that is the canary', 'browser', step({ [CANARY]: true })],
    ['the http driver', 'http', STEP],
  ];
  for (const [label, driver, candidate] of refused) {
    /** @type {any} */ let r;
    assert.doesNotThrow(() => {
      r = R.validateStep(driver, candidate);
    }, `${label} threw`);
    assertRefusal(r, label);
    assert.ok(!r.reason.includes(CANARY), `${label}: the refusal echoes the offending value: ${r.reason}`);
    assert.ok(!r.reason.includes('example.com'), label);

    // Inside an entry the same refusal names the step position and still echoes nothing.
    const entry = driver === 'browser' ? [GOTO, HEAD, CLICK, candidate] : [candidate];
    const inEntry = R.validateSteps(driver, entry, []);
    assertRefusal(inEntry, `${label} as a sequence`);
    assert.match(inEntry.reason, new RegExp(`^step ${entry.length}:`), label);
    assert.ok(!inEntry.reason.includes(CANARY), `${label}: the refusal of the entry echoes the offending value: ${inEntry.reason}`);
  }
});

test('AC-12 the step is a flat shape: the nested form is refused with the flat-shape hint on the browser driver, and an own __proto__ key is a key the closed set refuses', () => {
  const nested = R.validateStep('browser', { expect_requests: { method: 'POST', url_contains: '/avatar', count: 1 } });
  assertRefusal(nested, 'the nested form');
  assert.match(nested.reason, /flat shape/);

  // A JSON document can carry an own `__proto__` key, which an object spread would turn into a prototype.
  const polluted = JSON.parse('{"action":"expect_requests","method":"POST","url_contains":"/avatar","count":1,"__proto__":{"count":0}}');
  assertRefusal(R.validateStep('browser', polluted), 'an own __proto__ key');
});

test('AC-12 the step validators are total: a hostile JSON value in any field is PLAN_ENTRY_INVALID, never a thrown error, alone and inside an entry at its own position', () => {
  const hostile = [JSON.parse('{"toString":1}'), JSON.parse('{"toString":null}'), JSON.parse('[{"toString":1}]'), JSON.parse('{"toString":{"toString":1}}'), JSON.parse('{"valueOf":1,"length":3}')];
  for (const field of ['method', 'url_contains', 'count']) {
    for (const value of hostile) {
      const candidate = step({ [field]: value });
      /** @type {any} */ let one;
      /** @type {any} */ let many;
      assert.doesNotThrow(() => {
        one = R.validateStep('browser', candidate);
        many = R.validateSteps('browser', [GOTO, HEAD, CLICK, candidate], []);
      }, `${field} ${JSON.stringify(value)} threw`);
      assertRefusal(one, `${field} ${JSON.stringify(value)}`);
      assertRefusal(many, `${field} ${JSON.stringify(value)} as a sequence`);
      assert.match(many.reason, /^step 4:/, `${field} ${JSON.stringify(value)}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 2. The two sequence rules
// ---------------------------------------------------------------------------

test('AC-12 an entry accepts the step after any interaction of its own case, in the legacy and in the locator form, and the step is an expectation by itself', () => {
  /** @type {[string, any[]][]} */
  const accepted = [
    ['after a goto', [GOTO, STEP]],
    ['after a click', [CLICK, STEP]],
    ['after a fill', [{ action: 'fill', selector: '#a', value: 'x' }, STEP]],
    ['after a locator click', [GOTO, { action: 'click', role: 'button', name: 'Salvar' }, STEP]],
    ['after a locator fill', [GOTO, { action: 'fill', role: 'textbox', name: 'Filtro', value: 'x' }, STEP]],
    ['after an assertion that follows the interaction', [GOTO, CLICK, HEAD, STEP]],
    ['two request counts of one action', [GOTO, CLICK, STEP, step({ method: 'GET', url_contains: '/other', count: 2 })]],
    ['the only expectation of the entry', [GOTO, CLICK, STEP]],
  ];
  for (const [label, steps] of accepted) {
    assert.equal(R.validateSteps('browser', steps, []), null, label);
  }
  // The rule that every entry needs an expectation is unchanged: an interaction alone is still not one.
  assert.equal(R.validateSteps('browser', [GOTO, CLICK], [])?.code, 'NO_EXPECTATION');
});

test('AC-12 an entry that counts requests with no earlier goto, click or fill in the case is PLAN_ENTRY_INVALID at the step, and an assertion or a path check is not an interaction', () => {
  /** @type {[string, any[], number][]} label, steps, the position the refusal names */
  const refused = [
    ['the step alone', [STEP], 1],
    ['after a positive assertion only', [HEAD, STEP], 2],
    ['after an expect_url only', [{ action: 'expect_url', path: '/p' }, STEP], 2],
    ['after an assertion that is a locator form', [{ action: 'expect_visible', role: 'heading', name: 'Painel' }, STEP], 2],
  ];
  for (const [label, steps, at] of refused) {
    const r = R.validateSteps('browser', steps, []);
    assertRefusal(r, label);
    assert.match(r.reason, new RegExp(`^step ${at}:`), label);
    assert.ok(r.reason.includes('expect_requests'), `${label}: the refusal does not name the step kind: ${r.reason}`);
    assert.ok(!r.reason.includes('/avatar'), `${label}: the refusal echoes the path: ${r.reason}`);
  }
});

test('AC-10 a count of 0 needs a positive step on the same route since the last goto, so it cannot pass on a page that never rendered; a count above 0 does not', () => {
  const OTHER = { action: 'goto', path: '/q' };
  /** @type {[string, any[], number][]} */
  const refused = [
    ['no positive step at all', [GOTO, CLICK, ZERO], 3],
    ['the positive step comes only after the count', [GOTO, CLICK, ZERO, HEAD], 3],
    ['the positive step belongs to a page the case left', [GOTO, HEAD, OTHER, CLICK, ZERO], 5],
    ['a goto of the same path reloads the page and drops the anchor', [GOTO, HEAD, GOTO, CLICK, ZERO], 5],
    ['an expect_url to another route leaves the anchor behind', [GOTO, HEAD, { action: 'expect_url', path: '/q' }, CLICK, ZERO], 5],
    ['a request count is not a positive assertion: it proves nothing rendered', [GOTO, CLICK, STEP, CLICK, ZERO], 5],
    ['a click is an action, not an assertion', [GOTO, CLICK, CLICK, ZERO], 4],
  ];
  for (const [label, steps, at] of refused) {
    const r = R.validateSteps('browser', steps, []);
    assertRefusal(r, label);
    assert.match(r.reason, new RegExp(`^step ${at}:`), label);
    assert.ok(r.reason.includes('count 0'), `${label}: the refusal does not name the rule: ${r.reason}`);
  }

  // Every positive assertion anchors it, and a click or a second count after the anchor keeps it.
  /** @type {[string, any][]} */
  const anchors = [
    ['expect_visible', HEAD],
    ['expect_text', { action: 'expect_text', selector: 'h1', contains: 'Painel' }],
    ['expect_value', { action: 'expect_value', role: 'textbox', name: 'Telefone', not_empty: true }],
    ['expect_state', { action: 'expect_state', role: 'button', name: 'Grupo', state: 'expanded', equals: false }],
  ];
  for (const [label, anchor] of anchors) {
    assert.equal(R.validateSteps('browser', [GOTO, anchor, CLICK, ZERO], []), null, `${label} anchors the count`);
  }
  assert.equal(R.validateSteps('browser', [GOTO, HEAD, { action: 'expect_url', path: '/p' }, CLICK, ZERO], []), null, 'an expect_url to the same route keeps the anchor');
  assert.equal(R.validateSteps('browser', [GOTO, HEAD, CLICK, STEP, CLICK, ZERO], []), null, 'a count above 0 between two interactions keeps the anchor');
  assert.equal(R.validateSteps('browser', [GOTO, CLICK, STEP], []), null, 'a count above 0 needs no anchor');
});

// ---------------------------------------------------------------------------
// 3. classifyObservedRequest
// ---------------------------------------------------------------------------

/** A target built from the REAL guard: its own built-in local hosts and its own host predicate. */
const target = () => ({ origin: 'http://127.0.0.1:3000', allowedHosts: new Set(G.BUILTIN_LOCAL_HOSTS), guard: G });

test('AC-12 a classified request keeps exactly its method, its host with the port and its path, and never the query string, the fragment or the original text', () => {
  const seen = R.classifyObservedRequest('http://127.0.0.1:3000/avatar?token=QryCanary-7731#FragCanary-7732', 'post', target());
  assert.deepEqual(seen, { method: 'POST', host: '127.0.0.1:3000', path: '/avatar', local: true });
  assert.equal(Object.keys(seen).join(','), 'method,host,path,local');
  assert.ok(!JSON.stringify(seen).includes('QryCanary') && !JSON.stringify(seen).includes('FragCanary'), JSON.stringify(seen));

  // A default port is not written, and the method is upper-cased whatever the case it arrives in.
  assert.deepEqual(R.classifyObservedRequest('http://localhost/a', 'get', target()), { method: 'GET', host: 'localhost', path: '/a', local: true });
  assert.deepEqual(R.classifyObservedRequest('https://localhost:3443/a', 'Patch', target()), { method: 'PATCH', host: 'localhost:3443', path: '/a', local: true });
  assert.deepEqual(R.classifyObservedRequest('http://[::1]:3000/a', 'GET', target()), { method: 'GET', host: '[::1]:3000', path: '/a', local: true });
});

test('AC-12 the whole path is kept, however long, and a character the URL parser encodes is kept in its encoded form', () => {
  const long = R.classifyObservedRequest(`http://127.0.0.1:3000/${'a'.repeat(299)}`, 'GET', target());
  assert.equal(long.path.length, 300, 'the classified path was cut');

  const tail = `/${'a'.repeat(292)}/avatar`;
  assert.equal(tail.length, 300);
  const tailed = R.classifyObservedRequest(`http://127.0.0.1:3000${tail}?q=1`, 'POST', target());
  assert.equal(tailed.path, tail, 'the tail of a long path must be recorded whole, with the query dropped');

  const accented = R.classifyObservedRequest(`http://127.0.0.1:3000/avat${String.fromCharCode(225)}r`, 'POST', target());
  assert.equal(accented.path, '/avat%C3%A1r');
});

test('AC-15 only the guard decides that a request is local: its parsed host, an http or https scheme, and a failing guard is never read as approval', () => {
  const local = (/** @type {string} */ url) => R.classifyObservedRequest(url, 'POST', target());
  // The approved hosts of this target.
  for (const url of ['http://127.0.0.1:3000/a', 'http://localhost:3000/a', 'https://localhost:3443/a', 'http://[::1]:3000/a']) {
    assert.equal(local(url).local, true, url);
  }
  // A loopback address the guard does not list, and the three ways a string match would be fooled.
  for (const url of ['http://127.0.0.2:3000/a', 'https://cdn.example.com/a', 'http://127.0.0.1.evil.example/a', 'http://127.0.0.1@evil.example/a', 'http://evil.example/127.0.0.1']) {
    const seen = local(url);
    assert.notEqual(seen, null, url);
    assert.equal(seen.local, false, url);
  }
  assert.equal(local('https://cdn.example.com/avatar').host, 'cdn.example.com');
  // An approved host on a scheme that is not http or https is not approved.
  const ws = local('ws://127.0.0.1:3000/socket');
  assert.notEqual(ws, null);
  assert.equal(ws.local, false);
  // No guard, no predicate, a predicate that throws and one that answers with something other than true fail closed.
  for (const [label, t] of /** @type {[string, any][]} */ ([
    ['no target', undefined],
    ['an empty target', {}],
    ['no predicate', { allowedHosts: new Set(['127.0.0.1']), guard: {} }],
    [
      'a throwing predicate',
      {
        allowedHosts: new Set(['127.0.0.1']),
        guard: {
          isAllowedHost() {
            throw new Error('guard failed');
          },
        },
      },
    ],
    ['a truthy answer that is not true', { allowedHosts: new Set(['127.0.0.1']), guard: { isAllowedHost: () => 'yes' } }],
  ])) {
    const seen = R.classifyObservedRequest('http://127.0.0.1:3000/a', 'GET', t);
    assert.notEqual(seen, null, label);
    assert.equal(seen.local, false, `${label} was read as approval`);
  }
});

test('AC-12 a data, about or blob URL is not a network request, and text that is not a URL is a request of no host and no path that the guard does not approve', () => {
  for (const url of ['data:text/plain,hi', 'about:blank', 'blob:http://127.0.0.1:3000/6f1c']) {
    assert.equal(R.classifyObservedRequest(url, 'GET', target()), null, url);
  }
  assert.deepEqual(R.classifyObservedRequest('not a url', 'get', target()), { method: 'GET', host: '', path: '', local: false });
});

// ---------------------------------------------------------------------------
// 4. evaluateRequestWindow
// ---------------------------------------------------------------------------

/** @param {string} method @param {string} path @param {boolean} [local] @param {string} [host] */
const seenRequest = (method, path, local = true, host = '127.0.0.1:3000') => ({ method, host, path, local });

test('AC-12 the step passes only on an exact count of the requests whose method equals and whose path contains the needle: a duplicate fails, a method mismatch is not counted', () => {
  const win = [seenRequest('POST', '/avatar'), seenRequest('GET', '/avatar'), seenRequest('POST', '/avatar/9'), seenRequest('POST', '/other')];
  const two = R.evaluateRequestWindow(win, step({ count: 2 }));
  assert.equal(two.status, 'passed');
  assert.equal(two.observed, 2);
  assert.deepEqual(two.matching, [
    { method: 'POST', host: '127.0.0.1:3000', path: '/avatar' },
    { method: 'POST', host: '127.0.0.1:3000', path: '/avatar/9' },
  ]);
  for (const m of two.matching) assert.equal(Object.keys(m).sort().join(','), 'host,method,path', 'a listed request carries no other key');

  const dup = R.evaluateRequestWindow(win, step({ count: 1 }));
  assert.equal(dup.status, 'failed', 'a duplicate submit must fail the count of 1');
  assert.equal(dup.observed, 2);

  assert.equal(R.evaluateRequestWindow(win, step({ method: 'GET', count: 1 })).status, 'passed');
  assert.equal(R.evaluateRequestWindow(win, step({ method: 'PUT', count: 0 })).status, 'passed', 'no PUT was issued');
  const empty = R.evaluateRequestWindow([], step({ url_contains: '/none', count: 0 }));
  assert.deepEqual([empty.status, empty.observed, empty.matching], ['passed', 0, []]);
  const missed = R.evaluateRequestWindow([], step({ count: 1 }));
  assert.deepEqual([missed.status, missed.observed], ['failed', 0]);
});

test('AC-15 a matching request to a host the guard does not approve blocks the step, for any count, while a request that does not match is ignored whatever its host', () => {
  const away = seenRequest('POST', '/avatar', false, 'cdn.example.com');
  const hit = seenRequest('POST', '/avatar');
  for (const count of [0, 1, 2]) {
    assert.equal(R.evaluateRequestWindow([hit, away], step({ count })).status, 'non-local', `count ${count}`);
  }
  // Nothing is counted for a step that ended in non-local: the result carries no count to pass on.
  assert.deepEqual(Object.keys(R.evaluateRequestWindow([away], step({ count: 0 }))), ['status']);

  const stray = [hit, seenRequest('POST', '/other', false, 'cdn.example.com'), seenRequest('GET', '/avatar', false, 'cdn.example.com')];
  const ignored = R.evaluateRequestWindow(stray, step({ count: 1 }));
  assert.deepEqual([ignored.status, ignored.observed], ['passed', 1], 'a non-matching non-local request must be ignored');

  // A request the classifier did not mark local is never read as local.
  const unmarked = { method: 'POST', host: '127.0.0.1:3000', path: '/avatar' };
  assert.equal(R.evaluateRequestWindow([unmarked], step({ count: 1 })).status, 'non-local');
});

test('AC-12 the match runs on the whole recorded path: a needle that sits only in the tail of a long path counts, and a count of 0 fails on the request that was issued', () => {
  const tail = `/${'a'.repeat(292)}/avatar`;
  assert.equal(tail.length, 300);
  const win = [seenRequest('POST', tail)];
  const counted = R.evaluateRequestWindow(win, step({ url_contains: '/avatar', count: 1 }));
  assert.equal(counted.status, 'passed');
  assert.equal(counted.matching.length, 1);
  assert.equal(counted.matching[0].path, tail, 'the listed path was cut by the decision');
  const zero = R.evaluateRequestWindow(win, step({ url_contains: '/avatar', count: 0 }));
  assert.deepEqual([zero.status, zero.observed], ['failed', 1], 'a count of 0 passed on a request that was issued past character 200');
});

test('AC-12 a character the URL parser encodes is matched in its encoded form, and a needle whose encoded form is longer than 200 characters still matches', () => {
  const encoded = [seenRequest('POST', '/avat%C3%A1r')];
  const accented = `/avat${String.fromCharCode(225)}r`;
  const hit = R.evaluateRequestWindow(encoded, step({ url_contains: accented, count: 1 }));
  assert.deepEqual([hit.status, hit.observed], ['passed', 1]);
  const miss = R.evaluateRequestWindow(encoded, step({ url_contains: accented, count: 0 }));
  assert.deepEqual([miss.status, miss.observed], ['failed', 1], 'a count of 0 passed on a request that was issued');

  const quoted = R.evaluateRequestWindow([seenRequest('POST', '/a%22b')], step({ url_contains: `/a${String.fromCharCode(34)}b`, count: 1 }));
  assert.equal(quoted.status, 'passed', 'a double quote must match its encoded form');

  // 41 characters, 241 once encoded: valid as a step, and matched against the whole 241 character path.
  const wide = `/${String.fromCharCode(225).repeat(40)}`;
  assert.equal(R.validateStep('browser', step({ url_contains: wide })), null);
  const recorded = R.classifyObservedRequest(`http://127.0.0.1:3000/${'%C3%A1'.repeat(40)}`, 'POST', target());
  assert.equal(recorded.path.length, 241);
  assert.equal(R.evaluateRequestWindow([recorded], step({ url_contains: wide, count: 1 })).status, 'passed');
});

test('AC-12 the window decision is total: a window that is not an array is an empty window, and a window entry that is not an object matches nothing', () => {
  for (const notAWindow of ['nope', 5, null, undefined, {}, true]) {
    /** @type {any} */ let zero;
    /** @type {any} */ let one;
    assert.doesNotThrow(() => {
      zero = R.evaluateRequestWindow(notAWindow, step({ count: 0 }));
      one = R.evaluateRequestWindow(notAWindow, step({ count: 1 }));
    }, JSON.stringify(notAWindow));
    assert.deepEqual([zero.status, zero.observed], ['passed', 0], JSON.stringify(notAWindow));
    assert.deepEqual([one.status, one.observed], ['failed', 0], JSON.stringify(notAWindow));
  }
  const mixed = R.evaluateRequestWindow([null, 7, 'POST /avatar', [], seenRequest('POST', '/avatar')], step({ count: 1 }));
  assert.deepEqual([mixed.status, mixed.observed], ['passed', 1]);
});

// ---------------------------------------------------------------------------
// 5. settleRequestWindow
// ---------------------------------------------------------------------------

test('AC-12 the window is sliced after the wait, so a request that arrives during the wait is inside it, and the wait is the exported settle time unless the caller names one', async () => {
  const waits = /** @type {number[]} */ ([]);
  const log = [1, 2, 3, 4].map((i) => seenRequest('GET', `/${i}`));
  const sliced = await R.settleRequestWindow(log, 2, {
    sleep: async (/** @type {number} */ ms) => {
      waits.push(ms);
    },
  });
  assert.deepEqual(waits, [R.EXPECT_REQUESTS_SETTLE_MS]);
  assert.deepEqual(
    sliced.map((/** @type {any} */ r) => r.path),
    ['/3', '/4'],
    'the window starts at the recorded index',
  );

  const late = /** @type {any[]} */ ([]);
  const withLate = await R.settleRequestWindow(late, 0, {
    sleep: async () => {
      late.push(seenRequest('POST', '/late'));
    },
  });
  assert.deepEqual(
    withLate.map((/** @type {any} */ r) => r.path),
    ['/late'],
    'a request issued during the wait was left out of the window',
  );

  const named = /** @type {number[]} */ ([]);
  await R.settleRequestWindow(log, 0, {
    settleMs: 123,
    sleep: async (/** @type {number} */ ms) => {
      named.push(ms);
    },
  });
  assert.deepEqual(named, [123]);
});

test('AC-12 a window start that is negative or not an integer is the whole log, never a slice from the end', async () => {
  const log = [1, 2, 3, 4].map((i) => seenRequest('GET', `/${i}`));
  const noWait = { sleep: async () => {} };
  for (const start of [-5, -1, 1.5, '2', null, undefined]) {
    const r = await R.settleRequestWindow(log, start, noWait);
    assert.equal(r.length, 4, `start ${JSON.stringify(start)}`);
  }
  assert.equal((await R.settleRequestWindow(log, 4, noWait)).length, 0, 'a start at the end of the log is an empty window');
});
