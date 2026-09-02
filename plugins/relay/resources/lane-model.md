# Lane Model Contract

Shared, plugin-owned contract defining what a **lane** is — the unit of work
relay may run concurrently — how lanes are derived from an Implementation Phases
table, and what the `Parallel` column is allowed to say about them.

Read by reference from the commands and agents that need lane resolution,
exactly as `${CLAUDE_PLUGIN_ROOT}/resources/repository-topology.md` is read by
`/relay-execute` at precondition P6. The derivation algorithm, the column
grammar and the named codes below are defined once here and never restated as
logic in a consuming command.

---

## What a lane is

A **lane** is a set of Implementation Phases rows that must run one after
another, and that shares nothing mutable with any other lane. It is the unit
relay assigns a worktree and a branch to, and therefore the unit that can run
concurrently with another.

A lane is **derived**, never declared. It is computed from the `Depends` and
`Repo` cells the table already carries, so a lane cannot contradict a stated
dependency and cannot drift from the table it describes. This follows the same
discipline the phase-status lifecycle obeys: the Implementation Phases table IS
the state machine (`docs/decisions.md`, 2026-05-01), and a lane is a reading of
that table rather than a second source of truth beside it.

---

## Lane derivation

A consuming command executes these steps inline, against the data rows of the
source PRD's Implementation Phases table:

1. **Partition by `Repo`.** Group the rows by the value of their `Repo` cell. An
   empty cell or `-` is its own group: the project's single repository. Two rows
   in different groups are never in the same lane, because a lane becomes one
   worktree in one repository and a worktree belongs to exactly one repo.

2. **Build the dependency graph within each group.** For each row, add one
   **undirected** edge between that row and every row named in its `Depends`
   cell. `Depends` is comma-separated; `-` or an empty cell contributes no edge.

3. **Each weakly-connected component is one lane.** "Weakly connected" is what
   makes the grouping correct rather than merely convenient: two rows that both
   depend on a third must share the third's lane, even though neither depends on
   the other, because they will both build on its output.

4. **Apply the `Parallel` override** (see the grammar below). The override can
   only merge lanes, never split one.

5. **Order within a lane** by the `Depends` relation, falling back to ascending
   row number where `Depends` does not order two rows. Rows in one lane always
   run sequentially.

### Cross-repo dependency edges

A `Depends` edge whose two endpoints fall in different `Repo` groups does **not**
merge their lanes — step 1 has already separated them. The edge is not discarded
either: it is retained as an **inter-lane ordering constraint**, meaning the
dependent row's lane may not begin that row before the depended-on row has
reached a dependency-satisfying state (`implemented`, `tested`, or `complete`).

Dropping such an edge instead of retaining it would let a phase run before the
phase it declares a dependency on — silently, and only in workspaces, which is
exactly where it would be hardest to notice.

### Worked example

Given five rows in one repository, where rows 1, 2 and 3 have an empty `Depends`
cell and rows 4 and 5 each depend on 1:

| # | Depends |
|---|---------|
| 1 | -       |
| 2 | -       |
| 3 | -       |
| 4 | 1       |
| 5 | 1       |

The edges are 4–1 and 5–1. The weakly-connected components, and therefore the
lanes, are:

- **Lane A** — rows 1, 4, 5 (running 1, then 4 and 5 in row order)
- **Lane B** — row 2
- **Lane C** — row 3

Three lanes. Rows 4 and 5 share a lane with row 1 despite having no edge to each
other, because both attach to 1.

---

## The `Parallel` column

The `Parallel` cell is an **optional author override** on the derivation above.

### Grammar

Exactly one token is recognized:

```
lane:<label>
```

where `<label>` matches `[a-z0-9][a-z0-9-]*`. Rows carrying the **same** label
are merged into a single lane and run sequentially within it.

### Every other value is legacy, and is a no-op

Any other cell content — `-`, an empty cell, or free text such as `yes`,
`yes (with #2)`, `with 4`, `after 1 contract` — carries **no override**. It is
neither honored nor refused: the lanes are exactly those the graph gives.

This is deliberate and load-bearing. The `Parallel` column has existed in the
table header since the schema was defined and was never machine-read, so
approved PRDs across this repository already carry roughly nineteen free-text
values in it. Refusing them would invalidate PRDs that are already APPROVED;
honoring them would require guessing what each one meant. Treating them as
legacy no-ops is the only reading that leaves every existing PRD's behaviour
unchanged. The `lane:` prefix was chosen precisely because no legacy value
carries it, so the new grammar cannot collide with the old prose.

### The override is one-directional

A label may only make execution **more serial**. It can merge two lanes the
graph would have run concurrently; it can never split a lane the graph derived.

The asymmetry is a consequence, not a convention. An author choosing to be more
conservative than the graph only removes concurrency, which is always safe. An
author declaring two rows separable when `Depends` connects them is asserting
something the table already contradicts — and honoring it would run a phase
before the phase it depends on. A lane that violates `Depends` is therefore not
expressible in this grammar at all.

Two refusals follow:

- Two rows in the **same derived component** carrying **different** `lane:`
  labels is a split the graph forbids → `FAILED_LANE_SPLIT_FORBIDDEN`.
- One label spanning rows whose `Repo` cells **differ** → `FAILED_LANE_CROSS_REPO`.
  A lane becomes one worktree in one repository; a label cannot span two.

---

## Worktree identity

A lane needs its own filesystem, because two phases sharing a working tree also
share a git index — and the phase-boundary `git add -A` that runs at every phase
close-out would stage a concurrent lane's in-flight edits into the wrong diff
base. The identity key that gives a lane its own tree is one derived value.

### `<worktree_slug>`

Every worktree path and branch name is built from a single slug:

| Lane context | `<worktree_slug>` |
|--------------|-------------------|
| absent | `<feature>` |
| supplied | `<feature>-lane-<k>`, where `k` is the lane's index in the derived lane list |

**With no lane context the slug IS the feature name.** `.worktrees/<worktree_slug>/`
and `feature/<worktree_slug>` then reduce to exactly the forms that shipped before
this section existed, so a serial run and every standalone `/relay-worktree`
invocation are byte-identical to their previous behaviour. That is the whole of
the non-regression guarantee: it is not a promise to be careful, it is an
identity.

### Path and branch share the slug

The worktree lives at `.worktrees/<worktree_slug>/` and is checked out on
`feature/<worktree_slug>`. The two are built from the same value and must never
diverge. An edit that changed one without the other would silently return two
lanes to a single branch, which is the exact collision the lane dimension exists
to remove.

### Why the branch dimension is forced, not chosen

Git refuses to check one branch out in two worktrees. Attempting it in this
repository returns:

```
fatal: 'feature/parallel-phase-execution' is already checked out at 'C:/repos/PRPs-agentic-eng/.worktrees/parallel-phase-execution'
```

So a per-lane branch does not follow from a design preference — it follows from
`git worktree add` being unable to do anything else once each lane has its own
tree. The constraint was measured rather than assumed.

### Composing with the per-repo dimension

The lane dimension extends the per-repo one shipped by `multi-repo-topology`; it
does not replace it. A lane's worktree is created at
`<repo_root>/.worktrees/<worktree_slug>/`, so a laned run inside a declared
workspace is still per member: the repo selects which repository, and the slug
selects which lane within it.

---

## Lane outcomes and state ownership

Two lanes running at once would contend on exactly two surfaces. This section
removes the contention by construction rather than guarding it.

### A lane is read-only over shared state

A lane writes **neither** of these:

- the source PRD's Implementation Phases table, and
- `PRPs/reports/<feature>/orchestrator-run.json`.

It returns a structured outcome, and the orchestrator performs the write. The
race disappears because the second writer never exists — not because a lock keeps
the two writers apart.

### The lane outcome shape

```json
{
  "lane": "lane-2",
  "phase": 4,
  "stage": "implement",
  "outcome": "APPROVED",
  "artifacts": [
    "PRPs/plans/completed/<feature>-phase-4-<slug>.plan.md"
  ],
  "requested_transition": "implemented"
}
```

`requested_transition` names the row status the lane believes the phase reached.
It is a request, not an instruction: the orchestrator is free to reject it, and
`flip_row_status` validates the expected source state before writing regardless.

### Serialization

The orchestrator applies reported mutations **one at a time, in the order lanes
report**, through the `flip_row_status` procedure it already owns. This extends
ownership relay already has — it writes the `tested` and `complete` transitions
today — rather than adding a lock. A lock would be this codebase's first, in a
pipeline whose every concurrency mention so far has been a deferral.

Under serial execution there is exactly one lane, so this describes today's
behaviour unchanged.

### Shared-state writer registry

The surfaces that write shared state today. A check holds every row of this table
to being true: the surface must exist, and it must still carry its anchor.

| Surface | Anchor | Writes |
|---------|--------|--------|
| `plugins/relay/agents/plan-writer.md` | `Step 5.1` | the `pending` to `in-progress` back-fill, plus the `PRP Plan` cell |
| `plugins/relay/commands/relay-implement.md` | `Mutation c` | `in-progress` to `implemented` |
| `plugins/relay/commands/relay-execute.md` | `flip_row_status` | `tested` and `complete` |

### What is NOT shared, and why that is a finding rather than an omission

The per-plan verdict logs — `PRPs/plans/<basename>.review.jsonl` and
`PRPs/plans/<basename>.code-review.jsonl` — are keyed by plan basename, and a
plan basename carries its phase number. Two lanes therefore cannot resolve to one
of these files, and they need no protection at all. Guarding them would be effort
spent on a resource nothing contends for; recording that explicitly is what keeps
a later reader from wondering whether the question was asked.

---

## Runtime safety and the concurrency cap

Lanes isolate the filesystem. They do not isolate a port, a container name or a
database. Two lanes running their test stages at once would contend on all three,
and relay has no way to prevent that — so it does not pretend to.

### The gate: `lane_runtime_safe`

Read from the target project's `docs/context/methodology.md`.

| Value | Meaning | Effect |
|-------|---------|--------|
| `true` | The project declares its test stage does not contend on shared runtime resources | lanes may run concurrently |
| `false` | The project declares its test stage does contend | serial |
| absent | The project has not declared either way | serial |

The two serial cases are distinguished in the run log. "Nobody has decided yet"
and "somebody decided no" are different facts, and collapsing them would hide
which projects have actually been considered.

### Why this is declared and never detected

`docs/decisions.md` [2026-05-15] registers **runnable worktree environments** as a
future capability whose implementation is **BLOCKED** until it has its own
approved PRD. Its Context states that two parallel runs "are isolated for file
writes but cannot reliably start a dev server, a test stack, or a database inside
their own worktree folders without manual, collision-prone setup", and its
out-of-scope list forbids modifying `implementer` or `test-runner` to assume a
runnable environment exists.

A gate that scanned for a `docker-compose.yml`, grepped for bound ports, or
sniffed the stack would be more convenient and would break two rules at once: the
standing prohibition on flipping an opt-in gating key by heuristic
(`docs/anti-patterns.md`), and that out-of-scope list. Declaring is therefore not
the cautious choice here — it is the only one that does not contradict a recorded
decision.

The key obeys the same three non-heuristic properties every gating key since
`docs_sync` has carried: emitted `false` on every `*init`, preserved untouched on
`*update`, and backfilled only when entirely absent. Only a human edit flips it.

### The cap: `max_lanes_in_flight`

A session-level budget, initialised alongside the orchestrator's other budgets.
At most that many lanes are in flight at once; the remainder **queue** rather
than being dropped, so a wide PRD is slowed, never truncated.

**Its value is PROVISIONAL.** No measurement of concurrent lane cost exists yet,
and the synthetic fixture is the instrument meant to set it. Publishing a tuned
number now would repeat exactly the error this PRD refused when it declined to
name a speedup target: presenting a guess in the shape of a finding.

### Degradation is recorded, never silent

Whenever lanes do not run concurrently, the orchestrator records why — the absent
declaration, the declared contention, or the cap. A run that quietly behaves
serially and says nothing is indistinguishable from a run whose lane derivation
failed, which is the ambiguity every declaration in this pipeline exists to
remove.

---

## Lane dispatch

Phases 1 through 4 build everything concurrency needs. This section is where
lanes actually run.

### What a dispatch is

Each lane is dispatched as a subagent that adopts the **same** per-phase command
protocols the serial path adopts, by reference, per the inline-adoption dispatch
model (`docs/decisions.md`, 2026-05-01). There is no parallel copy of the
pipeline and no lane-specific variant of any command: a lane runs
`/relay-plan` to `/relay-test-review` exactly as a serial phase does, in its own
worktree, on its own branch, over the phases the derivation assigned it, in the
order the derivation fixed.

### The budget split

Some budgets were already per phase and are therefore per lane for free. One is
genuinely session-wide, and saying so is the point — a shared budget that nobody
names is a contended budget nobody notices.

| Budget | Scope | Why |
|--------|-------|-----|
| `max_implement_retries` | per lane | `/relay-implement` re-initialises it per phase, so each lane's phases carry their own |
| oscillation state | per lane | re-created per phase inside `/relay-implement`, same as above |
| dispute cap | per lane | re-created per phase inside `/relay-implement`, same as above |
| `max_plan_review_retries` | per lane | counted per plan, and a plan belongs to exactly one phase in exactly one lane |
| `max_orchestrator_minutes` | **shared** | one deadline for the whole session. Lanes consume it in parallel, so N lanes exhaust it roughly N times faster than a serial run would. This is documented rather than silently contended |
| `max_lanes_in_flight` | **shared** | the cap itself; see the runtime-safety section above |

### Terminal states

When any lane halts, every other lane reaches one of these, and the run log
records which. A halt must never leave a lane undescribed.

| Lane state | Meaning |
|------------|---------|
| `completed` | every phase the lane owned reached `complete` |
| `halted` | the lane stopped on a HALT; its own halt artifact carries the detail |
| `cancelled` | the lane was in flight when another lane halted, and stopped at its current phase boundary |
| `queued` | the lane never started, because the cap was reached first |

A halt in one lane does **not** roll back another lane's completed work. Phases
that reached `complete` stay complete, their worktrees stay on disk, and
re-invoking `/relay-execute` resumes only what is unfinished — the same
re-invocation model the serial path already relies on.

### Degradation

Dispatch does not occur, and the orchestrator's existing lowest-numbered pick
runs completely unchanged, in three cases:

1. `lane_runtime_safe` is absent or `false`;
2. fewer than two lanes were derived;
3. `max_lanes_in_flight` is 1.

Each is recorded in the run log by name. "Ran serially" and "ran serially
because the project declared its test stage contends" are different facts, and
only one of them tells an operator whether anything is worth changing.

### The dispatch tool name is unverified

This is recorded as a finding, with its evidence, because the mechanism this
section depends on is not currently checked by anything.

- Six agent files declare `Task` in their `tools:` frontmatter:
  `code-reviewer`, `plan-writer`, `prd-reviewer`, `prd-writer`, `test-reviewer`
  and `test-writer`. **No agent file declares `Agent`.**
- `dispatch-graph`'s own docstring scopes it to `plugins/relay/commands/*.md`
  bodies and states that "agent-to-agent dispatch is out of this check's scope".
  So nothing resolves the one edge that genuinely matters: `code-reviewer`
  reaching `code-reviewer-semantic`.
- Most relay "agents" are ADOPTED as protocols in the caller's own conversation
  rather than dispatched, so the declaration is rarely exercised. `code-reviewer`
  is the exception — it is genuinely dispatched, and it declares `Task` in order
  to reach `code-reviewer-semantic`.

**The consequence, stated plainly:** if the declared name does not resolve at
runtime, the `R-SEM` semantic layer is absent today, and absent silently — every
code review would report a full rubric while one row of it never ran.

This is a **pre-existing** condition. Lane dispatch does not introduce it and
does not depend on it any more than today's code review already does. Verifying
it requires actually dispatching an agent and observing the result, which is not
something a static check can do. **No `tools:` frontmatter is changed on a
guess**: renaming a declaration that currently works would be worse than the
ambiguity it removes.

What CAN be checked statically is checked — see the
`agent-dispatch-resolution` validation check, which resolves every
`subagent_type` reference found in an agent body and holds every dispatching
agent to declaring a dispatch tool at all. That is the structural half of the
answer; the behavioural half belongs to whoever can run the experiment.

---

## Lane integration in Pillar 3

Phase 2 gave each lane its own branch because git refuses any other arrangement.
That leaves N branches where Pillar 3 expects one, so they have to be brought
back together before anything is reviewed.

### Where integration happens, and why there

In `/relay-commit`, before its branch check. **Never in the orchestration loop.**

Pillar 2 never commits — a permanent architectural boundary
(`docs/decisions.md`, 2026-05-18), not a deferral. Integration is git work that
produces a commit-shaped result, so it belongs where committing already lives.
Putting it in the loop would move the boundary to buy convenience.

### The order

For each participating repository:

1. List the branches matching `feature/<feature>-lane-*`.
2. Merge each `feature/<feature>-lane-<k>` into `feature/<feature>`, in
   **ascending lane order** (lane 1, then lane 2, and so on).
3. Continue with the existing commit flow, unchanged.

After step 2 there is exactly **one branch per repository** again — which is what
keeps the one-PR-per-repository guarantee from `multi-repo-topology` true under
concurrency. `/relay-pr` then opens exactly one PR per repository, as it always
has, because it once again finds exactly what it expects.

### What a merge conflict means

**Lanes are disjoint by construction.** A lane is a weakly-connected component of
the `Depends` graph, so two lanes are, by definition, chains with no edge between
them — and independent chains touch different files.

A real merge conflict between two lanes is therefore not a routine git event. It
is **evidence that the source PRD's `Depends` column was wrong**: two chains the
graph believed independent modified the same file. That is a correctness finding
about the PRD, and it is worth more than the merge it interrupted.

It must be surfaced loudly, by name, and **never auto-resolved**. Auto-resolving
would produce a working branch and destroy the only signal that the dependency
graph misdescribes the work — the failure would be silent and permanent, and the
next run would repeat it.

### Degradation

With a single lane there is no `feature/<feature>-lane-*` branch to integrate.
The step is a documented no-op, and every Pillar 3 command behaves exactly as it
did before this section existed.

---

## Timing and the executable oracle

### Timing fields

`PRPs/reports/<feature>/orchestrator-run.json` carries two duration fields:

| Field | Shape | Meaning |
|-------|-------|---------|
| `lane_durations_ms` | map from lane id to integer milliseconds | how long each lane took |
| `total_duration_ms` | integer milliseconds | wall-clock for the whole run |

Both are written for **serial** runs too. A parallel duration means nothing on
its own; it is only interpretable against a serial duration measured the same
way, so a run that records neither cannot participate in the comparison at all.

### The non-regression floor

The parallel run must not be **slower** than the serial one.

**No speedup target is set**, and the omission is deliberate. No measurement of
concurrent lane cost exists yet, so any target would be a guess wearing the
shape of a finding — the same error this feature refused when it declined to
pick a tuned `max_lanes_in_flight`. A floor is falsifiable with the first
measurement; a target invented beforehand is only falsifiable in the sense that
it will be wrong.

### The executable oracle

The derivation algorithm defined in this contract is implemented in
`scripts/validate/lane-derivation.mjs` and exercised against two fixtures by the
`lane-fixture` validation check.

**This contract remains the authority for the rules.** The module is a *reading*
of it, and any disagreement between the two is a bug in the module. The asymmetry
is not ceremony: this contract is consumed by `/relay-execute`,
`/relay-worktree`, `/relay-commit`, `/relay-pr`, `/relay-visual-approve` and
`prd-reviewer`, all of which read prose. Promoting the module to authority would
silently split one definition into two.

### The negative fixture is load-bearing

`scripts/validate/fixtures/colliding-lanes.prd.md` declares two rows in one
derived lane with different `lane:` labels — a split this contract forbids. It
MUST produce a `FAILED_LANE_SPLIT_FORBIDDEN` refusal.

A run in which that fixture passes is a **defect in the gate**, never a success,
and must never be resolved by relaxing the fixture. Everything else this feature
ships is a specification that describes a refusal; this fixture is the only thing
that demonstrates one.

---

## Named-code registry

- `FAILED_LANE_SPLIT_FORBIDDEN` — two rows in one derived lane carry different `lane:` labels, which would split a component the `Depends` graph connects. The message names both phase numbers and both labels.
- `FAILED_LANE_CROSS_REPO` — one `lane:` label spans rows whose `Repo` cells differ. The message names the label and both repo values.
- `FAILED_LANE_INTEGRATION_CONFLICT` — merging a lane branch into `feature/<feature>` conflicted. The message names both lane branches and the contended path, and reports it as evidence that the source PRD's `Depends` column was wrong rather than as a routine merge failure.

---

## The compatibility clause

A PRD in which no row carries a `lane:` value is served entirely by the
derivation above, and every consumer of this contract behaves exactly as it did
before the contract existed. No note is emitted, no artifact is written, and no
rubric row is produced for such a PRD.

An author opts into the grammar by writing a `lane:` value, and opts into its
validation by the same act. This mirrors the compatibility clause in
`${CLAUDE_PLUGIN_ROOT}/resources/repository-topology.md`: an absent optional
declaration is not a failure and produces no output.
