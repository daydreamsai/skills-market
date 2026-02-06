---
name: lucid-agents-sdk
description: |
  Skill for working with the Lucid Agents SDK - a TypeScript framework for building
  and monetizing AI agents. Use this skill when building or modifying Lucid Agents
  projects, working with agent entrypoints, payments, identity, or A2A communication.

  Activate when: Building or modifying Lucid Agents projects, working with agent
  entrypoints, payments, identity, or A2A communication, developing in the
  lucid-agents monorepo, creating new templates or CLI features, or questions about
  the Lucid Agents architecture or API.

see-also:
  - https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md: Full AI coding guide for the lucid-agents monorepo
  - https://github.com/daydreamsai/lucid-agents/blob/master/CONTRIBUTING.md: Contribution guidelines
---

# Lucid Agents SDK

TypeScript/Bun framework for building, monetizing, and verifying AI agents.

## Packages

- **@lucid-agents/core** - Protocol-agnostic agent runtime with extension system
- **@lucid-agents/http** - HTTP extension for request/response handling
- **@lucid-agents/identity** - ERC-8004 identity and trust layer
- **@lucid-agents/payments** - x402 payment utilities with bi-directional tracking
- **@lucid-agents/analytics** - Payment analytics and reporting
- **@lucid-agents/wallet** - Wallet SDK for agent and developer wallets
- **@lucid-agents/a2a** - A2A Protocol client for agent-to-agent communication
- **@lucid-agents/ap2** - AP2 (Agent Payments Protocol) extension
- **@lucid-agents/hono** - Hono HTTP server adapter
- **@lucid-agents/express** - Express HTTP server adapter
- **@lucid-agents/tanstack** - TanStack Start adapter
- **@lucid-agents/cli** - CLI for scaffolding new agent projects

**Tech Stack:** Bun (Node.js 20+ compatible), TypeScript (ESM, strict), tsup, Bun workspaces, Changesets

## Architecture

### Extension System

Features are added via composable extensions:

```typescript
const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .use(wallets({ config: walletsFromEnv() }))
  .use(payments({ config: paymentsFromEnv() }))
  .use(identity({ config: identityFromEnv() }))
  .use(a2a())
  .build();
```

**Extensions:** http, wallets, payments, analytics, identity, a2a, ap2

### Adapters

- **Hono** (`@lucid-agents/hono`) - Lightweight, edge-compatible
- **Express** (`@lucid-agents/express`) - Traditional Node.js/Express
- **TanStack Start** (`@lucid-agents/tanstack`) - Full-stack React (UI or headless)

### Payment Networks

| Network | Type | Finality | Gas Cost |
|---------|------|----------|----------|
| `base` / `base-sepolia` | EVM (L2) | ~12s | ~$0.01 |
| `ethereum` / `sepolia` | EVM (L1) | ~12min | $0.01-$10 |
| `solana` / `solana-devnet` | Solana | ~400ms | ~$0.0001 |

**EVM:** EIP-712 signatures, ERC-20 tokens (USDC), 0x-prefixed addresses
**Solana:** Ed25519 signatures, SPL tokens (USDC), Base58 addresses

### x402 Protocol Versions

**v1:** Simple network names (`base`, `ethereum`, `solana`)
**v2 (recommended):** CAIP-2 chain IDs (`eip155:8453` for Base, `eip155:1` for Ethereum)

| v1 Name | v2 CAIP-2 ID | Description |
|---------|--------------|-------------|
| `base` | `eip155:8453` | Base Mainnet |
| `base-sepolia` | `eip155:84532` | Base Sepolia |
| `ethereum` | `eip155:1` | Ethereum Mainnet |
| `sepolia` | `eip155:11155111` | Ethereum Sepolia |

The Daydreams facilitator (`https://facilitator.daydreams.systems`) supports both v1 and v2. Use `@lucid-agents/hono@0.7.20`+ for proper x402 v2 support on Base.

## API Quick Reference

### Core Agent Creation

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { z } from 'zod';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
  description: 'My first agent',
})
  .use(http())
  .build();

agent.entrypoints.add({
  key: 'greet',
  input: z.object({ name: z.string() }),
  async handler({ input }) {
    return { output: { message: `Hello, ${input.name}` } };
  },
});
```

### Hono Adapter

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
  handler: async ctx => {
    return { output: { text: ctx.input.text } };
  },
});

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
```

### Payments Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(
    payments({
      config: {
        ...paymentsFromEnv(),
        policyGroups: [
          {
            name: 'Daily Limits',
            outgoingLimits: {
              global: { maxTotalUsd: 100.0, windowMs: 86400000 },
            },
            incomingLimits: {
              global: { maxTotalUsd: 5000.0, windowMs: 86400000 },
            },
          },
        ],
      },
      storage: { type: 'sqlite' }, // or 'in-memory' or 'postgres'
    })
  )
  .build();
```

## ERC-8004 Identity Registration

> **CRITICAL**: Per ERC-8004 spec, `agentURI` MUST be a URL to hosted metadata, NOT inline JSON.

1. **Host registration file** at `/.well-known/erc8004.json`
2. **Generate agent icon** (512x512 PNG)
3. **Register on-chain** with the hosted URL

```typescript
// WRONG - DO NOT pass inline JSON
const agentURI = JSON.stringify({ name: "Agent", ... });

// CORRECT - Pass URL to hosted registration file
const agentURI = 'https://my-agent.example.com/.well-known/erc8004.json';
```

| Network | Registry Address |
|---------|---------|
| Ethereum Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Base | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |

Full reference: [ERC8004_REFERENCE.md](./references/ERC8004_REFERENCE.md)

## Critical Requirements

### Zod v4 Required (NOT v3!)

```json
{ "dependencies": { "zod": "^4.0.0" } }
```

Error with v3: `TypeError: z.toJSONSchema is not a function`
Fix: `bun add zod@4`

### @lucid-agents/hono v0.7.20+ for Base x402

```json
{ "dependencies": { "@lucid-agents/hono": "^0.7.20" } }
```

Error with older versions: `No facilitator registered for scheme: exact and network: base`
Fix: `bun add @lucid-agents/hono@latest`

### Required Environment Variables

```bash
PAYMENTS_RECEIVABLE_ADDRESS=0xYourWalletAddress  # required
FACILITATOR_URL=https://facilitator.daydreams.systems  # required
NETWORK=base  # required (or base-sepolia, ethereum, solana, etc.)
```

### Bun Server Export Format

```typescript
// Correct - Bun auto-serves this
export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
```

Do NOT call `Bun.serve()` explicitly -- causes `EADDRINUSE`.

### Minimal Working Example

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod';  // Must be zod v4!

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
  description: 'My agent',
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

addEntrypoint({
  key: 'hello',
  description: 'Say hello',
  input: z.object({ name: z.string() }),
  price: { amount: 0 },  // Free endpoint
  handler: async (ctx) => {
    return { output: { message: `Hello, ${ctx.input.name}!` } };
  },
});

const port = Number(process.env.PORT ?? 3000);
console.log(`Agent running on port ${port}`);

export default { port, fetch: app.fetch };
```

### Minimal package.json

```json
{
  "name": "my-agent",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "@lucid-agents/core": "latest",
    "@lucid-agents/http": "latest",
    "@lucid-agents/hono": "latest",
    "@lucid-agents/payments": "latest",
    "hono": "^4.0.0",
    "zod": "^4.0.0"
  }
}
```

### Entrypoint Path Convention

- **Invoke:** `POST /entrypoints/{key}/invoke`
- **Stream:** `POST /entrypoints/{key}/stream`
- **Health:** `GET /health`
- **Landing:** `GET /` (HTML page)

## Resources

- [AGENTS.md](https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md) - Full AI coding guide
- [CONTRIBUTING.md](https://github.com/daydreamsai/lucid-agents/blob/master/CONTRIBUTING.md) - Contribution guidelines
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [x402 Protocol](https://github.com/paywithx402)
- [A2A Protocol](https://a2a-protocol.org/)
- [SDK Reference](./references/SDK_REFERENCE.md) - Monorepo structure, commands, coding standards, additional adapters
