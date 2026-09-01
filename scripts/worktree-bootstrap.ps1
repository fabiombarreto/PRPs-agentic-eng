#Requires -Version 5.1
<#
.SYNOPSIS
    relay worktree bootstrap — this repository's own instance of the D9
    project-owned hook (docs/decisions.md, 2026-05-11). Windows-parity twin of
    scripts/worktree-bootstrap.sh.

.DESCRIPTION
    Invoked by /relay-worktree as:
        scripts/worktree-bootstrap.ps1 <absolute-worktree-path>
    with a 60-second timeout. Failure is non-fatal to worktree creation; stdout
    and stderr are captured, redacted, and written to
    PRPs/reports/<feature>/worktree-bootstrap.log.

    SCOPE: the stack-specific half of worktree setup only. Propagating
    .claude/settings.json is the UNIVERSAL half and belongs to /relay-worktree
    Step B.0 — every relay worktree needs it in every project, so leaving it to
    a project-owned script would reintroduce the "forgot to check" ambiguity.
    This script deliberately does not touch .claude/.

    This repository's stack is Node/ESM with no build step: `npm run validate`
    and `node --test` need the devDependencies to resolve from inside the
    worktree. Because relay creates worktrees at
    <repo_root>/.worktrees/<feature>/ — nested inside the repository — Node's
    module resolution walks up and finds the root node_modules without any
    copying or linking. This script verifies that rather than assuming it, so a
    future layout change fails loudly here instead of silently later, inside a
    test run.

.PARAMETER WorktreePath
    Absolute path to the worktree just created by /relay-worktree.
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$WorktreePath
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($WorktreePath)) {
    Write-Error "worktree-bootstrap: FAIL - no worktree path given.`n  usage: scripts/worktree-bootstrap.ps1 <absolute-worktree-path>"
    exit 1
}

if (-not (Test-Path -LiteralPath $WorktreePath -PathType Container)) {
    Write-Error "worktree-bootstrap: FAIL - not a directory: $WorktreePath"
    exit 1
}

Write-Output "worktree-bootstrap: target $WorktreePath"

# The one thing this stack needs: the dependency tree the validate suite and the
# node:test corpus import. 'ajv' is a real devDependency of this repository
# (scripts/validate imports it), so resolving it proves the tree is reachable -
# not merely that a node_modules directory exists.
Push-Location -LiteralPath $WorktreePath
try {
    & node -e "require.resolve('ajv')" 2>$null | Out-Null
    $resolved = ($LASTEXITCODE -eq 0)
}
catch {
    $resolved = $false
}
finally {
    Pop-Location
}

if (-not $resolved) {
    Write-Error @"
worktree-bootstrap: FAIL - 'ajv' does not resolve from $WorktreePath.
  The worktree cannot run 'npm run validate' or 'node --test' in this state.
  Run 'npm install' at the repository root, or check that the worktree is
  still nested under it so node's module resolution can walk up.
"@
    exit 1
}

Write-Output "worktree-bootstrap: OK - node dependency tree resolves from the worktree"
Write-Output "worktree-bootstrap: done"
