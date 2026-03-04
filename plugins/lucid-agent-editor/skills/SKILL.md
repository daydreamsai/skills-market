---
name: lucid-agent-editor
description: |
  Edits and manages existing Lucid agents via the API. Covers three options:
  MCP tool with SIWE, SDK with wallet auth, or viem with custom signing.
  Use when editing, updating, disabling, or otherwise managing existing
  Lucid agents.

see-also:
  - lucid-agent-creator: For creating new agents
---

# Editing Agents with Agents

This skill teaches you how to edit existing Lucid agents via the API.

## When to Use

Use this skill when you need to:
- Update an existing agent's configuration
- Enable or disable an agent
- Modify entrypoints (add, remove, update)
- Change agent metadata or description
- Update payment configuration

## Three Options for Editing Agents

### Option 1: MCP Tool with Server Wallet (SIWE)

Use the MCP tool with Sign In With Ethereum (SIWE) and your server wallet:

```bash
# First, ensure you're authenticated via SIWE in your MCP client
# Your server wallet will be used for authentication

# Then use the MCP tool to edit an agent
edit_lucid_agent({
  agentId: "ag_abc123",
  enabled: false,
  description: "Updated via MCP"
})
```

The MCP tool handles:
- SIWE authentication with your server wallet
- x402 payment signature generation
- API request with PAYMENT-SIGNATURE header

### Option 2: SDK as Signer (Your Own Wallet)

Use the Lucid Agents SDK with your own wallet:

```typescript
import { createX402Payment } from '@lucid-agents/payments';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Setup your wallet
const account = privateKeyToAccount(`0x${WALLET_PRIVATE_KEY}`);
const agentId = 'ag_abc123';

// SDK creates x402 payment signature
const payment = await createX402Payment({
  account,
  chain: baseSepolia,
  resource: {
    url: `https://api.daydreams.systems/api/agents/${agentId}`,
    description: 'Agent update',
    mimeType: 'application/json',
  },
  amount: '0', // Free for auth
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
  payTo: account.address,
});

// Update agent
const response = await fetch(`https://api.daydreams.systems/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(payment)),
  },
  body: JSON.stringify({
    enabled: false,
    description: 'Updated via SDK',
  }),
});

const agent = await response.json();
```

### Option 3: Viem with Custom Signing

Write your own signing logic using viem directly:

**How it works:**
1. Create an EIP-712 signature with your wallet
2. Include the signature in the `PAYMENT-SIGNATURE` header
3. The backend extracts the wallet address and verifies ownership

**Example:**
```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { randomBytes } from 'crypto';

const account = privateKeyToAccount(`0x${WALLET_PRIVATE_KEY}`);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

// Create authorization signature
const nonce = '0x' + randomBytes(32).toString('hex');
const now = Math.floor(Date.now() / 1000);

const authorization = {
  from: account.address,
  to: account.address,
  value: '0',
  validAfter: String(now - 600),
  validBefore: String(now + 300),
  nonce,
};

const signature = await walletClient.signTypedData({
  account,
  domain: {
    name: 'USDC',
    version: '2',
    chainId: 84532,
    verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  types: {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  },
  primaryType: 'TransferWithAuthorization',
  message: authorization,
});

// Create payment payload
const paymentPayload = {
  x402Version: 2,
  resource: {
    url: `${BASE_URL}/api/agents/${agentId}`,
    description: 'Agent update',
    mimeType: 'application/json',
  },
  accepted: {
    scheme: 'exact',
    network: 'eip155:84532',
    amount: '0',
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    payTo: account.address,
    maxTimeoutSeconds: 300,
    extra: {},
  },
  payload: {
    authorization,
    signature,
  },
};

// Update agent
const response = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(paymentPayload)),
  },
  body: JSON.stringify({
    enabled: false,
    description: 'Updated via wallet auth',
  }),
});
```

### 2. Session Authentication (Cookie)

Use this when:
- The user is logged in via Better Auth
- You have a session cookie from the browser
- The agent was created by a logged-in user

**Example:**
```typescript
const response = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': sessionCookie,
  },
  body: JSON.stringify({
    enabled: false,
  }),
});
```

## What Can Be Updated

### Allowed Fields

You can update the following fields on an existing agent:

- **`enabled`** (boolean): Enable or disable the agent
- **`name`** (string): Human-readable name (1-128 chars)
- **`description`** (string): Description (max 1024 chars)
- **`entrypoints`** (array): Full entrypoints array (replaces existing)
- **`paymentsConfig`** (object): Payment configuration
- **`walletsConfig`** (object): Wallet configuration
- **`a2aConfig`** (object): Agent-to-agent configuration
- **`ap2Config`** (object): Access policy configuration
- **`analyticsConfig`** (object): Analytics configuration
- **`identityConfig`** (object): Identity configuration
- **`metadata`** (object): Custom metadata

### Restricted Fields

The following fields **cannot** be changed after creation:

- **`slug`**: Immutable identifier (tied to setup payment)
- **`ownerId`**: Owner cannot be transferred
- **`version`**: Automatically managed by backend
- **`createdAt`**: Timestamp of creation

## Common Operations

### Disable an Agent

```typescript
await fetch(`${BASE_URL}/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(paymentPayload)),
  },
  body: JSON.stringify({
    enabled: false,
  }),
});
```

### Update Description

```typescript
await fetch(`${BASE_URL}/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(paymentPayload)),
  },
  body: JSON.stringify({
    description: 'Updated description',
  }),
});
```

### Add a New Entrypoint

```typescript
// First, get the current agent to retrieve existing entrypoints
const agent = await fetch(`${BASE_URL}/api/agents/${agentId}`).then(r => r.json());

// Add new entrypoint to existing ones
const updatedEntrypoints = [
  ...agent.entrypoints,
  {
    key: 'new-endpoint',
    description: 'New endpoint',
    handlerType: 'js',
    handlerConfig: {
      code: 'return { result: input };',
    },
  },
];

// Update agent with new entrypoints array
await fetch(`${BASE_URL}/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(paymentPayload)),
  },
  body: JSON.stringify({
    entrypoints: updatedEntrypoints,
  }),
});
```

### Update Entrypoint Price

```typescript
// Get current agent
const agent = await fetch(`${BASE_URL}/api/agents/${agentId}`).then(r => r.json());

// Update price on specific entrypoint
const updatedEntrypoints = agent.entrypoints.map(ep => {
  if (ep.key === 'chat') {
    return { ...ep, price: '20000' }; // Update to 0.02 USDC
  }
  return ep;
});

// Update agent
await fetch(`${BASE_URL}/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(paymentPayload)),
  },
  body: JSON.stringify({
    entrypoints: updatedEntrypoints,
  }),
});
```

### Enable Analytics

```typescript
await fetch(`${BASE_URL}/api/agents/${agentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': btoa(JSON.stringify(paymentPayload)),
  },
  body: JSON.stringify({
    analyticsConfig: {
      enabled: true,
    },
  }),
});
```

## Ownership and Permissions

### Who Can Edit an Agent?

Only the **owner** of an agent can edit it. Ownership is determined by:

1. **Wallet-created agents**: Owned by the user account associated with the wallet address
2. **Session-created agents**: Owned by the logged-in user who created it

### Ownership Verification

The backend automatically:
1. Extracts the user identity from authentication (wallet or session)
2. Loads the agent from the database
3. Verifies `agent.ownerId` matches the authenticated user's ID
4. Rejects the request with 403 if ownership doesn't match

## Error Handling

Common errors when editing agents:

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "message": "Authentication required - provide PAYMENT-SIGNATURE header or valid session"
}
```

**Solution**: Include valid authentication (PAYMENT-SIGNATURE or session cookie)

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "code": "FORBIDDEN",
  "message": "You do not have permission to edit this agent"
}
```

**Solution**: Ensure you're authenticated as the agent owner

### 404 Not Found
```json
{
  "error": "Agent not found",
  "code": "AGENT_NOT_FOUND"
}
```

**Solution**: Verify the agent ID is correct

### 400 Validation Error
```json
{
  "error": "Validation failed",
  "details": {...}
}
```

**Solution**: Check that all fields match the expected schema

### 409 Slug Conflict
```json
{
  "error": "Cannot change agent slug",
  "code": "SLUG_IMMUTABLE"
}
```

**Solution**: Remove the `slug` field from your update - slugs cannot be changed

## API Endpoint

```
PUT /api/agents/:agentId
```

**Request Headers:**
- `Content-Type: application/json`
- `PAYMENT-SIGNATURE: <base64-encoded-payment-payload>` (for wallet auth)
- `Cookie: <session-cookie>` (for session auth)

**Request Body:**
```json
{
  "enabled": false,
  "description": "Updated description",
  "entrypoints": [...],
  "analyticsConfig": {...}
}
```

**Response:**
- **200 OK**: Agent updated successfully, returns updated agent object
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: User doesn't own the agent
- **404 Not Found**: Agent doesn't exist
- **400 Bad Request**: Validation error

## Complete Example Script

See `scripts/edit-agent-with-payment-auth.ts` for a complete working example of editing an agent with wallet authentication.

## Related Skills

- **hono-runtime-api**: Complete API reference for all operations
- **lucid-agent-creator**: Creating new agents
