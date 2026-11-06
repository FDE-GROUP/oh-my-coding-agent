# TypeScript 注释规范（TSDoc）

> 版本：0.1.0 | 日期：2026-11-06 | 状态：现行
>
> 地位：本项目平台 TypeScript 注释的单一标准。
>
> 关联：`docs/specs/workflow.md`、`AGENTS.md`、`docs/specs/vision.md`

## 0. 一句话原则

注释是**给人读的设计说明**，按 [TSDoc](https://tsdoc.org/) 写成机器可解析块：`/** … */` + 中文 summary 首行 + 结构化标签 + 显式发布修饰符。注释是纯说明，不借注释之名改变代码语义。

## 1. 适用范围

阶段 1 只覆盖平台代码，不回改 Pi 上游包：

| 区域 | 纳入 | 排除 |
|---|---|---|
| `apps/*/src/**/*.ts` | 导出的类型、函数、常量 | `bin/` 中的 JS 入口、测试 |
| `extensions/*/src/**/*.ts` | 导出的类型、函数、常量 | 测试、生成文件 |
| 未来的 `packages/omfde-*/src/**/*.ts` | 与平台包同等规则 | 测试、生成文件 |
| Pi 包 `packages/{agent,ai,coding-agent,...}` | 不回改；保持上游风格 | — |
| barrel `index.ts` | 纯 re-export 不要求 | — |

平台代码新增导出时，必须同时补 TSDoc。Pi 包不因本项目规范而批量重写，避免增加 rebase 冲突。

## 2. 语言与结构

- **中文优先**：summary 首行使用中文，句末用 `。`
- **双段式**：summary 一句话说明职责；需要解释 why、权衡或约束时加 `@remarks`。
- 简单符号可以只有 summary。
- 不重复签名本身，不写能从类型直接推知的内容。
- 坑位、非显然约束、兼容性说明写入 `@remarks`。

```ts
/**
 * 创建 omfde 平台会话。
 *
 * @remarks
 * 默认加载平台扩展，不修改 Pi 核心包。
 *
 * @param options - 会话启动参数。
 * @returns 已启动的会话句柄。
 * @public
 */
```

## 3. 发布修饰符

已文档化的导出必须显式标注：

| 修饰符 | 用途 |
|---|---|
| `@public` | 应用、扩展或其他包应引用的契约 |
| `@internal` | 模块内导出、仅测试或实现细节；消费者不应依赖 |
| `@private` / `@protected` | 类成员可见性；阶段 1 手动检查 |

判据：**消费者是否应引用它。**

## 4. 块标签

| 标签 | 规则 |
|---|---|
| `@param name - …` | 导出函数有参数时必填；参数名必须匹配 |
| `@returns …` | 有非 `void`、`never`、`undefined` 返回类型时必填 |
| `@throws {Type} …` | 有契约级失败时补充 |
| `@example` | 易误用的公开 API 建议给出片段 |
| `@deprecated` | 必须写明替代方案 |
| `{@link X}` | 内联交叉引用；跨文件解析失败时改用代码跨度 |

## 5. 附着规则

doc 块必须紧贴符号：

- 注释在 `export` 声明之前。
- 有装饰器时，注释在装饰器之前。
- barrel 的纯 re-export 不产条目，不算缺口。
- 不允许把 doc 放在上一个符号后面，造成归属歧义。

## 6. 转义与陷阱

| 陷阱 | 处置 |
|---|---|
| 注释内裸 `@` 被当成 block tag | 用反引号包裹，例如 `` `@omfde/app` `` |
| 字面 `{` / `}` 干扰 TSDoc | 改写或转义 |
| 跨文件 `{@link Foo}` 解析失败 | 改用代码跨度 `` `Foo` `` |
| 中文 summary 漏句号 | 补 `。` |

## 7. 字段与属性

- 公开类型字段、常量：`/** 中文释义。 */`；名称不自明时必须注释。
- 同名异义字段按容器精修，例如 `path` 要说明是工作区路径还是其他路径。
- 自明字段一行即可，不写噪音。
- 阶段 1 工具不强制检查接口字段；由 review 和人工对账补齐。

## 8. 验证门禁

工具：`scripts/check-tsdoc.mjs`。

```bash
npm run check:tsdoc
npm run check:tsdoc -- --staged
```

已纳入：

- `npm run check`
- pre-commit（staged-only）
- pre-push（完整 check）

工具自动检查：

1. 导出符号有 `/** */` doc。
2. summary 是中文并以 `。` 结尾。
3. 有 `@public` 或 `@internal`。
4. 每个参数有 `@param`。
5. 有非 `void` / `never` / `undefined` 返回类型的函数有 `@returns`。

工具不检查：

- 类成员、接口字段的完整性；
- `@remarks` 的质量；
- `@throws` 是否遗漏；
- 注释是否与实现一致。

这些仍由 review 和测试负责。阶段 1 不安装 TypeDoc，不生成 API 站点。

## 9. 反过度注释

- 不给平凡、可推知的东西加水。
- 不借注释改签名、默认值或行为。
- 不把内部实现标成 `@public` 凑覆盖率。
- 不为通过检查写空话；先让注释有信息，再让工具通过。

## 10. 演变记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-11-06 | 0.1.0 | 首版，参考 OdooThink TSDoc 规范，按 omfde 平台代码范围裁剪并加入本地检查工具 |
