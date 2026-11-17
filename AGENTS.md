# Skill Kit 项目指南（AGENTS.md）

> 面向 AI Agent 的项目导航：项目定位、目录结构、skill 规范，以及「把技能安装到目标项目」的完整流程。
> 修改代码或新增 skill 前先读本文件。

## 1. 项目定位

- 本仓库是**可复用 AI Agent skill 的源仓库**，`skills/` 下每个目录是一个可独立安装的技能。
- `lib/` 是一个小型 CLI，负责把技能**复制**到目标项目的 `.agents/skills/`。
- CLI **不生成、不修改**目标项目的 `AGENTS.md`：安装后只打印可粘贴的技能表格行，由 Agent 或用户决定如何写入。
- 技能保持**项目无关**：项目专属约定应放在目标项目的 `.agents/rules/`，不要写进本仓库。

## 2. 目录结构

```
skill-kit/
├── lib/
│   ├── cli/                 # 命令：list / add / info
│   ├── fs/                  # 目录复制、确保存在、删除
│   ├── generator/           # 安装技能到目标目录（支持 force 覆盖）
│   ├── logger/              # 终端输出
│   └── skill/               # 扫描并解析 SKILL.md / skill.md
├── scripts/
│   └── publish.ts           # npm 发布脚本
├── skills/                  # 技能源（每个子目录一个 skill）
│   ├── superpowers/         # 外壳技能，内含 14 个子技能，只能整体安装
│   ├── vue/
│   ├── react-best-practices/
│   └── ...
├── index.ts                 # CLI 入口（可执行，shebang 为 bun）
├── package.json
├── README.md                # 面向人的使用说明与技能目录
└── AGENTS.md                # 本文件
```

## 3. CLI 用法

```bash
# 人类可读目录
bun run ./index.ts list

# Agent 可读目录（JSON）
bun run ./index.ts list --json

# 非交互安装（默认 .agents/skills）
bun run ./index.ts add vue pinia --to .agents/skills --json

# 更新已安装技能
bun run ./index.ts add vue --to .agents/skills --force

# 交互式安装（仅在终端里给人用）
bun run ./index.ts add

# 查看技能详情
bun run ./index.ts info <skill-name>
```

约定：

- `--to` 相对于当前工作目录，默认 `.agents/skills`。
- `--json` 只输出一个 JSON 对象，不混入日志；任一技能失败时进程退出码为 1。
- `add` 返回的 `status`：`added` / `updated` / `skipped` / `failed`。
- 技能根目录解析顺序：`SKILL_KIT_HOME` → 源码相对路径 → `dist`/二进制相对路径 → 当前目录的 `skills/`。

## 4. 在目标项目安装技能（Agent 流程）

本机技能源路径：`KIT_PATH="${SKILL_KIT_HOME:-$HOME/code/personal/skill-kit}"`。若该目录不存在，先向用户确认，不要猜测。

1. **确认技术栈**：读目标项目的 `package.json`、`go.mod`、`pyproject.toml` 等，不要凭项目名猜。
2. **查目录**：

   ```bash
   bun <KIT_PATH>/index.ts list --json
   ```

   返回 `[{ name, description, tags, references, entryFile }]`。用 `description` 和 `tags` 匹配。
3. **安装**：

   ```bash
   bun <KIT_PATH>/index.ts add <name...> --to .agents/skills --json
   ```

   已安装且需要更新时加 `--force`。
4. **更新目标项目的 AGENTS.md**：按返回结果中的 `path` + `entryFile`，只把 `added` / `updated` 的技能增删到「技能导航」表：

   ```markdown
   | [vue](.agents/skills/vue/skill.md) | Vue.js core |
   ```

   表不存在时新增一节 `## 技能导航（.agents/skills/）`。
5. **汇报**：列出安装、更新、跳过和失败的技能，失败时原样报告 `error`。

### 选型参考

| 项目信号 | 建议技能 |
| --- | --- |
| `vue` 依赖 | `vue`、`vue-best-practices`、`pinia`；路由加 `vue-router-best-practices`，Ant Design Vue 加 `ant-design-vue`，UnoCSS 加 `unocss` |
| `react` 依赖 | `react`、`react-best-practices`、`zustand`；SSR 加 `nextjs` |
| React Native / Expo | `react-native-skills` |
| Fastify / NestJS 后端 | `fastify-best-practices` / `nestjs-best-practices` |
| Go 项目 | `golang-best-practices` |
| Bun 运行时/工具链 | `bun` |
| RAG / LLM 应用 | `rag`；用 LangChain 再加 `langchain` |
| 通用工作流 | `belos-street`（个人编码规范）、`grill-me`（需求澄清）、`vibe-flow`（Vibe Coding 流程） |
| 计划/调试/TDD 等 | `superpowers`（整套 14 个子技能，不拆装） |

一次安装不超过 3~4 个，与项目技术栈无关的一律不装。

### 硬性规则

- **禁止整体重写目标项目的 AGENTS.md**，只允许增删技能表格中对应的行。
- **禁止删除或修改 `.agents/skills/` 下的自定义技能**（非本工具安装的目录）。`--force` 只用于更新来自本仓库的技能。
- **禁止直接改目标项目里的技能副本**。需要修改时改本仓库 `skills/<name>/`，再执行 `add --force`。
- **失败不要静默兜底**：报告 `error`，不要偷偷改用 `cp`。只有 `bun` 不可用时才手工复制，并明确说明后续更新需重新复制。

## 5. Skill 目录规范

### 标准结构

```
skill-name/
├── SKILL.md              # 必需：技能主文件（也兼容 skill.md）
├── references/           # 必需：参考文档（兼容 reference/、rules/）
│   ├── topic-1.md
│   └── ...
└── LICENSE.md            # 可选
```

- 新 skill 统一使用 `SKILL.md` + `references/`；历史 skill 的 `skill.md`、`reference/`、`rules/` 由解析器兼容，不必强行改名。
- 目录名使用 kebab-case，且必须与 frontmatter 的 `name` 一致。
- `superpowers/` 的子技能不是独立顶层目录，CLI 不单独列出，只能整体安装。

### Frontmatter（必需）

```yaml
---
name: skill-name                    # 必需：与目录名一致
description: 简短描述...             # 必需：写清「何时使用」和触发词
version: "1.0.0"                    # 可选
license: MIT                        # 可选
metadata:
  author: github.com/username
  tags: [tag1, tag2]
---
```

`description` 是 Agent 决定是否加载技能的唯一依据。只写「Vue.js core」不够，应包含使用场景与触发关键词（参考 `fastify-best-practices` 的写法）。

### 正文结构

```markdown
# Skill Name

> 简短介绍

## Preferences / Core / Quick Reference

| Topic | Description | Reference |
| --- | --- | --- |
| 主题 | 描述 | [reference](references/topic.md) |

## 最佳实践
```

### Reference 文件

- 文件名 kebab-case，例如 `hooks-state-update-batching.md`。
- 每个文件必须有 frontmatter（`name`、`description`）。
- 内容建议按「问题/场景 → 解决方案 → 代码示例 → 关键要点」组织。
- 所有链接使用相对路径。

## 6. 添加新 Skill

1. **建目录**：

   ```bash
   mkdir -p skills/new-skill-name/references
   ```

2. **写 `SKILL.md`**：frontmatter 的 `name` 与目录名一致；`description` 写清触发条件；正文按标准结构组织并引用 reference 文件。
3. **写 references**：每个文件带 frontmatter，文件名 kebab-case。
4. **验证**：

   ```bash
   bun run ./index.ts list
   bun run ./index.ts info new-skill-name
   ```

   再安装到临时目录确认文件完整：

   ```bash
   cd /tmp && mkdir -p skill-kit-check && cd skill-kit-check
   bun <KIT_PATH>/index.ts add new-skill-name --json
   ```

5. **更新 README**：在 `Available Skills` 表格加一行（名称、描述、reference 数量），并在 `Skill Categories` 对应分类下加链接。
6. **提交前检查**：`git diff --check`，确认没有把项目专属内容写进技能。

## 7. 修改现有 Skill

1. 改 `skills/<name>/` 下的源文件，不直接改已安装到其他项目的副本。
2. 若改动了行为或适用范围，同步更新 `description` 和 README 表格描述。
3. 需要让目标项目生效时，在目标项目执行 `add <name> --force`。

## 8. 常见问题

**Q1：`references/`、`reference/`、`rules/` 用哪个？**
都可以被解析。新 skill 用 `references/`；`rules/` 是第三方技能（fastify、nestjs、react-native）自带的目录名，保持原样。

**Q2：`SKILL.md` 和 `skill.md` 用哪个？**
解析器大小写不敏感，两者都能识别。新 skill 用 `SKILL.md`，与主流 Agent 的加载约定一致。

**Q3：为什么 CLI 不自动写 AGENTS.md？**
目标项目的 `AGENTS.md` 通常由用户手工维护，自动覆盖会破坏内容。CLI 只输出表格行，写入由 Agent 按「只增删对应行」的规则完成。

**Q4：新增 skill 后还需要改 CLI 代码吗？**
不需要。CLI 扫描 `skills/` 下的所有顶层目录，新增目录会自动出现在 `list` 中。只有需要新的安装行为时才改 `lib/`。

**Q5：`superpowers` 为什么只显示一个条目？**
它是外壳技能，14 个子技能位于其子目录中，按整体安装，避免拆散后引用失效。

## 9. 技术栈与开发

- **运行时**：Bun（`index.ts` 通过 shebang 直接执行）
- **命令行解析**：commander
- **交互选择**：prompts（仅无参数 `add` 时使用）
- **终端样式**：chalk
- **文件操作**：Node.js `fs`

```bash
bun install                  # 安装依赖
bun run ./index.ts --help    # 本地运行
bun run build                # 构建到 dist/
bun run publish              # 发布 npm（需 .env 中的 npm_token）
```

`bunx tsc --noEmit` 会同时检查 `skills/` 下第三方技能的示例脚本，存在历史报错；判断本次改动是否引入类型问题时，只看 `lib/` 下的报错。

## 10. 检查清单

- [ ] `SKILL.md` 或 `skill.md` 位于技能根目录
- [ ] frontmatter 的 `name` 与目录名一致，`description` 含使用场景/触发词
- [ ] `references/`（或 `reference/`、`rules/`）存在且链接有效
- [ ] reference 文件有 frontmatter，文件名 kebab-case
- [ ] `bun run ./index.ts list` 能识别新技能
- [ ] 安装到临时目录后文件完整
- [ ] README 表格与分类已更新
- [ ] 没有项目专属内容混入技能
