# Spike：fdecode SQLite 元数据存储

> 对应 issue：[#7](https://github.com/FDE-GROUP/oh-my-fde/issues/7)。
>
> 方向记录：`docs/specs/vision.md`“fdecode 引入 SQLite 存储元数据”。
>
> 效力：证据与输入，不是编码依据。spike 代码在 `/tmp/opencode/fdecode-sqlite`，不进入 `main`。

## 1. 要回答的问题

| 编号 | 问题 |
|---|---|
| S1 | Node 22.23 的 `node:sqlite` 是否支持 WAL、事务、回滚、备份和并发写？ |
| S2 | 旧 JSON 一次性导入能否幂等？权限如何处理？ |
| S3 | 对现有 owners/links/shares/audit 的替换是否有明显性能或兼容风险？ |

## 2. 环境与方法

| 项目 | 值 |
|---|---|
| 日期 | 2026-11-06 |
| Node | v22.23.0 |
| 驱动 | 内置 `node:sqlite`（`DatabaseSync`） |
| 模式 | WAL、`busy_timeout=5000`、`synchronous=NORMAL`、`foreign_keys=ON` |

- 建五张表：`schema_migrations`、`session_owners`、`issue_links`、`shares`、`audit_events`。
- 事务内插入 10,000 条审计；查询尾部 20 条；测试回滚。
- 4 个独立进程同时写 100 条，验证锁等待。
- 从 JSON 导入 owners/links/shares/audit，执行两次观察幂等。
- `VACUUM INTO` 备份；`chmod` 数据库与 WAL/SHM。

## 3. 结果

| 检查 | 结果 |
|---|---|
| 10,000 条事务插入 | 33ms |
| 尾部 20 条查询 | <1ms |
| 回滚 | 数量不变 |
| 4 进程并发写 | 成功，400 条全部写入，无 `database is locked` |
| WAL / SHM | 生成后可 chmod 为 600 |
| 数据库权限 | 600 |
| 备份 | `VACUUM INTO` 生成 733KB 文件 |
| 实验性警告 | Node 22.23 首次加载打印 `ExperimentalWarning` |

### 幂等导入的问题

第一次导入 7 条，第二次又导入 3 条：

- owners/links/shares 使用 `INSERT OR IGNORE`，主键生效；
- `audit_events` 没有唯一约束，三条 JSON 审计被重复插入。

结论：不能仅靠 `OR IGNORE`。必须在 `schema_migrations` / `meta` 中记录 `json_import_v1`，只执行一次；或在导入事务中检查标记。迁移成功后删除旧 JSON；解析失败时保留文件。

## 4. 结论与对 plan 的影响

| 编号 | 结论 | 影响 |
|---|---|---|
| S1 | 可用 | 使用 `node:sqlite`；封装事务、错误与关闭 |
| S2 | 需迁移标记 | 一次性 JSON 导入，记录版本；审计不依赖唯一键 |
| S3 | 风险可控 | 现有 API 语义可映射；retention 可改为事务 |

### 被否决的选项

| 选项 | 理由 |
|---|---|
| `better-sqlite3` | 原生 ABI、安装脚本，违背当前 `--ignore-scripts` |
| 继续用 JSON | 一致性、查询和清理成本会继续上升 |
| 共享 omfde 数据库 | 破坏 fdecode 独立边界 |
| 依赖 `OR IGNORE` 做迁移幂等 | 审计表会重复 |

### 风险

| 风险 | 应对 |
|---|---|
| `node:sqlite` 仍是 experimental | 封装 adapter；升级 Node 时回归 WAL/事务/备份 |
| WAL/SHM 权限 | 打开后 chmod 数据库与 sidecar |
| 迁移失败 | 单事务导入；失败回滚；保留 JSON |
| 多进程写锁 | `busy_timeout` + 短事务；避免长事务 |
| 备份一致性 | 使用 `VACUUM INTO`，文档说明停止写入或依赖 WAL |

## 5. 对 plan 的具体建议

1. 新增 `server/db.ts`：路径、pragma、迁移、事务辅助、关闭。
2. 迁移表包含 `json_import_v1` 标记；导入在单事务内完成。
3. owners/links/shares/audit 改为 prepared statements；保留原函数签名。
4. 审计写入改为同步 prepared insert；查询走索引。
5. retention 使用事务删除会话元数据、分享和审计。
6. 数据库与 sidecar chmod 600；文档增加备份/恢复。
7. 启动脚本可加 `--disable-warning=ExperimentalWarning`，避免生产日志噪音（可选）。
8. 平台数据继续使用独立数据库。

## 6. 未决问题

- 是否把 `fdecode.db` 放在可配置路径，还是固定 `~/.fdecode/`：plan 中定。
- 旧 JSON 的去留：已定迁移成功后删除；解析失败时保留文件。
- 是否在 M6 之前把任务/项目表也放进同一数据库：建议不，等平台化线。
