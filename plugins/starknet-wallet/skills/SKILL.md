---
name: starknet-wallet
description: Build a StarkNet wallet agent that checks balances, transfers tokens, stakes STRK, and executes batched transactions — all monetized via x402 micropayments on Base.
see-also:
  - https://starkware-2adbb899.mintlify.app/mintlify-docs/build/consumer-app-sdk/overview
  - https://github.com/daydreamsai/skills-market
---

# StarkNet Wallet Agent

**Production URL**: https://starknet-wallet-agent-production.up.railway.app

Agentic wallet operations on StarkNet using starknet.js. Reads balances, transfers tokens (STRK, USDC, ETH, WBTC, DAI, USDT), stakes to validator pools, claims rewards, and batches multi-call transactions — all behind x402 paywalled endpoints on Base.

## Pricing

| Endpoint | Method | Price | Description |
|---|---|---|---|
| `/health` | GET | Free | Health check |
| `/` | GET | Free | Agent metadata |
| `/entrypoints/check-balance/invoke` | POST | $0.001 | Read ERC20 token balance |
| `/entrypoints/transfer-tokens/invoke` | POST | $0.003 | Send tokens to a recipient |
| `/entrypoints/batch-transfer/invoke` | POST | $0.004 | Multi-recipient atomic transfer |
| `/entrypoints/stake-tokens/invoke` | POST | $0.003 | Enter a STRK staking pool |
| `/entrypoints/claim-rewards/invoke` | POST | $0.002 | Claim staking rewards |
| `/entrypoints/exit-stake/invoke` | POST | $0.003 | Initiate or complete unstaking |
| `/entrypoints/get-pool-position/invoke` | POST | $0.001 | Read staking position details |

## Stack

- **Runtime**: Bun
- **Framework**: Hono via `@lucid-agents/hono`
- **Agent SDK**: `@lucid-agents/core` + `@lucid-agents/payments`
- **StarkNet**: `starknet` v6 (starknet.js)
- **Validation**: Zod v4 (NOT v3)
- **Payments**: x402 on Base (eip155:8453)

## Environment Variables

```bash
PAYMENTS_RECEIVABLE_ADDRESS=0xYOUR_BASE_WALLET       # Base address to receive x402 payments
FACILITATOR_URL=https://facilitator.xgate.run         # x402 facilitator
STARKNET_PRIVATE_KEY=0xYOUR_STARKNET_KEY              # StarkNet signer key
STARKNET_NETWORK=mainnet                               # mainnet | sepolia
STARKNET_ACCOUNT_ADDRESS=0xYOUR_STARKNET_ACCOUNT      # Deployed StarkNet account
STARKNET_STAKING_CONTRACT=                             # Optional: override staking contract
```

## Token Registry

Mainnet tokens are hardcoded with verified contract addresses:

| Token | Decimals | Address |
|---|---|---|
| ETH | 18 | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |
| STRK | 18 | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| USDC | 6 | `0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8` |
| USDT | 6 | `0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8` |
| WBTC | 8 | `0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac` |
| DAI | 18 | `0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3` |

## Zod Schemas (v4)

```typescript
import { z } from "zod";

const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]+$/, "Must be a hex address");
const TokenSymbol = z.enum(["STRK", "ETH", "USDC", "USDT", "WBTC", "DAI"]).default("STRK");

const CheckBalanceInput = z.object({
  walletAddress: AddressSchema.describe("StarkNet wallet address to check"),
  tokenSymbol: TokenSymbol.describe("Token to check balance for"),
});

const TransferInput = z.object({
  recipient: AddressSchema.describe("Recipient StarkNet address"),
  amount: z.string().describe("Human-readable amount, e.g. '10.5'"),
  tokenSymbol: TokenSymbol.describe("Token to transfer"),
});

const BatchTransferInput = z.object({
  tokenSymbol: TokenSymbol,
  transfers: z.array(z.object({
    recipient: AddressSchema,
    amount: z.string(),
  })).min(1).max(20).describe("Array of {recipient, amount} pairs"),
});

const StakeInput = z.object({
  poolAddress: AddressSchema.describe("Validator pool contract address"),
  amount: z.string().describe("Amount of STRK to stake"),
});

const ClaimRewardsInput = z.object({
  poolAddress: AddressSchema.describe("Pool to claim rewards from"),
});

const ExitStakeInput = z.object({
  poolAddress: AddressSchema.describe("Pool to exit"),
  amount: z.string().optional().describe("Amount to unstake (required for intent step)"),
  step: z.enum(["intent", "complete"]).describe("'intent' to start, 'complete' after cooldown"),
});

const PoolPositionInput = z.object({
  poolAddress: AddressSchema.describe("Pool to query"),
});
```

## Implementation

Uses starknet.js v6 directly with `Account`, `RpcProvider`, and `Contract` for on-chain reads and writes. Agent framework via `@lucid-agents/core` with `@lucid-agents/hono` adapter.

```typescript
import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { payments } from "@lucid-agents/payments";
import { createAgentApp } from "@lucid-agents/hono";
import { z } from "zod";
import { Account, RpcProvider, Contract, cairo, type Call } from "starknet";

// RPC via Cartridge public endpoints
const provider = new RpcProvider({
  nodeUrl: "https://api.cartridge.gg/x/starknet/mainnet",
});

const account = new Account(
  provider,
  process.env.STARKNET_ACCOUNT_ADDRESS!,
  process.env.STARKNET_PRIVATE_KEY!,
);

// Agent setup
const agent = createAgent({
  name: "starknet-wallet",
  description: "StarkNet wallet operations on L2.",
  version: "1.0.0",
});

agent.use(http());

agent.use(payments({
  config: {
    network: "eip155:8453",
    payTo: process.env.PAYMENTS_RECEIVABLE_ADDRESS!,
    facilitatorUrl: process.env.FACILITATOR_URL ?? "https://facilitator.xgate.run",
  },
}));

// Example entrypoint — balance check
agent.addEntrypoint({
  key: "check-balance",
  description: "Check ERC20 token balance",
  input: CheckBalanceInput,
  price: "0.001",
  handler: async (ctx) => {
    const input = ctx.input as z.infer<typeof CheckBalanceInput>;
    const token = resolveToken(input.tokenSymbol);
    const contract = new Contract(ERC20_ABI, token.address, provider);
    const result = await contract.balanceOf(input.walletAddress);
    const raw = BigInt(result.balance.low) + (BigInt(result.balance.high) << 128n);
    return { output: { balance: formatAmount(raw, token.decimals), token: token.symbol } };
  },
});

// Example entrypoint — transfer
agent.addEntrypoint({
  key: "transfer-tokens",
  description: "Transfer tokens to a recipient",
  input: TransferInput,
  price: "0.003",
  handler: async (ctx) => {
    const input = ctx.input as z.infer<typeof TransferInput>;
    const token = resolveToken(input.tokenSymbol);
    const call: Call = {
      contractAddress: token.address,
      entrypoint: "transfer",
      calldata: [input.recipient, cairo.uint256(parseAmount(input.amount, token.decimals))],
    };
    const tx = await account.execute([call]);
    await provider.waitForTransaction(tx.transaction_hash);
    return { output: { status: "confirmed", hash: tx.transaction_hash } };
  },
});

// Staking uses atomic approve + enter_delegation_pool calls
agent.addEntrypoint({
  key: "stake-tokens",
  description: "Stake STRK into a validator pool",
  input: StakeInput,
  price: "0.003",
  handler: async (ctx) => {
    const input = ctx.input as z.infer<typeof StakeInput>;
    const strk = resolveToken("STRK");
    const amt = parseAmount(input.amount, strk.decimals);
    const tx = await account.execute([
      { contractAddress: strk.address, entrypoint: "approve", calldata: [STAKING_CONTRACT, cairo.uint256(amt)] },
      { contractAddress: input.poolAddress, entrypoint: "enter_delegation_pool", calldata: [cairo.uint256(amt), account.address] },
    ]);
    await provider.waitForTransaction(tx.transaction_hash);
    return { output: { status: "confirmed", hash: tx.transaction_hash } };
  },
});

// Build and serve
const runtime = await agent.build();
const { app } = await createAgentApp(runtime);
export default { port: Number(process.env.PORT ?? 3000), fetch: app.fetch };
```

Key patterns:
- **`key`** not `id` for entrypoint names
- **`price`** is a string (`"0.003"`) not `{ amount, currency }`
- **Handler returns** `{ output: ... }` wrapper
- **Handler receives** `ctx` with `ctx.input` (cast to typed schema)
- **`agent.use(http())`** required — provides HTTP handlers to the runtime
- **`agent.build()`** before `createAgentApp(runtime)`
- **Bun server**: `export default { port, fetch }` — do NOT call `Bun.serve()`

## Deployment

### Railway

1. Push to GitHub
2. Connect repo to [Railway](https://railway.com)
3. Set environment variables in Railway dashboard
4. Railway auto-detects Bun and deploys

### Docker

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

## xGate Integration

Once deployed, register as an x402 resource on xGate so other agents can discover and pay for your endpoints:

```
# Using xGate MCP tools:
1. fetch_resource_info  → url: "https://YOUR-APP.up.railway.app/entrypoints/check-balance/invoke", method: POST
2. install_resource     → registers it as a callable tool
3. execute_resource     → fetch, install, and call in one shot
4. toolset_create       → bundle all endpoints into a "starknet-wallet" toolset
5. toolset_add_resource → add each endpoint to the toolset
6. toolset_update_visibility → set to "public" for discovery
```

Other agents find you via `agents_search` with query "starknet wallet" or protocol filter `["x402"]`.

## Composability

This skill pairs with:

- **helixa-identity** — Register the agent's onchain identity (ERC-8004) before deploying
- **defi-agent** — Combine wallet ops with DeFi analytics (TVL, protocol data)
- **b2a-agents** — Use as a backend wallet service for other agents needing StarkNet access
- **lucid-agents-sdk** — Core framework patterns, extensions, and adapter reference
