# apps

平台的可运行入口。

- `omfde/`：当前唯一的平台入口，负责启动 Pi 并加载平台级默认配置。
- 新应用放在 `apps/*`，每个应用有独立的 `package.json` 和 `README.md`。
- 应用通过 Pi 的公开 API、扩展和 CLI 组合能力，不直接修改 `packages/` 里的 Pi 核心代码。
