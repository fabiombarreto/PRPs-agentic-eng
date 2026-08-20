#!/usr/bin/env node
// plugins/relay/scripts/visual/capture.mjs
//
// Captures one screenshot per in-scope frame from a JSON frame manifest
// built from a Design Spec's `## Visual Acceptance Criteria` table
// (relay Figma Implementation Track, Phase 6 — Visual loop). Waits for
// the dev server to become ready via provision.mjs's `waitForDevServer`,
// then drives a headless Chromium browser through each frame's
// route/viewport, reusing a Playwright storage-state file when the
// frame's `auth_mode` names one — this script never performs its own
// login flow. Every browser context is created with `baseURL` set to the
// resolved dev-server URL, so a frame's `route` may be a relative path
// (`/checkout/confirmation`) — the form Design Spec `## Visual Acceptance
// Criteria` tables naturally use — or an absolute URL. Both resolve.
//
// Usage:
//   node capture.mjs <manifest.json> <outputDir> [devServerUrl]
//
// Manifest shape (one entry per Visual Acceptance Criteria row):
//   [
//     {
//       "node_id": "123:456",
//       "route": "/checkout/confirmation",
//       "preconditions": "cart has 1 item",
//       "auth_mode": "storage-state:PRPs/designs/<feature>/auth/session.json" | "none",
//       "viewport": { "width": 1440, "height": 900 },
//       "diff_threshold": 0.5,
//       "ref_png": "PRPs/designs/<feature>/refs/123-456.png",
//       "masks": [],
//       "interaction": "click(<selector>); wait(300)" | "none"
//     }
//   ]

import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { waitForDevServer } from './provision.mjs';

// `127.0.0.1`, never `localhost`: on hosts where `localhost` resolves to
// IPv6 first, a dev server listening only on IPv4 answers
// `http://127.0.0.1:3000/` while `http://[::1]:3000/` never responds —
// which surfaces as an unexplained capture timeout.
const DEFAULT_DEV_SERVER_URL = 'http://127.0.0.1:3000';
const DEV_SERVER_TIMEOUT_MS = 30_000;

function parseAuthMode(authMode) {
  if (!authMode || authMode === 'none') return null;
  const prefix = 'storage-state:';
  if (authMode.startsWith(prefix)) {
    return authMode.slice(prefix.length);
  }
  return null;
}

function frameFilename(nodeId) {
  return `${nodeId.replace(/[:/\\]/g, '-')}.png`;
}

// Bounded interaction-step vocabulary — mirrors
// ${CLAUDE_PLUGIN_ROOT}/resources/design-spec-template.md's `Interaction` column syntax
// exactly: click(<selector>), fill(<selector>, <value>),
// wait(<ms> | <selector>), semicolon-separated, executed in order
// before capture. Absent/"none" parses to zero steps (additive,
// zero-effect on every frame that declares no Interaction script).
const INTERACTION_STEP_PATTERN = /^(click|fill|wait)\((.*)\)$/;

export function parseInteractionScript(interaction) {
  if (!interaction || interaction === 'none') return [];
  return interaction.split(';').map((raw) => {
    const step = raw.trim();
    const match = step.match(INTERACTION_STEP_PATTERN);
    if (!match) {
      throw new Error(`unrecognized interaction step: "${step}"`);
    }
    const [, verb, argsRaw] = match;
    if (verb === 'click') {
      return { verb: 'click', selector: argsRaw.trim() };
    }
    if (verb === 'fill') {
      const [selector, ...valueParts] = argsRaw.split(',');
      return { verb: 'fill', selector: selector.trim(), value: valueParts.join(',').trim() };
    }
    const arg = argsRaw.trim();
    if (/^\d+$/.test(arg)) {
      return { verb: 'wait', ms: Number(arg) };
    }
    return { verb: 'wait', selector: arg };
  });
}

export async function executeInteractionSteps(page, steps) {
  for (const step of steps) {
    // Sequential on purpose — an ordered choreography script.
    // eslint-disable-next-line no-await-in-loop
    if (step.verb === 'click') {
      await page.click(step.selector);
    } else if (step.verb === 'fill') {
      await page.fill(step.selector, step.value);
    } else if (step.verb === 'wait' && step.ms != null) {
      await page.waitForTimeout(step.ms);
    } else if (step.verb === 'wait') {
      await page.waitForSelector(step.selector);
    }
  }
}

async function captureFrame(browser, frame, outputDir, baseURL) {
  const storageStatePath = parseAuthMode(frame.auth_mode);
  const contextOptions = {
    viewport: frame.viewport ?? { width: 1440, height: 900 },
    // Relative `route` values resolve against the dev server; absolute
    // URLs in a manifest keep working unchanged (Playwright ignores
    // `baseURL` when `goto` receives an absolute URL).
    baseURL,
  };
  if (storageStatePath) {
    contextOptions.storageState = storageStatePath;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  try {
    await page.goto(frame.route, { waitUntil: 'networkidle' });
    const interactionSteps = parseInteractionScript(frame.interaction);
    if (interactionSteps.length > 0) {
      await executeInteractionSteps(page, interactionSteps);
    }
    const outputPath = path.join(outputDir, frameFilename(frame.node_id));
    await page.screenshot({ path: outputPath, fullPage: false });
    return { node_id: frame.node_id, captured: true, path: outputPath };
  } catch (err) {
    return {
      node_id: frame.node_id,
      captured: false,
      error: String((err && err.message) || err),
    };
  } finally {
    await context.close();
  }
}

/**
 * Boots (waits for) the dev server, then captures one PNG per frame in
 * `manifestPath` into `outputDir`. `devServerUrl` doubles as the browser
 * context's `baseURL`, so relative `route` values resolve against it. Returns `{ ok, results, reason? }`;
 * `reason: "DEV_SERVER_TIMEOUT"` signals the trigger for the caller's
 * DEGRADED_STATIC_ONLY rung — no browser is launched in that case.
 */
export async function capture(manifestPath, outputDir, devServerUrl = DEFAULT_DEV_SERVER_URL) {
  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  const readiness = await waitForDevServer(devServerUrl, { timeoutMs: DEV_SERVER_TIMEOUT_MS });
  if (!readiness.ready) {
    console.error('CAPTURE_FAILED_DEV_SERVER_TIMEOUT');
    return { ok: false, reason: 'DEV_SERVER_TIMEOUT', results: [] };
  }

  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const frame of manifest) {
      // Sequential on purpose — keeps dev-server load predictable and
      // per-frame failures independently attributable.
      // eslint-disable-next-line no-await-in-loop
      const result = await captureFrame(browser, frame, outputDir, devServerUrl);
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  const ok = results.every((r) => r.captured);
  return { ok, results };
}

// CLI entry point. Cross-platform-correct guard: `pathToFileURL` normalizes
// path-separator (POSIX `/` vs Windows `\`) and URL-encoding differences so
// this comparison matches on both POSIX and Windows, unlike a naive
// `file://${process.argv[1]}` template-string comparison.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [manifestPath, outputDir, devServerUrl] = process.argv.slice(2);
  if (!manifestPath || !outputDir) {
    console.error('Usage: node capture.mjs <manifest.json> <outputDir> [devServerUrl]');
    process.exit(1);
  }
  const result = await capture(manifestPath, outputDir, devServerUrl);
  process.exit(result.ok ? 0 : 1);
}
