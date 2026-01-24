---
name: xgate-server
description: This skill should be used when the user asks about "xgate", "xgate-server", "X402 services", "ERC-8004 agents", "search xgate", "query xgate", "find agents on xgate", "token transfers", "blockchain agents", "on-chain data", or mentions the api.xgate.run API.
allowed-tools: [Bash, Read, Write, WebFetch]
---

# xgate-server CLI

Query the xgate-server API for X402 services, ERC-8004 agents, and on-chain token transfers.

## When to Use

- "Search for services on xgate"
- "Find agents that support MCP"
- "Query xgate for resources"
- "Get token transfers for address"
- "Search xgate agents"
- "List services on xgate-server"

## API Base URL

`https://api.xgate.run`

Check health first:
```bash
curl -s https://api.xgate.run/health | jq
```

## Quick Reference

### Search Services

```bash
# Basic search
curl -s "https://api.xgate.run/services?q=QUERY&limit=10" | jq

# With filters
curl -s "https://api.xgate.run/services?q=QUERY&network=ethereum,base&asset=USDC&limit=10" | jq

# Get specific service
curl -s "https://api.xgate.run/services/SERVICE_ID" | jq

# Debug mode (scoring info)
curl -s "https://api.xgate.run/services?q=QUERY&debug=true" | jq
```

**Service Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Free-text search query |
| `network` | string | Comma-separated networks (ethereum, base, polygon) |
| `asset` | string | Comma-separated assets (USDC, ETH) |
| `scheme` | string | Service scheme filter |
| `version` | number | X402 version filter |
| `maxAmount` | bigint | Maximum amount required |
| `limit` | number | Results per page (1-50, default: 10) |
| `offset` | number | Pagination offset |
| `debug` | boolean | Return scoring diagnostics |

### Search Agents

```bash
# Basic search
curl -s "https://api.xgate.run/agents?q=QUERY&limit=10" | jq

# Filter by protocol
curl -s "https://api.xgate.run/agents?protocols=MCP&limit=10" | jq

# Filter by chain
curl -s "https://api.xgate.run/agents?chain_id=11155111&limit=10" | jq

# Multiple filters
curl -s "https://api.xgate.run/agents?protocols=MCP,A2A&min_score=0.5&validation_status=completed&limit=10" | jq

# Debug mode (rank breakdown)
curl -s "https://api.xgate.run/agents?q=QUERY&debug=true" | jq
```

**Agent Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Free-text search query |
| `chain_id` | number | Blockchain chain ID |
| `protocols` | string | Comma-separated (MCP, A2A) |
| `identity_registry` | string | Identity registry address |
| `agent_id` | string | Specific agent ID |
| `wallet` | string | Wallet address |
| `has_metadata` | boolean | Filter by metadata presence |
| `supported_trust` | string | Comma-separated trust types |
| `mcp_version` | string | MCP protocol version |
| `mcp_capabilities` | string | Comma-separated capabilities |
| `a2a_skills` | string | Comma-separated A2A skills |
| `a2a_interfaces` | string | Comma-separated interfaces |
| `validation_status` | enum | pending, completed, expired, revoked |
| `min_score` | number | Minimum reputation score (0-1) |
| `min_confidence` | number | Minimum confidence threshold |
| `min_pass_rate` | number | Minimum validation pass rate |
| `limit` | number | Results per page (1-50) |
| `offset` | number | Pagination offset |
| `debug` | boolean | Return rank breakdown |

### Query Token Transfers

```bash
# All transfers for facilitator
curl -s "https://api.xgate.run/onchain/token-transfers?facilitator_id=base&chain_id=8453&limit=100" | jq

# Transfers for specific address
curl -s "https://api.xgate.run/onchain/token-transfers?wallet_address=0xADDRESS&chain_id=1" | jq

# Resource transfers
curl -s "https://api.xgate.run/services/resource/0xADDRESS/transfers?chain_id=1" | jq

# With totals
curl -s "https://api.xgate.run/onchain/token-transfers?facilitator_id=base&include_totals=true" | jq
```

**Transfer Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `facilitator_id` | string | Facilitator identifier |
| `chain_id` | number | Blockchain chain ID |
| `token_contract` | string | Token contract address (0x) |
| `from_address` | string | Source address (0x) |
| `to_address` | string | Destination address (0x) |
| `wallet_address` | string | Wallet address filter |
| `block_number_from` | number | Starting block |
| `block_number_to` | number | Ending block |
| `block_timestamp_from` | string | ISO timestamp |
| `block_timestamp_to` | string | ISO timestamp |
| `limit` | number | Results limit |
| `cursor` | string | Pagination cursor |
| `order` | enum | asc or desc |
| `include_totals` | boolean | Include value totals |

### Base Events (ERC3009)

```bash
# Query transfer-with-authorization events
curl -s "https://api.xgate.run/base/events/transfer-with-authorization?token_address=0xTOKEN&limit=50" | jq
```

### Utility Endpoints

```bash
# Health check
curl -s https://api.xgate.run/health | jq

# Usage statistics
curl -s https://api.xgate.run/services/usage | jq

# OpenAPI spec
curl -s https://api.xgate.run/doc | jq
```

## Common Workflows

### Find MCP-Compatible Agents with High Reputation

```bash
curl -s "https://api.xgate.run/agents?protocols=MCP&min_score=0.8&validation_status=completed&limit=20" | jq '.results[] | {name, agentId, reputationScore, mcp}'
```

### Search Services by Network and Extract URLs

```bash
curl -s "https://api.xgate.run/services?network=base&limit=20" | jq '.results[] | {id, resource, networks, assets}'
```

### Get Recent Token Transfers with USD Values

```bash
curl -s "https://api.xgate.run/onchain/token-transfers?chain_id=8453&order=desc&limit=20&include_totals=true" | jq '{totals: .meta.totals, transfers: [.data[] | {tx_hash, from: .from_address, to: .to_address, value_usd}]}'
```

### Paginate Through All Agents

```bash
# First page
curl -s "https://api.xgate.run/agents?limit=50&offset=0" | jq

# Next page
curl -s "https://api.xgate.run/agents?limit=50&offset=50" | jq
```

## Response Format

### Services Response
```json
{
  "query": { /* echoed query params */ },
  "total": 42,
  "results": [
    {
      "id": "service_id",
      "resource": "0x...",
      "type": "http",
      "networks": ["ethereum"],
      "assets": ["USDC"],
      "score": 0.95
    }
  ],
  "diagnostics": { "latencyMs": 125 }
}
```

### Agents Response
```json
{
  "query": { /* echoed query params */ },
  "total": 25,
  "results": [
    {
      "agentKey": "key",
      "agentId": "0x...",
      "name": "Agent Name",
      "protocols": ["MCP", "A2A"],
      "reputationScore": 0.95,
      "rankScore": 87.5
    }
  ]
}
```

## Error Handling

| Status | Meaning |
|--------|---------|
| 400 | Invalid query parameters |
| 401 | Unauthorized (missing/invalid x-internal-key) |
| 404 | Resource not found |
| 503 | Search engine unavailable |
| 500 | Internal server error |

## Chain IDs Reference

| Chain | ID |
|-------|-----|
| Ethereum Mainnet | 1 |
| Base | 8453 |
| Sepolia | 11155111 |
| Polygon | 137 |

## Tips

1. **Use `jq` filters** to extract specific fields from large responses
2. **Enable debug mode** (`debug=true`) to understand scoring/ranking
3. **Use pagination** for large result sets (cursor-based for transfers, offset-based for services/agents)
4. **Check health first** if queries fail - the search engine may be unavailable
