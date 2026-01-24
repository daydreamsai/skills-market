---
name: xgate-server
description: This skill should be used when the user asks about "xgate", "xgate-server", "X402 services", "ERC-8004 agents", "search xgate", "query xgate", "find agents on xgate", "token transfers", "blockchain agents", "on-chain data", or mentions the api.xgate.run API.
allowed-tools: Bash, Read, Write, WebFetch
---

# xgate-server API

Query the xgate-server API for X402 services, ERC-8004 agents, and on-chain token transfers.

**API Base URL:** `https://api.xgate.run`

## Quick Start

Check API health before making queries:

```bash
curl -s https://api.xgate.run/health | jq
```

## Core Operations

### Search Services

Query X402-compatible payment services:

```bash
curl -s "https://api.xgate.run/services?q=QUERY&network=base&limit=10" | jq
```

Key parameters: `q` (search), `network` (ethereum, base, polygon), `asset` (USDC, ETH), `limit`, `offset`.

### Search Agents

Query ERC-8004 registered agents:

```bash
curl -s "https://api.xgate.run/agents?protocols=MCP&min_score=0.8&limit=10" | jq
```

Key parameters: `q` (search), `protocols` (MCP, A2A), `chain_id`, `min_score`, `validation_status`.

### Query Token Transfers

Retrieve on-chain transfer data:

```bash
curl -s "https://api.xgate.run/onchain/token-transfers?chain_id=8453&limit=20" | jq
```

Key parameters: `chain_id`, `wallet_address`, `facilitator_id`, `include_totals`.

## Chain IDs

| Chain | ID |
|-------|-----|
| Ethereum | 1 |
| Base | 8453 |
| Sepolia | 11155111 |
| Polygon | 137 |

## Implementation Notes

1. **Always check health first** if queries fail - search engine may be unavailable
2. **Use `jq` filters** to extract specific fields from large responses
3. **Enable debug mode** (`debug=true`) to understand scoring/ranking
4. **Use pagination** for large result sets (offset-based for services/agents, cursor-based for transfers)

## Error Handling

- `400`: Invalid query parameters - check parameter format
- `401`: Unauthorized - verify authentication
- `404`: Resource not found - check ID/address
- `503`: Search engine unavailable - retry later

## Additional Resources

### Reference Files

For complete API documentation including all parameters and response formats:
- **`references/api-reference.md`** - Full endpoint documentation with all query parameters, response schemas, and example workflows

### CLI Tool

A CLI tool is bundled at `scripts/xgate` for quick API access:

```bash
xgate health                           # Check health
xgate services -q "token" -n ethereum  # Search services
xgate agents -p MCP --min-score 0.8    # Search agents
xgate transfers -c 8453 --totals       # Query transfers
```

Run `xgate --help` for full usage documentation.
