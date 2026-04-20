# `.claude/settings.json` — allowlist catalog

Canonical reference for what the `context-builder` skill emits into a
target project's `.claude/settings.json` during `*init`. The file enables
the autonomous portion of the relay pipeline to run without interrupting
the user for per-command permission prompts.

**Principle:** allowlist by narrow command pattern, never by tool. Deny
list is invariant and always applied.

**Scope exception:** `.claude/settings.json` is **setup config**, not a
pipeline artifact. It is written once by the context-builder at `*init`
(interactively, with the user's Claude Code asking for permission to
write to `.claude/` — acceptable UX at setup time). The autonomous
pipeline reads it but never writes under `.claude/`. See
`docs/anti-patterns.md`.

---

## `permissions.allow` — stack-dependent

Each category lists the patterns the context-builder emits **only when the
corresponding stack signal is detected in Phase 1**. Unused patterns are
not emitted.

### Test execution

| Stack signal | Emit |
|--------------|------|
| `bun.lockb` | `Bash(bun test *)`, `Bash(bun run test*)`, `Bash(bun run lint*)`, `Bash(bun run typecheck*)` |
| `pnpm-lock.yaml` | `Bash(pnpm test *)`, `Bash(pnpm run test*)`, `Bash(pnpm exec *)` |
| `yarn.lock` | `Bash(yarn test *)`, `Bash(yarn run test*)` |
| `package-lock.json` | `Bash(npm test *)`, `Bash(npm run test*)`, `Bash(npx *)` |
| `pyproject.toml` with pytest | `Bash(pytest *)`, `Bash(python -m pytest *)`, `Bash(uv run pytest *)` |
| `go.mod` | `Bash(go test *)` |
| `Cargo.toml` | `Bash(cargo test *)` |
| `pom.xml` | `Bash(mvn test)`, `Bash(mvn verify)` |
| `*.csproj` / `*.sln` | `Bash(dotnet test *)` |
| `Gemfile` | `Bash(bundle exec rspec *)`, `Bash(rspec *)`, `Bash(rake test*)` |
| `Makefile` with test target | `Bash(make test*)` |

### Docker / test environment

| Stack signal | Emit |
|--------------|------|
| `compose.test.yml` or similar | `Bash(docker compose -f compose.test.yml up -d*)`, `Bash(docker compose -f compose.test.yml down*)`, `Bash(docker compose -f compose.test.yml exec *)`, `Bash(docker compose -f compose.test.yml logs *)`, `Bash(docker compose -f compose.test.yml ps*)` |
| Any `docker-compose*.yml` | `Bash(docker compose up -d *)`, `Bash(docker compose down *)`, `Bash(docker compose exec *)`, `Bash(docker compose logs *)`, `Bash(docker compose ps*)` |
| Any `Dockerfile` | `Bash(docker build *)`, `Bash(docker ps)`, `Bash(docker logs *)` |

### Git (always, non-destructive only)

- `Bash(git status*)`
- `Bash(git diff*)`
- `Bash(git log*)`
- `Bash(git add *)`
- `Bash(git commit *)`
- `Bash(git branch*)`
- `Bash(git checkout feature/*)` — restricted to feature branches
- `Bash(git checkout -b feature/*)`
- `Bash(git worktree *)`
- `Bash(git fetch*)`
- `Bash(git push origin feature/*)` — never `main`, never `--force`
- `Bash(git stash*)` — stash/pop acceptable
- `Bash(git rev-parse*)`, `Bash(git show*)`, `Bash(git ls-files*)`

### GitHub CLI (always, read + restricted write)

- `Bash(gh pr create *)`
- `Bash(gh pr view *)`
- `Bash(gh pr checks *)`
- `Bash(gh pr list *)`
- `Bash(gh issue view *)`
- `Bash(gh issue list *)`
- `Bash(gh api)` — default is GET; mutations (`-X POST/PUT/DELETE/PATCH`) not allowed by this pattern

### Package managers (install / add; never global)

| Stack signal | Emit | Explicit deny (see below) |
|--------------|------|--------------------------|
| `bun.lockb` | `Bash(bun install)`, `Bash(bun add *)` | `bun add -g *` |
| `pnpm-lock.yaml` | `Bash(pnpm install)`, `Bash(pnpm add *)` | `pnpm add -g *` |
| `package-lock.json` | `Bash(npm install)`, `Bash(npm ci)`, `Bash(npm install --save *)` | `npm install -g *` |
| `pyproject.toml` | `Bash(uv sync)`, `Bash(uv add *)`, `Bash(pip install -r *)` | `pip install --user *`, `pip install -g *` |
| `Gemfile` | `Bash(bundle install)`, `Bash(bundle add *)` | |

### Lint / format / typecheck

Usually invoked via package scripts (already covered by test-execution
entries). When invoked directly:

- `Bash(ruff check*)`, `Bash(ruff format*)`
- `Bash(eslint *)`
- `Bash(prettier *)`
- `Bash(tsc *)`
- `Bash(mypy *)`, `Bash(pyright *)`

### Read-only file operations (always)

- `Bash(ls *)`
- `Bash(find *)`
- `Bash(cat *)`, `Bash(head *)`, `Bash(tail *)`
- `Bash(rg *)`, `Bash(grep *)`
- `Bash(which *)`
- `Bash(pwd)`
- `Bash(env)` — read env vars (values may be sensitive but read-only)

### Worktree cleanup (scoped)

- `Bash(rm -rf .worktrees/*)` — **only inside the `.worktrees/` folder**

---

## `permissions.deny` — invariant across all projects

Hardcoded. Emitted in every generated `settings.json` regardless of stack.

### Destructive git

- `Bash(git push --force*)`
- `Bash(git push -f*)`
- `Bash(git push * --force*)`
- `Bash(git reset --hard*)`
- `Bash(git clean -fd*)`
- `Bash(git branch -D*)` — force-delete branches
- `Bash(git push origin main*)`, `Bash(git push origin master*)` — direct push to default branches

### Destructive file operations

- `Bash(rm -rf /*)`
- `Bash(rm -rf ~*)`
- `Bash(rm -rf ..*)`
- `Bash(rm -rf *)` — bare pattern; only the scoped `.worktrees/` form allowed above

### Privilege escalation

- `Bash(sudo *)`
- `Bash(su *)`
- `Bash(chmod 777*)`
- `Bash(chmod -R 777*)`

### Remote execution

- `Bash(curl * | sh*)`
- `Bash(curl * | bash*)`
- `Bash(wget * | sh*)`
- `Bash(wget * | bash*)`

### Destructive Docker

- `Bash(docker system prune*)`
- `Bash(docker volume rm *)`
- `Bash(docker volume prune*)`
- `Bash(docker image prune*)`

### Global package pollution

- `Bash(npm install -g *)`, `Bash(npm i -g *)`
- `Bash(pip install --user *)`, `Bash(pip install -g *)`
- `Bash(bun add -g *)`
- `Bash(pnpm add -g *)`
- `Bash(yarn global *)`

### System directory writes

- `Bash(* > /etc/*)`, `Bash(* > /usr/*)`
- `Bash(* > %SystemRoot%/*)` (Windows)
- Any redirection to absolute system paths.

### GitHub mutations outside PR/issue flow

- `Bash(gh api -X DELETE *)`
- `Bash(gh api -X PUT *)`
- `Bash(gh repo delete *)`

---

## Patterns explicitly forbidden in `allow`

The context-builder MUST refuse to emit these, even if the user asks:

- `Bash(*)` — catches everything, defeats the purpose.
- `Bash(git *)` — too broad; would allow `git push --force`.
- `Bash(docker *)` — too broad.
- `Bash(rm *)` — too broad.
- Any pattern ending in `*` at the verb level.

If a stack signal would require such a broad pattern, it is a signal that
the detection logic needs more granularity — not that the pattern should
be loosened.

---

## Update behavior

- **`*init`:** generates `.claude/settings.json` fresh. Overwrites any
  existing file (with a warning printed; user sees Claude Code's prompt).
- **`*update`:** re-runs stack detection. **Adds** missing allow entries
  for newly detected signals. **Never removes** existing allow entries
  (they may have been added by the human on purpose). Denylist is
  replaced wholesale from this catalog (invariant).

---

## Per-user overrides

`.claude/settings.local.json` (git-ignored) is not generated by the
context-builder. Users can add per-machine overrides there (e.g., extra
allow patterns for their personal tooling) without polluting the
committed settings.
