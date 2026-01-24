---
name: lucid-agents-sdk
description: This skill should be used when the user asks about "lucid agents", "lucid-agents", "@lucid-agents", "lucid sdk", "create a lucid agent", "build a paid agent", "monetize an AI agent", "agent payments", "a2a communication", "ERC-8004 identity", "x402 protocol", "agent entrypoints", "Hono adapter", "Express adapter", "TanStack adapter", or is working in the lucid-agents repository.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
see-also:
  - https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md: Full AI coding guide for the lucid-agents monorepo
  - https://github.com/daydreamsai/lucid-agents/blob/master/CONTRIBUTING.md: Contribution guidelines
---

# Lucid Agents SDK

TypeScript framework for building and monetizing AI agents with x402 payments, ERC-8004 identity, and A2A communication.

## Quick Start

Create a new agent using the CLI:

```bash
bunx @lucid-agents/cli my-agent --adapter=hono
```

Or build from scratch:

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

addEntrypoint({
  key: 'echo',
  description: 'Echo back input',
  input: z.object({ text: z.string() }),
  handler: async ctx => ({ output: { text: ctx.input.text } }),
});

export default { port: 3000, fetch: app.fetch };
```

## Core Concepts

### Extension System

Add capabilities via composable extensions:

```typescript
const agent = await createAgent({ name: 'my-agent', version: '1.0.0' })
  .use(http())           // HTTP handling
  .use(wallets({ config: walletsFromEnv() }))   // Wallet management
  .use(payments({ config: paymentsFromEnv() })) // x402 payments
  .use(identity({ config: identityFromEnv() })) // ERC-8004 identity
  .use(a2a())            // Agent-to-agent communication
  .build();
```

### Adapters

| Adapter | Package | Use Case |
|---------|---------|----------|
| Hono | @lucid-agents/hono | Lightweight, edge-compatible |
| Express | @lucid-agents/express | Traditional Node.js |
| TanStack | @lucid-agents/tanstack | Full-stack React |

### Payment Networks

| Network | Chain ID | Notes |
|---------|----------|-------|
| Base | 8453 | Recommended for low fees |
| Base Sepolia | 84532 | Testnet |
| Ethereum | 1 | Mainnet |
| Solana | - | ~$0.0001 fees, ~400ms finality |

## Development Workflow

### Build and Test

```bash
bun install              # Install dependencies
bun run build:packages   # Build all packages
bun test                 # Run tests
```

### Create Changeset

```bash
bun run changeset        # Create version changeset
bun run release:version  # Apply versions
bun run release:publish  # Publish to npm
```

## Coding Standards

Follow these principles when modifying the SDK:

1. **Single source of truth** - One type definition per concept
2. **ESM only** - Use `import`/`export`, never `require()`
3. **Strict TypeScript** - Avoid `any`, prefer explicit types
4. **No re-exports** - Define types where they belong
5. **No emojis** - In code, comments, or commit messages
6. **File naming** - Use `kebab-case.ts`

## Additional Resources

### Reference Files

For detailed documentation:
- **`references/architecture.md`** - Monorepo structure, extension system, payment networks, coding principles
- **`references/code-patterns.md`** - Complete code examples for all adapters, extensions, streaming, CLI usage, and troubleshooting

### External Documentation

- [AGENTS.md](https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md) - Full AI coding guide
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity standard
- [x402 Protocol](https://github.com/paywithx402) - HTTP-native payments
- [A2A Protocol](https://a2a-protocol.org/) - Agent communication
