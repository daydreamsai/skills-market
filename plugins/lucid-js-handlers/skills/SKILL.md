---
name: lucid-js-handlers
description: |
  Skill for creating Lucid agents with JavaScript handler code.
  Teaches the JS handler code contract, paymentsConfig for paid agents,
  optional identityConfig (ERC-8004), and how to use the create_lucid_agent MCP tool.

  Activate when: user wants to create Lucid agents with inline JS handlers
  (no generate API, no self-hosting). The agent will be hosted on the Lucid platform.

see-also:
  - ./GUIDE.md: Guide for humans and agents (grok-the-flow)
---

# Lucid JS Handlers + Create Agent

This skill teaches you how to create Lucid agents with JavaScript handler code using the `create_lucid_agent` MCP tool.

## When to Use

Use this skill when the user wants to create Lucid agents with inline JavaScript handlers. The agents will be hosted on the Lucid platform and can be invoked immediately after creation. There is no generate API - you write the JS handler code yourself. There is no self-hosting required - agents are hosted on the Lucid platform.

## JS Handler Code Contract

### Execution Environment

- Code runs as `(async () => { ${code} })()` in a VM sandbox
- **Globals available**:
  - `input`: The request body’s `input` field (the entrypoint payload). Clients must POST `{ "input": <payload> }`; that `<payload>` is what handlers see as `input`.
  - `console`: Standard console object for logging
  - `fetch`: Only available if `handlerConfig.network.allowedHosts` is set
- **Not available**: `require`, `import`, `process`, Node.js APIs, or any other Node modules

### Return Value

- Return any JSON-serializable value
- That return value becomes the `output` field in the response
- The platform automatically sets `usage: { total_tokens: 0 }` for JS handlers

### Timeout

- **Default timeout**: 1000 ms (1 second)
- Override via `handlerConfig.timeoutMs` (must be positive integer)

### Fetch / Network Access

When your handler needs to make outbound HTTP requests:

1. Set `handlerConfig.network.allowedHosts` to an array of allowed hosts
2. Use `["*"]` to allow any host (not recommended for security)
3. Use specific hosts: `["api.example.com"]` or wildcards: `["*.example.com"]`
4. Optional: Set `handlerConfig.network.timeoutMs` for network request timeout

**Important**: If `allowedHosts` is not set, `fetch` will not be available in the handler code.

### Common mistakes

- **Do not use `ctx`**. Only `input` exists in the sandbox. Use `input` (e.g. `input.text`), not `ctx.input`.
- **Do not return `{ output, usage }`**. Return only the output value. The platform sets `output` and `usage` automatically.

### Examples

**Simple echo handler**:
```javascript
return { echoed: input };
```

**Echo a specific field**:
```javascript
return { text: input.text };
```

**Handler with fetch**:
```javascript
const res = await fetch(`https://api.example.com/data?q=${encodeURIComponent(input.q)}`);
const data = await res.json();
return data;
```

**Handler with timeout override**:
```javascript
// This handler might take longer, so we override the timeout
// Note: timeoutMs is set in handlerConfig, not in the code itself
return await someSlowOperation(input);
```

## Creating Agents with `create_lucid_agent` MCP Tool

### Prerequisites

- You must be connected via xgate MCP (Cursor/Claude)
- The user must have configured their server wallet (via SIWE)
- The server wallet will be used for setup-payment and payment-as-auth

### Tool Inputs

The `create_lucid_agent` tool accepts:

- `slug` (string, required): URL-friendly unique identifier (lowercase alphanumeric with hyphens, 1-64 chars)
- `name` (string, required): Human-readable name (1-128 chars)
- `description` (string, optional): Human-readable description (max 1024 chars, defaults to "")
- `entrypoints` (array, required, min 1): Array of entrypoint objects:
  - `key` (string, required, 1-64 chars): Unique entrypoint identifier
  - `description` (string, optional, max 512 chars): Optional description
  - `handlerType` (string, required): Must be `"js"`
  - `handlerConfig` (object, required):
    - `code` (string, required): JavaScript handler code (max 100KB)
    - `timeoutMs` (number, optional, positive): Override default 1000ms timeout
    - `network` (object, optional):
      - `allowedHosts` (array of strings, optional): Allowed hosts for fetch
      - `timeoutMs` (number, optional, positive): Network request timeout
  - `inputSchema` (object, optional): Valid JSON Schema object for input validation
  - `outputSchema` (object, optional): Valid JSON Schema object for output validation
  - `price` (string, optional): Price in smallest unit (e.g., "1000" = 0.001 USDC if 6 decimals)
  - **Note**: Entrypoint-level `network` field (for payment network) is **not accepted**. All agents use Base network (base-sepolia).
- `identityConfig` (object, optional): ERC-8004 identity configuration:
  - `chainId` (number, optional): Chain ID for ERC-8004 registry (defaults to Base Sepolia: 84532)
  - `rpcUrl` (string, optional): RPC URL for blockchain connection
  - `registryAddress` (string, optional): ERC-8004 registry contract address
  - `autoRegister` (boolean, optional): Whether to automatically register identity if not found
  - `trustModels` (array of strings, optional): Trust models to advertise
  - `trustOverrides` (object, optional): Custom trust config overrides

**Important**: 
- Do not include `version` - the backend sets it automatically (defaults to "1.0.0")
- Do not provide or see the Lucid API base URL - that is MCP config only
- Entrypoint-level `network` fields are not accepted - all agents use Base network

### PaymentsConfig for Paid Agents

When any entrypoint has a `price`, the agent **must** have `paymentsConfig`. The tool builds this automatically:

- `payTo`: Creator's server wallet address (receives invoker payments)
- `network`: `"base-sepolia"` (always Base Sepolia testnet)
- `facilitatorUrl`: `"https://facilitator.daydreams.systems"` (hardcoded)

**Conflict**: If you create an agent with paid entrypoints but without `paymentsConfig`, the agent will be created but invocations won't charge users. The tool automatically adds `paymentsConfig` when any entrypoint has a price, so this conflict shouldn't occur when using the tool correctly.

**Setup Fee**: For agents with paid entrypoints, a one-time setup fee is paid from the server wallet (USDC). The tool handles this automatically via the setup-payment flow.

### IdentityConfig (Optional)

You can pass `identityConfig` for ERC-8004 identity:

- The tool forwards it to the create payload
- **Important**: Auto-registration at create time requires an **agent wallet** (`walletsConfig.agent`)
- The MCP tool does not set `walletsConfig.agent`
- So when creating via MCP, `identityConfig` is stored and can be used later:
  - Add agent wallet in the dashboard
  - Retry identity registration via the dashboard

### Flow

1. **Setup-payment** (only if any entrypoint has `price`):
   - Tool calls setup-payment endpoint
   - Receives 402 with PAYMENT-REQUIRED header
   - Signs payment with server wallet
   - Retries with PAYMENT-SIGNATURE header
   - Continues when payment is verified

2. **Create**:
   - Tool calls create endpoint with agent definition
   - Sends same PAYMENT-SIGNATURE for payment-as-auth
   - Agent is created and immediately invokable

3. **Return**:
   - Tool returns agent object with `id`, `slug`, `name`, `description`, `invokeUrl`, and other fields

### Invoking created agents

POST to `invokeUrl` (or `POST /agents/{agentId}/entrypoints/{key}/invoke`). Request body **must** wrap the entrypoint payload in `input`:

```json
{ "input": { "text": "Hello" } }
```

Optional: `sessionId`, `metadata`. The handler receives the `input` value as the `input` global.

### Error Handling

The tool handles various error scenarios:

- **400** (Validation error): "Validation failed: {details}"
- **409** (Slug exists): "Agent slug '{slug}' already exists. Please try a different slug."
- **402** (Payment failed): "Payment failed: {details}. Please ensure your server wallet has sufficient USDC."
- **Insufficient funds**: "Insufficient funds in server wallet. Please add USDC to your server wallet and try again."
- **Lucid API down**: "Lucid API is currently unavailable. Please try again later."
- **Network timeout**: "Request timed out. Please try again."
- **Invalid JS code**: "Invalid JavaScript code: {error details}"
- **Invalid input schema**: "Invalid input: {validation error}"

### Example Usage

```javascript
// Create a simple echo agent
await create_lucid_agent({
  slug: "echo-agent",
  name: "Echo Agent",
  description: "Echoes input back",
  entrypoints: [
    {
      key: "echo",
      description: "Echo the input",
      handlerType: "js",
      handlerConfig: {
        code: "return { echoed: input };"
      }
    }
  ]
});

// Create a paid agent with fetch
await create_lucid_agent({
  slug: "weather-agent",
  name: "Weather Agent",
  description: "Fetches weather data",
  entrypoints: [
    {
      key: "get-weather",
      description: "Get weather by city",
      handlerType: "js",
      handlerConfig: {
        code: `
          const res = await fetch(\`https://api.weather.com/data?city=\${encodeURIComponent(input.city)}\`);
          const data = await res.json();
          return data;
        `,
        network: {
          allowedHosts: ["api.weather.com"]
        }
      },
      price: "1000" // 0.001 USDC
    }
  ]
});

// Create agent with identity config
await create_lucid_agent({
  slug: "identity-agent",
  name: "Identity Agent",
  description: "Agent with ERC-8004 identity",
  entrypoints: [
    {
      key: "process",
      handlerType: "js",
      handlerConfig: {
        code: "return { result: input };"
      }
    }
  ],
  identityConfig: {
    chainId: 84532, // Base Sepolia
    autoRegister: true,
    trustModels: ["feedback", "inference-validation"]
  }
});
```

## Code Contract Documentation

For more details on the JS handler code contract, see:
- Runtime implementation: `packages/hono-runtime/src/runtime/workers/js-worker.ts`
- Handler implementation: `packages/hono-runtime/src/handlers/js.ts`
- OpenAPI schema: `packages/hono-runtime/src/openapi/schemas.ts` (SerializedEntrypointSchema)

## Guide for Humans and Agents

See [GUIDE.md](./GUIDE.md) for the complete end-to-end flow: setup AI → xgate MCP + server wallet (SIWE) → install skill → prompt agent → create_lucid_agent → hosted agent.
