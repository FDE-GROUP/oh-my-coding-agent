# Schema

`packages/schema` 是一个不依赖 `eval` 的 JSON Schema 编译器。
源码约 4,850 行（之前统计的 42k 包含测试、格式实现和文档）。

## 1. 定位

两件事：

1. **编译**：把 JSON Schema 编译成一个普通的 check 闭包；
2. **构建**：用短函数生成普通 JSON Schema 对象，同时携带 TypeScript 类型。

```ts
const schema = obj({
  path: str({ description: "File path" }),
  limit: opt(int({ minimum: 1 })),
});

type Input = Static<typeof schema>;
// { path: string; limit?: number }
```

构建器返回的就是普通对象，可以 `JSON.stringify`，可以交给任何 JSON Schema
工具，也可以用 `compile()` 编译。

## 2. 公开 API

```ts
compile(schema, options?) → Validator<T>
compile(schema, { coerce: true }) → CoercingValidator<T>
```

`Validator`：

- `check(value)`：布尔判断，就是一个普通函数；
- `errors(value)`：失败时的错误列表，懒构建；
- `validate(value)`：`check` + `errors` 的组合，不做转换。

`CoercingValidator` 额外有：

- `coerce(value)`：按 schema 尝试转换；
- `parse(value)`：先转换再校验。

## 3. 支持的 draft

| Draft | 默认 | 说明 |
|---|---|---|
| 2020-12 | 是 | `$ref` 可与兄弟关键字共存，`prefixItems`、`$dynamicRef`、`unevaluated*` |
| 7 | 可选 | `$ref` 使兄弟关键字失效，`items` 数组、`dependencies` |

引用相关：

- `$id` 建立 schema resource；
- `$anchor` / `$dynamicAnchor` 命名锚点；
- JSON Pointer `#/...`；
- `$defs` / `definitions`；
- `options.schemas` 注册外部文档；
- `unresolvedRefs: "throw" | "reject"` 决定未解析引用是抛错还是只让该位置失败。

## 4. 编译器策略

`compile()` 只构建一次，之后 `check` 是纯闭包。

关键优化：

- **按 schema 对象缓存**：同一个子 schema 只编译一次；
- **递归引用用 indirection**：先占位，再填真正实现；
- **bare type 共享**：只有 `type` 和注解的 schema 直接用模块级 check；
- **按类型分组**：字符串、数字、对象、数组各自一个组；
- **特化常见形状**：
  - 闭合对象 → `declaredObject`，属性和 required 内联；
  - 单 items schema 的数组 → `listCheck`；
  - 带 tag 的 union → `taggedCheck`，只跑选中的分支；
  - `const` union → `enumCheck`；
  - 只有类型分支的 `anyOf` → 位掩码一次判断。
- **注解只在需要时跟踪**：只有出现 `unevaluatedProperties` / `unevaluatedItems`
  才构建 annotating check；
- **动态作用域**：遇到 bookended `$dynamicRef` 时抛 `RESTART`，用带动态作用域的
  编译器重来一次。

`and(parts)` 对 0/1/2/3 个部分有专门闭包，避免数组循环。

## 5. 引用解析

`Resolver` 在第一次需要时索引：

- 根 schema 的 `$id`；
- 注册文档的 URI；
- `$anchor` / `$dynamicAnchor`；
- 只遍历“持有 subschema”的关键字，`enum` / `const` / 未知关键字里的 `$id`
  不会被误认为资源。

解析顺序：

```
resolveUri(ref, base)
  → documentOf(uri)
  → 找到 document
  → fragment 为空 → 整个 document
  → fragment 以 "/" 开头 → JSON Pointer
  → 否则 → anchor
```

## 6. Check 的实现细节

- 类型用位掩码判断：`string=1, number=2, integer=4, ...`；
- `integer` 同时具有 `number` 和 `integer` 的位；
- 对象/数组循环里内联“叶子检查”（类型、const、enum、边界），避免函数调用；
- `Guard` 三种：不检查类型、严格检查、宽松检查；
- 对象条目用扁平数组 `[key, check, flags]` 存储，减少分配。

## 7. 强制转换（coerce）

只在 `{ coerce: true }` 时启用，用于模型工具参数、表单、查询字符串这类
“松散输入”。

三遍，按顺序：

### 第一遍：可选 null

- 非 required 属性，值为 `null`，且 schema 拒绝 null；
- 删除该属性，等价于“没传”。

### 第二遍：TypeBox `Value.Convert` 规则

- `$ref`、`const`、`enum`、`anyOf`/`oneOf`、`allOf`、`type`、数组/对象；
- `null` → 字符串 `"null"`；
- `"3.5"` → 数字 3.5；
- 单值 → 单元素数组；
- union 取第一个转换后能通过的分支。

### 第三遍：Ajv 风格的基础类型转换

- 按 `type`（或 type 数组）做原始值转换；
- 处理第二遍留下的情况，例如 `["integer", "null"]`、`""` → null。

特点：

- 全程 copy-on-write，只在成员变化时复制；
- 没有变化时返回原引用，绝不修改输入；
- 递归 schema 通过 re-entry 栈和 memo 防止无限转换和指数爆炸；
- 无法转换的值保持原样，由 check 报错。

## 8. 错误解释

`errors()` 只在 check 失败后运行，遍历 schema：

- 每个失败关键字产生一条 `{ path, keyword, message }`；
- `path` 是 JSON Pointer，`""` 表示值本身；
- 类型错误会提前返回，避免后续噪音；
- 递归 union 用 memo 避免重复解释；
- `$dynamicRef` 的错误是近似的，因为解释时不在原动态作用域里。

## 9. 注解与 unevaluated

`annotations.ts` 处理：

- `unevaluatedProperties` / `unevaluatedItems`；
- 需要知道哪些属性/元素已经被 `properties`、`patternProperties`、
  `additionalProperties`、`prefixItems`、`items`、`contains`、
  `allOf` / `anyOf` / `oneOf` / `if` / `$ref` 评估过；
- 只有出现这两个关键字时才构建 annotating check，普通 schema 零成本。

## 10. Formats

- draft 2020-12 默认把 `format` 当注解，不校验；
- 传入 `options.formats` 才变成检查；
- `@earendil-works/pi-schema/formats` 提供标准格式（date、time、uuid、
  hostname、uri、regex 等），包括 IDNA 相关实现。

## 11. Builders

| Builder | 生成 |
|---|---|
| `str` / `num` / `int` / `bool` / `nul` | 基础类型 |
| `lit` | `const` |
| `oneOf` | `enum` |
| `union` | `anyOf` |
| `nullable` | `anyOf [schema, null]` |
| `arr` | 数组 |
| `tuple` | `prefixItems` + `items: false` |
| `map` | `additionalProperties` |
| `obj` | 闭合对象，`opt()` 标记可选 |
| `recursive` | `$id` + 自引用 |
| `bytes` / `bigint` | JSON 之外的扩展类型 |
| `unsafe` | 原样返回并断言类型 |

`Static<S>` 的推导顺序：

1. TypeBox schema（有 `~kind` / `~unsafe`）→ `TypeBoxStatic`；
2. 构建器 schema（有类型品牌）→ 记录的类型；
3. 其他 → `unknown`。

## 12. TypeBox 兼容

- 构建器生成的是普通 JSON Schema，不带运行时 kind 标记；
- 但可以读取 TypeBox schema 的 `~kind` 来做类型推导；
- 这解释了为什么 Pi 可以逐步从 TypeBox 迁移到自己的 schema 包。

## 13. 设计观察

1. **不依赖 eval / new Function**：可以安全编译来自 MCP 服务器或工具定义的
   不可信 schema。
2. **schema 是数据，不是类层次**：构建器只是返回对象，没有运行时品牌。
3. **编译一次，检查是闭包**：热路径没有 schema 遍历。
4. **错误解释是懒的**：通过的值不付成本。
5. **coercion 是显式可选的**：只在信任边界（模型参数、表单）开启。
6. **常见形状有专门闭包**：闭合对象、数组、tagged union。
7. **unevaluated 是唯一需要注解跟踪的复杂特性**。

## 14. 尚未细读

- `annotations.ts` 的完整注解传播算法；
- `formats/` 的 IDNA、日期时间等实现；
- `typebox-static.ts` 的完整类型映射；
- `coerce.ts` 的剩余转换细节；
- `checks.ts` 的其余检查工厂。
