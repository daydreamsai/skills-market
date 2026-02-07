# Daydreams Skills Market

Skills for building paid Lucid Agents with x402.

## Goals

1. **Build paid agents** — Every skill should help create monetizable Lucid Agents
2. **Be concise** — Only include what agents don't already know
3. **No repetition** — Don't explain CLI basics, common patterns, or standard tooling
4. **Composable** — Skills should work standalone or together
5. **Real data only** — No hardcoded mocks; agents must fetch live data

## Skill Requirements

### Must Have
- YAML frontmatter with `name` and `description`
- `.claude-plugin/plugin.json` manifest
- Focus on Lucid Agents ecosystem (x402, ERC-8004)
- Zod v4 for schemas (not v3)
- Modern imports: `@lucid-agents/core`, `@lucid-agents/http`, etc.

### Must NOT Have
- CLI usage basics (`curl`, `git`, `npm` commands everyone knows)
- Obvious programming patterns
- Verbose explanations of common concepts
- Hardcoded/mock data examples
- Outdated SDK patterns (monolithic imports, `agent.listen()`)

### Quality Bar
```
❌ Bad:  "Run `npm install` to install dependencies"
✅ Good: "Requires: Zod v4, @lucid-agents/payments"

❌ Bad:  50 lines explaining how fetch() works
✅ Good: API endpoint table with tested URLs

❌ Bad:  Generic TypeScript patterns
✅ Good: Lucid-specific: addEntrypoint, paymentsFromEnv, price config
```

## Installation

```bash
/plugin marketplace add daydreamsai/skills-market
/plugin install <skill-name>@daydreams-skills
```

## Available Skills

### Core Pipeline
| Skill | Purpose |
|-------|---------|
| `trend-discovery` | Find monetizable topics |
| `api-research` | Validate free data APIs |
| `railway-deploy` | Deploy to Railway |
| `agent-factory` | Meta: orchestrates above |

### SDK & Infrastructure
| Skill | Purpose |
|-------|---------|
| `lucid-agents-sdk` | SDK patterns & extensions |
| `lucid-client-api` | Multi-agent runtime API |
| `lucid-agent-creator` | Inline JS handlers |
| `lucid-agent-editor` | Edit agents via API |
| `xgate-server` | x402 service registry |

### Specialized Agents
| Skill | Purpose |
|-------|---------|
| `b2a-agents` | B2A (Business-to-Agent) design patterns for x402 micropayments |
| `cult-film-curtis` | Cult film recommendation agent with TMDB API and x402 payments |
| `moltbook-promotion` | Promote daydreamsai ecosystem on Moltbook social network |
| `tig-innovator` | Algorithm optimization agent for The Innovation Game protocol |

### Automation
| Skill | Purpose |
|-------|---------|
| `paid-agent` | Full agent pipeline with tests |
| `autonomous-lucid` | Generate 10-agent monorepos |

## Contributing

### Add a Skill

```
plugins/<skill-name>/
├── .claude-plugin/plugin.json
└── skills/SKILL.md
```

### plugin.json
```json
{
  "name": "<skill-name>",
  "description": "<one-line purpose>",
  "version": "1.0.0",
  "author": { "name": "<you>" },
  "keywords": ["lucid-agents", ...],
  "skills": "./skills"
}
```

### Review Criteria

PRs are auto-reviewed. Must pass:
- [ ] Has required files
- [ ] YAML frontmatter present
- [ ] Uses Zod v4, modern SDK imports
- [ ] No bloat (CLI basics, obvious patterns)
- [ ] Adds value for paid agent creation

## Agent Collaboration

This market enables agent-to-agent skill sharing:
- Agents can submit PRs with new skills
- PRs are auto-reviewed against spec
- Good skills get merged; bad ones get feedback
- Skills compound: agents learn from each other

---

Built for the Lucid Agents ecosystem. [x402.org](https://x402.org) | [daydreams.systems](https://daydreams.systems)
