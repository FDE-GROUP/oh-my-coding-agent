# TUI 使用记录

目标：把仓库跑起来，用 DeepSeek 作为测试模型，走通 TUI 的日常操作。
本文记录实际执行过的命令和结果，不是照抄文档。

## 1. 启动方式

仓库里有四个入口：

| 入口 | 命令 | 用途 |
|---|---|---|
| 平台入口 | `npm run omfde` | 启动 omfde 平台入口，当前是 Pi 的薄启动器 |
| npm 脚本 | `npm run tui` | 等价于 `./pi-test.sh`，直接跑 Pi |
| 源码 | `./pi-test.sh` | 开发用，直接跑 `packages/coding-agent/src/cli.ts` |
| 构建产物 | `node packages/coding-agent/dist/cli.js` | 跑 `dist/`，需要先 `npm run build` |

日常开发用 npm 脚本：

```bash
cd /home/abel/omfde
npm run tui
```

带参数时用 `--` 分隔，例如：

```bash
npm run omfde -- --provider deepseek --model deepseek-flash
npm run omfde -- --continue          # 恢复当前目录最近的会话
npm run omfde -- -p "只回复 OK"      # 非交互模式
```

`npm run tui` 仍然保留，用于跳过平台入口、直接启动 Pi。

## 2. DeepSeek 配置

`~/.pi/agent/settings.json`：

```json
{
  "defaultProvider": "deepseek",
  "defaultModel": "deepseek-flash"
}
```

API key 存在 `~/.pi/agent/auth.json`，权限 `600`：

```json
{
  "deepseek": {
    "type": "api_key",
    "key": "sk-..."
  }
}
```

也可以临时用环境变量：

```bash
DEEPSEEK_API_KEY=sk-... ./pi-test.sh --provider deepseek --model deepseek-flash
```

验证：

```bash
node packages/coding-agent/dist/cli.js --list-models deepseek
node packages/coding-agent/dist/cli.js auth check --provider deepseek
```

实际输出：

```
provider  model            context  max-out  thinking  images
deepseek  deepseek-flash   1M       384K     yes       yes
deepseek  deepseek-v4-pro  1M       384K     yes       no

ready
```

### `.env.example` 的变量没有被 Pi 读取

Pi 不会自动加载 `.env`，也没有 `ODOOTHINK_PROVIDER` / `ODOOTHINK_MODEL`
这两个变量。对应关系需要手工映射：

| `.env.example` | Pi 实际用法 |
|---|---|
| `DEEPSEEK_API_KEY` | 环境变量，或写入 `auth.json` |
| `ODOOTHINK_PROVIDER=deepseek` | `--provider deepseek` 或 `settings.json` 的 `defaultProvider` |
| `ODOOTHINK_MODEL=deepseek-flash` | `--model deepseek-flash` 或 `settings.json` 的 `defaultModel` |

如果希望 `.env` 直接生效，需要额外写一个启动脚本，把这三个值翻译成环境变量和
CLI 参数。当前没有这样做，因为 `auth.json` + `settings.json` 已经够用。

## 3. 启动界面

首次进入会问是否信任项目目录：

```
 Trust project folder?
 /home/abel/omfde

 → Trust
   Trust parent folder (/home/abel)
   Trust (this session only)
   Do not trust
```

选 `Trust` 后会记住，后续不再询问。启动后显示：

```
▀▀█  v1.5.0
[Context]     AGENTS.md
[Skills]      add-llm-provider, github-work, interactive-testing, release
[Prompts]     /cl, /deslop, /dup, /is, /pr, /sa, /wr
[Extensions]  import-repro.ts, prompt-url-widget.ts, redraws.ts, tps.ts

~/omfde (main)
0.0%/1.0M (auto)                    deepseek-flash • high
```

底部状态栏：目录、分支、上下文占用、模型、thinking 等级。

## 4. 实际跑过的操作

### 普通对话 + 工具调用

输入：

```
用一句话说明这个仓库是做什么的，然后列出 packages 下的目录名。不要修改任何文件。
```

实际执行了 `ls packages/`、`head -40 README.md`，然后回答 9 个包名。
统计：

```
TPS 88.6 tok/s. out 165, in 2,436, cache r/w 8,576/0, total 11,177, 1.9s
↑2.4k ↓165 R8.6k CH86.8% $0.001
```

### 写文件与读文件

输入：

```
用 write 工具创建 /tmp/opencode/pi-tui-demo/greeting.txt，内容是 hello pi，
然后用 read 工具读回并告诉我内容。
```

TUI 显示了两个工具卡片：

```
write /tmp/opencode/pi-tui-demo/greeting.txt
hello pi

read /tmp/opencode/pi-tui-demo/greeting.txt
```

### 修改文件与 diff

输入：

```
把 /tmp/opencode/pi-tui-demo/greeting.txt 的内容改成 hello omca，用 edit 工具。
```

TUI 渲染了行级 diff：

```
edit /tmp/opencode/pi-tui-demo/greeting.txt
-1 hello pi
+1 hello omca
```

**Pi 默认不逐个工具询问确认。** 命令和改动会显示在 transcript 里，但不会停下来等
批准。需要门禁时要自己加扩展。

### Bash 模式

输入 `!echo hello-from-bash`，TUI 显示：

```
$ echo hello-from-bash

hello-from-bash
```

`!` 的输出进入上下文；`!!` 的输出不进入上下文，适合只看一眼的命令。

### 文件引用

输入 `@` 会打开文件选择器，可以直接把文件加入 prompt：

```
→ .pi/
  nix/
  docs/
  .npmrc
  .husky/
  (1/20)
```

### 斜杠命令

输入 `/` 打开命令面板，共 39 项。实际用过：

| 命令 | 结果 |
|---|---|
| `/model` | 打开模型选择器，显示 `deepseek-flash` 已选中 |
| `/session` | 显示会话文件、ID、消息数、token、缓存命中率、费用 |
| `/tree` | 打开会话树，可切换分支 |
| `/settings` | 打开 33 项设置 |
| `/hotkeys` | 显示当前键位表 |
| `/quit` | 退出 |

`/session` 实际输出：

```
File: /home/abel/.pi/agent/sessions/--home-abel-omfde--/2026-...jsonl
ID: 01a1ae54-...
Messages: Total 11, User 2, Assistant 4, Tools 3 calls
Tokens: Input 23,168, Cached 20,352 (87.8%), Output 296
Cache Warming: streaming, Inactive (cache lifetime unavailable)
Cost: $0.001
```

### 会话恢复

退出后运行：

```bash
./pi-test.sh --continue
```

TUI 恢复了上一轮的 `仅回复：resume check` 和回答。

## 5. 常用键位

| 键 | 作用 |
|---|---|
| `Enter` | 发送 |
| `Shift+Enter` | 换行（tmux 需要 `extended-keys on`） |
| `Escape` | 中止当前生成 |
| `Ctrl+C` | 第一次清空编辑器，第二次退出 |
| `Ctrl+D` | 编辑器为空时退出 |
| `Ctrl+L` | 模型选择器 |
| `Ctrl+P` / `Alt+P` | 循环切换模型 |
| `Shift+Tab` | 循环 thinking 等级 |
| `Ctrl+O` | 展开/折叠工具输出 |
| `Ctrl+T` | 显示/隐藏 thinking 块 |
| `Ctrl+G` | 用外部编辑器写长 prompt |
| `Ctrl+X` | 复制最后一条助手消息 |
| `Ctrl+Q` | 排队 follow-up |
| `@` | 文件选择 |
| `!` / `!!` | Bash，输出是否进入上下文 |
| `/` | 命令面板 |

## 6. 已知小问题

- tmux 默认关闭 extended-keys，`Shift+Enter` 可能不工作。提示会出现在启动页：

  ```
  Warning: tmux extended-keys is off.
  ```

  修复：`set -g extended-keys on`，然后重启 tmux。

- 在 tmux 里用 `tmux capture-pane` 截图时，如果弹层比终端高，顶部会被裁掉。
  把窗口调高即可。

## 7. 结论

以下路径已经实际走通：

1. 源码启动 TUI；
2. DeepSeek 认证和默认模型；
3. 对话、工具调用、写文件、改文件、diff；
4. Bash 模式、文件引用；
5. 模型选择、会话统计、会话树、设置、键位表；
6. 退出与 `--continue` 恢复。

这套流程可以重复执行。下一步可以开始用真实任务检验“会用”，而不是继续验证功能。
