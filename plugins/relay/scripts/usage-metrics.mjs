// @ts-check
/**
 * usage-metrics.mjs — materialize the per-project usage-metrics artifact.
 *
 * Regenerates the four TSV relations defined by
 * ${CLAUDE_PLUGIN_ROOT}/resources/usage-metrics-schema.md by full rescan of
 * the artifacts relay already writes. Output is a pure function of input: a
 * re-run against an unchanged corpus produces byte-identical shards, which is
 * what makes deduplication, append races and mixed-generation files
 * structurally impossible rather than merely handled.
 *
 * Nothing in the pipeline emits anything for this script's benefit. It reads
 * what is already on disk, so the collection path costs zero LLM tokens.
 *
 * Usage:
 *   node <plugin-root>/scripts/usage-metrics.mjs materialize [--root <dir>] [--out <dir>] [--project <id>]
 *   node <plugin-root>/scripts/usage-metrics.mjs --dry-run   [--root <dir>] [--out <dir>] [--project <id>]
 *
 * No npm dependencies. Node >=18, ESM, synchronous node: builtins only.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Schema generation. Bumping this starts a new shard filename series. */
const SCHEMA_MAJOR = 1;

/** Source filename suffix -> pipeline stage. Mirrors scripts/efficiency.mjs. */
const STAGES = {
  '.review.jsonl': 'plan-review',
  '.code-review.jsonl': 'code-review',
  '.test-write-review.jsonl': 'test-write-review',
};

/** The single not-applicable sentinel. */
const NA = '-';

/** Column order per relation, matching usage-metrics-schema.md. */
const COLUMNS = {
  verdict: ['proj', 'ts', 'deg', 'stage', 'art', 'seq', 'feat', 'phase', 'verdict', 'action', 'nrub', 'nfail', 'nblk', 'nadv', 'nesc'],
  rubric: ['proj', 'ts', 'deg', 'stage', 'art', 'seq', 'rid', 'pass', 'cls', 'esc', 'rat'],
  // ms/suite_ms/corr_ms appended 2026-08-14. Additive per the codebook's
  // versioning rule: new columns go at the END of the row and do not bump the
  // schema version. A reader that does not know them ignores them; a reader
  // that does finds them absent on older shards and reads that as "not
  // recorded", never as zero.
  run: ['proj', 'ts', 'feat', 'phase', 'stage', 'outcome', 'halt', 'bud_prr', 'bud_min', 'natt', 'ms', 'suite_ms', 'corr_ms'],
  scan: ['proj', 'ts', 'pv', 'tool_v', 'nsrc', 'nverdict', 'nrubric', 'nrun', 'ndeg'],
};

/** Composite key per relation. Rows sort by these, joined, in UTF-16 order. */
const KEYS = {
  verdict: ['proj', 'stage', 'art', 'seq'],
  rubric: ['proj', 'stage', 'art', 'seq', 'rid'],
  run: ['proj', 'feat', 'phase', 'stage'],
  scan: ['proj', 'ts'],
};

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// ---------------------------------------------------------------------------
// Task 1 — corpus discovery and defensive reads
// ---------------------------------------------------------------------------

/**
 * Read and parse a JSON file. Returns null when absent; warns to stderr and
 * returns null when malformed. Never throws — a full-corpus rescan touches
 * hundreds of files and must not abort on one bad one.
 * @param {string} path
 * @returns {any|null}
 */
export function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    process.stderr.write(`warn: could not parse ${path}: ${/** @type {Error} */ (err).message}\n`);
    return null;
  }
}

/**
 * Parse a JSONL file line by line. Blank lines are skipped; a missing trailing
 * newline is tolerated (the JSON Lines spec makes it recommended, not
 * required); a malformed line is recorded with its 1-based number rather than
 * aborting the file.
 * @param {string} path
 * @returns {{records: any[], errors: {line: number, message: string}[]}}
 */
export function readJsonlLines(path) {
  /** @type {any[]} */ const records = [];
  /** @type {{line: number, message: string}[]} */ const errors = [];
  if (!existsSync(path)) return { records, errors };
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    errors.push({ line: 0, message: /** @type {Error} */ (err).message });
    return { records, errors };
  }
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      records.push(JSON.parse(line));
    } catch (err) {
      errors.push({ line: i + 1, message: /** @type {Error} */ (err).message });
    }
  }
  return { records, errors };
}

/**
 * Discover every measurement source under a project root.
 * @param {string} root
 * @returns {{verdictFiles: {path: string, stage: string, art: string}[], reportDirs: string[]}}
 */
export function discoverCorpus(root) {
  /** @type {{path: string, stage: string, art: string}[]} */ const verdictFiles = [];
  for (const dir of [join(root, 'PRPs', 'plans'), join(root, 'PRPs', 'plans', 'completed')]) {
    if (!existsSync(dir)) continue;
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names.sort()) {
      const suffix = Object.keys(STAGES).find((s) => name.endsWith(s));
      if (!suffix) continue;
      verdictFiles.push({ path: join(dir, name), stage: STAGES[suffix], art: name.slice(0, -suffix.length) });
    }
  }

  /** @type {string[]} */ const reportDirs = [];
  const reportsRoot = join(root, 'PRPs', 'reports');
  if (existsSync(reportsRoot)) {
    let names;
    try {
      names = readdirSync(reportsRoot);
    } catch {
      names = [];
    }
    for (const name of names.sort()) {
      const dir = join(reportsRoot, name);
      try {
        if (statSync(dir).isDirectory()) reportDirs.push(dir);
      } catch {
        // unreadable entry — skip rather than abort the scan
      }
    }
  }
  return { verdictFiles, reportDirs };
}

// ---------------------------------------------------------------------------
// Field contract enforcement
// ---------------------------------------------------------------------------

/**
 * Coerce a value to the closed field contract: a code, a non-negative integer,
 * an ISO-8601 UTC instant, or the `-` sentinel. Anything else — including any
 * value carrying a tab, CR or newline — becomes the sentinel.
 * @param {unknown} value
 * @returns {string}
 */
export function toCell(value) {
  if (value === null || value === undefined || value === '') return NA;
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? String(value) : NA;
  if (typeof value === 'boolean') return value ? '1' : '0';
  const s = String(value);
  if (s.includes('\t') || s.includes('\r') || s.includes('\n')) return NA;
  return s;
}

/** @param {unknown} ts @returns {string} */
function toInstant(ts) {
  const s = toCell(ts);
  return ISO_INSTANT.test(s) ? s : NA;
}

// ---------------------------------------------------------------------------
// Task 2 — relation projection
// ---------------------------------------------------------------------------

/**
 * Split an artifact basename into its feature slug and phase number, when the
 * conventional `<feature>-phase-<N>-<slug>` shape is present.
 * @param {string} art
 * @returns {{feat: string, phase: string}}
 */
function splitArtifact(art) {
  const m = /^(.*)-phase-(\d+)-/.exec(art);
  return m ? { feat: m[1], phase: m[2] } : { feat: NA, phase: NA };
}

/**
 * One row per verdict line. `class` is emitted by plan-reviewer only, so an
 * absent field reads as blocking — see the schema's cls caveat.
 * @param {string} proj
 * @param {{path: string, stage: string, art: string}} file
 * @param {any[]} records
 * @returns {Record<string,string>[]}
 */
export function projectVerdicts(proj, file, records) {
  const { feat, phase } = splitArtifact(file.art);
  return records.map((r, idx) => {
    const rows = Array.isArray(r.rubric) ? r.rubric : [];
    const failing = rows.filter((x) => x && x.passed === false);
    return {
      proj,
      ts: toInstant(r.timestamp),
      deg: r.timestamp_degraded === true ? '1' : '0',
      stage: file.stage,
      art: file.art,
      seq: String(idx + 1),
      feat,
      phase,
      verdict: toCell(r.verdict),
      action: toCell(r.action),
      nrub: String(rows.length),
      nfail: String(failing.length),
      nblk: String(failing.filter((x) => x.class !== 'advisory').length),
      nadv: String(failing.filter((x) => x.class === 'advisory').length),
      nesc: String(failing.filter((x) => x.escalated === true).length),
    };
  });
}

/**
 * One row per rubric row, denormalizing proj/ts/deg/stage from the parent.
 * @param {string} proj
 * @param {{path: string, stage: string, art: string}} file
 * @param {any[]} records
 * @returns {Record<string,string>[]}
 */
export function projectRubric(proj, file, records) {
  /** @type {Record<string,string>[]} */ const out = [];
  records.forEach((r, idx) => {
    const rows = Array.isArray(r.rubric) ? r.rubric : [];
    for (const row of rows) {
      if (!row || typeof row.id !== 'string') continue;
      out.push({
        proj,
        ts: toInstant(r.timestamp),
        deg: r.timestamp_degraded === true ? '1' : '0',
        stage: file.stage,
        art: file.art,
        seq: String(idx + 1),
        rid: toCell(row.id),
        pass: row.passed === true ? '1' : row.passed === false ? '0' : NA,
        cls: row.class === 'advisory' ? 'advisory' : 'blocking',
        esc: row.escalated === true ? '1' : '0',
        rat: toCell(row.ratchet),
      });
    }
  });
  return out;
}

/**
 * One row per (feat, phase, stage). Handles all three real `phases[]` entry
 * shapes: a stage/outcome entry, a status-keyed completion entry (the only one
 * carrying a timestamp), and an entry with ad hoc `attempts` keys.
 * @param {string} proj
 * @param {string} dir
 * @returns {Record<string,string>[]}
 */
export function projectRuns(proj, dir) {
  const feat = basename(dir);
  /** @type {Record<string,string>[]} */ const out = [];

  const orch = readJsonIfExists(join(dir, 'orchestrator-run.json'))
    || readJsonIfExists(join(dir, 'orchestrator-halt.json'));
  if (orch && Array.isArray(orch.phases)) {
    const budPrr = toCell(orch.max_plan_review_retries);
    const budMin = toCell(orch.max_orchestrator_minutes);
    for (const e of orch.phases) {
      if (!e || typeof e !== 'object') continue;
      const isCompletion = typeof e.status === 'string' && e.stage === undefined;
      out.push({
        proj,
        ts: toInstant(e.timestamp),
        feat,
        phase: toCell(e.phase),
        stage: isCompletion ? 'complete' : toCell(e.stage),
        outcome: isCompletion ? toCell(e.status) : toCell(e.outcome),
        halt: typeof e.outcome === 'string' && e.outcome.startsWith('HALT:')
          ? toCell(e.outcome.slice(5))
          : NA,
        bud_prr: budPrr,
        bud_min: budMin,
        natt: toCell(e.attempts),
        // orchestrator-run.json records no per-stage duration. Deriving one
        // from consecutive completion timestamps would be inference presented
        // as measurement, so these stay unset.
        ms: NA,
        suite_ms: NA,
        corr_ms: NA,
      });
    }
  }

  const run = readJsonIfExists(join(dir, 'run.json'));
  if (run) {
    // Phase identity has no uniform source: phase_context in one real shape,
    // absent in another where it is recoverable only from a record path.
    let phase = toCell(run.phase_context);
    if (phase === NA && Array.isArray(run.attempts)) {
      for (const a of run.attempts) {
        const m = a && typeof a.record === 'string' ? /phase-(\d+)/.exec(a.record) : null;
        if (m) { phase = m[1]; break; }
      }
    }
    // Duration is present on some run.json files and absent on others (two of
    // four real samples carry neither field). Absent stays absent — the
    // sentinel, never a zero, which would read as "ran instantly".
    const bd = run.time_breakdown && typeof run.time_breakdown === 'object' ? run.time_breakdown : {};
    const sumBy = (suffix) => {
      const vals = Object.keys(bd)
        .filter((k) => k.endsWith(suffix))
        .map((k) => bd[k])
        .filter((v) => typeof v === 'number' && Number.isInteger(v) && v >= 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    };
    out.push({
      proj,
      ts: toInstant(run.ended_at || run.started_at),
      feat,
      phase,
      stage: 'test',
      outcome: toCell(run.outcome),
      halt: typeof run.outcome === 'string' && run.outcome.startsWith('FAILED_') ? toCell(run.outcome) : NA,
      bud_prr: NA,
      bud_min: NA,
      natt: Array.isArray(run.attempts) ? String(run.attempts.length) : NA,
      ms: toCell(run.elapsed_ms),
      suite_ms: toCell(sumBy('_suite_ms')),
      corr_ms: toCell(sumBy('_correction_ms')),
    });
  }
  return out;
}

/**
 * The single scan row. `pv` bounds the version axis; it is read from the
 * installed plugin manifest and is `-` when unreadable.
 * @param {{proj: string, nowIso: string, pluginVersion: string, nsrc: number, counts: Record<string, number>, ndeg: number}} input
 * @returns {Record<string,string>[]}
 */
export function projectScan(input) {
  return [{
    proj: input.proj,
    ts: toInstant(input.nowIso),
    pv: toCell(input.pluginVersion),
    tool_v: String(SCHEMA_MAJOR),
    nsrc: String(input.nsrc),
    nverdict: String(input.counts.verdict || 0),
    nrubric: String(input.counts.rubric || 0),
    nrun: String(input.counts.run || 0),
    ndeg: String(input.ndeg),
  }];
}

// ---------------------------------------------------------------------------
// Task 3 — deterministic writer, CLI, dry-run
// ---------------------------------------------------------------------------

/**
 * Sort rows by their relation's composite key. Uses the default UTF-16
 * code-unit comparator: `localeCompare` is documented as
 * implementation-dependent and cannot support byte-identical output.
 * @param {string} relation
 * @param {Record<string,string>[]} rows
 * @returns {Record<string,string>[]}
 */
export function sortRows(relation, rows) {
  const keyCols = KEYS[relation];
  // Tab is a safe key separator: toCell() guarantees no field can contain one.
  const keyed = rows.map((r) => ({ k: keyCols.map((c) => r[c] ?? '').join('\t'), r }));
  keyed.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  return keyed.map((x) => x.r);
}

/**
 * Render one shard. Line endings are a literal `\n`, never os.EOL, which is
 * CRLF on Windows and would make the same corpus produce different bytes per
 * platform.
 * @param {string} relation
 * @param {Record<string,string>[]} rows
 * @returns {string}
 */
export function renderShard(relation, rows) {
  const cols = COLUMNS[relation];
  const lines = [cols.join('\t')];
  for (const row of sortRows(relation, rows)) {
    lines.push(cols.map((c) => toCell(row[c])).join('\t'));
  }
  return lines.join('\n') + '\n';
}

/**
 * Route a row to its shard: month of its own instant, or the undated shard.
 * @param {string} relation
 * @param {Record<string,string>} row
 * @returns {string}
 */
export function shardName(relation, row) {
  if (relation === 'scan') return `scan-v${SCHEMA_MAJOR}.tsv`;
  const ts = row.ts;
  const month = ISO_INSTANT.test(ts) ? ts.slice(0, 7) : 'undated';
  return `${relation}-v${SCHEMA_MAJOR}-${month}.tsv`;
}

/**
 * Write atomically: temp file then rename, so an interrupted run cannot leave
 * a truncated shard a later reader consumes as valid data.
 * @param {string} path
 * @param {string} content
 */
export function writeAtomic(path, content) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

/**
 * Group every projected row into its destination shard.
 * @param {Record<string, Record<string,string>[]>} relations
 * @returns {Map<string, {relation: string, rows: Record<string,string>[]}>}
 */
export function planShards(relations) {
  /** @type {Map<string, {relation: string, rows: Record<string,string>[]}>} */ const shards = new Map();
  for (const relation of Object.keys(COLUMNS)) {
    for (const row of relations[relation] || []) {
      const name = shardName(relation, row);
      if (!shards.has(name)) shards.set(name, { relation, rows: [] });
      /** @type {{relation: string, rows: Record<string,string>[]}} */ (shards.get(name)).rows.push(row);
    }
  }
  return shards;
}

/** @param {string[]} argv @returns {{mode: string, root: string, out: string, project: string|null}} */
export function parseArgs(argv) {
  let mode = 'materialize';
  let root = process.cwd();
  let out = '';
  /** @type {string|null} */ let project = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') mode = 'dry-run';
    else if (a === 'materialize') mode = 'materialize';
    else if (a === 'query') mode = 'query';
    else if (a === '--root') root = argv[++i] || root;
    else if (a === '--out') out = argv[++i] || out;
    else if (a === '--project') project = argv[++i] || null;
  }
  if (!out) out = join(root, 'PRPs', 'metrics');
  return { mode, root, out, project };
}

/** @param {string} root @returns {string} */
function readPluginVersion(root) {
  for (const p of [
    join(root, 'plugins', 'relay', '.claude-plugin', 'plugin.json'),
    resolve(new URL('../.claude-plugin/plugin.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  ]) {
    const manifest = readJsonIfExists(p);
    if (manifest && typeof manifest.version === 'string') return manifest.version;
  }
  return NA;
}

/**
 * Build every relation from a project root. Pure with respect to the
 * filesystem: no writes, so both modes share it.
 * @param {{root: string, project: string|null, nowIso: string}} opts
 */
export function buildRelations(opts) {
  const proj = opts.project || basename(resolve(opts.root));
  const { verdictFiles, reportDirs } = discoverCorpus(opts.root);
  /** @type {Record<string, Record<string,string>[]>} */
  const relations = { verdict: [], rubric: [], run: [], scan: [] };
  /** @type {{path: string, line: number, message: string}[]} */ const parseErrors = [];

  for (const file of verdictFiles) {
    const { records, errors } = readJsonlLines(file.path);
    for (const e of errors) parseErrors.push({ path: file.path, line: e.line, message: e.message });
    relations.verdict.push(...projectVerdicts(proj, file, records));
    relations.rubric.push(...projectRubric(proj, file, records));
  }
  for (const dir of reportDirs) relations.run.push(...projectRuns(proj, dir));

  const ndeg = relations.verdict.filter((r) => r.deg === '1').length;
  relations.scan = projectScan({
    proj,
    nowIso: opts.nowIso,
    pluginVersion: readPluginVersion(opts.root),
    nsrc: verdictFiles.length + reportDirs.length,
    counts: { verdict: relations.verdict.length, rubric: relations.rubric.length, run: relations.run.length },
    ndeg,
  });
  return { relations, parseErrors, proj };
}

/**
 * Read a materialized shard back into rows keyed by column name.
 * @param {string} path
 * @returns {Record<string,string>[]}
 */
export function readShard(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const cols = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    /** @type {Record<string,string>} */ const row = {};
    cols.forEach((c, i) => { row[c] = cells[i] ?? NA; });
    return row;
  });
}

/**
 * Summarize materialized shards. Strictly read-only: it opens the output
 * directory and writes nothing. Degraded rows are excluded from every rate and
 * the exclusion is reported as a named warning rather than folded into totals,
 * mirroring scripts/efficiency.mjs's own doCompare() discipline.
 * @param {string} outDir
 * @returns {string}
 */
export function doQuery(outDir) {
  if (!existsSync(outDir)) {
    return `No materialized shards at ${outDir}. Run \`materialize\` first.\n`;
  }
  /** @type {Record<string,string>[]} */ const verdicts = [];
  /** @type {Record<string,string>[]} */ const rubric = [];
  for (const name of readdirSync(outDir).sort()) {
    if (name.startsWith('verdict-')) verdicts.push(...readShard(join(outDir, name)));
    else if (name.startsWith('rubric-')) rubric.push(...readShard(join(outDir, name)));
  }
  if (verdicts.length === 0) {
    return `No verdict rows at ${outDir}. Run \`materialize\` first.\n`;
  }

  const degraded = verdicts.filter((r) => r.deg === '1');
  const usable = verdicts.filter((r) => r.deg !== '1');
  const projects = [...new Set(usable.map((r) => r.proj))].sort();
  const stages = [...new Set(usable.map((r) => r.stage))].sort();

  const out = [];
  out.push(`usage-metrics query — ${outDir}`);
  out.push(`projects: ${projects.join(', ')}`);

  // Shard sanity, reported as a warning and never as a failure. This check
  // lives in the reader rather than in `npm run validate` deliberately: that
  // suite is this repo's pre-commit gate, and a corrupted measurement artifact
  // must never be able to block a commit.
  const malformed = verdicts.filter((r) => r.proj === undefined || r.stage === undefined);
  if (malformed.length > 0) {
    out.push('');
    out.push(`WARNING - ${malformed.length} verdict row(s) are missing a required column.`);
    out.push('Re-run `materialize` to regenerate; the shards are a derived artifact.');
  }
  if (degraded.length > 0) {
    out.push('');
    out.push(`WARNING - ${degraded.length} verdict row(s) carry a producer-flagged`);
    out.push('unreliable timestamp (deg=1) and are excluded from every rate below.');
  }
  for (const proj of projects) {
    out.push('');
    out.push(`[${proj}]`);
    for (const stage of stages) {
      const rows = usable.filter((r) => r.proj === proj && r.stage === stage);
      if (rows.length === 0) continue;
      const first = rows.filter((r) => r.seq === '1');
      const firstFail = first.filter((r) => r.verdict === 'CHANGES_REQUESTED');
      const rate = first.length ? (firstFail.length / first.length).toFixed(2) : '-';
      out.push(`  ${stage.padEnd(20)} verdicts=${String(rows.length).padStart(4)}  artifacts=${String(first.length).padStart(4)}  first-attempt-fail-rate=${rate}`);

      /** @type {Record<string, number>} */ const fails = {};
      for (const r of rubric) {
        if (r.proj !== proj || r.stage !== stage || r.pass !== '0' || r.deg === '1') continue;
        fails[r.rid] = (fails[r.rid] || 0) + 1;
      }
      const top = Object.entries(fails).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1)).slice(0, 3);
      if (top.length) out.push(`    top failing: ${top.map(([id, n]) => `${id}(${n})`).join(' ')}`);
    }
  }
  out.push('');
  return out.join('\n') + '\n';
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const args = parseArgs(argv);

  if (args.mode === 'query') {
    process.stdout.write(doQuery(args.out));
    return 0;
  }

  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const { relations, parseErrors } = buildRelations({ root: args.root, project: args.project, nowIso });

  for (const e of parseErrors) {
    process.stderr.write(`warn: ${e.path}:${e.line}: ${e.message}\n`);
  }

  const shards = planShards(relations);
  const names = [...shards.keys()].sort();

  if (args.mode === 'dry-run') {
    for (const name of names) {
      const shard = /** @type {{relation: string, rows: Record<string,string>[]}} */ (shards.get(name));
      process.stdout.write(`${join(args.out, name)}\t${shard.rows.length}\n`);
    }
    process.stdout.write(`# dry-run: ${names.length} shard(s), nothing written\n`);
    return 0;
  }

  mkdirSync(args.out, { recursive: true });
  for (const name of names) {
    const shard = /** @type {{relation: string, rows: Record<string,string>[]}} */ (shards.get(name));
    let rows = shard.rows;
    if (shard.relation === 'scan') {
      // The scan relation is a HISTORY — one row per materialization, as the
      // codebook states — not a regenerated snapshot. Appending is what makes
      // the version axis and the liveness signal work at all: a single
      // overwritten row could never bound rows between two plugin versions.
      // Prior rows are therefore immutable; only a new one is added, deduped
      // on the (proj, ts) composite key so a re-run inside the same second is
      // idempotent rather than duplicated.
      const existing = readShard(join(args.out, name));
      const seen = new Set(existing.map((r) => `${r.proj}\t${r.ts}`));
      rows = [...existing, ...shard.rows.filter((r) => !seen.has(`${r.proj}\t${r.ts}`))];
    }
    writeAtomic(join(args.out, name), renderShard(shard.relation, rows));
  }
  process.stdout.write(`materialized ${names.length} shard(s) into ${args.out}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exit(main(process.argv.slice(2)));
}
