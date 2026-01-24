---
name: lucid-client-api
description: This skill should be used when the user asks about "lucid client", "lucid-client", "lucid client API", "multi-agent runtime", "agent management API", "invoke agent entrypoints", "agent secrets", "agent analytics", "agent rankings", or mentions the lucid-client repository or API endpoints.
allowed-tools: Bash, Read, Write, WebFetch
see-also:
  - https://github.com/daydreamsai/lucid-client/blob/master/AGENTS.md: Full documentation of the lucid-client architecture
  - https://github.com/daydreamsai/lucid-client/blob/master/CLAUDE.md: Development guide for lucid-client
---

# Lucid Client API

Multi-agent runtime system for managing and invoking Lucid Agents with x402 payment handling.

**API Base URL:** `https://api.lucid.daydreams.ai` (or `http://localhost:8787` for development)

## Core Operations

### Agent Management

```bash
# List agents
curl -s "${API_URL}/api/agents?page=1&limit=10" -H "Cookie: ${SESSION}" | jq

# Create agent
curl -X POST "${API_URL}/api/agents" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${SESSION}" \
  -d '{"slug": "my-agent", "name": "My Agent", "version": "1.0.0"}'

# Get agent
curl -s "${API_URL}/api/agents/{agentId}" -H "Cookie: ${SESSION}" | jq

# Delete agent
curl -X DELETE "${API_URL}/api/agents/{agentId}" -H "Cookie: ${SESSION}"
```

### Invoke Entrypoints

```bash
# Invoke entrypoint
curl -X POST "${API_URL}/agents/{agentId}/entrypoints/{key}/invoke" \
  -H "Content-Type: application/json" \
  -d '{"input": {"field": "value"}}'
```

Handle 402 responses by completing payment and retrying with payment headers.

### Secrets Management

```bash
# Create secret
curl -X POST "${API_URL}/api/agents/{agentId}/secrets" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${SESSION}" \
  -d '{"key": "API_KEY", "value": "secret-value"}'

# List secrets
curl -s "${API_URL}/api/agents/{agentId}/secrets" -H "Cookie: ${SESSION}" | jq
```

## Authentication

The API uses Better Auth with session cookies:
- Include `credentials: 'include'` in fetch requests
- Protected routes require authentication: `/api/agents/*`, `/api/secrets/*`
- Public routes: `/agents/{slug}`, `/agents/{agentId}/.well-known/agent-card.json`

## Payment Flow (x402)

When invoking paid entrypoints:

1. Send invocation request
2. Receive `402 Payment Required` with headers:
   - `X-Payment-Price`: Amount required
   - `X-Payment-Network`: Chain identifier
   - `X-Payment-PayTo`: Recipient address
3. Complete payment via x402 client
4. Retry with payment headers:
   - `PAYMENT-SIGNATURE`: Payment signature
   - `PAYMENT-RESPONSE`: Payment response

## Error Handling

| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Not authenticated |
| 402 | Payment required |
| 404 | Not found |
| 409 | Conflict (slug exists) |

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents` | GET/POST | List/create agents |
| `/api/agents/{id}` | GET/PUT/DELETE | Manage agent |
| `/agents/{id}/entrypoints/{key}/invoke` | POST | Invoke entrypoint |
| `/api/agents/{id}/secrets` | GET/POST | Manage secrets |
| `/api/agents/{id}/analytics/summary` | GET | Get analytics |
| `/api/rankings` | GET | Get agent rankings |
| `/health` | GET | Health check |

## Implementation Notes

- The API is in the `lucid-client` codebase, not `lucid-agents`
- Uses Hono with OpenAPI validation
- All agent operations are scoped to authenticated owner
- Runtime is stateless - agents built dynamically from stored definitions
- OpenAPI spec available at `GET /doc`

## Additional Resources

### Reference Files

For complete endpoint documentation:
- **`references/endpoints.md`** - All endpoints with request/response formats, authentication details, and code examples

### External Documentation

- [lucid-client AGENTS.md](https://github.com/daydreamsai/lucid-client/blob/master/AGENTS.md) - Full architecture documentation
- [lucid-client CLAUDE.md](https://github.com/daydreamsai/lucid-client/blob/master/CLAUDE.md) - Development guide
