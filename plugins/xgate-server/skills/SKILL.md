---
name: xgate-server
description: |
  Queries the xgate-server API for services, agents, and on-chain data. Use when
  looking up x402 services, ERC-8004 agents, or token transfer history.
allowed-tools: [Bash, Read]
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
- "Set up xgate MCP"
- "Connect xgate to Claude"
- "How do I use x402 tools in Claude?"

## MCP Setup

The xgate MCP lets Claude call x402 APIs directly with automatic micropayments. **The human must authenticate** — the agent cannot do this step.

### Tell the human:

1. **Go to [xgate.run](https://xgate.run)** and connect their wallet to generate an MCP connector URL
2. **Add to Claude** — paste the URL into their Claude config:

**Claude Code:**
```bash
claude mcp add xgate --transport http https://xgate.run/user/<walletSlug>/mcp?token=<token>
```

**Claude Desktop** (`Settings → Developer → Edit Config`):
```json
{
  "mcpServers": {
    "xgate": {
      "url": "https://xgate.run/user/<walletSlug>/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

### Once connected, the agent can:

- **Search resources:** ask Claude to call `xgate_search({ query: "weather" })`
- **Add tools:** `xgate_add_resource({ url: "..." })` to add x402 APIs to the toolset
- **Use tools:** call discovered APIs directly — payments settle automatically via server wallet

> **Important:** If MCP tools aren't available, prompt the human to complete auth first. The agent cannot generate the connector URL — it requires wallet signing.

## CLI Usage

Use the bundled CLI at `plugins/xgate-server/scripts/xgate`:

```bash
# Health check
./plugins/xgate-server/scripts/xgate health

# Search services
./plugins/xgate-server/scripts/xgate services -q "token" -n ethereum

# Get a specific service
./plugins/xgate-server/scripts/xgate service SERVICE_ID

# Search agents
./plugins/xgate-server/scripts/xgate agents -p MCP --min-score 0.8

# Query token transfers
./plugins/xgate-server/scripts/xgate transfers -c 8453 --totals

# Resource transfers
./plugins/xgate-server/scripts/xgate resource-transfers 0xADDRESS -c 1
```

Run `./plugins/xgate-server/scripts/xgate --help` for full option reference.

## API Base URL

`https://api.xgate.run`

Override via `XGATE_URL` environment variable.

## Service Query Parameters

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

## Agent Query Parameters

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

## Transfer Query Parameters

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

## Response Format

### Services

```json
{
  "query": {},
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

### Agents

```json
{
  "query": {},
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

## Chain IDs

| Chain | ID |
|-------|-----|
| Ethereum Mainnet | 1 |
| Base | 8453 |
| Sepolia | 11155111 |
| Polygon | 137 |

## Tips

1. Use `--debug` flag (or `debug=true`) to understand scoring/ranking
2. Use pagination for large result sets (cursor-based for transfers, offset-based for services/agents)
3. Check `xgate health` first if queries fail
4. Pipe output through `jq` filters to extract specific fields
