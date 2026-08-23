---
name: payment-contract
description: 402Agent live payment contract values, accepts[0] validation checklist, and response schemas. Load when the main skill references a specific field value or schema shape.
---

## Contents

- Payment contract constants
- Service prices
- `accepts[0]` validation checklist
- Response schemas (READ, SEARCH, VERIFY)
- Live source endpoints

## Payment Contract Constants

Primary source of truth: `GET https://402agent.ai/agent402/api/v1/services`

| Field | Value |
|-------|-------|
| Network | `eip155:8453` (Base mainnet) |
| Asset | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (native Base USDC) |
| Scheme | `exact` |
| x402 version | `2` |
| Facilitator | `https://api.cdp.coinbase.com/platform/v2/x402` |
| Payment header | `PAYMENT-SIGNATURE` |
| Max timeout | 300 seconds |

## Service Prices

| Service | USD | Atomic USDC |
|---------|-----|-------------|
| READ | $0.047 | 47 000 |
| SEARCH | $0.157 | 157 000 |
| VERIFY | $0.282 | 282 000 |

Atomic units = USD × 1 000 000. All amounts are authoritative from the live 402 challenge, not
this file. Never pay an amount that differs from what arrives in the live `accepts[0].amount`.

## `accepts[0]` Validation Checklist

Inspect the live 402 response body before signing. Stop and abort if any field differs:

```
scheme   === "exact"
network  === "eip155:8453"
asset    === "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
amount   matches expected atomic amount for the chosen service (above)
```

The `@x402/fetch` library performs this check automatically when configured via Step 3 of the
main skill. Manual validation is only needed if bypassing the library.

## READ Response Schema

```json
{
  "transaction_id": "tx_…",
  "replayed": false,
  "settlement": { "transactionHash": "0x…", "network": "eip155:8453" },
  "result": {
    "service": "read",
    "title": "…",
    "summary": "…",
    "key_points": ["…"],
    "extracted_facts": ["…"],
    "source_url": "https://…"
  }
}
```

`replayed: true` — cached result returned at no charge; `settlement` is absent or null.

## SEARCH Response Schema

```json
{
  "transaction_id": "tx_…",
  "replayed": false,
  "settlement": { "transactionHash": "0x…", "network": "eip155:8453" },
  "result": {
    "service": "search",
    "query": "…",
    "results": [{ "title": "…", "url": "…", "snippet": "…", "source_tier": "…" }],
    "sources": ["…"],
    "generated_at": "ISO-8601"
  }
}
```

## VERIFY Response Schema

```json
{
  "transaction_id": "tx_…",
  "replayed": false,
  "settlement": { "transactionHash": "0x…", "network": "eip155:8453" },
  "result": {
    "service": "verify",
    "url": "https://…",
    "reachable": true,
    "status_code": 200,
    "content_signals": ["…"]
  }
}
```

## Live Source Endpoints

Always prefer live endpoints over values in this file for operational decisions:

- `https://402agent.ai/agent402/api/v1/services` — payment config + service URLs
- `https://402agent.ai/agent402/docs/buyer` — buyer guide
- `https://402agent.ai/.well-known/x402` — x402 resource discovery
- `https://402agent.ai/openapi.json` — OpenAPI 3.1 spec
