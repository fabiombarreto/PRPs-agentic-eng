---
description: Compare relay's rework metrics before and after a recorded release marker, using this repo's own review audit logs. Reports runs per artifact and first-attempt failure rate per pipeline stage, with an explicit small-sample caution.
allowed-tools: Bash(node scripts/efficiency.mjs:*), Bash(ls PRPs/reports/efficiency:*), Read
---

# /efficiency-report

**Arguments:** `$ARGUMENTS` — optional. A recorded baseline label (e.g.
`v0.24.0`) to compare against. Omit to use the most recent marker.

---

## What this measures and why

relay's cost is dominated by rework: how many writer/reviewer round trips an
artifact needs before it is accepted. Every verdict is already written to
`PRPs/plans/*.jsonl`, so the numbers come from the repo itself — nothing new
is instrumented, and nothing can be gamed by the pipeline that produces them.

Two headline metrics per stage:

- **Runs per artifact** — total review runs divided by artifacts. Falls when
  retries get cheaper or rarer.
- **First-attempt failure rate** — share of artifacts whose first verdict was
  not a pass. This is the metric the shift-left self-checks target; the
  `prior_feedback` pipe provably cannot move it, since that input is null on
  attempt 1.

---

## Steps

1. **Run the comparison.**

   ```bash
   node scripts/efficiency.mjs compare
   ```

   With an explicit marker: `node scripts/efficiency.mjs compare --since $ARGUMENTS`.

   To see which markers exist: `ls PRPs/reports/efficiency/`.

2. **Read the output honestly before interpreting it.** The script prints
   warnings you must not skip past:

   - *"No artifacts authored since the marker yet"* — there is nothing to
     compare. Say so plainly and stop. Do not reach for older data to
     manufacture a trend.
   - *"CAUTION: N artifact(s) is a small sample"* — below ten artifacts a
     delta is directional at best. Report it as such; never present it as a
     measured improvement.
   - *"WARNING - the before-set does not reproduce the snapshot exactly"* —
     some historical entries carry a date-only timestamp, so same-day
     artifacts can land on either side of the marker. Small deltas are noise.
   - *"WARNING - N artifact(s) carry a producer-flagged unreliable timestamp
     (timestamp_degraded) and are excluded from both sides"* — the producer
     itself declared these stamps placeholders, so `compare` excludes the
     named artifacts from both the before and after sets rather than
     guessing which side they belong on. Distinct from the snapshot-drift
     warning above: this one names files, not a count-vs-count mismatch.
     Report the excluded files if you cite either total.

3. **Report the delta per stage**, and state which direction is good: lower is
   better for both metrics.

4. **Name the attribution honestly.** A change in the first-attempt failure
   rate after `v0.24.0` is attributable to the writer self-checks. A change in
   runs per artifact could come from either the self-checks or the earlier
   `prior_feedback` targeted-revision work — do not credit one when both are
   live.

5. **Say when the evidence points the other way.** The self-refinement
   research recorded in `docs/decisions.md` [2026-07-30] predicts marginal
   gains from self-critique. If the first-attempt rate has not fallen
   meaningfully once the sample is real, the honest conclusion is that the
   research was right and the checks should be reverted — not that more
   checklist items are needed. Report that outcome as readily as a win.

---

## Recording a new marker

After cutting a release whose changes are meant to affect these metrics:

```bash
node scripts/efficiency.mjs snapshot --label v0.25.0 --note "what changed"
```

This writes `PRPs/reports/efficiency/<label>.json` — the UTC timestamp plus the
metrics as they stood. Commit it with the release so the marker is part of the
history it describes.

---

## Constraints

- **Never edit a recorded snapshot.** A marker is a historical fact. If one was
  taken at the wrong moment, record a new labelled marker and compare against
  that instead.
- **Never re-derive the metrics by hand** when the script disagrees with an
  expectation. Read `scripts/efficiency.mjs` and fix the script, or explain the
  discrepancy — do not narrate numbers the tool did not produce.
- **This command is measurement only.** It writes nothing except when
  explicitly asked to record a new marker, and it never modifies the jsonl
  corpus it reads.
