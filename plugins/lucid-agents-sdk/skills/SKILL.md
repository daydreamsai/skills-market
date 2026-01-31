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

# Lucid Agents SDK Skill

Use this skill when working with the Lucid Agents SDK - a TypeScript framework for building and monetizing AI agents.

## When to Use This Skill

This skill should be activated when:
- Building or modifying Lucid Agents projects
- Working with agent entrypoints, payments, identity, or A2A communication
- Developing in the lucid-agents monorepo
- Creating new templates or CLI features
- Questions about the Lucid Agents architecture or API

## Project Overview

Lucid Agents is a TypeScript/Bun monorepo for building, monetizing, and verifying AI agents. It provides:

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

**Tech Stack:**
- Runtime: Bun (Node.js 20+ compatible)
- Language: TypeScript (ESM, strict mode)
- Build: tsup
- Package Manager: Bun workspaces
- Versioning: Changesets

## Architecture Overview

### Extension System

The framework uses an extension-based architecture where features are added via composable extensions:

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
```text

**Available Extensions:**
- **http** - HTTP request/response handling, streaming, SSE
- **wallets** - Wallet management for agents
- **payments** - x402 payment verification and tracking
- **analytics** - Payment analytics and reporting
- **identity** - ERC-8004 on-chain identity and trust
- **a2a** - Agent-to-agent communication protocol
- **ap2** - Agent Payments Protocol extension

### Adapter System

The framework supports multiple runtime adapters:

- **Hono** (`@lucid-agents/hono`) - Lightweight HTTP server, edge-compatible
- **Express** (`@lucid-agents/express`) - Traditional Node.js/Express server
- **TanStack Start** (`@lucid-agents/tanstack`) - Full-stack React with dashboard (UI) or API-only (headless)

Templates are adapter-agnostic and work with any compatible adapter.

### Payment Networks

**EVM Networks:**
- `base` - Base mainnet (L2, low cost)
- `base-sepolia` - Base Sepolia testnet
- `ethereum` - Ethereum mainnet
- `sepolia` - Ethereum Sepolia testnet

**Solana Networks:**
- `solana` - Solana mainnet (high throughput, low fees)
- `solana-devnet` - Solana devnet

**Key Differences:**
- **EVM**: EIP-712 signatures, ERC-20 tokens (USDC), 0x-prefixed addresses
- **Solana**: Ed25519 signatures, SPL tokens (USDC), Base58 addresses
- **Transaction finality**: Solana (~400ms) vs EVM (12s-12min)
- **Gas costs**: Solana (~$0.0001) vs EVM ($0.01-$10)

## Code Structure Principles

### 1. Single Source of Truth
One type definition per concept. Avoid duplicate types. Use type composition or generics, not separate type definitions.

### 2. Encapsulation at the Right Level
Domain complexity belongs in the owning package. The payments package should handle all payments-related complexity.

### 3. Direct Exposure
Expose runtimes directly without unnecessary wrappers. If the type matches what's needed, pass it through.

### 4. Consistency
Similar concepts should follow the same pattern. Consistency reduces cognitive load.

### 5. Public API Clarity
If something needs to be used by consumers, include it in the public type. Don't hide methods or use type casts.

### 6. Simplicity Over Indirection
Avoid unnecessary getters, wrappers, and intermediate objects. Prefer straightforward code.

### 7. Domain Ownership
Each package should own its complexity and return what consumers need.

### 8. No Premature Abstraction
Keep it simple until you actually need the complexity. YAGNI (You Aren't Gonna Need It) applies.

## Monorepo Structure

```text
/
├── packages/
│   ├── core/               # Protocol-agnostic runtime
│   ├── http/               # HTTP extension
│   ├── wallet/             # Wallet SDK
│   ├── payments/           # x402 payment utilities
│   ├── analytics/          # Payment analytics
│   ├── identity/           # ERC-8004 identity
│   ├── a2a/                # A2A Protocol client
│   ├── ap2/                # AP2 extension
│   ├── hono/               # Hono adapter
│   ├── express/            # Express adapter
│   ├── tanstack/           # TanStack adapter
│   └── cli/                # CLI scaffolding tool
├── scripts/
└── package.json            # Workspace config
```text

## Common Commands

### Workspace-Level
```bash
# Install dependencies
bun install

# Build all packages
bun run build:packages

# Create changeset
bun run changeset

# Version packages
bun run release:version

# Publish packages
bun run release:publish
```text

### Package-Level
```bash
cd packages/[package-name]

# Build this package
bun run build

# Run tests
bun test

# Type check
bunx tsc --noEmit
```text

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
```text

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
```text

### Express Adapter

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/express';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// Express apps need to listen on a port
const server = app.listen(process.env.PORT ?? 3000);
```text

### TanStack Adapter

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createTanStackRuntime } from '@lucid-agents/tanstack';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .build();

const { runtime: tanStackRuntime, handlers } = await createTanStackRuntime(agent);

// Use runtime.addEntrypoint() instead of addEntrypoint()
tanStackRuntime.addEntrypoint({ ... });

// Export for TanStack routes
export { runtime: tanStackRuntime, handlers };
```text

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
```text

### Analytics Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { analytics, getSummary, exportToCSV } from '@lucid-agents/analytics';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(payments({ config: paymentsFromEnv() }))
  .use(analytics())
  .build();

// Get payment summary
const summary = await getSummary(agent.analytics.paymentTracker, 86400000);

// Export to CSV for accounting
const csv = await exportToCSV(agent.analytics.paymentTracker);
```text

### Identity Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { wallets, walletsFromEnv } from '@lucid-agents/wallet';
import { identity, identityFromEnv } from '@lucid-agents/identity';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(wallets({ config: walletsFromEnv() }))
  .use(identity({ config: identityFromEnv() }))
  .build();

// Identity automatically handles ERC-8004 registration
```text

## ERC-8004 Identity Registration (CRITICAL)

Per the **ERC-8004 specification**, all agents MUST be registered with a proper `agentURI` that points to hosted metadata.

### ⚠️ MANDATORY REQUIREMENTS

1. **agentURI MUST be a URL** - NOT inline JSON data
2. **URL MUST point to hosted metadata** - Typically `/.well-known/agent.json`
3. **Metadata MUST be accessible** - The URL must return valid JSON

### ❌ WRONG (Inline JSON)
```typescript
// DO NOT DO THIS - violates ERC-8004 spec
const agentURI = JSON.stringify({
  name: "My Agent",
  description: "...",
  url: "https://my-agent.example.com"
});

await walletClient.writeContract({
  address: REGISTRY,
  abi,
  functionName: 'register',
  args: [agentURI]  // ❌ WRONG - inline JSON, not a URL
});
```text

### ✅ CORRECT (Hosted ERC-8004 Registration File)
```typescript
// CORRECT - URL pointing to ERC-8004 registration file
const agentURI = 'https://my-agent.example.com/.well-known/erc8004.json';

await walletClient.writeContract({
  address: REGISTRY,
  abi,
  functionName: 'register',
  args: [agentURI]  // ✅ CORRECT - URL to ERC-8004 registration file
});
```text

### ERC-8004 Registration File Format

The `agentURI` MUST resolve to a registration file with this structure:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "my-agent",
  "description": "A natural language description of what the agent does, pricing, and interaction methods",
  "image": "https://my-agent.example.com/icon.png",
  "services": [
    {
      "name": "web",
      "endpoint": "https://my-agent.example.com/"
    },
    {
      "name": "A2A",
      "endpoint": "https://my-agent.example.com/.well-known/agent.json",
      "version": "0.3.0"
    },
    {
      "name": "MCP",
      "endpoint": "https://my-agent.example.com/mcp",
      "version": "2025-06-18"
    }
  ],
  "x402Support": true,
  "active": true,
  "registrations": [
    {
      "agentId": 12345,
      "agentRegistry": "eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
    }
  ],
  "supportedTrust": ["reputation"]
}
```text

**Required Fields:**
- `type` - MUST be `"https://eips.ethereum.org/EIPS/eip-8004#registration-v1"`
- `name` - Agent name (ERC-721 compatible)
- `description` - Natural language description
- `image` - Agent icon URL (ERC-721 compatible, 512x512 PNG recommended)
- `services` - Array of endpoints (A2A, MCP, web, etc.)
- `x402Support` - Boolean indicating x402 payment support
- `active` - Boolean indicating agent is active
- `registrations` - Array of on-chain registrations

**Image Requirements:**
- URL must be publicly accessible (e.g., `https://agent.example.com/icon.png`)
- Recommended size: 512x512px (minimum 256x256)
- Format: PNG with transparency preferred
- Style: Simple, recognizable icon representing the agent's purpose
- No text in the icon (won't be legible at small sizes)

**URI Schemes Allowed:**
- `https://` - Standard HTTPS URL
- `ipfs://` - IPFS CID (e.g., `ipfs://bafybeig...`)
- `data:` - Base64-encoded on-chain (e.g., `data:application/json;base64,...`)

### Hosting the Registration File

Option 1: Add endpoint to your agent at `/.well-known/erc8004.json`:

```typescript
app.get('/.well-known/erc8004.json', (c) => {
  return c.json({
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: agent.name,
    description: agent.description,
    image: `${baseUrl}/icon.png`,
    services: [
      { name: "web", endpoint: baseUrl },
      { name: "A2A", endpoint: `${baseUrl}/.well-known/agent.json`, version: "0.3.0" }
    ],
    x402Support: true,
    active: true,
    registrations: [
      { agentId: tokenId, agentRegistry: "eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }
    ],
    supportedTrust: ["reputation"]
  });
});
```text

Option 2: Host on IPFS for immutable metadata

Option 3: Use base64 data: URI for fully on-chain metadata

### Generating Agent Icons

Use Gemini (nano-banana-pro) or other image gen to create agent icons:

```typescript
// Generate icon via Gemini API
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Create a simple, modern app icon for an AI agent that ${agentDescription}. Style: flat design, minimal, single focal element, vibrant colors, 512x512px. No text.`
        }]
      }],
      generationConfig: { responseModalities: ['image', 'text'] }
    })
  }
);

const data = await response.json();
const imageBase64 = data.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
const iconBuffer = Buffer.from(imageBase64, 'base64');
await Bun.write('./public/icon.png', iconBuffer);
```text

Serve the icon:

```typescript
app.get('/icon.png', async (c) => {
  const file = Bun.file('./public/icon.png');
  return new Response(file, {
    headers: { 'Content-Type': 'image/png' }
  });
});
```text

### Note: A2A Agent Card vs ERC-8004 Registration File

These are **different formats** for different purposes:
- `/.well-known/agent.json` - A2A protocol agent card (skills, capabilities)
- ERC-8004 registration file - Identity/discovery (services, registrations, trust)

### Registration Flow

1. **Deploy agent** to Railway/hosting (e.g., `https://my-agent-production.up.railway.app`)
2. **Verify metadata endpoint** works: `curl https://my-agent-production.up.railway.app/.well-known/agent.json`
3. **Register on-chain** with the metadata URL as `agentURI`

```typescript
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const RPC_URL = 'https://ethereum-rpc.publicnode.com';

const abi = parseAbi([
  'function register(string _uri) external returns (uint256)'
]);

async function registerAgent(privateKey, agentBaseUrl) {
  const account = privateKeyToAccount(privateKey);
  
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(RPC_URL)
  });

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(RPC_URL)
  });

  // MUST use the hosted ERC-8004 registration file URL, not inline JSON
  const agentURI = `${agentBaseUrl}/.well-known/erc8004.json`;
  
  console.log('Registering with agentURI:', agentURI);
  
  const hash = await walletClient.writeContract({
    address: REGISTRY,
    abi,
    functionName: 'register',
    args: [agentURI]
  });

  console.log('TX:', hash);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status);
  console.log('Etherscan: https://etherscan.io/tx/' + hash);
  
  return hash;
}

// Usage:
// registerAgent('0xYourPrivateKey', 'https://my-agent-production.up.railway.app');
```text

### ERC-8004 Registries

| Network | Registry Address |
|---------|-----------------|
| Ethereum Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Base | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |

### Updating agentURI After Registration

If you registered with wrong data (e.g., inline JSON), you can fix it:

```typescript
const abi = parseAbi([
  'function setAgentURI(uint256 agentId, string newURI) external'
]);

// Get your agentId from the registration TX logs or Etherscan
const agentId = 12345n;
const newURI = 'https://my-agent.example.com/.well-known/erc8004.json';

const hash = await walletClient.writeContract({
  address: REGISTRY,
  abi,
  functionName: 'setAgentURI',
  args: [agentId, newURI]
});
```text

### Agent Wallet

The `agentWallet` key is reserved for payment address:
- Initially set to owner's address on registration
- To change: call `setAgentWallet()` with EIP-712 signature proving control
- Automatically cleared on NFT transfer (new owner must re-verify)

```typescript
// Read agent wallet
const abi = parseAbi([
  'function getAgentWallet(uint256 agentId) external view returns (address)'
]);

const wallet = await publicClient.readContract({
  address: REGISTRY,
  abi,
  functionName: 'getAgentWallet',
  args: [agentId]
});
```text

### Registration with Metadata

```typescript
const abi = parseAbi([
  'function register(string agentURI, (string metadataKey, bytes metadataValue)[] metadata) external returns (uint256 agentId)'
]);

const hash = await walletClient.writeContract({
  address: REGISTRY,
  abi,
  functionName: 'register',
  args: [
    'https://my-agent.example.com/.well-known/erc8004.json',
    [
      { metadataKey: 'version', metadataValue: '0x' + Buffer.from('1.0.0').toString('hex') }
    ]
  ]
});
```text

### Reputation Registry (Feedback)

ERC-8004 includes a Reputation Registry for agent feedback:

```typescript
const reputationAbi = parseAbi([
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external'
]);

// Give feedback to an agent (value is fixed-point, e.g., 4.5 = 45 with decimals=1)
await walletClient.writeContract({
  address: REPUTATION_REGISTRY,
  abi: reputationAbi,
  functionName: 'giveFeedback',
  args: [
    agentId,
    45n,           // value (4.5 as fixed-point)
    1,             // valueDecimals
    'quality',     // tag1 (optional)
    'fast',        // tag2 (optional)
    '/entrypoints/lookup/invoke',  // endpoint (optional)
    '',            // feedbackURI (optional, use IPFS)
    '0x0000000000000000000000000000000000000000000000000000000000000000'  // feedbackHash
  ]
});
```text

**Feedback restrictions:**
- Agent owner cannot give feedback to their own agent
- valueDecimals must be 0-18

### Why This Matters

Per ERC-8004 spec:
- `agentURI` resolves to the agent's **registration file**
- Other agents use this to discover capabilities, verify identity, and establish trust
- Inline JSON breaks discoverability - the URI should be fetchable by any client
- Reputation feedback enables trust scoring across the agent ecosystem

### A2A Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { a2a } from '@lucid-agents/a2a';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .use(a2a())
  .build();

// Call another agent
const result = await agent.a2a.client.invoke(
  'https://other-agent.com',
  'skillId',
  { input: 'data' }
);
```text

### Streaming Entrypoints

```typescript
addEntrypoint({
  key: 'chat',
  description: 'Chat with AI assistant',
  input: z.object({ message: z.string() }),
  streaming: true,
  async stream(ctx, emit) {
    const stream = await ai.chat.stream({ messages: [{ role: 'user', content: ctx.input.message }] });

    for await (const chunk of stream) {
      await emit({
        kind: 'delta',
        delta: chunk.delta,
        mime: 'text/plain',
      });
    }

    return {
      output: { completed: true },
      usage: { total_tokens: stream.usage.total_tokens },
    };
  },
});
```text

## CLI Usage

### Interactive Mode
```bash
bunx @lucid-agents/cli my-agent
```text

### With Adapter Selection
```bash
# Hono adapter
bunx @lucid-agents/cli my-agent --adapter=hono

# Express adapter
bunx @lucid-agents/cli my-agent --adapter=express

# TanStack UI (full dashboard)
bunx @lucid-agents/cli my-agent --adapter=tanstack-ui

# TanStack Headless (API only)
bunx @lucid-agents/cli my-agent --adapter=tanstack-headless
```text

### Non-Interactive Mode
```bash
bunx @lucid-agents/cli my-agent \
  --adapter=hono \
  --template=axllm \
  --non-interactive \
  --AGENT_NAME="My AI Agent" \
  --AGENT_DESCRIPTION="AI-powered assistant" \
  --OPENAI_API_KEY=your_api_key_here \
  --PAYMENTS_RECEIVABLE_ADDRESS=0xYourAddress \
  --NETWORK=base-sepolia \
  --DEFAULT_PRICE=1000
```text

## Coding Standards

### General
- **No emojis** - Do not use emojis in code, comments, or commit messages unless explicitly requested
- **Re-exports are banned** - Do not re-export types or values from other packages. Define types in `@lucid-agents/types` or in the package where they are used.

### TypeScript
- **ESM only** - Use `import`/`export`, not `require()`
- **Strict mode** - All packages use `strict: true`
- **Explicit types** - Avoid `any`, prefer explicit types or `unknown`
- **Type exports** - Export types separately: `export type { MyType }`

### File Naming
- Source: `kebab-case.ts`
- Types: `types.ts` or inline
- Tests: `*.test.ts` in `__tests__/`
- Examples: Descriptive names in `examples/`

## Testing Local Packages

Use bun's linking feature for testing local changes:

1. **Register packages globally**:
   ```bash
   cd packages/types
   bun link

   cd ../wallet
   bun link
   ```

2. **Update test project's `package.json`**:
   ```json
   {
     "dependencies": {
       "@lucid-agents/wallet": "link:@lucid-agents/wallet"
     }
   }
   ```

3. **Install and test**:
   ```bash
   cd my-test-agent
   bun install
   ```

4. **Make changes and rebuild**:
   ```bash
   cd lucid-agents/packages/wallet
   # Make changes
   bun run build
   # Changes reflected immediately
   ```

## Common Development Tasks

### Adding a New Feature to a Package

1. Create implementation in `packages/[package]/src/feature.ts`
2. Add types to `types.ts` or inline
3. Export from `index.ts`
4. Add tests in `__tests__/feature.test.ts`
5. Update package `README.md` and `AGENTS.md`
6. Create changeset: `bun run changeset`

### Creating a New Template

1. Create directory: `packages/cli/templates/my-template/`
2. Add required files: `src/agent.ts`, `src/index.ts`, `package.json`, `tsconfig.json`
3. Create `template.json` with wizard configuration
4. Create `template.schema.json` documenting all arguments
5. Create `AGENTS.md` with comprehensive examples
6. Test: `bunx ./packages/cli/dist/index.js test-agent --template=my-template`

## Critical Requirements

### Zod v4 Required (NOT v3!)

The Lucid Agents SDK requires **Zod v4** for the `toJSONSchema` function used in entrypoint schema generation.

```json
{
  "dependencies": {
    "zod": "^4.0.0"
  }
}
```text

**Common Error with Zod v3:**
```text
TypeError: z.toJSONSchema is not a function
```text

**Fix:** Update to Zod v4: `bun add zod@4`

### Required Environment Variables

When using the payments extension, these environment variables are **mandatory**:

```bash
# Your wallet address to receive payments (required)
PAYMENTS_RECEIVABLE_ADDRESS=0xYourWalletAddress

# x402 facilitator URL (required)
FACILITATOR_URL=https://x402.org/facilitator

# Network for payments (required)
NETWORK=base  # or base-sepolia, ethereum, solana, etc.
```text

**Common Error without env vars:**
```text
error: Payment configuration error: PAYMENTS_RECEIVABLE_ADDRESS environment variable is not set.
error: Payment configuration error: FACILITATOR_URL is not set.
```text

### Bun Server Export Format

For Bun runtime, use this export format:

```typescript
// Correct - Bun auto-serves this
export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
```text

**Do NOT** call `Bun.serve()` explicitly - Bun's runtime auto-detects the export and serves it. Calling both causes:
```text
error: Failed to start server. Is port in use?
code: "EADDRINUSE"
```text

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
```text

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
```text

### Entrypoint Path Convention

Lucid SDK creates endpoints at:
- **Invoke:** `POST /entrypoints/{key}/invoke`
- **Stream:** `POST /entrypoints/{key}/stream`
- **Health:** `GET /health`
- **Landing:** `GET /` (HTML page)

## Troubleshooting

### "Module not found" errors
1. Build all packages: `bun run build:packages`
2. Install dependencies: `bun install`
3. Check import paths are correct

### TypeScript errors in templates
1. Build packages first
2. Check template `package.json` references correct versions
3. Run `bunx tsc --noEmit` in template directory

### Build fails
1. Check TypeScript version matches across packages
2. Verify all imports are resolvable
3. Check for circular dependencies
4. Run `bun install` again

### `z.toJSONSchema is not a function`
Update Zod to v4: `bun add zod@4`

### `PAYMENTS_RECEIVABLE_ADDRESS is not set`
Set the required environment variables (see Critical Requirements above)

### `EADDRINUSE` port conflict
Don't call `Bun.serve()` explicitly - just use `export default { port, fetch }`

## Key Files

- **packages/core/src/core/** - AgentCore, entrypoint management
- **packages/core/src/extensions/** - AgentBuilder, extension system
- **packages/http/src/extension.ts** - HTTP extension definition
- **packages/payments/src/extension.ts** - Payments extension
- **packages/identity/src/extension.ts** - Identity extension
- **packages/hono/src/app.ts** - Hono adapter implementation
- **packages/express/src/app.ts** - Express adapter implementation
- **packages/tanstack/src/runtime.ts** - TanStack adapter implementation
- **packages/cli/src/index.ts** - CLI implementation

## Resources

- [AGENTS.md](../https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md) - Full AI coding guide
- [CONTRIBUTING.md](../https://github.com/daydreamsai/lucid-agents/blob/master/CONTRIBUTING.md) - Contribution guidelines
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [x402 Protocol](https://github.com/paywithx402)
- [A2A Protocol](https://a2a-protocol.org/)
