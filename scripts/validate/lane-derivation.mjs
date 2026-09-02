#!/usr/bin/env node
// @ts-check
/**
 * Executable reading of the lane model defined in
 * `plugins/relay/resources/lane-model.md`.
 *
 * That contract is the AUTHORITY for the rules. This module is a reading of it,
 * and any disagreement between the two is a bug HERE, not there. The asymmetry
 * matters: the contract is consumed by `/relay-execute`, `/relay-worktree`,
 * `/relay-commit`, `/relay-pr`, `/relay-visual-approve` and `prd-reviewer`, all
 * of which read prose; this module is consumed by one validation check. Treating
 * the module as authoritative would silently split one definition into two.
 *
 * What it buys: prose cannot fail. Until a lane could actually be COMPUTED,
 * nothing could demonstrate that a contradicting `Parallel` declaration is
 * genuinely refused — the behaviour the source PRD states in its strongest
 * terms. This module is what makes the refusal falsifiable.
 *
 * Exports:
 *   parsePhasesTable(text) — locate an Implementation Phases table (canonical
 *     eight-column form or the legacy seven-column form) and return its data
 *     rows, cells mapped BY COLUMN NAME.
 *   deriveLanes(rows) — partition by `repo`, compute weakly-connected components
 *     of the `depends` graph within each partition, apply the `Parallel`
 *     override, and return { lanes, refusals, orderingConstraints }.
 *
 * Neither function throws on malformed input: a table that cannot be found
 * yields an empty row list, and a contradiction yields a refusal object. The
 * callers of this module report; they are not interrupted.
 */

/** The canonical eight-column header, matched byte-for-byte. */
const HEADER_CANONICAL = '| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |';

/** The legacy seven-column header, which predates the `Repo` column. */
const HEADER_LEGACY = '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |';

/**
 * A GFM separator row: pipes, dashes, colons and whitespace ONLY.
 *
 * The pipe MUST be inside the character class. An eight-column separator is
 * `|---|---|---|---|---|---|---|---|`, whose internal pipes a class of `[\s:-]`
 * cannot match — a class omitting `|` therefore fails to recognise any
 * multi-column separator and parses it as a data row. That exact bug shipped
 * once in `lane-state-writers.mjs` and registered `---------` as a shared-state
 * writer; it is not repeated here.
 */
const SEPARATOR = /^[|\s:-]+$/;

/** The one recognized `Parallel` override token. */
const LANE_LABEL = /^lane:([a-z0-9][a-z0-9-]*)$/;

/**
 * Split a GFM table row into trimmed cell values.
 *
 * @param {string} line
 * @returns {string[]}
 */
function cells(line) {
  return line.trim().split('|').slice(1, -1).map((c) => c.trim());
}

/**
 * Treat `-` and the empty string alike, as the contract's parsing rules require.
 *
 * @param {string | undefined} value
 * @returns {string}
 */
function normalize(value) {
  if (value === undefined) return '';
  const trimmed = value.trim();
  return trimmed === '-' ? '' : trimmed;
}

/**
 * Locate the Implementation Phases table and return its data rows.
 *
 * Cells are mapped BY COLUMN NAME using whichever header actually matched.
 * Ordinal extraction is forbidden: it misreads every legacy row, because `Repo`
 * shifted every column after `Status` when it was introduced.
 *
 * @param {string | null | undefined} text
 * @returns {Array<{ num: number, phase: string, status: string, repo: string, parallel: string, depends: number[], raw: string }>}
 */
export function parsePhasesTable(text) {
  if (!text) return [];

  const lines = text.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));

  let start = -1;
  /** @type {string[]} */
  let columns = [];

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === HEADER_CANONICAL || trimmed === HEADER_LEGACY) {
      start = i;
      columns = cells(trimmed);
      break;
    }
  }

  if (start === -1) return [];

  const index = (name) => columns.indexOf(name);
  const iNum = index('#');
  const iPhase = index('Phase');
  const iStatus = index('Status');
  const iRepo = index('Repo'); // -1 on the legacy form, which reads as empty
  const iParallel = index('Parallel');
  const iDepends = index('Depends');

  /** @type {Array<{ num: number, phase: string, status: string, repo: string, parallel: string, depends: number[], raw: string }>} */
  const rows = [];

  for (let i = start + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (SEPARATOR.test(trimmed)) continue;
    if (!trimmed.startsWith('|')) break;

    const c = cells(trimmed);
    const num = Number.parseInt(normalize(c[iNum]), 10);
    if (!Number.isInteger(num)) continue;

    const dependsRaw = normalize(c[iDepends]);
    const depends = dependsRaw
      ? dependsRaw.split(',').map((d) => Number.parseInt(d.trim(), 10)).filter(Number.isInteger)
      : [];

    rows.push({
      num,
      phase: normalize(c[iPhase]),
      status: normalize(c[iStatus]),
      repo: iRepo === -1 ? '' : normalize(c[iRepo]),
      parallel: normalize(c[iParallel]),
      depends,
      raw: trimmed,
    });
  }

  return rows;
}

/**
 * Union-find over row numbers, used to compute weakly-connected components.
 *
 * @param {number[]} keys
 */
function unionFind(keys) {
  /** @type {Map<number, number>} */
  const parent = new Map(keys.map((k) => [k, k]));

  /** @param {number} x @returns {number} */
  function find(x) {
    let root = x;
    while (parent.get(root) !== root) root = /** @type {number} */ (parent.get(root));
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = /** @type {number} */ (parent.get(cur));
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  /** @param {number} a @param {number} b */
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  return { find, union };
}

/**
 * Derive lanes from parsed rows.
 *
 * @param {Array<{ num: number, repo: string, parallel: string, depends: number[] }>} rows
 * @returns {{ lanes: Array<Array<any>>, refusals: Array<{ code: string, message: string }>, orderingConstraints: Array<{ from: number, to: number }> }}
 */
export function deriveLanes(rows) {
  /** @type {Array<{ code: string, message: string }>} */
  const refusals = [];
  /** @type {Array<{ from: number, to: number }>} */
  const orderingConstraints = [];

  if (!rows || rows.length === 0) {
    return { lanes: [], refusals, orderingConstraints };
  }

  const byNum = new Map(rows.map((r) => [r.num, r]));
  const nums = rows.map((r) => r.num);
  const { find, union } = unionFind(nums);

  // Step 1 + 2: edges only WITHIN a repo partition. A cross-partition edge is
  // retained as an ordering constraint rather than merging two repositories'
  // lanes — dropping it instead would let a phase run before the phase it
  // declares a dependency on, silently, and only in workspaces.
  for (const row of rows) {
    for (const dep of row.depends) {
      const target = byNum.get(dep);
      if (!target) continue;
      if (target.repo === row.repo) {
        union(row.num, dep);
      } else {
        orderingConstraints.push({ from: dep, to: row.num });
      }
    }
  }

  // Step 4: the `Parallel` override. Same label merges; different labels within
  // one derived component is a split the graph forbids.
  /** @type {Map<string, number[]>} */
  const labelled = new Map();
  for (const row of rows) {
    const m = row.parallel.match(LANE_LABEL);
    if (!m) continue; // legacy free text and `-` alike carry no override
    const label = m[1];
    if (!labelled.has(label)) labelled.set(label, []);
    /** @type {number[]} */ (labelled.get(label)).push(row.num);
  }

  // A label spanning differing repos cannot become one worktree in one repo.
  for (const [label, members] of labelled) {
    const repos = new Set(members.map((n) => /** @type {any} */ (byNum.get(n)).repo));
    if (repos.size > 1) {
      refusals.push({
        code: 'FAILED_LANE_CROSS_REPO',
        message:
          `lane:${label} spans rows in differing Repo partitions (${[...repos].map((r) => r || '(single repo)').join(', ')}) — ` +
          'a lane becomes one worktree in one repository, so a label cannot span two',
      });
    }
  }

  // Different labels inside one derived component: a split the graph forbids.
  /** @type {Map<number, Map<string, number[]>>} */
  const componentLabels = new Map();
  for (const [label, members] of labelled) {
    for (const n of members) {
      const root = find(n);
      if (!componentLabels.has(root)) componentLabels.set(root, new Map());
      const inner = /** @type {Map<string, number[]>} */ (componentLabels.get(root));
      if (!inner.has(label)) inner.set(label, []);
      /** @type {number[]} */ (inner.get(label)).push(n);
    }
  }
  for (const [, inner] of componentLabels) {
    if (inner.size <= 1) continue;
    const parts = [...inner.entries()].map(([label, members]) => `lane:${label} on phase ${members.join(', ')}`);
    refusals.push({
      code: 'FAILED_LANE_SPLIT_FORBIDDEN',
      message:
        `rows in one derived lane carry different labels (${parts.join('; ')}) — they are connected through the ` +
        'Depends graph, so a split is not expressible; the override may only make execution more serial',
    });
  }

  // Same label merges (more serial is always allowed).
  for (const [, members] of labelled) {
    for (let i = 1; i < members.length; i += 1) union(members[0], members[i]);
  }

  /** @type {Map<number, any[]>} */
  const grouped = new Map();
  for (const row of rows) {
    const root = find(row.num);
    if (!grouped.has(root)) grouped.set(root, []);
    /** @type {any[]} */ (grouped.get(root)).push(row);
  }

  const lanes = [...grouped.values()]
    .map((members) => members.slice().sort((a, b) => a.num - b.num))
    .sort((a, b) => a[0].num - b[0].num);

  return { lanes, refusals, orderingConstraints };
}
