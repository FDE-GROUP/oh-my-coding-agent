# Contributing to omfde

This repository is the internal FDE platform for oh-my-fde (omfde), built on Pi.

## Read first

- [`docs/specs/vision.md`](docs/specs/vision.md)
- [`docs/specs/workflow.md`](docs/specs/workflow.md)
- [`AGENTS.md`](AGENTS.md)

## The one rule

You must understand your code. AI-generated code is fine; submitting code you cannot explain is not. If you cannot explain what a change does and how it interacts with the rest of the system, it is not ready.

## Issue and discussion

GitHub Issues are the team record and task board for requirements, bugs, and tasks; they also track stage goals through milestones or tracking issues.

- New requirements start with a decision-maker-led discussion. After the decision, create the issue and link the RAD if one is needed.
- Bugs can start as an issue, or be recorded right after the discussion. Do not rely on chat-only reports.
- Use the "omfde Task" issue form. It requires an explicit write scope.
- Requirement issue: if a RAD is needed, link it in `docs/rads/<slug>.md`; otherwise state why no RAD is needed. The decision-maker decides.
- Implementation issue: link the plan in `docs/plans/<slug>.md`. Non-trivial work needs an approved plan before coding.
- Bug issue: include reproduction, expected/actual behavior, and environment. Close it with `fixes #N`.
- A-class mechanical fixes may skip an issue unless they touch shared docs, behavior, or parallel work.
- Use milestones or tracking issues for stage goals; assign each development issue to one.

## Workflow

1. For a new requirement, start with a decision-maker discussion; then open or pick an issue. Bugs can start with an issue.
2. Write a RAD if needed; the decision-maker confirms it and the user stories freeze.
3. Run a spike if a key uncertainty remains.
4. Write a plan for non-trivial work; the decision-maker approves it. The plan is the coding basis.
5. Implement inside the approved plan.
6. Validate with commands and recorded evidence.
7. Close the issue and link the result.

The full process is in [`docs/specs/workflow.md`](docs/specs/workflow.md).

## Scope and boundaries

- `docs/specs/vision.md` is the project constitution. Do not exceed its goals, boundaries, or phase. If a change conflicts, stop and discuss amending the vision first.
- Pi core stays minimal. Prefer apps, extensions, and configuration over core changes.
- Do not modify Pi core unless the vision decision and the approved plan say so.
- Keep Pi packages in `packages/` so upstream rebases keep applying.
- Platform code belongs in `apps/`, `packages/`, or `extensions/` according to its role.

## Branches and commits

- Work only on `main`. Do not create feature branches or worktrees on other branches. If a task seems to require one, stop and ask the decision-maker.
- Every agent task declares an explicit write scope. A-class mechanical fixes may use the session task as the declaration. A task without a scope is not ready; do not start.
- Keep writes inside the declared scope; verify with `git status` and `git diff --name-only` before committing. Shared files are single-writer and serialized.
- Commit only files you changed in this session and inside your write scope. Never stage or commit other agents' files. Out-of-scope commits require explicit decision-maker approval.
- Stage explicit paths; never use `git add -A` or `git add .`. Before commit, check `git status` and `git diff --cached --name-only`.
- Commit message: `{feat,fix,docs}[(repo|ai|tui|agent|coding-agent)]: <summary>`. Use `refs #N` in the body; use `fixes #N` or `closes #N` when complete.
- Do not commit `.env`, `~/.pi/agent/auth.json`, or API keys.
- Do not edit `pages` directly; the docs site has its own publish flow.
- Do not edit `packages/*/CHANGELOG.md` for internal work; record internal changes in `docs/explains/`.
- All agents share the `main` worktree. Serialize branch-changing and Git-state operations (switch, checkout, rebase, reset, stash, branch deletion); do not run them concurrently.

## Pull requests and merges

- Internal work does not open PRs by default. `main` is the only development branch.
- This repository does not contribute to upstream Pi and does not open upstream PRs.
- PRs are only for external contributors (from their fork) or a decision-maker-approved internal exception.
- An internal exception PR must use a separate fork or clone; do not create its source branch in the canonical repository.
- A PR must link its issue and RAD/plan if present, state its write scope, list validation commands and output, and contain only scoped changes.
- Only the decision-maker, or an agent explicitly authorized by them, may merge.
- Use squash merge, keep `main` linear, delete the source branch, and update the issue with the result.
- Never force push.

## pages branch

- `pages` is a publish-only branch, not a development branch.
- Without explicit decision-maker authorization, do not switch to, check out, commit on, push, or merge `pages`.
- Authorized publishing uses a separate clone or worktree; never switch the shared `main` worktree.
- Do not merge `pages` into `main` or `main` into `pages`.
- If publishing must use the shared worktree, stop every agent first and get explicit authorization.

## Quality gates

- All quality gates run locally. Remote CI is not a gate; do not push expecting GitHub Actions to catch failures.
- Code changes: run `npm run check`.
- Run the relevant tests; use `./test.sh` for non-e2e tests.
- Platform entry changes: run `npm run omfde -- --version` and one `npm run omfde -- -p "..."` smoke.
- Record commands, output, and environment. Do not mask failures with skips or relaxed assertions.
- If you create or modify a test, run it and iterate until it passes.

## Upstream sync

This repository tracks `earendil-works/pi` as a read-only source. Internal work follows this guide and `docs/specs/workflow.md`.

- Do not open PRs against upstream Pi or push branches to `upstream`.
- Use upstream only to fetch and rebase; upstream's issue and PR gates do not apply to our internal work.

## External contributions

The repository is public, but current development serves the internal team. External contributors should open an issue first and wait for a decision before opening a PR.

## Questions

Open an issue or ask the decision-maker. For architecture, read `docs/explains/` before asking.
