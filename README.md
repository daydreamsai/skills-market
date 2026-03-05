# Skills Market

Definitive standards for writing Skills Market plugins that help build paid Lucid Agents.

## Core goals

1. Build paid agents with x402 and ERC-8004 flows.
2. Keep instructions concise and high signal.
3. Avoid repeating obvious CLI or language basics.
4. Make skills composable across agent workflows.
5. Use real, fetchable data instead of hardcoded mocks.

## Required package structure

```text
plugins/<skill-name>/
├── .claude-plugin/plugin.json
└── skills/
    ├── SKILL.md
    ├── references/   (optional)
    ├── examples/     (optional)
    └── scripts/      (optional)
```

## `SKILL.md` contract

Every skill must include YAML frontmatter followed by markdown instructions.

```yaml
---
name: my-skill
description: "Describes behavior. Use when [trigger condition]."
---
```

### Description rules

1. Write in third person, not imperative voice.
2. Include an explicit `Use when ...` trigger.
3. Include concrete terms users will naturally ask for.
4. Keep under 1024 characters.
5. Quote long descriptions or any text containing `:` to avoid YAML parse errors.

### Content limits

- Keep `SKILL.md` under 500 lines.
- Put detailed guidance in `skills/references/*.md`.
- Keep references one level deep from `SKILL.md` (no nested reference chains).
- Any reference file over 100 lines must include `## Contents` at the top.

## `.claude-plugin/plugin.json` contract

Required fields:

| Field | Type | Requirement |
|:------|:-----|:------------|
| `name` | string | Must match directory name, lowercase with hyphens |
| `description` | string | One-line plugin purpose |
| `version` | string | Semver (for example `1.0.0`) |
| `author` | object | Must be `{ "name": "...", "email": "..." }` |
| `license` | string | SPDX-like identifier (for example `MIT`) |
| `keywords` | array | Must include `lucid-agents` |
| `skills` | string | Must be `"./skills"` |

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

## Authoring best practices

- Prefer modern imports: `@lucid-agents/core`, `@lucid-agents/http`.
- Use Zod v4 only.
- Avoid outdated patterns such as `agent.listen()` and monolithic imports.
- Add dynamic context where needed using `` !`command` ``.
- Use `$ARGUMENTS` and `$0`, `$1` for slash-command arguments.
- Keep workflows implementation-focused and testable.

## Quality bar

Bad:
- "Run `npm install` to install dependencies."
- 50 lines teaching `fetch()` basics.
- Mock-only examples disconnected from real endpoints.

Good:
- "Requires: Zod v4, `@lucid-agents/payments`."
- Endpoint tables with verified inputs/outputs.
- Live-data examples with clear constraints and assumptions.

## PR checklist

- [ ] `SKILL.md` exists with `name` and `description` frontmatter.
- [ ] `description` is third-person and includes `Use when ...`.
- [ ] `SKILL.md` is under 500 lines.
- [ ] Large reference files include `## Contents`.
- [ ] `.claude-plugin/plugin.json` has all required fields.
- [ ] `author` is an object with `name` and `email`.
- [ ] Uses Zod v4 and modern Lucid SDK imports.
- [ ] No bloat, no repetitive basics, no hardcoded mock flows.
- [ ] Skill clearly improves paid-agent creation outcomes.

## Troubleshooting

| Problem | Likely cause | Fix |
|:--------|:-------------|:----|
| Skill does not trigger | Weak description terms | Add concrete keywords and explicit `Use when` |
| YAML parse error in frontmatter | Unquoted `:` or invalid YAML | Quote description string and validate delimiters |
| Skill triggers too often | Description too broad | Narrow trigger phrasing and context |
| Agent misses references | Nested or unlinked docs | Link every reference directly from `SKILL.md` |

## Install

```bash
/plugin marketplace add daydreamsai/skills-market
/plugin install <skill-name>@daydreams-skills
```
