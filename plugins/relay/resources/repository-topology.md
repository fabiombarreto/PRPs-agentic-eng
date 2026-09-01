# Repository Topology Contract

Shared, plugin-owned contract defining how relay addresses a **workspace** — a
project directory that contains N sibling git repositories — and how it refuses
the topologies it cannot serve.

Read by reference from the commands that need root resolution, exactly as
`${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` is read by
`/relay-worktree` Phase B.2. The parsing rules,
column semantics and HALT codes below are defined once here and never restated
as logic in a consuming command.

---

## The three roots

Relay historically collapsed one variable, `target_root`, into two unrelated
jobs: the root of the artifact plane and the root of the code plane. A workspace
separates them, and a third root is needed because a member's relay context and
its git repository are not always the same directory.

| Root | What it is | Multiplicity |
|------|------------|--------------|
| `project_root` | The workspace root — the current working directory the command was invoked from. Holds the single artifact plane: `PRPs/prds/`, `PRPs/plans/`, `PRPs/reports/`, and the workspace's own `docs/`. | exactly one |
| `context_root` | A member's relay context: its `CLAUDE.md`, `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`, `docs/context/methodology.md`. | one per member |
| `repo_root` | A member's git repository root — the directory containing `.git`. Worktrees are created at `<repo_root>/.worktrees/<feature>/`. | one per member |

In most members `context_root` and `repo_root` are the same directory. They are
not always: a member may hold its relay context in a wrapper directory whose git
repository lives one level below. The contract expresses both rather than
assuming they coincide.

---

## Declaration, never detection

Workspace membership is **declared**. Relay never discovers members by scanning
for `.git` directories, and never infers a member's role or base.

This follows the standing non-heuristic contract every opt-in gating key in this
pipeline already obeys (`tdd`, `docs_sync`, `figma_track`): a run whose behavior
depends on something being *detected* rather than *declared* reintroduces the
"forgot to check" versus "doesn't apply" ambiguity the declaration model exists
to prevent. A scan is also simply wrong on real data — it misreads both the
depth at which a repository sits and which directory carries the context.

---

## The declaration

A workspace declares its members in a section of its own
`docs/context/architecture.md` headed exactly:

```
## Repository topology
```

The section contains one GFM table whose header line matches **byte-for-byte**
the header shown in the canonical example below. Do not attempt fuzzy matching;
the canonical header is fixed, and this file carries exactly one copy of it so
that consumers and the `topology-contract` validate check compare against a
single authority.

Canonical example declaration — its header line IS the contract:

```
## Repository topology

| Repo | Path | Git root | Role | Base |
|------|------|----------|------|------|
| spe-services | spe-services | - | editable | current |
| api-escola | api-escola | api-escola/apiescola | editable | origin/develop |
| spe-ui | spe-ui | - | reference-only | - |
```

### Parsing rules

1. Locate the section by the exact heading line `## Repository topology`. A
   heading that merely starts with that text (for example
   `## Repository topology contract`) is **not** a match — the comparison is
   against the whole trimmed line.
2. Locate the table by the byte-exact header line above.
3. Skip the GFM separator row (the row consisting only of dashes and pipes).
4. For each pipe-delimited data row below the separator, extract the five cells.
   Trim whitespace from every cell. Treat `-` as "empty".
5. A row that does not yield exactly five cells, or whose `Repo` or `Path` cell
   is empty, raises `FAILED_TOPOLOGY_MALFORMED_ROW`.

### Column semantics

| Column | Meaning |
|--------|---------|
| `Repo` | The member's name. Used by a phase to name the repository it targets, and in every HALT message. Must be unique within the table. |
| `Path` | The member's `context_root`, relative to `project_root`. Must resolve to an existing directory. |
| `Git root` | The member's `repo_root`, relative to `project_root`. When the cell is empty (`-`), `repo_root` equals `context_root`. Must resolve to an existing directory containing `.git`. |
| `Role` | `editable` — the member may be written to and may receive a worktree. `reference-only` — the member is part of the workspace but is never written to and never receives a worktree. Any other value raises `FAILED_TOPOLOGY_MALFORMED_ROW`. |
| `Base` | The ref a worktree for this member is created from. `current` (or an empty cell) resolves to the member's currently checked-out commit, `git -C <repo_root> rev-parse HEAD` — which is also what `git worktree add` itself does when given no commit-ish. Any other value is a named ref, resolved with `git -C <repo_root> rev-parse --verify <value>`; a non-zero exit raises `FAILED_TOPOLOGY_BASE_UNRESOLVED`. |

---

## Where a member's context is read from

A member's governing context — the three Decision Gate sources
(`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`)
and `docs/context/methodology.md` — is read from that member's
**`context_root`**, never from `project_root`.

**A member's own declaration wins outright.** There is no inheritance from a
workspace-level file and no overlay onto one. An overlay would mean a phase's
effective `tdd` value is readable from no single file, which is precisely the
ambiguity the declaration model exists to prevent.

**When no topology is declared, `context_root` IS `project_root`**, so every one
of these reads resolves exactly where it did before this contract existed.

The reason the root has to be per member is that these declarations diverge
irreconcilably. Measured across one real workspace's six initialized members,
jest, vitest and pytest coexist, `tdd` is `true` in half and `false` in the
other half, and `figma_track: true` holds in exactly one. No single file can
represent that, and a run that read one would route at least half its phases
wrongly.

---

## The compatibility clause

**When the `## Repository topology` section is absent, the project is
single-repo.** The consumer records `topology = null`, emits no note, writes no
artifact, and proceeds silently — the same shape as the `test_frameworks`-absent
branch of `/relay-execute` P5. Every downstream stage resolves paths exactly as
it did before this contract existed.

This clause is what guarantees that no existing project needs to migrate, and it
is the reason the declaration is a section rather than a frontmatter key: an
absent section is unambiguous, whereas an absent key invites backfill.

---

## Named HALT codes

Every unserviceable topology stops the run with a named code and an actionable
message. None of them degrades to "proceed anyway" — silent degradation is the
defect this contract exists to remove.

> FAILED_TOPOLOGY_MALFORMED_ROW: Row `<row-text>` of the `## Repository topology`
> table in `<architecture-path>` is malformed. Every row must have exactly five
> cells, a non-empty `Repo` and `Path`, and a `Role` of either `editable` or
> `reference-only`.
> Fix the row and re-run the command. No phase work has been performed.

> FAILED_TOPOLOGY_PATH_UNRESOLVED: Member `<repo>` declares `<column>` as
> `<value>`, which does not resolve to an existing directory under
> `<project_root>`.
> Options:
>   (a) Correct the path in the `## Repository topology` table of
>       `<architecture-path>`.
>   (b) Remove the member's row if it is no longer part of this workspace.
> No phase work has been performed.

> FAILED_TOPOLOGY_NOT_A_GIT_REPO: Member `<repo>` resolves its git root to
> `<repo_root>`, which is not a git repository — `git -C <repo_root> rev-parse
> --show-toplevel` exited non-zero.
> Options:
>   (a) Run `git init` in `<repo_root>` if the member should be versioned.
>   (b) Correct the member's `Git root` cell if the repository lives at a
>       different depth than declared.
>   (c) Remove the member's row if it is not a repository at all.
> No phase work has been performed.

> FAILED_TOPOLOGY_ORPHANED_GITLINK: Member `<repo>` is registered in its parent
> repository as a gitlink (mode `160000`) but the parent has no `.gitmodules`
> entry for it. Git treats this as a half-registered submodule: a worktree of
> the parent comes up with `<path>` EMPTY, and git's own documentation states
> that worktree support for submodules is incomplete and advises against
> multiple checkouts of a superproject.
> Options:
>   (a) Add the member to the parent's `.gitmodules` so it is a fully
>       registered submodule.
>   (b) Remove the gitlink from the parent's index
>       (`git rm --cached <path>`) so the member is an independent sibling
>       repository, and declare it as its own row here.
> Do NOT proceed with a worktree against this member — it would produce an
> empty tree and an implementation written nowhere.
> No phase work has been performed.

> FAILED_TOPOLOGY_BASE_UNRESOLVED: Member `<repo>` declares `Base` as `<value>`,
> which does not resolve in `<repo_root>` — `git -C <repo_root> rev-parse --verify
> <value>` exited non-zero.
> Options:
>   (a) Run `git -C <repo_root> fetch` if the ref exists on a remote but not locally.
>   (b) Correct the member's `Base` cell, or set it to `current` to branch from
>       whatever that repository currently has checked out.
> No worktree has been created in any member. No phase work has been performed.

> FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET: Phase `<N>` targets member `<repo>`,
> whose `Role` is declared `reference-only` in the `## Repository topology`
> table of `<architecture-path>`. A reference-only member is never written to
> and never receives a worktree.
> Options:
>   (a) Retarget the phase at an `editable` member.
>   (b) Change the member's `Role` to `editable` if it should now be writable.
> No phase work has been performed.

### Detecting an orphaned gitlink

For a member whose `repo_root` sits inside another git repository, run
`git -C <parent> ls-files -s <relative-path>` and inspect the mode field. A mode
of `160000` marks a gitlink. When a `160000` entry exists and the parent has no
`.gitmodules` file, or that file contains no entry whose `path` equals the
member's relative path, the member is an orphaned gitlink and
`FAILED_TOPOLOGY_ORPHANED_GITLINK` applies.

---

## Named-code registry

- `FAILED_TOPOLOGY_MALFORMED_ROW` — a table row has the wrong cell count, an empty `Repo`/`Path`, or an unrecognized `Role`.
- `FAILED_TOPOLOGY_PATH_UNRESOLVED` — a declared `Path` or `Git root` does not resolve to an existing directory.
- `FAILED_TOPOLOGY_NOT_A_GIT_REPO` — a resolved `repo_root` is not a git repository.
- `FAILED_TOPOLOGY_ORPHANED_GITLINK` — a member is a mode-`160000` gitlink with no `.gitmodules` entry.
- `FAILED_TOPOLOGY_BASE_UNRESOLVED` — a declared `Base` does not resolve in that member.
- `FAILED_TOPOLOGY_REFERENCE_ONLY_TARGET` — a phase targets a member declared `reference-only`.

---

## Resolution protocol

A consuming command executes these steps inline:

1. Read `<project_root>/docs/context/architecture.md`. If the file is absent, or
   contains no line equal to `## Repository topology`, record `topology = null`
   and return — the compatibility clause applies.
2. Parse the table per the parsing rules above. Any malformed row raises
   `FAILED_TOPOLOGY_MALFORMED_ROW`.
3. For each row, resolve `context_root = <project_root>/<Path>` and
   `repo_root = <project_root>/<Git root>`, falling back to `context_root` when
   the `Git root` cell is empty. A path that does not resolve raises
   `FAILED_TOPOLOGY_PATH_UNRESOLVED`.
4. For each member whose `Role` is `editable`, verify `repo_root` is a git
   repository; otherwise raise `FAILED_TOPOLOGY_NOT_A_GIT_REPO`. Then apply the
   orphaned-gitlink detection above and raise
   `FAILED_TOPOLOGY_ORPHANED_GITLINK` when it matches.
5. Record the resolved member list — each entry carrying `repo`, absolute
   `context_root`, absolute `repo_root`, `role`, the raw `base` string AND the
   RESOLVED base (its ref name and its SHA) — for the consuming command's
   downstream stages. Resolving the base is what raises
   `FAILED_TOPOLOGY_BASE_UNRESOLVED`; it happens here, before any worktree
   exists, so a bad declaration costs nothing on disk.

A `reference-only` member is resolved (so it can be named in a HALT) but is
never git-verified and never receives a worktree. Its refusal fires at the point
something targets it, not at resolution time.
