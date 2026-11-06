# @omfde/app

omfde 平台的可运行入口。

当前它只是一个很薄的启动器：解析 monorepo 里的 `pi` 可执行文件，设置 `OMFDE_PLATFORM=1`，然后把参数原样传给 Pi。

```bash
npm run omfde
npm run omfde -- --continue
npm run omfde -- -p "只回复 OK"
```

平台化能力后续加在这里，或者拆成新的 `apps/*`。不要把这个入口直接绑到 Pi 的核心代码上；优先通过扩展、配置和公开 API 组合。
