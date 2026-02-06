---
name: autonomous-lucid
description: |
  Autonomous agent factory that researches a domain and generates a monorepo of
  10 production Lucid Agents. Use when batch-creating agents for a new vertical.
allowed-tools: [Skill, Bash, Read, Write, Edit, AskUserQuestion, TodoWrite]
---

# Autonomous Lucid Agent Factory

Fully autonomous pipeline that researches a domain and generates a complete monorepo of 10 production-ready Lucid Agents.

## When to Use

Activate this skill when the user wants to:
- "Build agents for [domain]"
- "Create a suite of [domain] agents"
- "Generate autonomous agents for [subject]"
- "Build a monorepo of agents for [industry/topic]"

## What This Skill Does

Orchestrates an end-to-end autonomous agent generation pipeline:

1. **Domain Research** - Deep research into the subject area
2. **Idea Generation** - Generate 10 unique agent concepts
3. **Parallel Agent Creation** - Build all 10 agents simultaneously
4. **Monorepo Organization** - Structure as a professional monorepo
5. **Publishing & Deployment** - Git publish and optional Railway deployment

## Workflow Architecture

```
User Input: "cryptocurrency trading"
    ↓
┌───────────────────────────────────────────────┐
│ Phase 1: Domain Research (research-agent)    │
│ - Best practices and patterns                │
│ - Common use cases and pain points           │
│ - Technical requirements and constraints     │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 2: Idea Generation                     │
│ - Analyze research findings                  │
│ - Generate 10 unique agent concepts          │
│ - Validate feasibility and value            │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 3: Parallel Agent Creation             │
│                                               │
│  Agent 1 ──→ /paid-agent ──→ Built + Tested  │
│  Agent 2 ──→ /paid-agent ──→ Built + Tested  │
│  Agent 3 ──→ /paid-agent ──→ Built + Tested  │
│  ...                                          │
│  Agent 10 ─→ /paid-agent ──→ Built + Tested  │
│                                               │
│  (All run in parallel for speed)              │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 4: Monorepo Organization               │
│                                               │
│  domain-agents/                               │
│  ├── packages/                                │
│  │   ├── agent-1/                            │
│  │   ├── agent-2/                            │
│  │   └── ...                                 │
│  ├── package.json (workspaces)               │
│  ├── tsconfig.base.json                      │
│  └── README.md (comprehensive)               │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ Phase 5: Publishing & Deployment             │
│ - Git commit entire monorepo                 │
│ - Push to GitHub                             │
│ - Optional: Deploy all to Railway            │
└───────────────────────────────────────────────┘
```

## Instructions

### Step 1: Gather Requirements

Ask the user for:
- **Domain/Subject**: What domain to build agents for
- **Monorepo name**: Repository name (kebab-case)
- **Deployment preference**: Deploy immediately or later?

```bash
AskUserQuestion with:
- "What domain should we build agents for?"
- "What should we name the monorepo?" (suggest based on domain)
- "Deploy all agents to Railway immediately?" (yes/no)
```

### Step 2: Domain Research

Launch research-agent to deeply understand the domain:

```bash
Skill("research-agent", args: "Research {DOMAIN} comprehensively. Focus on:
- Common use cases and applications
- Pain points and challenges
- Technical requirements
- Best practices and patterns
- Opportunities for AI agents")
```

After research completes, immediately proceed to idea generation.

### Step 3: Generate 10 Agent Ideas

Using the research findings, generate 10 unique agent concepts:

**Criteria for each agent idea:**
- Solves a specific problem in the domain
- Has clear value proposition
- Technically feasible as a Lucid Agent
- Complements other agents in the suite
- Has well-defined inputs/outputs

**Output format:**
```
1. agent-name-1: Brief description (1 sentence)
2. agent-name-2: Brief description (1 sentence)
...
10. agent-name-10: Brief description (1 sentence)
```

Present the 10 agent ideas to the user, then immediately proceed to create the monorepo structure and build the agents.

### Step 4: Create Monorepo Structure

Create the root monorepo before spawning agents:

```bash
mkdir -p {monorepo-name}/packages
cd {monorepo-name}

# Create root package.json with workspaces
# Create tsconfig.base.json
# Create .gitignore
# Create README.md template
```

### Step 5: Parallel Agent Creation

Spawn 10 paid-agent skills **in parallel** (single message with multiple Tool calls):

**CRITICAL:** Use Task tool with run_in_background=true for each agent to run them in parallel.

```bash
# For each of the 10 agents, spawn in parallel:
Task(
  subagent_type="general-purpose",
  description="Build agent {N}",
  prompt="Use the /paid-agent skill to create: {AGENT_DESCRIPTION}

  Target directory: {monorepo-name}/packages/{agent-name}

  After paid-agent completes:
  - Do NOT push to GitHub (we'll do that for the monorepo)
  - Do NOT create a separate repo
  - Agent should be in packages/{agent-name}/ directory
  ",
  run_in_background=true
)
```

Monitor all 10 agents for completion by using TaskOutput or reading their output files. Once all agents have completed successfully, proceed immediately to integration.

### Step 6: Integrate into Monorepo

Once all agents are built:

1. **Verify structure:**
```bash
ls -la packages/
# Should show all 10 agent directories
```

2. **Create root package.json:**
```json
{
  "name": "{monorepo-name}",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test",
    "type-check": "bun run --filter '*' type-check",
    "dev:all": "bun run --filter '*' dev"
  }
}
```

3. **Create root tsconfig.base.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

4. **Create comprehensive README.md:**
- Overview of the agent suite
- Description of each agent
- Installation instructions
- Usage examples
- Development guide

### Step 7: Publish Monorepo

```bash
cd {monorepo-name}
git init
git add -A
Skill("commit")  # Uses /commit skill

# Create GitHub repo
gh repo create {monorepo-name} --public --source=. --remote=origin --push --description "{DOMAIN} AI Agent Suite - 10 production Lucid Agents"
```

### Step 8: Deploy (Optional)

If user requested deployment:

```bash
# For each agent in packages/
for agent in packages/*/; do
  Skill("railway", args: "deploy $agent")
done
```

### Step 9: Summary

Provide the user with:
- GitHub repository URL
- List of all 10 agents with descriptions
- Monorepo structure overview
- Quick start commands
- Next steps (e.g., customize agents, configure payments)

## Example Usage

```
User: "Build agents for cryptocurrency trading"

Assistant response:
1. Ask: "What should we name the monorepo?" (suggest: "crypto-trading-agents")
2. Research domain:
   Skill("research-agent", args: "Research cryptocurrency trading comprehensively...")
3. Generate 10 agent ideas based on research:
   - price-alert-agent: Monitor crypto prices and send alerts on thresholds
   - portfolio-tracker-agent: Track portfolio performance across exchanges
   - sentiment-analyzer-agent: Analyze crypto social sentiment
   - whale-watcher-agent: Monitor large transactions on-chain
   - arbitrage-finder-agent: Find arbitrage opportunities across DEXs
   - gas-optimizer-agent: Optimize transaction gas fees
   - risk-scorer-agent: Score trading risk for positions
   - trend-predictor-agent: Predict short-term price trends
   - news-aggregator-agent: Aggregate crypto news from multiple sources
   - liquidity-monitor-agent: Monitor liquidity pools and yields
4. Present ideas to user and proceed automatically
5. Create monorepo structure
6. Spawn 10 parallel agents using Task tool with run_in_background=true
7. Monitor all agents and proceed when complete
8. Integrate into monorepo with shared configs
9. Commit and push to GitHub
10. Optionally deploy all to Railway
11. Provide summary with GitHub URL and agent overview
```

## Pipeline Stages

### Stage 1: Domain Research (5-10 minutes)
- Deep dive into the domain
- Identify patterns and opportunities
- Gather technical requirements
- Research best practices

### Stage 2: Idea Generation (2-3 minutes)
- Synthesize research into agent concepts
- Ensure diversity and complementarity
- Validate feasibility
- Present ideas and proceed automatically

### Stage 3: Parallel Agent Creation (30-60 minutes)
- All 10 agents build simultaneously
- Each runs full /paid-agent pipeline:
  - Ralph loop #1 (build features)
  - Code review
  - Ralph loop #2 (fix tests)
  - All tests pass
- Running in parallel dramatically reduces total time

### Stage 4: Monorepo Organization (5 minutes)
- Create workspace configuration
- Add shared configs
- Generate comprehensive README
- Set up cross-package scripts

### Stage 5: Publishing (2 minutes)
- Git commit entire monorepo
- Push to single GitHub repository
- Optional: Deploy all agents

## Skill Composition

This meta-skill orchestrates:

1. **research-agent** - Domain research and analysis
2. **paid-agent** (10x) - Complete agent creation pipeline
3. **commit** - Git operations with proper formatting
4. **railway** (10x, optional) - Agent deployment

## Key Design Decisions

### Why Parallel Execution?
- Building 10 agents sequentially would take 5-10 hours
- Parallel execution with Task tool reduces to 30-60 minutes
- Each agent is independent and can build simultaneously

### Why Monorepo?
- Single source of truth for all agents
- Shared configurations and dependencies
- Easier to manage and version
- Better discoverability
- Simpler deployment pipeline

### Why 10 Agents?
- Provides comprehensive coverage of the domain
- Creates a valuable agent ecosystem
- Balances breadth vs depth
- Manageable complexity
- Can be adjusted based on user needs

## Configuration Options

### Agent Count
Default is 10, but can be customized:
- Minimum: 3 agents
- Maximum: 20 agents (be mindful of resource limits)

### Deployment Strategy
Options:
- **None**: Just build and publish to GitHub
- **Selective**: Deploy only specific agents
- **All**: Deploy entire suite to Railway

### Research Depth
Options:
- **Quick**: 5-minute research scan
- **Standard**: 10-minute comprehensive research (default)
- **Deep**: 20-minute extensive research with examples

## Error Handling

### If Research Fails
- Retry with simplified query
- Fall back to general domain knowledge
- Ask user for domain expertise

### If Agent Creation Fails
- Log which agent failed
- Continue with remaining agents
- Report failures in summary
- Allow retry of failed agents

### If Monorepo Integration Fails
- Verify each agent directory exists
- Check for naming conflicts
- Validate package.json in each agent

### If Publishing Fails
- Check git authentication
- Verify GitHub repo name is unique
- Ensure all files are committed

## Advanced Features

### Custom Agent Templates
Allow user to provide template or requirements for specific agents

### Dependency Management
Detect and configure shared dependencies across agents

### Testing Suite
Generate integration tests for the agent ecosystem

### Documentation Generation
Auto-generate API docs for each agent

## Limitations

- Maximum 20 agents (resource constraints)
- Each agent must be independent (no cross-dependencies)
- Requires stable internet for parallel research and builds
- Railway deployment requires valid credentials

## Required Tools

- research-agent skill
- paid-agent skill
- commit skill
- Task tool (for parallel execution)
- gh CLI (for GitHub operations)
- Railway CLI (optional, for deployment)
- Bun package manager

## Performance Estimates

### Sequential (old approach)
- 10 agents × 30 min each = 300 minutes (5 hours)

### Parallel (this approach)
- Research: 10 minutes
- Idea generation: 5 minutes
- Agent creation (parallel): 30-60 minutes
- Integration: 5 minutes
- **Total: ~50-80 minutes**

**Speedup: 4-6x faster** ⚡

## See Also

- `/research-agent` - Domain research and analysis
- `/paid-agent` - Complete agent creation pipeline
- `/commit` - Git operations
- Railway skill - Agent deployment