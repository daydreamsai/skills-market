# Skills Market Guidelines

Skills for building paid Lucid Agents with x402. For the full spec, see `AGENTS.md`.

## Skill Format

Every skill requires a `SKILL.md` with YAML frontmatter and markdown body:

```yaml
---
name: my-skill
description: What this does. Use when [trigger conditions].
---

Instructions the agent follows when invoked...
```

- `name` becomes the `/slash-command`
- `description` determines when the skill auto-loads

### Description Rules

Descriptions are injected into the system prompt. Follow these rules:

1. **Third person only** -- Descriptions must use third-person voice, not imperative
   - Good: "Discovers trending topics on X/Twitter..."
   - Bad: "Discover trending topics on X/Twitter..."
2. **Include "Use when" trigger** -- Every description must state when to activate
   - Good: "...Use when starting any agent creation workflow."
   - Bad: "...Critical step before building agents." (no explicit trigger)
3. **Be specific** -- Include key terms that match natural language queries
4. **Max 1024 characters**

### Reference File Rules

Reference files linked from SKILL.md must follow these rules:

1. **One level deep** -- All references link directly from SKILL.md (no nested references)
2. **Table of contents required** -- Any reference file over 100 lines must include a `## Contents` section at the top listing all headings
3. **Descriptive names** -- Use `form_validation_rules.md`, not `doc2.md`

## Frontmatter Reference

| Field | Type | Description |
|:------|:-----|:------------|
| `name` | string | Lowercase, hyphens only (max 64 chars). Default: directory name |
| `description` | string | What it does and when to use it |
| `disable-model-invocation` | boolean | `true` = only user can invoke |
| `user-invocable` | boolean | `false` = hidden from `/` menu |
| `allowed-tools` | array | Tools the agent can use without asking |
| `context` | string | `fork` to run in subagent |
| `agent` | string | Subagent type when `context: fork` |
| `see-also` | array | References to related skills or external docs |

## Directory Structure

```
plugins/<skill-name>/
├── .claude-plugin/plugin.json    # Required - plugin manifest
└── skills/
    ├── SKILL.md                  # Required - main instructions
    ├── template.md               # Optional - templates
    ├── references/               # Optional - detailed reference material
    ├── examples/                 # Optional - example outputs
    └── scripts/                  # Optional - executable scripts
```

### Line Limits

Keep SKILL.md under **500 lines**. Move detailed reference material to separate files (e.g., `references/`, `GUIDE.md`).

## plugin.json Specification

Required fields:

| Field | Type | Description |
|:------|:-----|:------------|
| `name` | string | Must match directory name, lowercase with hyphens |
| `description` | string | One-line purpose |
| `version` | string | Semver (e.g., `1.0.0`) |
| `author` | object | `{ "name": "...", "email": "..." }` |
| `license` | string | License identifier (e.g., `MIT`) |
| `keywords` | array | Tags for discovery; must include `lucid-agents` for core skills |
| `skills` | string | Path to skills directory (always `"./skills"`) |

Recommended fields:

| Field | Type | Description |
|:------|:-----|:------------|
| `homepage` | string | URL to project homepage |
| `repository` | string | URL to source repository |

**Important:** The `author` field MUST be an object `{ "name": "...", "email": "..." }`, not a plain string. PRs with `"author": "Some Name"` will be rejected.

Example:

```json
{
  "name": "my-skill",
  "description": "Generates payment schemas for x402 agents",
  "version": "1.0.0",
  "author": { "name": "Jane Doe", "email": "jane@example.com" },
  "license": "MIT",
  "keywords": ["lucid-agents", "x402", "payments"],
  "skills": "./skills"
}
```

## Dynamic Context

Inject live data with `` !`command` ``:

```yaml
---
name: pr-summary
context: fork
---
PR diff: !`gh pr diff`
Changed files: !`gh pr diff --name-only`

Summarize this pull request...
```

Commands execute before the agent sees the prompt.

## Arguments

Use `$ARGUMENTS` or positional `$0`, `$1`, etc:

```yaml
---
name: fix-issue
---
Fix GitHub issue $ARGUMENTS following our standards.
```

`/fix-issue 123` expands to "Fix GitHub issue 123..."

---

## Requirements

### Must Have

- YAML frontmatter with `name` and `description`
- `plugin.json` with all required fields
- `author` as an object (not a string)
- Focus on Lucid Agents (x402, ERC-8004)
- Zod v4 (not v3)
- Modern imports: `@lucid-agents/core`, `@lucid-agents/http`

### Must NOT Have

- CLI basics everyone knows
- Verbose explanations of common concepts
- Hardcoded/mock data
- Outdated SDK patterns (`agent.listen()`, monolithic imports)

## Market-Specific Goals

1. **Build paid agents** -- Every skill helps create monetizable Lucid Agents
2. **Be concise** -- Only include what agents don't already know
3. **No repetition** -- Don't explain CLI basics or common patterns
4. **Composable** -- Skills work standalone or together
5. **Real data only** -- No hardcoded mocks

## Quality Bar

```
Bad:  "Run `npm install` to install dependencies"
Good: "Requires: Zod v4, @lucid-agents/payments"

Bad:  50 lines explaining how fetch() works
Good: API endpoint table with tested URLs
```

## PR Review Checklist

- [ ] Has `SKILL.md` with valid frontmatter (`name`, `description`)
- [ ] Has `.claude-plugin/plugin.json` with all required fields
- [ ] `author` in plugin.json is an object, not a string
- [ ] `description` is third-person voice (not imperative)
- [ ] `description` includes a "Use when" trigger
- [ ] `SKILL.md` is under 500 lines
- [ ] Reference files >100 lines have a `## Contents` TOC
- [ ] Uses Zod v4, modern SDK imports
- [ ] No bloat or redundant explanations
- [ ] Adds value for paid agent creation

## Troubleshooting

| Problem | Fix |
|:--------|:----|
| Skill not triggering | Make `description` match natural phrases; check `context` |
| Triggers too often | Make `description` more specific; add `disable-model-invocation: true` |
| Agent doesn't see skill | Too many skills exceed 15K char budget; increase `SLASH_COMMAND_TOOL_CHAR_BUDGET` |

## Reference

- [Agent Skills Standard](https://agentskills.io)
- [Claude Code Docs](https://code.claude.com/docs/llms.txt)
