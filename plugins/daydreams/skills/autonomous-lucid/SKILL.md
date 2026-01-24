---
name: autonomous-lucid
description: This skill should be used when the user asks to "build agents for a domain", "create agent suite", "generate autonomous agents", "build monorepo of agents", "10 agents for X", "agent factory", "parallel agent creation", or wants to research a domain and generate multiple production Lucid Agents.
allowed-tools: Skill, Bash, Read, Write, Edit, AskUserQuestion, TaskCreate, TaskUpdate, TaskList
requires:
  - research-agent
  - paid-agent
  - commit
  - railway
see-also:
  - ./references/ARCHITECTURE.md: Detailed architecture and data flow diagrams
---

# Autonomous Lucid Agent Factory

Autonomous pipeline that researches a domain and generates a monorepo of 10 production-ready Lucid Agents in parallel.

## Pipeline Overview

1. **Domain Research** - Deep research into the subject area
2. **Idea Generation** - Generate 10 unique agent concepts
3. **Parallel Agent Creation** - Build all 10 agents simultaneously
4. **Monorepo Organization** - Structure as professional Bun workspace
5. **Publishing & Deployment** - Git publish and optional Railway deployment

**Performance:** 4-6x faster than sequential (~50-80 min vs 5+ hours)

## Execution Steps

### Step 1: Gather Requirements

Collect or ask for:
- **Domain/Subject**: What domain to build agents for
- **Monorepo name**: Repository name (kebab-case)
- **Deployment**: Deploy immediately or later?

### Step 2: Domain Research

Launch research-agent:

```
Skill("research-agent", args: "Research {DOMAIN} comprehensively. Focus on:
- Common use cases and applications
- Pain points and challenges
- Technical requirements
- Best practices and patterns
- Opportunities for AI agents")
```

### Step 3: Generate 10 Agent Ideas

Using research findings, generate 10 unique agent concepts:

**Criteria for each idea:**
- Solves a specific problem in the domain
- Clear value proposition
- Technically feasible as Lucid Agent
- Complements other agents in suite
- Well-defined inputs/outputs

**Output format:**
```
1. agent-name-1: Brief description (1 sentence)
2. agent-name-2: Brief description (1 sentence)
...
10. agent-name-10: Brief description (1 sentence)
```

Present ideas to user, then proceed automatically.

### Step 4: Create Monorepo Structure

```bash
mkdir -p {monorepo-name}/packages
cd {monorepo-name}
```

Create root configs: `package.json` (workspaces), `tsconfig.base.json`, `.gitignore`, `README.md`.

### Step 5: Parallel Agent Creation

Spawn 10 paid-agent tasks **in parallel** using Task tool with `run_in_background=true`:

```
Task(
  subagent_type="general-purpose",
  description="Build agent {N}",
  prompt="Use the /paid-agent skill to create: {AGENT_DESCRIPTION}
  Target directory: {monorepo-name}/packages/{agent-name}
  Do NOT push to GitHub (monorepo will be pushed together)",
  run_in_background=true
)
```

Monitor all 10 agents for completion. Proceed when all complete.

### Step 6: Integrate Monorepo

Create root `package.json`:
```json
{
  "name": "{monorepo-name}",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test"
  }
}
```

Generate comprehensive README with agent descriptions.

### Step 7: Publish

```bash
cd {monorepo-name}
git init && git add -A
Skill("commit")
gh repo create {monorepo-name} --public --source=. --remote=origin --push
```

### Step 8: Deploy (Optional)

If requested, deploy each agent to Railway:
```bash
for agent in packages/*/; do
  Skill("railway", args: "deploy $agent")
done
```

### Step 9: Summary

Provide:
- GitHub repository URL
- List of all 10 agents with descriptions
- Monorepo structure overview
- Quick start commands

## Configuration

| Setting | Options | Default |
|---------|---------|---------|
| Agent Count | 3-20 | 10 |
| Research Depth | quick/standard/deep | standard |
| Deployment | none/selective/all | none |

## Error Handling

| Error | Resolution |
|-------|------------|
| Research fails | Retry with simpler query, ask user for expertise |
| Agent creation fails | Log failure, continue with remaining, offer retry |
| Integration fails | Verify directories, check for conflicts |

## Additional Resources

### Reference Files

For detailed architecture documentation:
- **`references/ARCHITECTURE.md`** - Skill composition diagram, data flow, parallel execution strategy, monorepo structure, performance benchmarks
