# relay — documentation site

Self-contained interactive documentation for the `relay` plugin. Open
`documentation/index.html` in any modern browser — no server, no build
step required. All assets are loaded via relative paths so `file://`
access works.

> **Modifying this site?** Read [`AGENTS.md`](AGENTS.md) first — it is the
> binding contract for structure, CSS vocabulary, NAV/search/changelog
> registration, and forbidden changes. Applies to humans and AI agents alike.
> Every change must include an entry in [`changelog.html`](changelog.html).

## Reading the docs locally

```bash
# From the repo root, on Windows
start documentation/index.html

# macOS
open documentation/index.html

# Linux
xdg-open documentation/index.html
```

## Layout

```
documentation/
├── index.html                    entry point + landing page
├── README.md                     this file
├── assets/
│   ├── css/app.css               full stylesheet (theme, layout, components)
│   ├── js/app.js                 runtime: nav, theme, search, highlight, TOC
│   └── data/search-index.json    client-side search index
├── concepts/                     explanatory pages (what / why)
├── guide/                        how-to pages (step-by-step)
├── reference/                    API reference (commands / agents / schemas)
├── governance/                   decisions, anti-patterns, decision gate
├── roadmap/                      phase status + per-PRD roadmaps
└── examples/                     worked examples (phoenix dogfood, etc.)
```

## What's in this drop

This is **Part 1** of the documentation. Delivered pages:

- `index.html` — landing + pipeline overview + design rationale
- `concepts/pillars.html` — the three pillars (Init / Implement / Approve)
- `concepts/interactivity-boundary.html` — the single most important design choice
- `reference/commands.html` — full command surface reference
- `governance/decisions.html` — 14 stable decisions with rationale
- `roadmap/status.html` — current phase status + what's shipped vs pending

Planned for subsequent drops (sidebar links exist but pages TBD):

- `concepts/` — pipeline stages, test pair, PRP artifacts, graceful degradation
- `guide/` — installation, first run, writing a PRD, running tests, troubleshooting
- `reference/` — agents, skills, scripts, test-output schema, settings allowlist, redaction policy
- `governance/` — anti-patterns, decision gate
- `roadmap/` — Test Runner PRD detail
- `examples/` — Phoenix dogfood walkthrough

## Features (all implemented)

- **Dark / light theme** — toggle in the top bar; choice persists in `localStorage`
- **Sidebar navigation** — persistent across pages, highlights current page
- **Right-rail table of contents** — with scrollspy (hides on narrow screens)
- **Client-side search** — type `/` anywhere to focus; searches titles + excerpts from `assets/data/search-index.json`
- **Copy-to-clipboard** on every code block (hover to reveal button)
- **Syntax highlighting** — minimal vanilla JS tokenizer for common languages (no external deps)
- **Responsive** — drawer-style sidebar on mobile (≤ 640px); TOC hidden on tablets (≤ 1100px)
- **Prev/next footer** — auto-generated from sidebar order
- **Keyboard shortcuts** — `/` focuses search; `Esc` closes dropdown
- **No network dependencies** — everything runs offline

## Extending the docs

Adding a new page:

1. Create the HTML file in the appropriate subfolder.
2. Copy the boilerplate from any existing page (topbar / layout / content / TOC / footer blocks are the same structure).
3. Write content in the `<main class="content">` block. Use the CSS classes documented in `assets/css/app.css` — `.callout`, `.kv`, `.pipeline`, `.badge`, `.card-grid`, etc.
4. Add an entry to the `NAV` array in `assets/js/app.js` — this drives the sidebar and the prev/next footer.
5. Add a search entry to `assets/data/search-index.json` with `title`, `path`, `category`, `excerpt`.

That's it. No build step, no bundler, no framework.

## Keeping in sync with the source docs

This site is a rendering of the authoritative Markdown files in the plugin repo:

| Site page | Source of truth |
|-----------|----------------|
| Decisions | `docs/decisions.md` |
| Anti-patterns | `docs/anti-patterns.md` |
| Decision gate | `docs/decision-gate.md` |
| Commands | `docs/api-reference.md` + `plugins/relay/commands/*.md` |
| Agents | `plugins/relay/agents/*.md` |
| Test output schema | `plugins/relay/resources/test-output-schema.md` |
| Settings allowlist | `plugins/relay/resources/settings-allowlist.md` |
| Redaction policy | `plugins/relay/resources/redaction-policy.md` |
| PRD template | `plugins/relay/resources/prd-template.md` |
| Phase status | `PRPs/prds/test-runner.prd.md` (implementation phases) |

When the Markdown source changes, the corresponding HTML page should be regenerated or manually updated. Both directions are fine — this is a living doc. The HTML version is the team-facing / external-facing surface; the Markdown is the AI-facing / agent-consumed surface.

## Philosophy

- **Offline-first.** The whole site works from `file://` with no CDN. Copying the folder to a USB stick and emailing it to someone counts as shipping.
- **Progressive enhancement.** JS adds chrome, search, copy buttons, theme. If JS is disabled, the main content still renders and links still work.
- **No framework.** No React, no Vue, no bundler. Plain HTML + one CSS file + one JS file. A reader can inspect everything in ten minutes.
- **Style over chrome.** The typography, spacing, and code blocks do most of the visual work. Minimal icons, minimal animation.

## License

Same license as the relay plugin itself (TBD).
