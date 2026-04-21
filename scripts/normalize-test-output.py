#!/usr/bin/env python3
"""Normalize JUnit XML output from pytest/Playwright/Vitest into the relay
canonical test-output schema.

Schema definition and field semantics:
  docs/context/test-output-schema.md (in the relay plugin repo)

Usage:
  normalize-test-output.py --framework pytest --junit path/to/results.xml
      [--tier unit|integration|e2e] [--run-id uuid] [--attempt N]
      [--coverage path/to/coverage.json] [--trace path/to/trace.zip]

Output: JSON schema v1 on stdout. Exits 0 on successful normalization,
2 on invalid input (missing JUnit file, malformed XML), 1 on any other
error.

Populates `failures[].category` as null — the B3 classifier fills this
in downstream. Emits `outcome: PASSED` when all tests passed,
`outcome: FAILED` when any failed. The B4 auto-correction loop upgrades
that to `FAILED_AFTER_N_RETRIES` or `FAILED_TIME_BUDGET_EXCEEDED` when
the terminating condition is known.
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


def parse_junit(junit_path: Path) -> list[ET.Element]:
    """Parse a JUnit XML file and return the list of <testsuite> elements.

    Handles both shapes:
      <testsuite> ... </testsuite>                 (single-suite root)
      <testsuites><testsuite>...</testsuite>...</testsuites>  (multi-suite root)
    """
    tree = ET.parse(junit_path)
    root = tree.getroot()
    if root.tag == "testsuite":
        return [root]
    return root.findall("testsuite")


def extract_failure(testcase: ET.Element, suite_name: str) -> dict[str, Any] | None:
    """Return a failure record for a <testcase> that has <failure> or <error>.

    Returns None if the testcase passed or was skipped.
    """
    failure = testcase.find("failure")
    if failure is None:
        failure = testcase.find("error")
    if failure is None:
        return None

    line_attr = testcase.get("line")
    try:
        line: int | None = int(line_attr) if line_attr is not None else None
    except (TypeError, ValueError):
        line = None

    return {
        "suite": suite_name,
        "test": testcase.get("name", ""),
        "file": testcase.get("file") or testcase.get("classname", ""),
        "line": line,
        "message": failure.get("message", ""),
        "stack": (failure.text or "").strip() or None,
        "category": None,  # B3 classifier fills this in
        "raw_framework_output_ref": (
            f"{testcase.get('classname', '')}#{testcase.get('name', '')}"
        ),
    }


def build_counts(suites: list[ET.Element]) -> dict[str, int]:
    passed = failed = skipped = total = 0
    for suite in suites:
        s_tests = int(suite.get("tests", 0))
        s_failures = int(suite.get("failures", 0))
        s_errors = int(suite.get("errors", 0))
        s_skipped = int(suite.get("skipped", 0))
        total += s_tests
        failed += s_failures + s_errors
        skipped += s_skipped
        passed += s_tests - s_failures - s_errors - s_skipped
    return {"passed": passed, "failed": failed, "skipped": skipped, "total": total}


def sum_duration_ms(suites: list[ET.Element]) -> int:
    total_seconds = 0.0
    for suite in suites:
        try:
            total_seconds += float(suite.get("time", 0))
        except (TypeError, ValueError):
            continue
    return int(round(total_seconds * 1000))


def determine_outcome(counts: dict[str, int]) -> str:
    if counts["total"] == 0:
        # No tests ran — caller may override with SKIPPED_UPSTREAM_FAILURE
        # if a previous layer failed; here the neutral signal is "nothing".
        return "SKIPPED_UPSTREAM_FAILURE"
    if counts["failed"] > 0:
        return "FAILED"
    return "PASSED"


def collect_failures(suites: list[ET.Element]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    for suite in suites:
        suite_name = suite.get("name", "")
        for testcase in suite.findall("testcase"):
            fail = extract_failure(testcase, suite_name)
            if fail is not None:
                failures.append(fail)
    return failures


def build_coverage(coverage_path: Path | None) -> dict[str, Any] | None:
    if coverage_path is None or not coverage_path.exists():
        return None
    # v1 does not parse coverage formats — that is per-framework and
    # will be added as adapters land. For now, emit a placeholder with
    # the source path so the record is still informative.
    return {
        "lines_pct": None,
        "branches_pct": None,
        "source": str(coverage_path),
    }


def build_artifacts(
    junit_path: Path,
    coverage_path: Path | None,
    trace_path: Path | None,
) -> dict[str, str]:
    artifacts: dict[str, str] = {"junit_xml": str(junit_path.resolve())}
    if trace_path is not None and trace_path.exists():
        artifacts["playwright_trace"] = str(trace_path.resolve())
    if coverage_path is not None and coverage_path.exists():
        artifacts["coverage_raw"] = str(coverage_path.resolve())
    return artifacts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--framework",
        required=True,
        choices=["pytest", "playwright", "vitest"],
        help="Which tool produced the native output.",
    )
    parser.add_argument(
        "--junit",
        required=True,
        type=Path,
        help="Path to the JUnit XML file.",
    )
    parser.add_argument(
        "--tier",
        default="unit",
        choices=["unit", "integration", "e2e"],
        help="Layer this run belongs to when layered execution is active.",
    )
    parser.add_argument(
        "--coverage",
        type=Path,
        default=None,
        help="Optional path to a coverage artifact (framework-native format).",
    )
    parser.add_argument(
        "--trace",
        type=Path,
        default=None,
        help="Optional path to a Playwright trace file.",
    )
    parser.add_argument(
        "--run-id",
        default=None,
        help="Session run id (UUID). Generated if omitted.",
    )
    parser.add_argument(
        "--attempt",
        type=int,
        default=1,
        help="Attempt number (1-based). Initial run = 1.",
    )
    args = parser.parse_args(argv)

    if not args.junit.exists():
        sys.stderr.write(f"error: JUnit XML not found: {args.junit}\n")
        return 2
    if args.attempt < 1:
        sys.stderr.write(f"error: --attempt must be >= 1 (got {args.attempt})\n")
        return 2

    try:
        suites = parse_junit(args.junit)
    except ET.ParseError as exc:
        sys.stderr.write(f"error: invalid JUnit XML at {args.junit}: {exc}\n")
        return 2

    counts = build_counts(suites)
    duration_ms = sum_duration_ms(suites)
    failures = collect_failures(suites)
    outcome = determine_outcome(counts)

    record = {
        "run_id": args.run_id or str(uuid.uuid4()),
        "attempt": args.attempt,
        "tier": args.tier,
        "framework": args.framework,
        "outcome": outcome,
        "duration_ms": duration_ms,
        "counts": counts,
        "failures": failures,
        "coverage": build_coverage(args.coverage),
        "artifacts": build_artifacts(args.junit, args.coverage, args.trace),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    json.dump(record, sys.stdout, indent=2, sort_keys=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
