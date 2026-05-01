# AGENTS.md — documentation site contract

**Audience:** any AI agent asked to modify anything inside `documentation/`.
**Status:** binding. Read this file in full before editing, adding, or
removing pages. Treat the conventions here the same way you treat
`docs/decisions.md` at the project root — settled rules, not suggestions.

If a request conflicts with this file, halt and surface the conflict to
the human instead of proceeding.

---

## 1. Why this file exists

The doc site is intentionally small in surface area (vanilla HTML + one
CSS file + one JS file, no build step). That simplicity only holds if
every change follows the same structure. Without an explicit contract:

- Pages drift apart — different breadcrumb styles, different heading
  levels, ad-hoc CSS classes.
- Nav / search / prev-next desynchronize — new pages invisible in
  sidebar, unsearchable, broken footer arrows.
- New CSS files / npm packages / CDN references creep in and break
  `file://` usage.
- Changelog is never updated, so version history is fiction.

This file is the single source of truth that prevents all of that.

---

## 2. Core invariants (never violate)

1. **No build step, no bundler, no framework.** Plain HTML + `assets/css/app.css` + `assets/js/app.js`. Do not add React, Vue, Tailwind, Markdown-to-HTML generators, or any npm dependency.
2. **No network dependencies.** No CDN `<link>` or `<script>`, no Google Fonts, no external icons, no remote images. Everything must work from `file://` after cloning the repo.
3. **No new CSS files or new JS files.** Extend `app.css` and `app.js` instead. One stylesheet, one script — that's a hard constraint.
4. **No inline `<style>` blocks and no inline `style=""` attributes.** All visual rules live in `app.css`.
5. **No emojis anywhere** — in page copy, headings, code blocks, changelog entries, or commit messages. (Consistent with the project-wide rule in `CLAUDE.md`.)
6. **No screenshots or binary images** unless the user explicitly asks. The site communicates with typography, layout, and code blocks.
7. **Every new page must be registered in three places.** NAV (sidebar), search index (search), changelog (history). See §6.
8. **Relative paths only.** Never `/documentation/...` absolute. Paths to assets use `../` or `../../` depending on page depth — see existing pages for the pattern.

---

## 3. Directory layout

```
documentation/
├── index.html                      landing page (Getting started)
├── AGENTS.md                       this file
├── README.md                       human-facing reading guide
├── changelog.html                  version history (see §7)
├── assets/
│   ├── css/app.css                 full stylesheet
│   ├── js/app.js                   runtime (NAV, theme, search, TOC, highlight)
│   └── data/search-index.json      client-side search index
├── concepts/                       explanatory pages (what / why)
├── guide/                          how-to pages (step-by-step)
├── reference/                      API reference (commands, agents, schemas)
├── governance/                     decisions, anti-patterns, decision gate
├── roadmap/                        phase status + per-PRD roadmaps
└── examples/                       worked examples
```

**Creating a new top-level folder** is allowed but requires:

1. User approval (the folder represents a new content category).
2. A new NAV section for it (see §6).
3. A changelog entry documenting the addition.

Do not create a folder just to house one page — put the page in an
existing folder that fits, or propose the new folder explicitly.

---

## 4. Canonical page template

Every new HTML page MUST start from this skeleton. Copy, adapt the
breadcrumb / title / content, leave everything else alone:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Page title — relay</title>
  <link rel="stylesheet" href="../assets/css/app.css" />
</head>
<body>
  <header class="topbar"></header>
  <div class="layout">
    <aside class="sidebar"></aside>
    <main class="content">

      <div class="breadcrumb">
        <a href="../index.html">Home</a>
        <span class="breadcrumb__sep">›</span>
        <span>Section name</span>
        <span class="breadcrumb__sep">›</span>
        <span>Page name</span>
      </div>

      <h1>Page title</h1>
      <p class="page-subtitle">One paragraph of plain prose. No jargon without definition. Says what this page is about and why the reader should read it.</p>

      <h2 id="first-section">First section</h2>
      <!-- content -->

      <div class="page-footer"></div>
    </main>
    <aside class="toc"></aside>
  </div>
  <script src="../assets/js/app.js"></script>
</body>
</html>
```

**Rules:**

- `lang="en" data-theme="dark"` — English content, dark theme as the default document attribute. The user's chosen theme overrides via `localStorage`; `data-theme="dark"` is the fallback when no choice is stored.
- `title` tag: `"Page name — relay"` (em dash, not hyphen).
- `<header class="topbar">`, `<aside class="sidebar">`, `<aside class="toc">`, and `<div class="page-footer">` are placeholders — `app.js` fills them at runtime.
- `<h1>` appears exactly once, right after the breadcrumb. Use `<h2>` for top-level sections, `<h3>` for subsections. Do not skip levels.
- Every `<h2>` and `<h3>` that readers will link to must have an `id="kebab-case-slug"`. These feed the right-rail TOC.
- Keep paragraphs short (3–6 lines). Prefer lists for parallel structure.
- End every page with the `<div class="page-footer"></div>` inside `<main>`, followed by the `<aside class="toc">` and the `<script>` tag — in that order.

---

## 5. CSS vocabulary (use these, don't invent new ones)

The following classes exist in `app.css`. Prefer them over new markup.
When a genuinely new visual component is needed, extend `app.css` — do
not inline styles.

### 5.1 Callouts

```html
<div class="callout callout--note">      <!-- informational, purple -->
  <div class="callout__title">Heading</div>
  <p>Body.</p>
</div>
```

Variants:

| Class | Purpose | When to use |
|-------|---------|-------------|
| `callout--note` | Informational | Background context, canonical-source pointers, "by the way" |
| `callout--warn` | Warning, yellow | Things that often go wrong, non-blocking caveats |
| `callout--error` | Forbidden / critical, red | Anti-patterns, destructive operations, "must not" |
| `callout--success` | Confirmation, green | Post-check confirmations, "you did it right" |

### 5.2 Key-value blocks

For term/definition lists (method parameters, concept glossaries, per-phase attributes):

```html
<div class="kv">
  <dt>Term</dt><dd>Definition text here.</dd>
  <dt>Another term</dt><dd>Another definition.</dd>
</div>
```

Prefer `.kv` over `<table>` for two-column structured content. `<table>` is fine for genuinely tabular data with 3+ columns.

### 5.3 Badges

```html
<span class="badge badge--done">Complete</span>
```

Variants (these are the ONLY ones that exist — do NOT use `badge--ok`, `badge--wip`, etc.):

| Class | Color | Typical text |
|-------|-------|--------------|
| `badge--done`    | green  | "Complete", "Shipped", "GREEN" |
| `badge--partial` | yellow | "Partial", "WIP", "Known gap" |
| `badge--pending` | gray   | "Not started", "Planned", "Deferred" |
| `badge--info`    | blue   | "Reference", "Note", neutral marker |

### 5.4 Card grids

```html
<div class="card-grid">
  <a class="card" href="target.html">
    <div class="card__title">Title</div>
    <div class="card__desc">One-sentence description.</div>
  </a>
</div>
```

Use for the landing page and section index pages only. Not for mid-article navigation.

### 5.5 Pipeline diagrams

For ordered-stage visualizations (writer → reviewer → runner):

```html
<div class="pipeline">
  <div class="pipeline__row pipeline__row--interactive">
    <div class="pipeline__label">Stage</div>
    <div class="pipeline__text">Description.</div>
  </div>
  <div class="pipeline__arrow">↓</div>
  <div class="pipeline__row pipeline__row--autonomous">
    <div class="pipeline__label">Stage</div>
    <div class="pipeline__text">Description.</div>
  </div>
</div>
```

Row modifiers: `pipeline__row--interactive` (blue), `pipeline__row--autonomous` (green), `pipeline__row--manual` (purple).

### 5.6 Hero block (landing pages only)

```html
<section class="hero">
  <div class="hero__eyebrow">Eyebrow text</div>
  <h1 class="hero__title">Title</h1>
  <p class="hero__sub">Subtitle.</p>
</section>
```

Reserved for `index.html` and section landing pages. Do NOT use on regular content pages — the standard `<h1>` + `.page-subtitle` pattern is correct there.

### 5.7 Code blocks

Language hints supported by `app.js`'s tokenizer: `language-default`, `language-bash`, `language-json`. Others render as plain text (which is fine).

```html
<pre><code class="language-json">{ "key": "value" }</code></pre>
```

Indent-sensitive — keep the content left-aligned; any leading whitespace shows up in the rendered block.

---

## 6. Registration — the three coupled files

Whenever you add, rename, or remove a page, you MUST update all three of:

### 6.1 NAV in `assets/js/app.js`

The `NAV` array near the top of `app.js` drives:
- Sidebar rendering
- Prev/next footer order
- Active-page highlight

Edit the relevant section, add the item in the right position (alphabetic within a section is fine; logical reading order is better):

```js
{
  heading: "Guide",
  items: [
    { title: "Writing a PRD",  path: "guide/writing-a-prd.html" },
    { title: "Running tests",  path: "guide/running-tests.html" },
    { title: "Your new page",  path: "guide/your-new-page.html" },  // <-- here
  ],
},
```

**Rule:** every page that exists in `documentation/` MUST appear in NAV. An orphan HTML file is a bug. If a page is intentionally unlisted (rare), document why in a comment next to NAV.

### 6.2 Search index at `assets/data/search-index.json`

Add one object per page:

```json
{
  "title": "Your new page",
  "path": "guide/your-new-page.html",
  "category": "Guide",
  "excerpt": "One-sentence plain-language summary — the first hit readers see when searching. Optimize for discovery keywords; 15–35 words."
}
```

- `category` must match the NAV section heading exactly (case-sensitive).
- `excerpt` is what appears under the title in search results — make it count.

### 6.3 Changelog entry in `changelog.html`

Every user-visible change gets an entry under the current unreleased
version. See §7 for the format.

---

## 7. Changelog — versioning and format

`documentation/changelog.html` is the human-facing history of the doc
site. Rules:

### 7.1 Versioning

The doc site uses semver:

- **Patch (0.x.Y)** — typo fixes, wording tweaks, broken-link fixes, accessibility fixes. No structural change.
- **Minor (0.X.0)** — new pages, new sections, new NAV entries, new CSS components. Existing content unchanged.
- **Major (X.0.0)** — breaking restructure: renamed top-level folders, removed pages, broken-link-inducing reshuffles, overhauled theme. Accompany with a migration note in the changelog entry.

The project is pre-1.0; expect minor bumps frequently, major bumps rarely.

The doc-site version was historically described as "independent of the plugin version", but as of 2026-04-30 the two are kept in lock-step (see §7.5 below + `docs/decisions.md` 2026-04-30). The numbers are conceptually distinct (the changelog tracks doc-site changes; the plugin manifest identifies the plugin) but they share the same value to keep Claude Code's plugin cache invalidation aligned with shipped contracts.

### 7.2 Entry shape

Each release block uses the section vocabulary from
[keepachangelog.com](https://keepachangelog.com/) (without importing the
site — we just follow the convention):

- **Added** — new pages, sections, components
- **Changed** — edits to existing pages that altered meaning
- **Deprecated** — content marked for future removal
- **Removed** — deleted pages or sections (with redirect notes if applicable)
- **Fixed** — bugs: broken links, wrong code, missing NAV entries, CSS errors
- **Security** — only if we ever get there

### 7.3 Unreleased section

Keep an `Unreleased` block at the top of the changelog while accumulating
changes. When the user (or you, on their request) cuts a release,
rename `Unreleased` to the new version with today's date and start a
fresh empty `Unreleased` block.

### 7.4 Where entries come from

Every PR / commit that touches `documentation/` must include a
corresponding changelog update. No silent changes. If you're uncertain
whether a change is user-visible, err on the side of logging it — deleting
an entry later is cheap.

### 7.5 Plugin manifest version sync (binding)

**Every minor or major release cut in `changelog.html` MUST also bump
`plugins/relay/.claude-plugin/plugin.json`'s `version` field to the
same value, in the same commit.**

This rule is binding because Claude Code keys its plugin cache on the
manifest version: `~/.claude/plugins/cache/relay-marketplace/relay/<version>/`.
A stale `plugin.json` (e.g. frozen at `0.1.0` while the changelog
ships `0.8.0`) means installed users keep loading the cached old
plugin even after the marketplace publishes new commands and agents.

**Rules:**

- **Minor (0.X.0) or major (X.0.0) bump in changelog** → bump
  `plugin.json` to the same version in the same commit. Always.
- **Patch (0.x.Y) bump in changelog** → bump `plugin.json` ONLY if
  the patch ships a plugin asset (anything under `plugins/relay/`).
  Pure doc-site copy fixes (typos, wording tweaks confined to
  `documentation/`) do NOT require a plugin bump.
- **The two version numbers are identical from 2026-04-30 onward.**
  The "independent versions" framing in §7.1 was revised — they
  remain conceptually distinct but share the same number to keep
  cache invalidation aligned.

**When cutting a release that includes plugin changes**, the
changelog block MUST list the plugin bump under `Changed`:

```html
<li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
  &mdash; version bumped <code>0.X.Y</code> &rarr; <code>0.A.B</code> to
  match this release; users running <code>/plugin</code> after pulling
  this version will get a fresh <code>relay/0.A.B/</code> cache directory
  with all newly-shipped commands and agents registered.</li>
```

**When the rule was missed (drift cleanup):** if a release shipped
without a plugin bump, the next release (or a dedicated patch)
must bump the plugin to the most-recent changelog version and document
the back-fill in the entry's Changed section. Drift is a bug; the
fix is always to align forward, never to roll the changelog back.

**Rationale, in one sentence:** without the bump, the plugin you
just shipped is invisible to users who already had a previous version
installed.

For the durable contract behind this rule, see
[`docs/decisions.md` 2026-04-30 entry "Plugin manifest version is
bumped on every minor/major release cut"](../docs/decisions.md).

---

## 8. Workflow — adding a new page (checklist)

Follow in order. Don't skip.

1. [ ] **Decide the folder.** Concept / guide / reference / governance / roadmap / example. If none fits, propose a new folder to the user and wait.
2. [ ] **Pick the slug.** Kebab-case, descriptive, not clever. Filename = URL = page identity.
3. [ ] **Copy the template from §4.** Do not start from an existing page with lots of content — you'll inherit its structure, not this contract's structure.
4. [ ] **Write the content.** Page-subtitle is mandatory. Use h2/h3 with explicit `id`s. Prefer `.callout` / `.kv` / `.card-grid` / `.pipeline` over ad-hoc markup.
5. [ ] **Add NAV entry** in `assets/js/app.js` (§6.1).
6. [ ] **Add search index entry** in `assets/data/search-index.json` (§6.2).
7. [ ] **Add changelog entry** under `Unreleased` in `changelog.html` (§6.3 / §7).
8. [ ] **Visually verify.** Open the page in a browser; confirm: sidebar highlight, TOC populates, prev/next works, search finds it, theme toggle still works.
9. [ ] **Commit.** Message format: `docs(site): <imperative summary>`. Example: `docs(site): add redaction-policy page under Reference`.

---

## 9. Workflow — modifying an existing page

1. [ ] **Read the full page first.** Don't edit a single section blind — drift between sections is one of the easiest mistakes.
2. [ ] **Preserve structure.** Don't convert `.kv` blocks to tables, don't rename `id` slugs (breaks existing links and TOC anchors).
3. [ ] **If you change a slug, changing other pages' hrefs is mandatory** — grep for the old anchor across `documentation/`.
4. [ ] **Update `page-subtitle`** if the scope of the page changed.
5. [ ] **Log it in changelog** under `Unreleased` / `Changed` (or `Fixed`).

---

## 10. Workflow — deleting a page

Deletion is breaking for:

- Incoming links from other pages.
- Search results that cached the title.
- Any external reference (if the site is published).

Steps:

1. [ ] **Grep for the path.** `documentation/` + `docs/` + `CLAUDE.md` + top-level READMEs. Fix every link before removing the file.
2. [ ] **Remove from NAV.**
3. [ ] **Remove from search-index.json.**
4. [ ] **Delete the file.**
5. [ ] **Changelog entry under `Removed`** with a note on what content moved where (or "content merged into `<other page>`").
6. [ ] **Consider a stub redirect page** if the URL might be cached elsewhere. Minimal HTML with a `<meta http-equiv="refresh">` to the new location. Only if justified — usually overkill.

---

## 11. Workflow — adding new CSS or JS behavior

Rare but occasionally needed.

### CSS:

1. [ ] **Try to reuse an existing component first.** Don't add a new callout variant if `callout--note` fits.
2. [ ] **Edit `assets/css/app.css`.** Add the rules in the right section — tokens at top, components grouped, media queries at bottom. Match the file's comment-banner style.
3. [ ] **Use existing theme tokens** (`var(--accent)`, `var(--bg-elevated)`, etc.) — don't hardcode colors.
4. [ ] **Test both themes.** Dark is default; toggle to light and confirm legibility.
5. [ ] **Document the new class in this file (§5) as part of the same change.**
6. [ ] **Changelog entry under `Added`.**

### JS:

1. [ ] **Edit `assets/js/app.js`** inside the existing IIFE. No new script files.
2. [ ] **No external dependencies.** Vanilla only.
3. [ ] **Preserve progressive enhancement.** If JS is disabled, main content must still render. Don't put critical content behind a JS render.
4. [ ] **Initialize in the existing `init()` sequence at the bottom.**
5. [ ] **Changelog entry under `Added` or `Changed`.**

---

## 12. Content voice

- **Direct, not promotional.** "The gate fails closed" beats "we believe the gate should fail closed."
- **Define jargon on first use.** Link to the canonical page instead of re-explaining.
- **Show, then explain.** Code block / example first, prose afterward, not the other way around.
- **No first person.** No "we recommend" — just state the rule.
- **British / American English: pick American.** ("optimize" not "optimise", "behavior" not "behaviour").
- **Trailing punctuation in lists: consistent within a page** — either all items end with `.` or none do.

---

## 13. Halt conditions

Stop and ask the user instead of proceeding when:

- The requested change conflicts with an invariant in §2.
- The change needs a new top-level folder (§3).
- The change needs a new npm package, CDN, or external dependency.
- The change would remove a published page without a documented replacement.
- The user asks to "redesign the site" or "use framework X" — that's a §2 conflict.

---

## 14. Related canonical sources

- `documentation/README.md` — human-facing reading guide (not binding for AI; points humans at the site).
- `CLAUDE.md` (repo root) — Tier 1 project memory; references this file.
- `docs/decisions.md` — plugin-level binding decisions. The doc site's HTML is downstream of these.
- `docs/anti-patterns.md` — plugin-level forbidden patterns. Independent of the site's `callout--error` blocks (which are rendered content), but the site's own anti-patterns (this file §2, §13) follow the same spirit.
