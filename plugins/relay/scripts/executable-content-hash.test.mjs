// @ts-check
/**
 * Unit coverage for scripts/executable-content-hash.mjs — the script that
 * makes `code-reviewer`'s R-X carve-out verifiable instead of self-asserted.
 *
 * The whole value of this script is that a FALSE CLEAR is impossible in
 * practice: if it ever reports `identical` for a pair of versions whose
 * assertions differ, R-X silently stops guarding the thing it exists to
 * guard. So the suite is weighted toward adversarial negatives — the cases
 * where a naive "strip comments and string literals" implementation would
 * wrongly clear a real behavioural change — and toward the fail-closed
 * paths, rather than toward happy-path coverage of the two positives.
 *
 * The single most important assertion in this file is
 * "a changed expected value does NOT clear": that is the exact hole in the
 * strip-all-string-literals design this implementation deliberately rejects.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { hashExecutableContent, normalizeSource, parseArgs } from './executable-content-hash.mjs';

/** Hash `src` as a .ts file, asserting the script did not fail closed. */
function tsHash(src) {
  const r = hashExecutableContent('a.test.ts', src);
  assert.ok('hash' in r, `expected a hash, got: ${JSON.stringify(r)}`);
  return r.hash;
}

/** Hash `src` as a .py file, asserting the script did not fail closed. */
function pyHash(src) {
  const r = hashExecutableContent('test_a.py', src);
  assert.ok('hash' in r, `expected a hash, got: ${JSON.stringify(r)}`);
  return r.hash;
}

// ---------------------------------------------------------------------------
// Positives — the two edits the carve-out exists to clear
// ---------------------------------------------------------------------------

test('a comment-only edit produces an identical hash', () => {
  const before = `/** Old docstring. */\nit('x', () => { expect(f()).toBe(1); });\n`;
  const after = `/** A rewritten docstring, much longer, saying something else entirely. */\n// plus a new line comment\nit('x', () => { expect(f()).toBe(1); });\n`;
  assert.equal(tsHash(before), tsHash(after));
});

test('renaming a describe() title produces an identical hash', () => {
  const before = `describe('AC-13 — read-only by construction', () => { it('x', () => { expect(1).toBe(1); }); });`;
  const after = `describe('AC-13 tripwire — no ACCIDENTAL write reaches the API', () => { it('x', () => { expect(1).toBe(1); }); });`;
  assert.equal(tsHash(before), tsHash(after));
});

test('the real-world blocking case — docstring + describe rename around a detection regex — clears', () => {
  const body = `const RE = /\\bhttps:\\/\\/www\\.googleapis\\.com\\b/g;\n  const offenders = scan(RE);\n  expect(offenders).toEqual([]);`;
  const before = `/**\n * Proof: every call is a GET.\n */\ndescribe('read-only by construction', () => {\n  it('finds no mutation', () => {\n  ${body}\n  });\n});\n`;
  const after = `/**\n * Tripwire, not proof: catches an ACCIDENTAL write, not a determined one.\n */\ndescribe('tripwire — no accidental write', () => {\n  it('finds no mutation', () => {\n  ${body}\n  });\n});\n`;
  assert.equal(tsHash(before), tsHash(after));
});

test('reformatting (indentation, line breaks) produces an identical hash in JS', () => {
  const before = `it('x',()=>{expect(f()).toBe(1);});`;
  const after = `it('x', () => {\n  expect(f()).toBe(1);\n});\n`;
  assert.equal(tsHash(before), tsHash(after));
});

// ---------------------------------------------------------------------------
// Adversarial negatives — every one of these MUST fail to clear
// ---------------------------------------------------------------------------

test('a changed EXPECTED STRING VALUE does not clear — string literals outside title position are executable content', () => {
  const before = `it('x', () => { expect(dto.title).toBe('A'); });`;
  const after = `it('x', () => { expect(dto.title).toBe('B'); });`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('adding a .skip modifier does not clear — the modifier lives in the callee, which is code', () => {
  const before = `it('x', () => { expect(1).toBe(2); });`;
  const after = `it.skip('x', () => { expect(1).toBe(2); });`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('deleting an it() block does not clear', () => {
  const before = `it('a', () => { expect(1).toBe(1); });\nit('b', () => { expect(2).toBe(2); });`;
  const after = `it('a', () => { expect(1).toBe(1); });`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('adding a new it() block does not clear — additive coverage goes through arbitration, not the carve-out', () => {
  const before = `it('a', () => { expect(1).toBe(1); });`;
  const after = `it('a', () => { expect(1).toBe(1); });\nit('b', () => { expect(2).toBe(2); });`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('a changed detection regex does not clear', () => {
  const before = `const RE = /\\bevents\\.insert\\b/;`;
  const after = `const RE = /events.insert/;`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('weakening an assertion while keeping the title does not clear', () => {
  const before = `it('same title', () => { expect(offenders).toEqual([]); });`;
  const after = `it('same title', () => { expect(offenders.length >= 0).toBe(true); });`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('a string that only LOOKS like a title — same text, different callee — is not stripped', () => {
  const before = `register('my title', handler);`;
  const after = `register('other title', handler);`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('a template-literal title is preserved verbatim — it.each tables are data, not prose', () => {
  const before = 'it(`case ${n}`, () => { expect(n).toBe(1); });';
  const after = 'it(`scenario ${n}`, () => { expect(n).toBe(1); });';
  assert.notEqual(tsHash(before), tsHash(after));
});

// ---------------------------------------------------------------------------
// Tokenizer traps — a naive scanner mis-reads these and silently drops code
// ---------------------------------------------------------------------------

test('a // sequence inside a string literal is not treated as a comment', () => {
  const before = `const url = 'https://example.com/a';`;
  const after = `const url = 'https://example.com/b';`;
  assert.notEqual(tsHash(before), tsHash(after));
  // and the tail of the line must survive normalization
  assert.match(normalizeSource('javascript', `const u = 'https://x'; call(u);`), /call\(u\)/);
});

test('a comment marker inside a regex literal does not swallow the rest of the line', () => {
  const src = `const RE = /https:\\/\\//; call(RE);`;
  assert.match(normalizeSource('javascript', src), /call\(RE\)/);
});

test('a quote inside a comment does not open a string', () => {
  const src = `// it's fine\nexpect(1).toBe(1);`;
  assert.match(normalizeSource('javascript', src), /expect\(1\)\.toBe\(1\)/);
});

test('division is not misread as a regex', () => {
  const before = `const avg = (a + b) / 2; expect(avg).toBe(1);`;
  const after = `const avg = (a + b) / 3; expect(avg).toBe(1);`;
  assert.notEqual(tsHash(before), tsHash(after));
});

// ---------------------------------------------------------------------------
// Fail-closed paths
// ---------------------------------------------------------------------------

test('an ambiguous `/` after `}` fails closed rather than guessing', () => {
  const r = hashExecutableContent('a.test.ts', `if (x) {} /re/.test(y);`);
  assert.ok('error' in r);
  assert.match(r.error, /ambiguous source/);
});

test('an unterminated block comment fails closed', () => {
  const r = hashExecutableContent('a.test.ts', `/* never closed\nit('x', () => {});`);
  assert.ok('error' in r);
  assert.match(r.error, /unterminated block comment/);
});

test('an unsupported extension fails closed', () => {
  const r = hashExecutableContent('a_test.go', `func TestX(t *testing.T) {}`);
  assert.ok('error' in r);
  assert.match(r.error, /unsupported extension \.go/);
});

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

test('a Python docstring rewrite and a # comment change produce an identical hash', () => {
  const before = `def test_x():\n    """Old."""\n    # note\n    assert f() == 1\n`;
  const after = `def test_x():\n    """A completely different explanation."""\n    assert f() == 1\n`;
  assert.equal(pyHash(before), pyHash(after));
});

test('a Python string that is an argument, not a docstring, is preserved', () => {
  const before = `def test_x():\n    assert f() == "A"\n`;
  const after = `def test_x():\n    assert f() == "B"\n`;
  assert.notEqual(pyHash(before), pyHash(after));
});

test('Python indentation is executable content and is preserved', () => {
  const before = `def test_x():\n    if a:\n        assert f()\n`;
  const after = `def test_x():\n    if a:\n            assert f()\n`;
  assert.notEqual(pyHash(before), pyHash(after));
});

// ---------------------------------------------------------------------------
// CLI argument contract
// ---------------------------------------------------------------------------

test('parseArgs requires --base, --head and at least one path', () => {
  assert.throws(() => parseArgs(['--base', 'x', '--', 'a.ts']), /--base and --head are required/);
  assert.throws(() => parseArgs(['--base', 'x', '--head', 'y', '--']), /at least one path is required/);
  const args = parseArgs(['--base', 'abc', '--head', 'WORKTREE', '--repo', '/r', '--', 'a.ts', 'b.ts']);
  assert.deepEqual(
    { base: args.base, head: args.head, repo: args.repo, paths: args.paths },
    { base: 'abc', head: 'WORKTREE', repo: '/r', paths: ['a.ts', 'b.ts'] }
  );
});

test('unary plus is not glued into an increment operator', () => {
  const before = `expect(a + +b).toBe(1);`;
  const after = `expect(a++b).toBe(1);`;
  assert.notEqual(tsHash(before), tsHash(after));
});

test('a prettier-style reflow of the same code clears', () => {
  const before = `describe('s',()=>{it('t',async()=>{const r=await f({a:1,b:2});expect(r).toEqual({ok:true});});});`;
  const after = [
    "describe('s', () => {",
    "  it('t', async () => {",
    '    const r = await f({ a: 1, b: 2 });',
    '    expect(r).toEqual({ ok: true });',
    '  });',
    '});',
    '',
  ].join('\n');
  assert.equal(tsHash(before), tsHash(after));
});
