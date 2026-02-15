---
name: helixa-identity
description: |
  Register and manage onchain agent identity on Helixa — the ERC-8004 identity
  and reputation layer on Base. Mint agent souls, set traits and personality,
  and query cred scores for trust-aware agent interactions.

  Activate when: Creating onchain agent identity, setting soul traits or personality,
  querying agent reputation/cred scores, or integrating Helixa identity with
  Lucid Agents payments and A2A workflows.
---

# Helixa Identity

Onchain agent identity and reputation on Base (chain ID 8453). Agents mint ERC-8004 souls, define traits and personality, and accumulate cred scores.

## Contract

| Key | Value |
|-----|-------|
| Address | `0x665971e7bf8ec90c3066162c5b396604b3cd7711` |
| Network | Base mainnet (`eip155:8453`) |
| RPC | `https://mainnet.base.org` |

## ABI (relevant functions)

```typescript
const HELIXA_ABI = [
  'function mintAgent(string name, string framework) external returns (uint256)',
  'function setTraits(uint256 tokenId, string[] keys, string[] values) external',
  'function setPersonality(uint256 tokenId, string personalityType, uint8 creativity, uint8 autonomy, uint8 risk) external',
  'function totalAgents() external view returns (uint256)',
] as const;
```

## Integration with Lucid Agents

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { identity, identityFromEnv } from '@lucid-agents/identity';
import { wallets, walletsFromEnv } from '@lucid-agents/wallet';
import { z } from 'zod/v4';
import { createPublicClient, createWalletClient, http as viemHttp } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const HELIXA_CONTRACT = '0x665971e7bf8ec90c3066162c5b396604b3cd7711';

const publicClient = createPublicClient({
  chain: base,
  transport: viemHttp('https://mainnet.base.org'),
});

const walletClient = createWalletClient({
  chain: base,
  account: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`),
  transport: viemHttp('https://mainnet.base.org'),
});
```

## Schemas

```typescript
const MintAgentInput = z.object({
  name: z.string().min(1).max(64),
  framework: z.string().default('lucid-agents'),
});

const SetTraitsInput = z.object({
  tokenId: z.number().int().positive(),
  keys: z.array(z.string()).min(1),
  values: z.array(z.string()).min(1),
}).refine(d => d.keys.length === d.values.length, 'keys and values must match');

const SetPersonalityInput = z.object({
  tokenId: z.number().int().positive(),
  personalityType: z.string(),
  creativity: z.number().int().min(0).max(100),
  autonomy: z.number().int().min(0).max(100),
  risk: z.number().int().min(0).max(100),
});
```

## Entrypoints

### Mint Agent Identity

```typescript
agent.addEntrypoint({
  id: 'helixa-mint',
  description: 'Mint an ERC-8004 agent soul on Helixa',
  input: MintAgentInput,
  price: { amount: '0.50', currency: 'USDC', network: 'eip155:8453' },
  handler: async ({ input }) => {
    const hash = await walletClient.writeContract({
      address: HELIXA_CONTRACT,
      abi: HELIXA_ABI,
      functionName: 'mintAgent',
      args: [input.name, input.framework],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash, blockNumber: receipt.blockNumber };
  },
});
```

### Set Soul Traits

```typescript
agent.addEntrypoint({
  id: 'helixa-traits',
  description: 'Set soul traits on a minted Helixa agent',
  input: SetTraitsInput,
  price: { amount: '0.25', currency: 'USDC', network: 'eip155:8453' },
  handler: async ({ input }) => {
    const hash = await walletClient.writeContract({
      address: HELIXA_CONTRACT,
      abi: HELIXA_ABI,
      functionName: 'setTraits',
      args: [BigInt(input.tokenId), input.keys, input.values],
    });
    return { txHash: hash };
  },
});
```

### Set Personality

```typescript
agent.addEntrypoint({
  id: 'helixa-personality',
  description: 'Configure personality parameters for a Helixa agent',
  input: SetPersonalityInput,
  price: { amount: '0.25', currency: 'USDC', network: 'eip155:8453' },
  handler: async ({ input }) => {
    const hash = await walletClient.writeContract({
      address: HELIXA_CONTRACT,
      abi: HELIXA_ABI,
      functionName: 'setPersonality',
      args: [BigInt(input.tokenId), input.personalityType, input.creativity, input.autonomy, input.risk],
    });
    return { txHash: hash };
  },
});
```

### Query Cred Score

Cred scores are Helixa's reputation layer — accumulated through onchain activity, trait consistency, and agent interactions.

```typescript
agent.addEntrypoint({
  id: 'helixa-cred',
  description: 'Query total registered agents (network health)',
  input: z.object({}),
  handler: async () => {
    const total = await publicClient.readContract({
      address: HELIXA_CONTRACT,
      abi: HELIXA_ABI,
      functionName: 'totalAgents',
    });
    return { totalAgents: Number(total) };
  },
});
```

## Gasless Minting (API)

For agents without Base ETH, Helixa offers a gasless mint endpoint:

```typescript
const res = await fetch('https://helixa.xyz/api/mint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'my-agent', framework: 'lucid-agents' }),
});
const { tokenId, txHash } = await res.json();
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AGENT_PRIVATE_KEY` | Wallet key for onchain txs (Base) |
| `HELIXA_API_KEY` | Optional, for gasless mint API |

## Composability

Helixa identity works with other Lucid Agent extensions:

- **x402 payments** — Gate identity services behind USDC micropayments
- **A2A** — Agents can verify each other's Helixa cred scores before transacting
- **@lucid-agents/identity** — Helixa souls extend the ERC-8004 identity layer with reputation data
