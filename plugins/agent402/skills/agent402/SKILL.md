---
name: agent402
description: |
  Calls 402Agent's x402-paid web intelligence services — READ, SEARCH, and VERIFY — from a Lucid
  Agent or TypeScript project. Fetches the live payment contract, configures an @x402/fetch client,
  posts to the paid endpoint, and validates the settlement receipt. Use when adding live web reading,
  ranked web search, or URL verification to a Lucid Agent entrypoint; when a Lucid Agent needs
  structured external web content without building its own scraper; or when integrating x402-paid
  data into an agent pipeline. Not for building a new paid agent from scratch (use paid-agent) or
  researching free APIs (use api-research).
---

# 402Agent Client

402Agent sells structured web intelligence per-request via x402 on Base mainnet. No API key,
account, or subscription — only a Base USDC wallet. Follow this procedure on every integration:
discover → validate → install → call → verify.

## Step 1: Fetch the Live Payment Contract

Always fetch before hardcoding. Values change during protocol upgrades.

```bash
curl -s https://402agent.ai/agent402/api/v1/services | jq '{
  network: .payment.network,
  asset: .payment.asset,
  facilitator: .payment.facilitator,
  header: .payment.payment_header,
  services: [.services[] | {service, price_usd, url}]
}'
```

**Completion:** Response confirms `payment.network === "eip155:8453"`,
`payment.asset === "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"`, and three services
(read, search, verify) with `https://` URLs.

Stop if any field is missing, uses `http://`, or does not match the expected contract values in
`references/payment-contract.md`.

## Step 2: Install Dependencies

```bash
npm install @x402/fetch @x402/core @x402/evm viem
# bun add / pnpm add also work
```

## Step 3: Configure the Payment Client

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import * as evmClient from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.PAYER_PRIVATE_KEY as `0x${string}`);
const client = new x402Client();
evmClient.registerExactEvmScheme(client, { signer });
export const fetchWithPay = wrapFetchWithPayment(fetch, client);
```

`PAYER_PRIVATE_KEY` must control a Base mainnet wallet funded with USDC
(`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`). The library handles the 402 challenge,
EIP-3009 signing, nonce, and retry automatically. Do not implement the 402 retry manually.

## Step 4: Call a Service

**READ** — structured extraction from a URL ($0.047 / 47 000 atomic USDC):

```typescript
const res = await fetchWithPay("https://402agent.ai/agent402/api/v1/read", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
});
if (res.status !== 200) throw new Error(`READ failed: ${res.status}`);
const data = await res.json();
// data.result.summary, .title, .key_points[], .extracted_facts[], .source_url
// data.settlement.transactionHash — on-chain USDC transfer on Base mainnet
// data.replayed — true means cached result, no charge
```

**SEARCH** — ranked web results for a query ($0.157 / 157 000 atomic USDC):

```typescript
const res = await fetchWithPay("https://402agent.ai/agent402/api/v1/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "your query here" }),
});
if (res.status !== 200) throw new Error(`SEARCH failed: ${res.status}`);
const data = await res.json();
// data.result.results[] — {title, url, snippet, source_tier}
// data.result.sources[], data.result.generated_at
```

**VERIFY** — reachability and content signals for a URL ($0.282 / 282 000 atomic USDC):

```typescript
const res = await fetchWithPay("https://402agent.ai/agent402/api/v1/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
});
if (res.status !== 200) throw new Error(`VERIFY failed: ${res.status}`);
const data = await res.json();
// data.result.reachable, .status_code, .content_signals[]
```

## Step 5: Validate the Settlement

```typescript
// replayed: true → cached result, no charge, transactionHash absent — this is correct
if (!data.replayed && !data.settlement?.transactionHash) {
  throw new Error("Missing settlement on non-replayed response");
}
// transactionHash is a Base mainnet on-chain USDC transfer (eip155:8453)
```

**Completion:** `data.result` is populated and either `data.settlement.transactionHash` is present
or `data.replayed === true`. No 402 or 5xx in the final response.

## Step 6: Wrap Into a Lucid Entrypoint

```typescript
// Inside a Lucid Agent entrypoint handler
async function webReadHandler(input: { url: string }) {
  const res = await fetchWithPay("https://402agent.ai/agent402/api/v1/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: input.url }),
  });
  if (res.status !== 200) throw new Error(`upstream error: ${res.status}`);
  const { result, settlement, replayed } = await res.json();
  return { summary: result.summary, source: result.source_url, txHash: settlement?.transactionHash ?? null, replayed };
}
```

## Failure Paths

| Status | Cause | Action |
|--------|-------|--------|
| Library throws | Payment rejected or facilitator error | Check USDC balance; verify `PAYER_PRIVATE_KEY` is on Base mainnet |
| `200` but no `result` | Upstream processing error | Log `data.error`; do not retry |
| `400` | Bad request body (missing `url` or `query`) | Fix input; do not retry |
| `500` | Server error | Wait 5 s, retry once |
| `402` in final response | Library retry exhausted | Payment client misconfigured; re-check Step 3 |

Never call Step 4 a second time on a 402 — the library owns retry. A second manual call creates
a double-payment risk.

## Discovery Endpoints (free, no payment required)

| Endpoint | Purpose |
|----------|---------|
| `GET https://402agent.ai/agent402/api/v1/services` | Live payment contract + service URLs |
| `GET https://402agent.ai/.well-known/x402` | x402 standard resource discovery document |
| `GET https://402agent.ai/openapi.json` | OpenAPI 3.1 spec with `x-payment-protocol` extension |
| `GET https://402agent.ai/agent402/docs/buyer` | Human-readable buyer guide |

Load `references/payment-contract.md` for expected contract values, `accepts[0]` validation
checklist, and full response schemas.
