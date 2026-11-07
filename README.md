<p align="center">
  <img alt="omfde" src="omfde.jpg" width="160">
</p>

# omfde (oh-my-fde)

[简体中文](README.zh-CN.md)

An enterprise-internal **FDE (Forward Deployed Engineer) platform**, built on an independently maintained fork of [Pi](https://github.com/earendil-works/pi). The coding agent is the platform's core capability, not the final product: the platform evolves step by step toward team collaboration, enterprise integration, and governance — it is not a rewrite of Pi.

This repository does not track upstream. `main` is the product branch; history is anchored by the `pi-fork-base-20d86c365` and `omfde-cutover` tags. See [`docs/explains/26-fork-and-prune.md`](docs/explains/26-fork-and-prune.md).

## Current state

Three goal lines run in parallel:

| Line | Path | Status |
|---|---|---|
| Tutorial (docs) | 理解 → 会用 → 用好 | 会用 done; 用好 continues in the background |
| Platformization (code structure) | 骨架 → 核心能力 → 协作 → 企业集成 → 治理 | **核心能力 in progress (current focus)** |
| Web UI (`apps/fdecode`) | 可用 → 对齐 DSH → 会话完整 → 团队可用 | Milestones M1–M5 delivered |

Platform capabilities are triggered by demonstrated gaps from real usage, not by a roadmap schedule. Each capability still goes through vision → RAD → plan → validation. The constitution is [`docs/specs/vision.md`](docs/specs/vision.md).

## Repository layout

| Directory | Content |
|---|---|
| `packages/` | The Pi fork and shared libraries (9 packages) |
| `apps/` | Runnable apps: `apps/omfde` (platform entrypoint), `apps/fdecode` (FDE Code UI), `apps/docs-site` (docs site) |
| `extensions/` | Platform extensions: `extensions/omfde-core` (first skeleton) |
| `docs/` | Governance and architecture record: `specs/` (constitution, workflow, glossary), `rads/`, `plans/`, `spikes/`, `explains/` |

## Getting started

Requires Node.js >= 22.19 and pnpm 11.15.1 (pinned by `packageManager`).

```bash
pnpm install --ignore-scripts          # hydrate dependencies (no lifecycle scripts)
pnpm --filter @omfde/fdecode build     # build the Web UI once before first launch
pnpm run omfde                         # platform entrypoint: starts FDE Code UI (OMFDE_PLATFORM=1)
pnpm run omfde -- --tui                # launch the Pi TUI directly instead
```

## Packages

| Package | Description |
|---|---|
| **[@earendil-works/pi-agent-core](packages/agent)** | Agent runtime with tool calling and state management |
| **[@earendil-works/pi-ai](packages/ai)** | Unified multi-provider LLM API (OpenAI, Anthropic, Google, etc.) |
| **[@earendil-works/pi-coding-agent](packages/coding-agent)** | Interactive coding agent CLI: session, extensions, tools, compaction |
| **[@earendil-works/pi-codemode](packages/codemode)** | Sandboxed JavaScript execution whose only capability is calling injected tools |
| **[@earendil-works/pi-evals](packages/evals)** | Evaluation harness |
| **[@earendil-works/pi-mcp](packages/mcp)** | Standalone Model Context Protocol client |
| **[@earendil-works/pi-schema](packages/schema)** | JSON Schema validation without eval: 2020-12 and 7, compiled to plain closures |
| **[@earendil-works/pi-telemetry](packages/telemetry)** | Vendor-neutral telemetry contracts, reference adapter, conformance tests, typed schemas |
| **[@earendil-works/pi-tui](packages/tui)** | Terminal UI library with differential rendering |

The upstream `chord` / `durable` / `env` / `p2` subsystems were pruned at the fork point (about half of the repository volume); they are recoverable from git history. Pi user documentation still lives in [`packages/coding-agent/docs/`](packages/coding-agent/docs/).

## FDE Code UI (`apps/fdecode`)

The Web UI line delivers `fdecode` (package `@omfde/fdecode`, UI name "FDE Code"): a local-first React + TanStack Start + Tailwind CSS + Vite app. Sessions, ownership, links, shares, and audit live in `~/.fdecode/fdecode.db` (`node:sqlite`); configuration stays in `config.json`; environment variables use the `FDECODE_*` prefix. M3+ supports 3–5-person team use (optional LAN binding + access-token auth, admin/member roles).

`apps/omfde` consumes it **compositionally**: it launches the already-built Web UI service and shares configuration through `FDECODE_CONFIG`, `FDECODE_CWD`, and the port. `apps/fdecode` keeps its own directory and standalone startup; the code is not merged into the platform skeleton.

```bash
pnpm run fdecode   # run the Web UI from source (dev)
```

## Documentation site

`apps/docs-site` builds a unified Chinese documentation site from `docs/` and `.qoder/repowiki/` with [Blume](https://useblume.dev) (Astro + Vite, static). It serves both humans and coding agents: alongside HTML, the build emits `llms.txt`, a per-page `.md` mirror, and a JSON docs API.

It publishes to the `pages` branch at <https://fde-group.github.io/oh-my-fde/>.

```bash
pnpm --filter @omfde/docs-site build   # sync content + build dist/
pnpm --filter @omfde/docs-site deploy  # dry-run the pages publish (deploy:publish to push)
```

Build and publish mechanism: [`docs/explains/28-docs-site.md`](docs/explains/28-docs-site.md).

## Development

```bash
pnpm install --ignore-scripts  # install dependencies without lifecycle scripts
pnpm run build                 # refresh model data, then build all packages
pnpm run build:offline         # rebuild using existing model data, no network
pnpm run check                 # full local quality gate: lint, format, types, TSDoc, secrets (read-only; no tests)
./test.sh                      # run packages/* tests (never run the full vitest suite directly: e2e activates with env vars)
pnpm run tui                   # run Pi from source in the TUI
```

- All quality gates run **locally only**; this fork does not rely on remote CI. Pre-commit checks staged files; pre-push runs the full `pnpm run check`.
- All work happens on `main` with an explicit per-task write scope; multiple agents may share the same worktree. Never `git add -A`.
- Dependencies and `pnpm-lock.yaml` are treated as reviewed code: direct deps pinned to exact versions, lockfile commits blocked unless `PI_ALLOW_LOCKFILE_CHANGE=1`.
- Tests must not use real provider APIs, keys, or paid tokens; they use the faux provider.

## Governance and contributing

- [`docs/specs/vision.md`](docs/specs/vision.md) — project constitution: goals, boundaries, phase, decision log. Conflicting decisions stop and amend the vision first.
- [`docs/specs/workflow.md`](docs/specs/workflow.md) — the RAD → Spike → Plan → validation loop and gate definitions.
- [`docs/specs/glossary.md`](docs/specs/glossary.md) — terminology SSOT for consistent human/AI communication.
- [`AGENTS.md`](AGENTS.md) — execution discipline for both humans and agents (write scope, git rules, commands). [`CONTRIBUTING.md`](CONTRIBUTING.md) — contributor operations and code gates.

Internal work does not open PRs by default; `main` is the only development branch. GitHub Issues are the team-visible task board.

## Relationship to upstream

This fork does not publish releases and does not contribute to upstream Pi. The npm-era `install-lock` and release scripts are legacy paths kept in the tree but unused. Upstream code, when it must be consulted, is fetched into a temporary clone — the `upstream` remote stays removed.

## License

MIT

<p align="center">
  <strong>omfde</strong> — an enterprise-internal FDE platform.
</p>

<p align="center">
  <img alt="omfde" src="omfde.jpg" width="160">&nbsp;&nbsp;<img alt="Abel" src="abel.jpg" width="160">
</p>
