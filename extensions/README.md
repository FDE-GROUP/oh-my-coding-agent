# extensions

平台级 Pi 扩展。

- `omfde-core/`：基础扩展骨架，注册 `/omfde` 命令。
- 扩展放在这里，而不是 `packages/`，避免和上游 Pi 包混在一起。
- 扩展通过 `ExtensionAPI` 接入，优先使用事件、工具、命令和 UI 能力，不改内核。
