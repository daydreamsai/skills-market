# Daydreams AI Skills Marketplace

A Claude Code plugin marketplace for working with Daydreams AI infrastructure.

## Installation

Add this marketplace to Claude Code:

```bash
/plugin marketplace add daydreamsai/skills-market
```

Then install the plugins you want:

```bash
/plugin install xgate-server@daydreams-skills
/plugin install lucid-agents-sdk@daydreams-skills
/plugin install lucid-client-api@daydreams-skills
/plugin install lucid-js-handlers@daydreams-skills
/plugin install paid-agent@daydreams-skills
/plugin install autonomous-lucid@daydreams-skills
```

## Available Plugins

### xgate-server

Query the xgate-server API for X402 services, ERC-8004 agents, and on-chain token transfers.

**Features:**
- Search services by query, network, and asset
- Search agents by protocol (MCP, A2A), reputation score, and validation status
- Query on-chain token transfers
- CLI tool for quick API access

**Usage:**
```bash
# After installing, use the skill
/xgate-server

# Or use the CLI directly
xgate health
xgate services -q "token" -n ethereum
xgate agents -p MCP --min-score 0.8
xgate transfers -c 8453 --totals
```

**Environment:**
```bash
export XGATE_URL=https://xgate.run  # or http://localhost:9000
```

### lucid-agents-sdk

Comprehensive skill for working with the Lucid Agents SDK - a TypeScript framework for building and monetizing AI agents.

**Features:**
- Building agents with extensions (http, payments, identity, a2a, etc.)
- Using adapters (Hono, Express, TanStack)
- Payment networks (EVM and Solana)
- Code structure principles
- Common development tasks and patterns

**Usage:**
Automatically activates when:
- Building or modifying Lucid Agents projects
- Working with agent entrypoints, payments, identity, or A2A communication
- Developing in the lucid-agents monorepo
- Questions about the Lucid Agents architecture

**Resources:**
- [Lucid Agents Repository](https://github.com/daydreamsai/lucid-agents)
- [AGENTS.md Guide](https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [x402 Protocol](https://github.com/paywithx402)

### lucid-client-api

Skill for interacting with the Lucid Client API - a multi-agent runtime system.

**Features:**
- Agent management endpoints (create, update, delete, list)
- Entrypoint invocation with payment handling
- Payment handling (x402 protocol)
- Secrets management
- Analytics and rankings
- OpenAPI documentation access

**Usage:**
Automatically activates when:
- Interacting with the Lucid Client API
- Managing agents programmatically
- Invoking agent entrypoints
- Working with the multi-agent runtime

**Resources:**
- [Lucid Client Repository](https://github.com/daydreamsai/lucid-client)
- [API Documentation](https://github.com/daydreamsai/lucid-client/blob/master/AGENTS.md)

### lucid-js-handlers

Create Lucid agents with inline JavaScript handler code using the `create_lucid_agent` MCP tool. Agents are hosted on the Lucid platform (no self-hosting).

**Features:**
- JS handler code contract (sandboxed runtime, input/return expectations)
- Fetch allowlist via `handlerConfig.network.allowedHosts`
- Timeout controls via `handlerConfig.timeoutMs`
- PaymentsConfig requirements for paid agents
- Optional identityConfig (ERC-8004)

**Usage:**
Automatically activates when:
- Creating Lucid agents with inline JS handlers
- Working with `create_lucid_agent`
- Setting paid entrypoints or identity config

**Resources:**
- [Guide](plugins/lucid-js-handlers/skills/GUIDE.md)

### paid-agent

End-to-end Lucid Agent creation, testing, and deployment pipeline.

**Features:**
- Iterative agent development using Ralph Wiggum loops
- Automated code review for quality and security
- Test refinement loop to ensure all tests pass
- GitHub repository creation and publishing
- Optional Railway deployment

**Pipeline Stages:**
1. **Development Loop** - Ralph Wiggum iteratively builds the agent (max 50 iterations)
2. **Code Review** - Reviews implementation for quality, security, and best practices
3. **Test Refinement Loop** - Second Ralph loop focused on making tests pass (max 30 iterations)
4. **Git Publishing** - Creates GitHub repo and pushes code
5. **Railway Deployment** - Optional production deployment

**Usage:**
```bash
# After installing, use the skill
/paid-agent

# Or use with arguments
/paid-agent --name my-agent --purpose "Analyzes code quality" --no-deploy
```

**What It Does:**
- Creates production-ready Lucid Agents with comprehensive tests
- Ensures code quality through automated review
- Handles git operations and GitHub publishing
- Optionally deploys to Railway for immediate production use

**Example:**
```
User: "Create a paid agent that analyzes GitHub PRs for security issues"

The skill will:
1. Ask for repo name (e.g., 'pr-security-agent')
2. Run Ralph loop to build the agent with all features
3. Review code for bugs, security issues, and quality
4. Run second Ralph loop to fix any failing tests
5. Commit with proper formatting (removes Claude attribution)
6. Push to new GitHub repository
7. Ask if you want to deploy to Railway
8. Provide summary with links and next steps
```

### autonomous-lucid

Autonomous agent factory that researches a domain and generates a complete monorepo of 10 production-ready Lucid Agents.

**Features:**
- Deep domain research using research-agent skill
- Generates 10 unique, complementary agent concepts
- Parallel agent creation (4-6x faster than sequential)
- Professional Bun workspace monorepo structure
- Integrated testing and deployment pipeline
- Single GitHub repository for entire agent suite

**Pipeline Stages:**
1. **Domain Research** - Deep research into the subject area (5-10 minutes)
2. **Idea Generation** - Generate 10 unique agent concepts (2-3 minutes)
3. **Parallel Agent Creation** - Build all 10 agents simultaneously (30-60 minutes)
4. **Monorepo Organization** - Structure as professional monorepo (5 minutes)
5. **Publishing & Deployment** - Git publish and optional Railway deployment (2 minutes)

**Performance:**
- Sequential approach: ~5 hours for 10 agents
- Parallel approach: ~50-80 minutes
- **Speedup: 4-6x faster** ⚡

**Usage:**
```bash
# After installing, use the skill
/autonomous-lucid

# Then provide a domain
User: "cryptocurrency trading"
```

**What It Does:**
1. Researches the domain comprehensively (use cases, pain points, technical requirements)
2. Generates 10 agent ideas based on research findings
3. Creates monorepo structure with Bun workspaces
4. Spawns 10 paid-agent pipelines in parallel using Task tool
5. Integrates all agents into a single monorepo
6. Publishes entire suite to one GitHub repository

**Example Output:**
For "commodities futures trading", generates:
- risk-guardian-agent: Position sizing & stop-loss management
- spread-scout-agent: Arbitrage & spread opportunity detection
- margin-sentinel-agent: Margin monitoring & kill switch alerts
- contango-detector-agent: Term structure analysis
- weather-impact-agent: Weather-based agricultural predictions
- cftc-compliance-agent: Regulatory compliance automation
- volatility-advisor-agent: ATR-based volatility tracking
- portfolio-tracker-agent: Multi-commodity portfolio analytics
- news-pulse-agent: News aggregation & sentiment analysis
- backtest-lab-agent: Strategy backtesting engine

**Orchestrates:**
- `research-agent` - Domain analysis
- `paid-agent` (10x) - Complete agent creation pipeline
- `commit` - Git operations with proper formatting
- `railway` (optional) - Deployment

## Development

### Repository Structure

```
skills-market/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace catalog
├── plugins/
│   ├── xgate-server/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # Plugin manifest
│   │   ├── skills/
│   │   │   └── xgate-server.md
│   │   └── scripts/
│   │       └── xgate             # CLI tool
│   ├── lucid-agents-sdk/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── skills/
│   │       └── SKILL.md
│   ├── lucid-client-api/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── skills/
│   │       └── SKILL.md
│   ├── paid-agent/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── skills/
│   │       └── SKILL.md
│   └── autonomous-lucid/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       └── skills/
│           ├── SKILL.md
│           └── ARCHITECTURE.md
└── README.md
```

### Adding New Plugins

1. Create a new directory under `plugins/`
2. Add `.claude-plugin/plugin.json` with the plugin manifest
3. Add skills, commands, or other plugin components
4. Update `.claude-plugin/marketplace.json` to include the new plugin

### Testing Locally

```bash
# Add marketplace from local path
/plugin marketplace add ./path/to/skills-market

# Install a plugin
/plugin install xgate-server@daydreams-skills

# Validate marketplace
/plugin validate .
```

## License

MIT
