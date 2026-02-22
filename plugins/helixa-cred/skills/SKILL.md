---
name: helixa-cred
description: |
  Query and interact with Helixa Cred — the reputation scoring system for AI
  agents on Base. Look up any agent's Cred score, search the agent registry,
  mint new agent identities via x402 micropayments, and link to Cred reports.

  Activate when: Checking an agent's reputation or Cred score, searching for
  agents by name, minting a new onchain agent identity, or building trust-aware
  agent workflows that need reputation data.
---

# Helixa Cred

REST API for Helixa's agent reputation layer on Base (chain ID 8453). Cred scores range 0–100 and measure onchain identity quality.

## Base URL

```
https://api.helixa.xyz/api/v2
```

## Cred Tiers

| Tier | Range | Meaning |
|------|-------|---------|
| Junk | 0–25 | Unverified or abandoned |
| Speculative | 26–50 | Early stage, limited history |
| Investment Grade | 51–75 | Established, consistent activity |
| Prime | 76–90 | High quality, trusted |
| AAA | 91–100 | Elite reputation |

## Contracts

| Key | Value |
|-----|-------|
| Identity (ERC-8004) | `0x2e3B541C59D38b84E3Bc54e977200230A204Fe60` |
| $CRED token | `0xAB3f23c2ABcB4E12Cc8B593C218A7ba64Ed17Ba3` |
| Network | Base mainnet (`eip155:8453`) |

## Schemas

```typescript
import { z } from 'zod/v4';

const CredTier = z.enum(['Junk', 'Speculative', 'Investment Grade', 'Prime', 'AAA']);

const AgentProfile = z.object({
  id: z.number(),
  name: z.string(),
  framework: z.string(),
  credScore: z.number().min(0).max(100),
  credTier: CredTier,
  owner: z.string(),
  tokenId: z.number(),
  createdAt: z.string(),
});

const AgentListResponse = z.object({
  agents: z.array(AgentProfile),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const MintRequest = z.object({
  name: z.string().min(1).max(64),
  framework: z.string().default('lucid-agents'),
});

const MintResponse = z.object({
  tokenId: z.number(),
  txHash: z.string(),
  credScore: z.number(),
});
```

## Integration with Lucid Agents

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod/v4';

const HELIXA_API = 'https://api.helixa.xyz/api/v2';

function credTier(score: number): string {
  if (score >= 91) return 'AAA';
  if (score >= 76) return 'Prime';
  if (score >= 51) return 'Investment Grade';
  if (score >= 26) return 'Speculative';
  return 'Junk';
}
```

## Entrypoints

### Get Agent Cred Score

```typescript
agent.addEntrypoint({
  id: 'helixa-cred-check',
  description: 'Look up any agent\'s Cred score and profile by ID',
  input: z.object({ id: z.number().int().positive() }),
  handler: async ({ input }) => {
    const res = await fetch(`${HELIXA_API}/agent/${input.id}`);
    if (!res.ok) throw new Error(`Agent ${input.id} not found`);
    const data = await res.json();
    return {
      ...data,
      tier: credTier(data.credScore),
      reportUrl: `https://helixa.xyz/cred-report.html?id=${data.tokenId}`,
    };
  },
});
```

### Search Agents

```typescript
agent.addEntrypoint({
  id: 'helixa-agent-search',
  description: 'Search or list agents in the Helixa registry',
  input: z.object({
    search: z.string().optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  handler: async ({ input }) => {
    const params = new URLSearchParams();
    params.set('page', String(input.page));
    params.set('limit', String(input.limit));
    if (input.search) params.set('search', input.search);
    const res = await fetch(`${HELIXA_API}/agents?${params}`);
    if (!res.ok) throw new Error('Failed to query agents');
    return res.json();
  },
});
```

### Mint Agent Identity (x402)

Minting costs $1 USDC on Base via the x402 payment protocol. The agent must have a funded wallet and SIWA (Sign-In With Agent) auth.

```typescript
agent.addEntrypoint({
  id: 'helixa-mint',
  description: 'Mint a new onchain agent identity on Helixa via x402 payment',
  input: z.object({
    name: z.string().min(1).max(64),
    framework: z.string().default('lucid-agents'),
  }),
  price: { amount: '1.00', currency: 'USDC', network: 'eip155:8453' },
  handler: async ({ input, wallet }) => {
    const res = await fetch(`${HELIXA_API}/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-402-Payment': wallet.x402Header,
      },
      body: JSON.stringify({ name: input.name, framework: input.framework }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mint failed: ${err}`);
    }
    const { tokenId, txHash, credScore } = await res.json();
    return {
      tokenId,
      txHash,
      credScore,
      tier: credTier(credScore),
      reportUrl: `https://helixa.xyz/cred-report.html?id=${tokenId}`,
    };
  },
});
```

### View Cred Report

```typescript
agent.addEntrypoint({
  id: 'helixa-cred-report',
  description: 'Get the Cred report URL for any agent by token ID',
  input: z.object({ tokenId: z.number().int().positive() }),
  handler: async ({ input }) => ({
    url: `https://helixa.xyz/cred-report.html?id=${input.tokenId}`,
  }),
});
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AGENT_PRIVATE_KEY` | Wallet key for x402 payments (Base) |

## Composability

- **helixa-identity** — Complements this skill; use identity for onchain trait/personality writes, cred for API-based reputation reads
- **x402 payments** — Mint endpoint requires USDC micropayment via x402
- **A2A** — Agents verify each other's Cred scores before transacting
