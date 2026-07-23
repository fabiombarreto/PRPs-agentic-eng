#!/usr/bin/env node
// plugins/relay/scripts/visual/compare.mjs
//
// AA-tolerant pixel diff of captured screenshots against reference PNGs
// (relay Figma Implementation Track, Phase 6 — Visual loop). Applies any
// named mask regions (blacked out on in-memory copies of both images
// before diffing — the reference PNG on disk is never mutated), runs
// pixelmatch with antialiasing-awareness enabled, computes a diff
// percentage per frame, compares it against the frame's own diff
// threshold, and writes fidelity-report.json.
//
// Usage:
//   node compare.mjs <manifest.json> <capturedDir> <reportPath>

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

function frameFilename(nodeId) {
  return `${nodeId.replace(/[:/\\]/g, '-')}.png`;
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

async function compareFrame(frame, capturedDir) {
  const capturedPath = path.join(capturedDir, frameFilename(frame.node_id));

  let captured;
  let reference;
  try {
    [captured, reference] = await Promise.all([
      loadPng(capturedPath),
      loadPng(frame.ref_png),
    ]);
  } catch (err) {
    return {
      node_id: frame.node_id,
      route: frame.route,
      diff_percent: null,
      threshold: frame.diff_threshold,
      status: 'FAIL',
      masked_regions: frame.masks ?? [],
      error: `failed to load captured/reference PNG: ${String((err && err.message) || err)}`,
    };
  }

  if (captured.width !== reference.width || captured.height !== reference.height) {
    return {
      node_id: frame.node_id,
      route: frame.route,
      diff_percent: null,
      threshold: frame.diff_threshold,
      status: 'FAIL',
      masked_regions: frame.masks ?? [],
      error: `dimension mismatch: captured ${captured.width}x${captured.height} vs reference ${reference.width}x${reference.height}`,
    };
  }

  const maskedCaptured = applyMasks(clonePng(captured), frame.masks);
  const maskedReference = applyMasks(clonePng(reference), frame.masks);

  const { width, height } = captured;
  const diffPng = new PNG({ width, height });
  const diffPixels = pixelmatch(
    maskedCaptured.data,
    maskedReference.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1, includeAA: false } // AA-tolerant: antialiased pixels are excluded from the diff count
  );

  const diffPercent = (diffPixels / (width * height)) * 100;
  const status = diffPercent <= frame.diff_threshold ? 'PASS' : 'FAIL';

  return {
    node_id: frame.node_id,
    route: frame.route,
    diff_percent: Number(diffPercent.toFixed(4)),
    threshold: frame.diff_threshold,
    status,
    masked_regions: frame.masks ?? [],
  };
}

/**
 * Compares every frame in `manifestPath` (captured PNGs in `capturedDir`
 * vs. each frame's `ref_png`) and writes `fidelity-report.json` to
 * `reportPath` — one entry per frame, `{node_id, route, diff_percent,
 * threshold, status, masked_regions}`. Never mutates a reference PNG.
 */
export async function compare(manifestPath, capturedDir, reportPath) {
  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  const entries = [];
  for (const frame of manifest) {
    // Sequential on purpose — keeps per-frame failures independently
    // attributable and avoids large concurrent PNG buffers in memory.
    // eslint-disable-next-line no-await-in-loop
    entries.push(await compareFrame(frame, capturedDir));
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
  const [manifestPath, capturedDir, reportPath] = process.argv.slice(2);
  if (!manifestPath || !capturedDir || !reportPath) {
    console.error('Usage: node compare.mjs <manifest.json> <capturedDir> <reportPath>');
    process.exit(1);
  }
  const result = await compare(manifestPath, capturedDir, reportPath);
  process.exit(result.ok ? 0 : 1);
}
