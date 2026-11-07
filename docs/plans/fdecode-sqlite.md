# Plan：fdecode SQLite 元数据存储

> 效力：经决策者批准后，本文件是实现和验收的唯一编码依据。方向见 `docs/specs/vision.md`。
>
> Spike 结论：`docs/spikes/fdecode-sqlite.md`。

| 字段 | 值 |
|---|---|
| 状态 | 已批准 |
| 决策者 | Abel |
| 关联 issue | [#7](https://github.com/FDE-GROUP/oh-my-fde/issues/7) |
| 关联 RAD | 无（存储层重构，由 vision 决策记录覆盖） |
| 最后更新 | 2026-11-06 |

## 1. 目标

把 fdecode 的元数据从 JSON 文件迁移到 SQLite，为后续任务、项目和证据数据打基础，同时保持现有 API 行为不变。

## 2. 非目标

- 不改 Pi session 文件格式。
- 不迁移 fdecode 配置（继续 `config.json`）。
- 不建任务/项目/证据表。
- 不与 `apps/omfde` 共享数据库。
- 不引入 ORM。

## 3. 设计要点

### 3.1 数据库

- 路径：`~/.fdecode/fdecode.db`，可由 `FDECODE_DB` 覆盖（测试与运维）。
- 打开时设置：`journal_mode=WAL`、`busy_timeout=5000`、`synchronous=NORMAL`、`foreign_keys=ON`。
- 打开与迁移后 chmod 数据库、`-wal`、`-shm` 为 0600。
- 备份：`VACUUM INTO`；文档说明先停止写入。

### 3.2 Schema

```sql
schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)
session_owners(id TEXT PRIMARY KEY, owner TEXT, workspace_id TEXT, updated_at INTEGER)
issue_links(session_id TEXT PRIMARY KEY, repo_id TEXT, number INTEGER, title TEXT, url TEXT)
shares(token_hash TEXT PRIMARY KEY, session_id TEXT, owner TEXT, created_at INTEGER, expires_at INTEGER, revoked_at INTEGER)
audit_events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, user TEXT, role TEXT, action TEXT, target TEXT, result TEXT, detail TEXT)
CREATE INDEX audit_events_ts ON audit_events(ts);
```

迁移版本：

- `1`：创建表与索引。
- `2`：`json_import_v1` 一次性导入。
- 旧 JSON：`sessions.json`、`links.json`、`shares.json`、`audit.jsonl`。
- 导入在单事务内；成功后写入 `json_import_v1` 标记并删除旧 JSON。解析失败则回滚、保留文件并阻止启动。

### 3.3 模块

新增 `db.mjs`（边缘层与应用共用）：

- `openDatabase(path?)`：打开、pragma、迁移、chmod。
- `withTransaction(db, fn)`：BEGIN/COMMIT/ROLLBACK。
- `importLegacyJson(db, configDir)`：只执行一次。

新增 `src/server/db.ts`：

- 读取 `FDECODE_DB` 或默认路径；
- 进程级单例；
- 导出 `getDb()` 与 `withTransaction`；
- 测试可关闭/重置。

改造：

- `owners.ts`、`links.ts`、`shares.ts` 用 prepared statements，保留现有函数签名。
- `audit.mjs` 改用 SQLite：`appendAudit`、`queryAudit`、`previewAudit`、`pruneAudit`。
- `retention.ts` 使用事务删除 owner/link/share/audit。

### 3.4 行为兼容

- 所有现有函数签名不变，调用方不改。
- 首次启动自动导入，成功后删除旧 JSON；此后不再读写旧文件。
- 未知归属、分享过期、审计查询顺序保持现有语义。
- 错误信息保持可诊断。

### 3.5 否决项

| 选项 | 理由 |
|---|---|
| `better-sqlite3` | 原生 ABI 与安装脚本 |
| 继续 JSON | 一致性与查询成本 |
| 共享 omfde 数据库 | 破坏独立边界 |
| `OR IGNORE` 做导入幂等 | 审计会重复 |

## 4. 实施切片

### S1 DB 与迁移

- `db.mjs`、`src/server/db.ts`、schema、版本表、JSON 导入标记。
- 测试：空库初始化、重复初始化、JSON 导入幂等、解析失败、权限、事务回滚。

完成判据：启动后表存在；旧 JSON 只导入一次并删除；DB 0600。

### S2 替换存储

- owners/links/shares/audit 改为 SQL。
- 保留函数签名与现有 API。
- 测试：CRUD、过期/撤销、审计追加与查询。

完成判据：app 测试全绿；dev 下 M1–M5 行为不变。

### S3 保留清理与备份

- retention 改为事务；审计 `retention.apply`。
- 备份说明与脚本。
- 测试：dry-run、应用、活跃保护、回滚。

完成判据：清理不留下半完成状态；备份可恢复。

### S4 门禁与文档

- README 存储与备份说明。
- `pnpm run check`、app 测试、浏览器冒烟。

完成判据：无回归；文档与行为一致。

## 5. 测试与验证

- 单元：迁移、导入幂等、CRUD、审计、事务回滚、retention。
- 集成：dev 创建会话/分享/交接/清理。
- 手工：删除 DB 后重启自动重建；迁移后旧 JSON 不再存在。
- 门禁：`pnpm run check`；`pnpm --filter @omfde/fdecode test`。

## 6. 风险

| 风险 | 应对 |
|---|---|
| `node:sqlite` experimental | adapter 隔离；升级 Node 回归 |
| WAL/SHM 权限 | 打开后 chmod；文档说明 |
| 迁移重复 | 版本标记 + 单事务 |
| 多进程写锁 | busy_timeout、短事务 |
| 备份不一致 | `VACUUM INTO` + 停止写入 |
| 实验性警告 | 启动脚本可选 `--disable-warning=ExperimentalWarning` |

## 7. 决策者批准记录

- 批准范围：S1–S4。
- 日期：2026-11-07。
- 备注：旧 JSON 在迁移成功后删除。
