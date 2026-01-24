# Daydreams AI Plugin

A Claude Code plugin for working with Daydreams AI infrastructure.

## Installation

Add this marketplace to Claude Code:

```bash
/plugin marketplace add daydreamsai/skills-market
```

Then install the plugin:

```bash
/plugin install daydreams@daydreams-skills
```

That's it! You now have access to all Daydreams AI tools.

## Usage

### Commands

Type `/daydreams` to see all available commands:

| Command | Description |
|---------|-------------|
| `/daydreams:xgate-server` | Query xgate API for services, agents, and on-chain data |
| `/daydreams:lucid-agents-sdk` | Work with the Lucid Agents SDK |
| `/daydreams:lucid-client-api` | Interact with the Lucid Client API |
| `/daydreams:paid-agent` | Create, test, and deploy a production Lucid Agent |
| `/daydreams:autonomous-lucid` | Research a domain and generate 10 production agents |

### Auto-Activation

Skills also auto-activate when you mention relevant keywords:

- **xgate-server**: "xgate", "X402 services", "ERC-8004 agents", "token transfers"
- **lucid-agents-sdk**: "lucid agents", "lucid sdk", "@lucid-agents", "agent payments"
- **lucid-client-api**: "lucid client", "multi-agent runtime", "agent management API"
- **paid-agent**: "create a paid agent", "build a lucid agent", "deploy an agent"
- **autonomous-lucid**: "build agents for a domain", "agent factory", "10 agents"

## Features

### xgate-server

Query the xgate-server API for X402 services, ERC-8004 agents, and on-chain token transfers.

- Search services by query, network, and asset
- Search agents by protocol (MCP, A2A), reputation score, and validation status
- Query on-chain token transfers
- CLI tool for quick API access

```bash
# Example queries:
curl -s "https://api.xgate.run/health" | jq
curl -s "https://api.xgate.run/services?q=token&network=ethereum" | jq
curl -s "https://api.xgate.run/agents?protocols=MCP&min_score=0.8" | jq
```

### lucid-agents-sdk

Comprehensive guidance for working with the Lucid Agents SDK - a TypeScript framework for building and monetizing AI agents.

- Building agents with extensions (http, payments, identity, a2a, etc.)
- Using adapters (Hono, Express, TanStack)
- Payment networks (EVM and Solana)
- Code structure principles and patterns

**Resources:**
- [Lucid Agents Repository](https://github.com/daydreamsai/lucid-agents)
- [AGENTS.md Guide](https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md)

### lucid-client-api

Interact with the Lucid Client API - a multi-agent runtime system.

- Agent management endpoints (create, update, delete, list)
- Entrypoint invocation with payment handling
- x402 protocol integration
- Secrets management, analytics, and rankings

**Resources:**
- [Lucid Client Repository](https://github.com/daydreamsai/lucid-client)
- [API Documentation](https://github.com/daydreamsai/lucid-client/blob/master/AGENTS.md)

### paid-agent

End-to-end Lucid Agent creation, testing, and deployment pipeline.

**Pipeline:**
1. Development Loop - Iteratively builds the agent
2. Code Review - Reviews for quality, security, and best practices
3. Test Refinement - Ensures all tests pass
4. Git Publishing - Creates GitHub repo and pushes code
5. Railway Deployment - Optional production deployment

**Required skills (from other plugins):**
- `ralph-wiggum` - Iterative development loops
- `feature-dev` - Code review capabilities
- `commit` - Git operations
- `railway` - Deployment (optional)

### autonomous-lucid

Autonomous agent factory that researches a domain and generates a monorepo of 10 production-ready Lucid Agents.

**Pipeline:**
1. Domain Research - Deep research into the subject area
2. Idea Generation - Generate 10 unique agent concepts
3. Parallel Agent Creation - Build all 10 agents simultaneously
4. Monorepo Organization - Structure as professional Bun workspace
5. Publishing & Deployment - Git publish and optional Railway deployment

**Performance:** 4-6x faster than sequential (parallel execution)

**Required skills (from other plugins):**
- `research-agent` - Domain analysis
- All `paid-agent` dependencies

## Repository Structure

```
skills-market/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   └── daydreams/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── commands/
│       │   ├── xgate-server.md
│       │   ├── lucid-agents-sdk.md
│       │   ├── lucid-client-api.md
│       │   ├── paid-agent.md
│       │   └── autonomous-lucid.md
│       ├── skills/
│       │   ├── xgate-server.md
│       │   ├── lucid-agents-sdk.md
│       │   ├── lucid-client-api.md
│       │   ├── paid-agent.md
│       │   ├── autonomous-lucid.md
│       │   └── ARCHITECTURE.md
│       └── scripts/
│           └── xgate
└── README.md
```

## Development

### Testing Locally

```bash
# Add marketplace from local path
/plugin marketplace add /path/to/skills-market

# Install the plugin
/plugin install daydreams@daydreams-skills

# Validate marketplace
/plugin validate .
```

## License

MIT
