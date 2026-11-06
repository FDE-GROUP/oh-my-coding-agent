# @omfde/extension-core

omfde 平台的基础扩展骨架。

现在只注册一个 `/omfde` 命令，用来确认扩展已被加载：

```bash
pi -e extensions/omfde-core/src/index.ts
```

平台扩展放在 `extensions/`，不要放进 `packages/`，也不要改 Pi 内核。这样 Pi 的包可以继续从上游 rebase。
