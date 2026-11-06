# Development Rules

## Current State

This repository is a local fork of `earendil-works/pi`, not a GitHub fork.

- `upstream` is the Pi remote. `main` is the product branch; `upstream/main` is the read-only Pi mirror used only for sync. `pages` publishes the docs site. Do not contribute upstream.
- All work happens on `main`. Do not create feature branches or worktrees on other branches.
- Do not commit to `upstream/main`.
- Pruned upstream subsystems: `apps/p2`, `packages/env`, `packages/durable`, `packages/chord`, and `scripts/durable-browser-smoke-entry.ts`.
- Kept packages: `agent`, `ai`, `coding-agent`, `codemode`, `evals`, `mcp`, `schema`, `telemetry`, `tui`.
- Platform layout: `apps/` holds runnable apps, `extensions/` holds platform extensions, and `packages/` holds Pi and shared libraries. Pi packages stay in `packages/` so upstream rebases keep applying.
- `apps/omfde` is the first platform entrypoint. It launches Pi with `OMFDE_PLATFORM=1`; `extensions/omfde-core` is the first extension skeleton.
- Pi core code is unmodified except for two removed comment lines in `packages/coding-agent/src/utils/shell.ts`.
- Goals run as two parallel lines: the tutorial line (理解 → 会用 → 用好) and the platform line (骨架 → 核心能力 → 协作 → 企业集成 → 治理). The project is in 会用. Do not modify Pi core behavior until a real gap justifies the platform phase.
- The vision and its decision log live in `docs/specs/vision.md`. Reading notes, validation scripts, and fork details live in `docs/explains/`.
- Prune scope and recovery instructions: `docs/explains/26-fork-and-prune.md`.

In the current phase, prefer configuration and extensions over core changes. A core change needs an explicit decision recorded in `docs/specs/vision.md` first.

## Vision Authority

`docs/specs/vision.md` is the project constitution.

- Code, docs, and development decisions must stay within the vision's goals, boundaries, and phase.
- Decisions inside those boundaries are normal implementation work and do not need a vision change.
- If a concrete decision conflicts with the vision, or would expand its boundaries, stop. Discuss whether to amend the vision first. Do not implement the conflicting change and do not silently reinterpret the vision.
- Record an approved amendment in the vision's decision log before implementing it.
- The vision is not an implementation plan. It answers where the project is going and what it is not doing.

## Hard Rules

These override convenience and local preference.

- Work only on `main`. Do not create feature branches or worktrees on other branches. If a task seems to require one, stop and ask the decision-maker.
- Every task must declare an explicit write scope in its issue or task. A-class mechanical fixes may use the session task as the declaration. No scope means the task is not ready; do not start.
- Keep writes inside the declared scope. Before commit, verify with `git status` and `git diff --name-only`.
- Commit only files you changed in this session and that are inside your write scope. Do not stage or commit other agents' files. Out-of-scope commits require explicit decision-maker approval.
- `pages` is publish-only. Do not switch the shared worktree to `pages`, commit on it, or push it without explicit decision-maker authorization. Authorized publishing uses a separate clone or worktree.
- Branch-changing and shared-state Git operations are serialized. Do not run `git switch`, `git checkout <branch>`, `git rebase`, `git reset`, `git stash`, or branch deletion in the shared worktree without decision-maker coordination.
- All quality gates run locally. Do not rely on GitHub Actions or any remote CI; push only after local checks pass.
- Shared files are single-writer: package manifests, lockfiles, `tsconfig.json`, `AGENTS.md`, `docs/specs/`, the root README, and generated files.

## Conversational Style

- Keep answers short and concise
- No emojis in commits, issues, PR comments, or code
- No fluff or cheerful filler text (e.g., "Thanks @user" not "Thanks so much @user!")
- Technical prose only, be direct
- Use concise, clear, simple language. Define unavoidable jargon before using it.
- Explain non-trivial designs and problems as: problem, concrete example or short trace, then solution. State why the solution is necessary and distinguish it from optional complexity.
- Prefer concrete behavior and small illustrations over abstract summaries, dense terminology, or unexplained lists of changes.
- When the user asks a question, answer it first before making edits or running implementation commands.
- When responding to user feedback or an analysis, explicitly say whether you agree or disagree before saying what you changed.

## Code Quality

- Read files in full before wide-ranging changes, before editing files you have not fully inspected, and when asked to investigate or audit. Do not rely on search snippets for broad changes.
- No `any` unless absolutely necessary.
- No runtime checks of values whose types TypeScript already guarantees (no `typeof`/`instanceof`/`Array.isArray`/shape guards on typed parameters, typed callback results or typed declarations). Validate only at decided trust boundaries (wire input, schema-checked arguments and params).
- Inline single-line helpers that have only one call site.
- Check node_modules for external API types; don't guess.
- **No inline imports** (`await import()`, `import("pkg").Type`, dynamic type imports). Top-level imports only.
- In `packages/coding-agent`, resolve package assets through helpers in `src/config.ts`. Do not use `__dirname` directly; the helpers account for source checkouts, npm installations, and standalone binaries.
- Never remove or downgrade code to fix type errors from outdated deps; upgrade the dep instead.
- Use only erasable TypeScript syntax (Node strip-only mode) in code checked by the root config (`packages/*/src`, `packages/*/test`, `packages/coding-agent/examples`): no parameter properties, `enum`, `namespace`/`module`, `import =`, `export =`, or other constructs needing JS emit. Use explicit fields with constructor assignments.
- Always ask before removing functionality or code that appears intentional.
- Do not preserve backward compatibility unless the user asks for it.
- Never hardcode key checks (e.g. `matchesKey(keyData, "ctrl+x")`). Add defaults to `DEFAULT_EDITOR_KEYBINDINGS` or `DEFAULT_APP_KEYBINDINGS` so they stay configurable.
- Never modify `packages/ai/src/models.generated.ts` directly; update the catalog definitions in `packages/ai/catalog/` instead (see its README), then regenerate. Including the resulting `models.generated.ts` diff is always OK, even if regeneration includes unrelated upstream model metadata changes. The generated model data in `packages/ai/src/providers/data/` is gitignored: never stage it, and don't look for it in git history.
- Do not add new workspace packages, or change the package graph, without recording the decision in `docs/specs/vision.md`.

## Commands

- After code changes (not docs): `npm run check` (full output, no tail). Fix all errors, warnings, and infos before committing. Does not run tests.
- `npm run omfde` launches the platform entrypoint. `npm run tui` still launches Pi directly from source.
- Run `npm run build` only when something needs built output (`dist/`), for example tests that import built packages. Never use it to type check or lint: that is `npm run check`.
- Never run `npm test` unless requested by the user.
- Never run the full vitest suite directly: it includes e2e tests that activate when endpoint/auth env vars are present. For all non-e2e tests, run `./test.sh` from the repo root. It runs `packages/*` only. Otherwise run specific tests from the package root:
  - Vitest: `node "$(git rev-parse --show-toplevel)/node_modules/vitest/dist/cli.js" --run test/specific.test.ts`
  - `packages/tui` (`node:test`): `node --test test/specific.test.ts`
- If you create or modify a test file, run it and iterate on test or implementation until it passes.
- For `packages/coding-agent/test/suite/`, use `test/suite/harness.ts` + the faux provider. No real provider APIs, keys, or paid tokens.
- When adding regression tests for a fixed issue, add a comment with the issue number next to the test.
- For ad-hoc scripts, `write` them to a temp file (e.g. `/tmp`), run, edit if needed, remove when done. Don't embed multi-line scripts in `bash` commands.
- Never commit unless the user asks.

Known environmental failures are tracked in `docs/explains/00-baseline.md`. Do not mask a failure with skips or relaxed assertions; record it instead.

## Environment and Test Model

- DeepSeek is the test LLM. Credentials live in `~/.pi/agent/auth.json`; the default model is set in `~/.pi/agent/settings.json`. Never commit either file or paste keys into source.
- `.env.example` is a template, not a runtime config file. Pi does not load `.env`. `ODOOTHINK_PROVIDER` and `ODOOTHINK_MODEL` are not recognized by Pi; map them to `--provider` / `--model` or to `defaultProvider` / `defaultModel` in settings.
- Tests must not use real provider APIs, keys, or paid tokens. Use the faux provider.
- TUI smoke checks may use DeepSeek with small prompts. Keep them cheap and deterministic where possible.

## Dependency and Install Security

- Treat npm dep and lockfile changes as reviewed code. Direct registry deps, including internal workspace deps, stay pinned to exact versions.
- When updating `undici`, you MUST read its changelog/release notes for the target version and evaluate whether any changes may affect functionality before applying the update.
- Hydrate/update locally with `npm install --ignore-scripts`; clean/CI-style with `npm ci --ignore-scripts`. Don't run lifecycle scripts unless the user asks.
- If dep metadata changes, refresh `package-lock.json` with `npm install --package-lock-only --ignore-scripts`.
- If `packages/coding-agent/install-lock/` needs regen, run `node scripts/generate-coding-agent-install-lock.mjs` (verify with `--check` or `npm run check`). New deps with lifecycle scripts require review and an explicit allowlist entry in that script; never add one silently.
- Pre-commit blocks lockfile commits unless `PI_ALLOW_LOCKFILE_CHANGE=1`. Don't bypass unless the user wants the lockfile change committed.

## Branch, Git, and Upstream

Multiple pi sessions may run in this cwd at the same time, each modifying different files. Git operations that touch unstaged, staged, or untracked files outside your own changes will stomp on other sessions' work.

- Work only on `main`. Do not create feature branches or worktrees on other branches. If a task seems to require one, stop and ask the decision-maker.
- Never commit to `upstream/main`; it is the read-only Pi mirror.
- Keep `pages` as a standalone docs branch; do not merge it into `main`.
- Do not switch the shared worktree to `pages` or run branch-changing Git operations there without decision-maker coordination. Authorized publishing uses a separate clone or worktree.
- Respect the write scope assigned in the issue. Do not edit outside it without explicit approval. Treat package manifests, lockfiles, `tsconfig.json`, `AGENTS.md`, `docs/specs/`, the root README, and generated files as shared single-writer files.
- Only commit files YOU changed in THIS session and that are inside your write scope. Do not stage or commit other agents' files.
- Stage explicit paths (`git add <path1> <path2>`); never `git add -A` / `git add .`.
- Before committing, run `git status` and `git diff --cached --name-only`; verify every staged path is yours and inside your write scope. Out-of-scope commits require explicit decision-maker approval.
- `packages/ai/src/models.generated.ts` is generated and shared. Include it only when your change regenerates it; otherwise leave it unstaged. It is still subject to the write-scope rule.
- Message format: `{feat,fix,docs}[(repo|ai|tui|agent|coding-agent)]: <commit message>` (optionally multiple lines). Message is informative and concise.
- Never push to `upstream` and never open upstream PRs. Upstream is read-only.

Never run (destroys other agents' work or bypasses checks):

- `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git add -A`, `git add .`, `git commit --no-verify`.

Syncing upstream:

- `upstream/main` moves independently. Do not compare your work with `git diff upstream/main`; use the fork base recorded in `docs/explains/26-fork-and-prune.md`, or `git log --oneline HEAD..upstream/main` to see upstream-only commits.
- Sync with `git fetch upstream && git rebase upstream/main`. Do not merge upstream into `main`; a merge hides our changes in history.
- If rebase conflicts occur, resolve conflicts only in files you modified. If a conflict is in a file you did not modify, abort and ask the user.
- Never force push.

## Issues and PRs

This fork does not use the upstream issue/PR gate. GitHub Issues are the internal record and task board for requirements, bugs, and stage goals; the durable product record stays in `docs/specs/vision.md`, `docs/rads/`, `docs/plans/`, and `docs/explains/`.

- New requirements start with a decision-maker-led discussion. After the decision, create or link the issue and, if needed, the RAD. Bugs can start as issues. Link requirement issues to `docs/rads/<slug>.md`; link implementation issues to `docs/plans/<slug>.md`; track stage goals with milestones or tracking issues.
- Team-visible development tasks are tracked by issue. A-class mechanical fixes may skip an issue unless they touch shared docs, behavior, or parallel work.
- Internal work does not open PRs by default. PRs are only for external contributors or a decision-maker-approved internal exception. Internal exception PRs use a separate fork or clone, not a branch in this repository.
- Only the decision-maker or an explicitly authorized agent may merge. Use squash merge, delete the source branch, and update the issue with the result.
- This repository does not contribute to upstream Pi. Do not open PRs or push branches to `upstream`.
- When posting issue/PR comments, write the comment to a temp file and post with `gh issue/pr comment --body-file`. Keep comments concise, technical, and end every AI-posted comment with the AI-generated disclaimer line specified by the originating prompt.
- When closing issues via commit, include `fixes #<number>` or `closes #<number>`; repeat the keyword per issue.

## Documentation

- `docs/specs/vision.md` is the tracked project constitution and decision log. Update and commit it with any change to goals, boundaries, or phase; do not leave vision changes uncommitted.
- `docs/specs/workflow.md` is the development workflow. Follow it for RAD, spike, plan, validation, and closing work.
- `docs/explains/` holds architecture notes, validation scripts, and the fork record. Update it when understanding changes, and prefer executable validation over prose-only claims.
- Keep the Chinese translations in sync with their English sources: `README.zh-CN.md`, `AGENTS.zh-CN.md`, `CONTRIBUTING.zh-CN.md`.
- Do not commit `.env`, `~/.pi/agent/auth.json`, or any API key.

## Testing pi Interactive Mode with tmux

For testing pi's interactive mode, load and follow [.pi/skills/interactive-testing.md](.pi/skills/interactive-testing.md).

## Changelog and Releases

- This fork does not publish releases and does not maintain per-package changelogs. Do not edit `packages/*/CHANGELOG.md` for internal work; record internal changes in `docs/explains/`.
- This repository does not contribute to upstream Pi, so upstream changelog and release rules do not apply.

## User Override

If the user's instructions conflict with any rule in this document, ask for explicit confirmation before overriding. Only then execute their instructions.
