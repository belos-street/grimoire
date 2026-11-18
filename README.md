# @belos-street/grimoire

> A grimoire of reusable AI Agent skills: third-party integrations, engineering conventions, and workflows.

## About

`grimoire` collects reusable AI Agent skills — curated third-party integrations, personal engineering conventions, and workflows — and installs them into a project. Skills land in `.agents/skills/` by default, the CLI supports non-interactive JSON output for agent-driven use, and it prints the rows to add to the skill table in `AGENTS.md` instead of editing it.

### What's inside

- **Curated third-party skills** — Vue / React / Next.js / React Native, Go, Fastify, NestJS, LangChain, plus the `superpowers` workflow collection.
- **Personal conventions and methodology** — `belos-street` coding conventions and review checklists, `grill-me` requirement clarification, `vibe-flow` end-to-end Vibe Coding flow, `ai-collab-system-bootstrap`, and a RAG methodology.
- **A CLI that keeps them in sync** — installs skills into a project's `.agents/skills/`, records what was installed in `.grimoire.json`, and reports `outdated` / `modified` / `missing` copies so updates do not silently clobber local edits.

## Features

- Non-interactive installs for agent use: `add <skill...> --json`
- Installs to `./.agents/skills` by default (configurable with `--to`)
- Install manifest (`.grimoire.json`) with `status` and `sync` drift detection
- `--link` mode for maintaining skills locally
- `lint` for frontmatter, reference directories, and broken links
- Unit tests for the core modules (`pytest`)
- JSON catalog via `list --json`
- Duplicate detection with opt-in `--force` overwrite
- Prints ready-to-paste rows for the skill table in `AGENTS.md`; never rewrites it
- Zero runtime dependencies, Python 3.10+

## Installation

### Requirements

- Python 3.10+ installed

### Local Setup

This project is distributed as a Git repository. Clone it and install it in editable mode:

```bash
git clone https://github.com/belos-street/grimoire.git
cd grimoire

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -e ".[dev]"

# run the CLI
grimoire list
```

Alternatively, run it without installing: `python -m grimoire list`.

## Usage

### List Available Skills

View all available skills with descriptions:

```bash
grimoire list
```

Output example:

```
Available skills:
  ant-design-vue - Ant Design Vue component library
  belos-street - Belos Street coding conventions
  bun - Bun runtime and toolkit
  fastify-best-practices - Fastify Node.js backend best practices
  nextjs - Next.js React framework
  rag - General RAG methodology
  react - React library
  superpowers - AI-assisted development workflows
  vue-best-practices - Vue 3 + TypeScript best practices
  ...

Total: 24 skills
```

### Add Skills

Non-interactive (recommended for agents):

```bash
grimoire add vue pinia --to .agents/skills --json
grimoire add vue --to .agents/skills --force   # update an installed skill
```

`--to` defaults to `.agents/skills`. Output is a single JSON object:

```json
{
  "ok": true,
  "target": "/path/to/project/.agents/skills",
  "results": [
    {
      "skillName": "vue",
      "status": "added",
      "path": "/path/to/project/.agents/skills/vue",
      "entryFile": "skill.md",
      "description": "Vue 3 Composition API..."
    }
  ]
}
```

`status` is one of `added`, `updated`, `skipped`, `failed`; the process exits non-zero when any skill fails.

Interactive (terminal use):

```bash
grimoire add
```

After installing, the CLI prints Markdown rows for the skill table in your project's `AGENTS.md`. It deliberately does not edit or overwrite `AGENTS.md`.

Each successful install is recorded in `<target>/.grimoire.json` (source, mode, entry file, content hash). This enables drift detection:

```bash
# ok | outdated | modified | missing, plus untracked directories
grimoire status --to .agents/skills --json

# Update outdated/missing skills; modified copies are kept unless --force
grimoire sync --to .agents/skills --json
grimoire sync --to .agents/skills --force
```

For local skill development, install a symlink instead of a copy so source edits take effect immediately:

```bash
grimoire add vue --to .agents/skills --link --force
```

### Lint Skills

```bash
grimoire lint              # all skills
grimoire lint vue --json   # specific skill(s)
```

Checks frontmatter (`name` matches directory, `description` present), reference directories, and broken relative Markdown links. Errors exit with code 1; warnings do not.

### List Skills as JSON

```bash
grimoire list --json
```

Returns `[{ name, description, tags, references, entryFile }]`, suitable for agent-driven skill selection.

### View Skill Info

Get detailed information about a specific skill:

```bash
grimoire info <skill-name>

Example:
grimoire info nextjs

Output:
nextjs

Description: Next.js React framework
Path: /path/to/skills/nextjs
References: 8 files

--- Frontmatter ---
  name: nextjs
  title: Next.js
  tags: react, framework, ssr
```

### Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success, including `info` when the skill is not found |
| `1` | `add`, `sync`, or `lint` reported failures |
| `2` | Usage error: missing/unknown command or invalid option (argparse default) |

## Available Skills

### Built-in Skills

This collection contains 24 skills covering web frontend/backend, mobile, AI, and AI-assisted development workflows:

| Skill                                                                  | Description                                                  | Docs        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| [ant-design-vue](skills/ant-design-vue/skill.md)                       | Ant Design Vue component library                             | 17          |
| [ai-collab-system-bootstrap](skills/ai-collab-system-bootstrap/skill.md) | Bootstrap AI collaboration system: AGENTS.md + .agents rules/workflows + doc layers + machine-gated verification | 4           |
| [belos-street](skills/belos-street/skill.md)                           | Personal coding conventions, code review & project evaluation | 12          |
| [bun](skills/bun/skill.md)                                             | Bun runtime and toolkit                                      | 6           |
| [fastify-best-practices](skills/fastify-best-practices/SKILL.md)       | Fastify Node.js backend best practices                       | 19          |
| [frontend-design](skills/frontend-design/skill.md)                     | Frontend design principles and best practices                | 6           |
| [golang-best-practices](skills/golang-best-practices/skill.md)         | Go best practices and patterns                               | 37          |
| [grill-me](skills/grill-me/SKILL.md)                                   | Layered requirement clarification for vague requirements     | 2           |
| [langchain](skills/langchain/skill.md)                                 | LangChain framework for AI agents                            | 12          |
| [nestjs-best-practices](skills/nestjs-best-practices/SKILL.md)         | NestJS architecture and best practices                       | 42          |
| [nextjs](skills/nextjs/skill.md)                                       | Next.js React framework                                      | 9           |
| [pinia](skills/pinia/skill.md)                                         | Vue state management                                         | 33          |
| [rag](skills/rag/skill.md)                                             | General RAG methodology (11 modules, based on iKnow ASE 2025 + SAG2) | 12          |
| [react](skills/react/skill.md)                                         | React library                                                | 3           |
| [react-best-practices](skills/react-best-practices/skill.md)           | React best practices                                         | 62          |
| [react-native-skills](skills/react-native-skills/SKILL.md)             | React Native & Expo mobile development best practices        | 38          |
| [superpowers](skills/superpowers/skill.md)                             | AI-assisted development workflows (collection of 14 sub-skills) | 14 sub-skills |
| [ui-templates](skills/ui-templates/skill.md)                           | Collection of distinctive UI design templates                | 30          |
| [unocss](skills/unocss/skill.md)                                       | UnoCSS atomic CSS engine                                     | 3           |
| [vibe-flow](skills/vibe-flow/skill.md)                                 | Independent developer Vibe Coding full-process workflow      | 14          |
| [vue](skills/vue/skill.md)                                             | Vue.js core                                                  | 3           |
| [vue-best-practices](skills/vue-best-practices/skill.md)               | Vue 3 + TypeScript best practices                            | 180         |
| [vue-router-best-practices](skills/vue-router-best-practices/skill.md) | Vue Router best practices                                    | 8           |
| [zustand](skills/zustand/skill.md)                                     | Zustand state management                                     | 5           |

### Skill Categories

**Vue Ecosystem**

- [vue](skills/vue/skill.md) - Vue.js core
- [pinia](skills/pinia/skill.md) - State management
- [vue-best-practices](skills/vue-best-practices/skill.md) - Best practices
- [vue-router-best-practices](skills/vue-router-best-practices/skill.md) - Router best practices
- [ant-design-vue](skills/ant-design-vue/skill.md) - Ant Design Vue component library

**React Ecosystem**

- [react](skills/react/skill.md) - React library
- [react-best-practices](skills/react-best-practices/skill.md) - Best practices
- [nextjs](skills/nextjs/skill.md) - Next.js framework
- [zustand](skills/zustand/skill.md) - Zustand state management

**Mobile Development**

- [react-native-skills](skills/react-native-skills/SKILL.md) - React Native & Expo mobile development best practices

**Backend Frameworks**

- [fastify-best-practices](skills/fastify-best-practices/SKILL.md) - Fastify Node.js backend best practices
- [nestjs-best-practices](skills/nestjs-best-practices/SKILL.md) - NestJS architecture and best practices

**Languages & Runtimes**

- [golang-best-practices](skills/golang-best-practices/skill.md) - Go best practices and WebAssembly
- [bun](skills/bun/skill.md) - Bun runtime

**Tooling**

- [unocss](skills/unocss/skill.md) - Atomic CSS engine

**Design & UI**

- [frontend-design](skills/frontend-design/skill.md) - Frontend design principles and best practices
- [ui-templates](skills/ui-templates/skill.md) - Collection of distinctive UI design templates

**Coding Conventions & Review**

- [belos-street](skills/belos-street/skill.md) - Personal coding conventions, including LLM coding guidelines, multi-dimensional code review, and project evaluation

**AI & LLM**

- [langchain](skills/langchain/skill.md) - LangChain framework for building AI agents
- [rag](skills/rag/skill.md) - General RAG methodology (selection/loading/ingestion/query/retrieval/rerank/generation/multi-turn/GraphRAG/lightweight lexical multi-hop/evaluation, based on iKnow ASE 2025 + SAG2)

**Workflow & Process**

- [ai-collab-system-bootstrap](skills/ai-collab-system-bootstrap/skill.md) - Bootstrap AI collaboration system: AGENTS.md + .agents rules/workflows + doc layers + machine-gated verification
- [vibe-flow](skills/vibe-flow/skill.md) - Independent developer Vibe Coding full-process workflow
- [grill-me](skills/grill-me/SKILL.md) - Layered requirement clarification for vague requirements

**Superpowers (AI-Assisted Development Workflows)**

- [superpowers](skills/superpowers/skill.md) - Collection overview
- [brainstorming](skills/superpowers/brainstorming/SKILL.md) - Design exploration before implementation
- [writing-plans](skills/superpowers/writing-plans/SKILL.md) - Implementation plan creation
- [executing-plans](skills/superpowers/executing-plans/SKILL.md) - Execute plans with review checkpoints
- [dispatching-parallel-agents](skills/superpowers/dispatching-parallel-agents/SKILL.md) - Parallel task execution
- [subagent-driven-development](skills/superpowers/subagent-driven-development/SKILL.md) - Subagent-based development
- [systematic-debugging](skills/superpowers/systematic-debugging/SKILL.md) - Systematic debugging approach
- [test-driven-development](skills/superpowers/test-driven-development/SKILL.md) - TDD methodology
- [receiving-code-review](skills/superpowers/receiving-code-review/SKILL.md) - Handling code review feedback
- [requesting-code-review](skills/superpowers/requesting-code-review/SKILL.md) - Requesting code reviews
- [finishing-a-development-branch](skills/superpowers/finishing-a-development-branch/SKILL.md) - Branch completion workflow
- [verification-before-completion](skills/superpowers/verification-before-completion/SKILL.md) - Pre-completion verification
- [using-superpowers](skills/superpowers/using-superpowers/SKILL.md) - Skill discovery and usage
- [using-git-worktrees](skills/superpowers/using-git-worktrees/SKILL.md) - Git worktree management
- [writing-skills](skills/superpowers/writing-skills/SKILL.md) - Skill creation and editing

## Skill Structure

Each skill follows this structure:

```
skills/
├── <skill-name>/
│   ├── skill.md              # Main skill file with metadata
│   └── reference/            # Reference documents (naming varies: reference/ | references/ | rules/)
│       ├── basics.md
│       ├── advanced.md
│       └── ...
```

### skill.md Format

The `skill.md` file contains metadata and documentation:

````markdown
---
name: skill-name
title: Skill Title
description: Brief description of what this skill covers
tags: tag1, tag2, tag3
---

# Skill Title

Detailed documentation and best practices...

## Core Concepts

- Concept 1
- Concept 2

## Usage Examples

```typescript
// Example code
```
````

## Project Structure

```
grimoire/
├── grimoire/
│   ├── cli.py               # CLI parser and command dispatch
│   ├── commands/            # list / add / status / sync / lint / info
│   ├── fs.py                # Copy, symlink, ensure, remove
│   ├── generator.py         # Install logic and manifest updates
│   ├── lint.py              # Frontmatter, references, link checks
│   ├── logger.py            # Colorful console output
│   ├── manifest.py          # .grimoire.json, hashing, drift status
│   └── skill.py             # Read and parse SKILL.md/skill.md
├── tests/                   # pytest suite for the core modules
├── skills/                  # Built-in skills (24 top-level skills)
│   ├── superpowers/         # Integrated from obra/superpowers (14 sub-skills)
│   ├── bun/
│   ├── nextjs/
│   ├── pinia/
│   ├── react/
│   └── ... (23 other skills)
├── pyproject.toml
├── AGENTS.md                # Agent-facing project guide
└── README.md
```

### Project Commands

```bash
# List all skills
python -m grimoire list

# List as JSON (agent use)
python -m grimoire list --json

# Non-interactive install / update
python -m grimoire add vue pinia --to .agents/skills --json
python -m grimoire add vue --to .agents/skills --force

# Link mode for local skill development
python -m grimoire add vue --to .agents/skills --link --force

# Drift detection and update
python -m grimoire status --to .agents/skills --json
python -m grimoire sync --to .agents/skills --json

# Validate skills
python -m grimoire lint --json

# Run unit tests
python -m pytest

# Interactive add skills
python -m grimoire add

# View skill info
python -m grimoire info <skill-name>
```

**Note:** The CLI scans top-level directories under `skills/` and accepts either `SKILL.md` or `skill.md`. Reference counts include `references/`, `reference/`, and `rules/`. The 14 sub-skills inside `superpowers/` are installed as part of the `superpowers` collection and are not listed individually by the CLI.

## Acknowledgments

- Inspired by [antfu/skills](https://github.com/antfu/skills)
- Superpowers skills integrated from [obra/superpowers](https://github.com/obra/superpowers)
- Third-party skill recommendations: [awesome-skills/](awesome-skills/README.md)
