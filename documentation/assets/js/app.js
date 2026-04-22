/* =====================================================================
   relay documentation — app.js
   Single-file runtime for the static doc site. Handles:
     - Sidebar navigation rendering (from nav structure below)
     - Top bar + theme toggle
     - Light syntax highlighting (no external dependencies)
     - Copy-to-clipboard on code blocks
     - Table of contents (right rail) with scrollspy
     - Client-side search across a pre-built index
     - Page-footer prev/next based on nav order
   Every page in documentation/ loads this one script at the bottom of
   <body>. The script auto-runs and handles everything from there.
===================================================================== */

(function () {
  "use strict";

  // ---------- Nav structure (single source of truth) ----------
  // Order here drives the sidebar AND prev/next footer. Paths are
  // relative to documentation/.

  const NAV = [
    {
      heading: "Getting started",
      items: [
        { title: "Introduction",        path: "index.html" },
        { title: "Installation",        path: "guide/installation.html" },
        { title: "First run",           path: "guide/first-run.html" },
      ],
    },
    {
      heading: "Concepts",
      items: [
        { title: "The three pillars",       path: "concepts/pillars.html" },
        { title: "Interactivity boundary",  path: "concepts/interactivity-boundary.html" },
        { title: "Pipeline stages",         path: "concepts/pipeline.html" },
        { title: "TDD opt-in",              path: "concepts/tdd-track.html" },
        { title: "PRP artifact paths",      path: "concepts/prp-artifacts.html" },
        { title: "Graceful degradation",    path: "concepts/graceful-degradation.html" },
      ],
    },
    {
      heading: "Guide",
      items: [
        { title: "Writing a PRD",           path: "guide/writing-a-prd.html" },
        { title: "Running tests",           path: "guide/running-tests.html" },
        { title: "Handling failures",       path: "guide/handling-failures.html" },
        { title: "Post-green review",       path: "guide/post-green-review.html" },
        { title: "Troubleshooting",         path: "guide/troubleshooting.html" },
      ],
    },
    {
      heading: "Reference",
      items: [
        { title: "Commands",                path: "reference/commands.html" },
        { title: "Agents",                  path: "reference/agents.html" },
        { title: "Skills",                  path: "reference/skills.html" },
        { title: "Scripts",                 path: "reference/scripts.html" },
        { title: "Test output schema",      path: "reference/test-output-schema.html" },
        { title: "Settings allowlist",      path: "reference/settings-allowlist.html" },
        { title: "Redaction policy",        path: "reference/redaction-policy.html" },
      ],
    },
    {
      heading: "Governance",
      items: [
        { title: "Decisions",               path: "governance/decisions.html" },
        { title: "Anti-patterns",           path: "governance/anti-patterns.html" },
        { title: "Decision gate",           path: "governance/decision-gate.html" },
      ],
    },
    {
      heading: "Roadmap",
      items: [
        { title: "Phase status",            path: "roadmap/status.html" },
        { title: "Test Runner PRD",         path: "roadmap/test-runner-prd.html" },
      ],
    },
    {
      heading: "Examples",
      items: [
        { title: "Phoenix dogfood",         path: "examples/phoenix-dogfood.html" },
      ],
    },
    {
      heading: "Meta",
      items: [
        { title: "Changelog",               path: "changelog.html" },
      ],
    },
  ];

  // Flatten for prev/next and search
  const NAV_FLAT = NAV.flatMap(sec =>
    sec.items.map(item => ({ ...item, category: sec.heading }))
  );

  // ---------- Helpers ----------

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function pathDepth() {
    // Documentation root is served at /documentation/. We need the
    // relative prefix from the current page to the documentation root.
    const parts = window.location.pathname.split("/");
    // Find "documentation" in the path; everything after is nesting.
    const docIdx = parts.indexOf("documentation");
    if (docIdx === -1) return "";
    // e.g., /.../documentation/concepts/pillars.html → depth 1 (concepts/)
    const nesting = parts.length - docIdx - 2; // -2: "documentation" itself and the filename
    return nesting <= 0 ? "" : "../".repeat(nesting);
  }

  function relativeTo(target) {
    return pathDepth() + target;
  }

  function currentPagePath() {
    // Returns the current page path relative to documentation/.
    const parts = window.location.pathname.split("/");
    const docIdx = parts.indexOf("documentation");
    if (docIdx === -1) return "index.html";
    const tail = parts.slice(docIdx + 1).filter(Boolean);
    if (tail.length === 0) return "index.html";
    return tail.join("/");
  }

  // ---------- Topbar render ----------

  function renderTopbar() {
    const topbar = $(".topbar");
    if (!topbar) return;
    const prefix = pathDepth();
    topbar.innerHTML = `
      <button class="icon-btn mobile-nav-toggle" aria-label="Open navigation">☰</button>
      <a class="topbar__brand" href="${prefix}index.html">
        <span class="topbar__brand-dot"></span>
        <span>relay</span>
        <span class="topbar__version">0.5 · docs</span>
      </a>
      <div class="topbar__actions">
        <div class="search-wrap">
          <input
            class="topbar__search"
            type="search"
            placeholder="Search docs…"
            aria-label="Search documentation"
            id="search-input"
          />
          <div class="search-results" id="search-results"></div>
        </div>
        <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme">◐</button>
      </div>
    `;
  }

  // ---------- Sidebar render ----------

  function renderSidebar() {
    const sidebar = $(".sidebar");
    if (!sidebar) return;
    const prefix = pathDepth();
    const current = currentPagePath();

    sidebar.innerHTML = NAV.map(section => {
      const items = section.items.map(item => {
        const activeClass = item.path === current ? "sidebar__link--active" : "";
        return `<li><a class="sidebar__link ${activeClass}" href="${prefix}${item.path}">${item.title}</a></li>`;
      }).join("");
      return `
        <div class="sidebar__section">
          <h3 class="sidebar__heading">${section.heading}</h3>
          <ul class="sidebar__list">${items}</ul>
        </div>
      `;
    }).join("");
  }

  // ---------- Theme toggle ----------

  function initTheme() {
    const saved = localStorage.getItem("relay-docs-theme");
    const theme = saved || "dark";
    document.documentElement.setAttribute("data-theme", theme);

    const btn = $("#theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("relay-docs-theme", next);
    });
  }

  // ---------- Mobile nav ----------

  function initMobileNav() {
    const toggle = $(".mobile-nav-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.classList.toggle("nav-open");
    });
    document.body.addEventListener("click", (e) => {
      if (!e.target.closest(".sidebar") && document.body.classList.contains("nav-open")) {
        document.body.classList.remove("nav-open");
      }
    });
  }

  // ---------- Syntax highlight ----------
  // Very lightweight tokenizer. Good enough for docs — not a replacement
  // for Prism. Recognizes keywords, strings, comments, numbers.

  const LANG_RULES = {
    default: {
      keywords: ["if", "else", "for", "while", "return", "const", "let", "var",
                 "function", "class", "import", "export", "from", "async", "await",
                 "true", "false", "null", "undefined", "new", "this", "try",
                 "catch", "throw", "def", "in", "is", "None", "True", "False",
                 "as", "with", "lambda", "yield", "raise", "pass", "break", "continue"],
      types:    ["string", "int", "float", "bool", "void", "any", "number", "boolean"],
      comment:  /(^|[^:\/])(\/\/.*?$|#.*?$|\/\*[\s\S]*?\*\/)/gm,
      string:   /(['"`])((?:\\.|(?!\1).)*?)\1/g,
      number:   /\b\d+(?:\.\d+)?\b/g,
      fn:       /\b([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()/g,
    },
    bash: {
      keywords: ["if", "then", "else", "fi", "for", "in", "do", "done", "while",
                 "function", "return", "export", "echo", "set", "source"],
      comment:  /(^|[^\\])(#.*?$)/gm,
      string:   /(['"])((?:\\.|(?!\1).)*?)\1/g,
      number:   /\b\d+\b/g,
    },
    json: {
      keywords: ["true", "false", "null"],
      string:   /"((?:\\.|[^"\\])*)"/g,
      number:   /\b-?\d+(?:\.\d+)?\b/g,
    },
  };

  function highlight(code, lang) {
    const rules = LANG_RULES[lang] || LANG_RULES.default;
    // Escape HTML first
    let html = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Apply in order: comments → strings → numbers → keywords → types → functions
    if (rules.comment) {
      html = html.replace(rules.comment, (m, pre, c) => `${pre}<span class="tok-cmt">${c}</span>`);
    }
    if (rules.string) {
      html = html.replace(rules.string, (m) => `<span class="tok-str">${m}</span>`);
    }
    if (rules.number) {
      html = html.replace(rules.number, (m) => `<span class="tok-num">${m}</span>`);
    }
    if (rules.keywords) {
      const kwPattern = new RegExp("\\b(" + rules.keywords.join("|") + ")\\b", "g");
      html = html.replace(kwPattern, (m) => `<span class="tok-kw">${m}</span>`);
    }
    if (rules.types) {
      const tPattern = new RegExp("\\b(" + rules.types.join("|") + ")\\b", "g");
      html = html.replace(tPattern, (m) => `<span class="tok-typ">${m}</span>`);
    }
    if (rules.fn) {
      html = html.replace(rules.fn, (m, name) => `<span class="tok-fn">${name}</span>`);
    }
    return html;
  }

  function highlightAll() {
    $$("pre > code").forEach(code => {
      const raw = code.textContent;
      const cls = (code.className || "").match(/language-(\w+)/);
      const lang = cls ? cls[1] : "default";
      // Only highlight if not already processed (idempotent)
      if (!code.dataset.hl) {
        code.innerHTML = highlight(raw, lang);
        code.dataset.hl = "1";
        code.dataset.raw = raw;
      }
    });
  }

  // ---------- Copy buttons ----------

  function addCopyButtons() {
    $$("pre").forEach(pre => {
      if (pre.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code");
        const text = (code && code.dataset.raw) || (code && code.textContent) || "";
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied";
          btn.classList.add("copy-btn--copied");
          setTimeout(() => {
            btn.textContent = "Copy";
            btn.classList.remove("copy-btn--copied");
          }, 1400);
        }).catch(() => {
          btn.textContent = "Failed";
          setTimeout(() => { btn.textContent = "Copy"; }, 1400);
        });
      });
      pre.appendChild(btn);
    });
  }

  // ---------- Table of contents (right rail) ----------

  function renderTOC() {
    const toc = $(".toc");
    if (!toc) return;
    const content = $(".content");
    if (!content) return;
    const headings = $$("h2, h3", content).filter(h => h.id);
    if (headings.length < 2) {
      toc.style.display = "none";
      return;
    }
    const items = headings.map(h => {
      const lvl = h.tagName === "H2" ? "2" : "3";
      return `<li class="lvl-${lvl}"><a href="#${h.id}" data-href="${h.id}">${h.textContent}</a></li>`;
    }).join("");
    toc.innerHTML = `<h4 class="toc__heading">On this page</h4><ul>${items}</ul>`;

    // Scrollspy
    const links = $$("a[data-href]", toc);
    const byId = new Map(links.map(a => [a.dataset.href, a]));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const link = byId.get(id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });
    headings.forEach(h => observer.observe(h));
  }

  // ---------- Page footer (prev/next) ----------

  function renderPageFooter() {
    const footer = $(".page-footer");
    if (!footer) return;
    const current = currentPagePath();
    const idx = NAV_FLAT.findIndex(i => i.path === current);
    if (idx === -1) return;
    const prev = idx > 0 ? NAV_FLAT[idx - 1] : null;
    const next = idx < NAV_FLAT.length - 1 ? NAV_FLAT[idx + 1] : null;
    const prefix = pathDepth();
    footer.innerHTML = `
      <div class="page-footer__prev">
        ${prev ? `<div class="page-footer__dir">← Previous</div>
          <a class="page-footer__label" href="${prefix}${prev.path}">${prev.title}</a>` : ""}
      </div>
      <div class="page-footer__next" style="text-align: right">
        ${next ? `<div class="page-footer__dir">Next →</div>
          <a class="page-footer__label" href="${prefix}${next.path}">${next.title}</a>` : ""}
      </div>
    `;
  }

  // ---------- Auto-ID headings ----------

  function autoIdHeadings() {
    const content = $(".content");
    if (!content) return;
    $$("h2, h3", content).forEach(h => {
      if (h.id) return;
      const slug = h.textContent
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      h.id = slug;
    });
  }

  // ---------- Search ----------
  // Search index is expected at assets/data/search-index.json (built by
  // tooling later). For now we fall back to searching just titles of
  // pages in NAV_FLAT so the UI works out of the box.

  let searchIndex = null;

  async function loadSearchIndex() {
    try {
      const url = relativeTo("assets/data/search-index.json");
      const res = await fetch(url);
      if (!res.ok) throw new Error("no index");
      searchIndex = await res.json();
    } catch (e) {
      // Fallback: generate a minimal index from NAV_FLAT alone.
      searchIndex = NAV_FLAT.map(item => ({
        title: item.title,
        path: item.path,
        category: item.category,
        excerpt: "",
      }));
    }
  }

  function search(query) {
    if (!searchIndex || !query || query.length < 2) return [];
    const q = query.toLowerCase();
    const results = [];
    for (const item of searchIndex) {
      const t = (item.title || "").toLowerCase();
      const e = (item.excerpt || "").toLowerCase();
      const c = (item.category || "").toLowerCase();
      let score = 0;
      if (t.includes(q)) score += 10;
      if (c.includes(q)) score += 3;
      if (e.includes(q)) score += 1;
      if (score > 0) results.push({ ...item, score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  function highlightMatch(text, query) {
    if (!text || !query) return text;
    const q = query.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return text.slice(0, idx) + "<mark>" + text.slice(idx, idx + query.length) + "</mark>" + text.slice(idx + query.length);
  }

  function initSearch() {
    const input = $("#search-input");
    const dropdown = $("#search-results");
    if (!input || !dropdown) return;

    const prefix = pathDepth();

    input.addEventListener("input", () => {
      const q = input.value.trim();
      if (!q) {
        dropdown.classList.remove("open");
        return;
      }
      const hits = search(q);
      if (hits.length === 0) {
        dropdown.innerHTML = `<div class="search-results__empty">No results for "${q}"</div>`;
        dropdown.classList.add("open");
        return;
      }
      dropdown.innerHTML = hits.map(h => `
        <a class="search-hit" href="${prefix}${h.path}">
          <div class="search-hit__category">${h.category || ""}</div>
          <div class="search-hit__title">${highlightMatch(h.title, q)}</div>
          ${h.excerpt ? `<div class="search-hit__excerpt">${highlightMatch(h.excerpt.slice(0, 140) + "…", q)}</div>` : ""}
        </a>
      `).join("");
      dropdown.classList.add("open");
    });

    input.addEventListener("focus", () => {
      if (input.value.trim()) dropdown.classList.add("open");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrap")) {
        dropdown.classList.remove("open");
      }
    });

    // Keyboard shortcuts: "/" focuses search; Esc closes dropdown
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
      if (e.key === "Escape") {
        dropdown.classList.remove("open");
        input.blur();
      }
    });
  }

  // ---------- Boot ----------

  function boot() {
    renderTopbar();
    renderSidebar();
    initTheme();
    initMobileNav();
    autoIdHeadings();
    highlightAll();
    addCopyButtons();
    renderTOC();
    renderPageFooter();
    loadSearchIndex().then(initSearch);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
