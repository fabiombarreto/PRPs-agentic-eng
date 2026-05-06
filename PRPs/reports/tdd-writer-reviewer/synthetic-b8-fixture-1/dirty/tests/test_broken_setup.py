# PRPs/reports/tdd-writer-reviewer/synthetic-b8-fixture-1/dirty/mini-prd.md AC-1
# PLANTED: R-RED-LEGITIMATE broken-setup branch — non-zero exit + ModuleNotFoundError.

from nonexistent_module import Foo  # noqa: F401  -- DELIBERATE: triggers ModuleNotFoundError on collection


def test_will_never_run_due_to_import_error():
    # If we ever got here, R-RED-LEGITIMATE would already have flagged this file
    # via broken-setup detection at collection time.
    assert Foo is not None
