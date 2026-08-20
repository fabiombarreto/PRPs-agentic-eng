#!/usr/bin/env node
// plugins/relay/scripts/visual/compare.mjs
//
// AA-tolerant pixel diff of captured screenshots (relay Figma
// Implementation Track, Phase 6 — Visual loop). Applies any named mask
// regions (blacked out on in-memory copies of both images before
// diffing — neither image on disk is ever mutated), runs pixelmatch,
// computes a diff percentage per frame, compares it against the frame's
// own diff threshold, writes a diff PNG per frame, and writes
// fidelity-report.json.
//
// TWO COMPARISON BASES. A frame is diffed against its APPROVED BASELINE
// capture when one exists, and only then does the number gate anything:
//
//   approved-baseline — captured vs. the last human-approved capture of
//     the same frame. Measures DRIFT since approval. This is the only
//     basis whose number is a gate.
//   figma-reference   — captured vs. the Design Spec's Figma export,
//     used only when no baseline exists yet. The number is ADVISORY and
//     the frame's status is NO_BASELINE, never PASS/FAIL: a Figma export
//     and a real render differ permanently by font, spacing and, above
//     all, real data vs. the mock placeholders in the design, so the
//     resulting percentage does not order defective renders below
//     correct ones. Field measurement (2026-08-18, spe-cms): two
//     genuinely broken layouts measured 2.6035% and 2.4614% against the
//     Figma export while the correct layout measured 2.5139% — a
//     NEGATIVE separation, unsalvageable by any threshold and unmoved by
//     masking. The same three captures against an approved baseline
//     separated cleanly: 0.0000% noise floor, 0.8963% and 1.1625% for
//     the two defects.
//
// Baselines are promoted by `/relay-visual-approve` when a human
// approves a capture — it appends the approved capture's path to
// `<baselineDir>/index.json`; the first run of a frame therefore has
// none.
//
// Usage:
//   node compare.mjs <manifest.json> <capturedDir> <reportPath> [baselineDir]

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

function frameFilename(nodeId) {
  return `${nodeId.replace(/[:/\\]/g, '-')}.png`;
}

// pixelmatch's `threshold` is a per-pixel colour-distance tolerance, not
// a diff budget. 0.1 is blind to low-contrast difference: measured in
// the field (2026-08-18, spe-cms), adding a decorative banner ornament
// whose colours sit ~10/255 from the background moved 24.6% of the
// unmasked pixels and did not move `diff_percent` in the fourth decimal
// place — which sent two correction rounds chasing a number that could
// not move. Against an approved baseline the render is bit-for-bit
// deterministic (measured noise floor: 0.0000%), so the tolerance can be
// tight. Against a Figma export it cannot: tightening it there only
// inflates a number that already fails to order defects correctly.
const BASELINE_PIXELMATCH_THRESHOLD = 0.02;
const REFERENCE_PIXELMATCH_THRESHOLD = 0.1;

function diffPngPath(reportPath, nodeId) {
  return path.join(path.dirname(reportPath), 'diff', frameFilename(nodeId));
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads `<baselineDir>/index.json` — the baseline registry
 * `/relay-visual-approve` appends to when a human approves a capture.
 * Shape: `{ "<node_id>": { "png": "<repo-relative path>", "approved_at":
 * "<ISO>", "phase": <N> } }`. A registry of POINTERS rather than copied
 * files is deliberate: `/relay-visual-approve` is `Bash`-free by
 * contract (`Read`/`Glob`/`Edit`/`Write` only) and cannot copy a binary,
 * while the captures it points at are durable report artifacts already.
 * Returns `{}` when the registry is absent or unparseable — never
 * throws: an unreadable registry must degrade to `NO_BASELINE`, never
 * fail the run.
 */
export async function readBaselineRegistry(baselineDir) {
  if (!baselineDir) return {};
  try {
    const raw = await readFile(path.join(baselineDir, 'index.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Resolves which image a frame is diffed against, in order: an explicit
 * `frame.baseline_png`; a copied `<baselineDir>/<node-id>.png`; the
 * capture named by the baseline registry's entry for this node. Falls
 * back to the Figma export, in which case the caller must treat the
 * number as advisory (`NO_BASELINE`).
 */
export async function resolveComparisonBasis(frame, baselineDir, registry = {}) {
  const candidates = [];
  if (frame.baseline_png) candidates.push(frame.baseline_png);
  if (baselineDir) candidates.push(path.join(baselineDir, frameFilename(frame.node_id)));
  const registered = registry[frame.node_id];
  if (registered && registered.png) candidates.push(registered.png);
  for (const candidate of candidates) {
    // Sequential on purpose — first existing candidate wins, in order.
    // eslint-disable-next-line no-await-in-loop
    if (await fileExists(candidate)) {
      return { basis: 'approved-baseline', comparisonPath: candidate };
    }
  }
  return { basis: 'figma-reference', comparisonPath: frame.ref_png };
}

function clonePng(png) {
  const clone = new PNG({ width: png.width, height: png.height });
  png.data.copy(clone.data);
  return clone;
}

function applyMasks(png, masks) {
  if (!masks || masks.length === 0) return png;
  for (const mask of masks) {
    const { x, y, width, height } = mask;
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) {
        const idx = (png.width * row + col) << 2;
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 255;
      }
    }
  }
  return png;
}

async function loadPng(filePath) {
  const buffer = await readFile(filePath);
  return PNG.sync.read(buffer);
}

async function compareFrame(frame, capturedDir, reportPath, baselineDir, registry) {
  const capturedPath = path.join(capturedDir, frameFilename(frame.node_id));
  const { basis, comparisonPath } = await resolveComparisonBasis(frame, baselineDir, registry);

  const base = {
    node_id: frame.node_id,
    route: frame.route,
    comparison_basis: basis,
    comparison_png: comparisonPath ?? null,
    threshold: frame.diff_threshold,
    masked_regions: frame.masks ?? [],
  };

  let captured;
  let comparison;
  try {
    [captured, comparison] = await Promise.all([
      loadPng(capturedPath),
      loadPng(comparisonPath),
    ]);
  } catch (err) {
    return {
      ...base,
      diff_percent: null,
      diff_png: null,
      status: 'FAIL',
      error: `failed to load captured/comparison PNG: ${String((err && err.message) || err)}`,
    };
  }

  if (captured.width !== comparison.width || captured.height !== comparison.height) {
    return {
      ...base,
      diff_percent: null,
      diff_png: null,
      status: 'FAIL',
      error: `dimension mismatch: captured ${captured.width}x${captured.height} vs comparison ${comparison.width}x${comparison.height}`,
    };
  }

  const maskedCaptured = applyMasks(clonePng(captured), frame.masks);
  const maskedComparison = applyMasks(clonePng(comparison), frame.masks);

  const { width, height } = captured;
  const diffPng = new PNG({ width, height });
  const pixelmatchThreshold =
    frame.pixelmatch_threshold ??
    (basis === 'approved-baseline'
      ? BASELINE_PIXELMATCH_THRESHOLD
      : REFERENCE_PIXELMATCH_THRESHOLD);
  const diffPixels = pixelmatch(
    maskedCaptured.data,
    maskedComparison.data,
    diffPng.data,
    width,
    height,
    { threshold: pixelmatchThreshold, includeAA: false } // AA-tolerant: antialiased pixels are excluded from the diff count
  );

  // Always persist the diff overlay. The buffer already exists in
  // memory, and without it every FAIL is an uninspectable percentage -
  // the field session that produced these findings had to hand-write a
  // pixelmatch script to learn that one "fidelity failure" was in fact
  // an undersized mask.
  const outPath = diffPngPath(reportPath, frame.node_id);
  let writtenDiffPath = outPath;
  try {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, PNG.sync.write(diffPng));
  } catch {
    writtenDiffPath = null;
  }

  const diffPercent = (diffPixels / (width * height)) * 100;
  const status =
    basis === 'figma-reference'
      ? 'NO_BASELINE'
      : (diffPercent <= frame.diff_threshold ? 'PASS' : 'FAIL');

  const entry = {
    ...base,
    diff_percent: Number(diffPercent.toFixed(4)),
    pixelmatch_threshold: pixelmatchThreshold,
    diff_png: writtenDiffPath,
    status,
  };
  if (basis === 'figma-reference') {
    entry.advisory_reason =
      'no approved baseline for this frame yet — diff is against the Figma export and carries a permanent design-vs-implementation delta (mock placeholders vs. real data); it does not order defects and must not be read as PASS/FAIL. Human visual approval is required.';
  }
  return entry;
}

/**
 * Compares every frame in `manifestPath` (captured PNGs in `capturedDir`
 * vs. the frame's approved baseline when one exists, else its Figma
 * `ref_png`) and writes `fidelity-report.json` to `reportPath` — one
 * entry per frame, `{node_id, route, comparison_basis, comparison_png,
 * diff_percent, pixelmatch_threshold, threshold, diff_png, status,
 * masked_regions}` plus `advisory_reason` on a `NO_BASELINE` frame. A
 * diff overlay PNG is written to `<reportDir>/diff/<node-id>.png` for
 * every frame that got as far as being diffed. Never mutates a
 * reference, baseline or captured PNG.
 */
export async function compare(manifestPath, capturedDir, reportPath, baselineDir = null) {
  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  const registry = await readBaselineRegistry(baselineDir);

  const entries = [];
  for (const frame of manifest) {
    // Sequential on purpose — keeps per-frame failures independently
    // attributable and avoids large concurrent PNG buffers in memory.
    // eslint-disable-next-line no-await-in-loop
    entries.push(await compareFrame(frame, capturedDir, reportPath, baselineDir, registry));
  }

  await writeFile(reportPath, JSON.stringify(entries, null, 2), 'utf8');

  const ok = entries.every((entry) => entry.status === 'PASS');
  return { ok, entries, reportPath };
}

// CLI entry point. Cross-platform-correct guard: `pathToFileURL` normalizes
// path-separator (POSIX `/` vs Windows `\`) and URL-encoding differences so
// this comparison matches on both POSIX and Windows, unlike a naive
// `file://${process.argv[1]}` template-string comparison.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [manifestPath, capturedDir, reportPath, baselineDir] = process.argv.slice(2);
  if (!manifestPath || !capturedDir || !reportPath) {
    console.error('Usage: node compare.mjs <manifest.json> <capturedDir> <reportPath> [baselineDir]');
    process.exit(1);
  }
  const result = await compare(manifestPath, capturedDir, reportPath, baselineDir ?? null);
  process.exit(result.ok ? 0 : 1);
}
