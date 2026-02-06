# ERC-8004 Identity Registration Reference

> Full reference documentation for ERC-8004 agent identity registration.
> See [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004) for the complete standard.

## Contents

- Registration File Format
- Hosting the Registration File
- Generating Agent Icons
- Registration Code
- Agent Wallet
- Reputation Registry
- ERC-8004 Registries
- A2A Agent Card vs ERC-8004 Registration File
- Resources

## Registration File Format

The `agentURI` MUST resolve to a registration file with this structure:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "my-agent",
  "description": "A natural language description of what the agent does, pricing, and interaction methods",
  "image": "https://my-agent.example.com/icon.png",
  "services": [
    {
      "name": "web",
      "endpoint": "https://my-agent.example.com/"
    },
    {
      "name": "A2A",
      "endpoint": "https://my-agent.example.com/.well-known/agent.json",
      "version": "0.3.0"
    },
    {
      "name": "MCP",
      "endpoint": "https://my-agent.example.com/mcp",
      "version": "2025-06-18"
    }
  ],
  "x402Support": true,
  "active": true,
  "registrations": [
    {
      "agentId": 12345,
      "agentRegistry": "eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
    }
  ],
  "supportedTrust": ["reputation"]
}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `type` | MUST be `"https://eips.ethereum.org/EIPS/eip-8004#registration-v1"` |
| `name` | Agent name (ERC-721 compatible) |
| `description` | Natural language description |
| `image` | Agent icon URL (ERC-721 compatible, 512x512 PNG recommended) |
| `services` | Array of endpoints (A2A, MCP, web, etc.) |
| `x402Support` | Boolean indicating x402 payment support |
| `active` | Boolean indicating agent is active |
| `registrations` | Array of on-chain registrations |

### Image Requirements

- URL must be publicly accessible (e.g., `https://agent.example.com/icon.png`)
- Recommended size: 512x512px (minimum 256x256)
- Format: PNG with transparency preferred
- Style: Simple, recognizable icon representing the agent's purpose
- No text in the icon (won't be legible at small sizes)

### URI Schemes Allowed

- `https://` - Standard HTTPS URL
- `ipfs://` - IPFS CID (e.g., `ipfs://bafybeig...`)
- `data:` - Base64-encoded on-chain (e.g., `data:application/json;base64,...`)

## Hosting the Registration File

### Option 1: Web Endpoint

Add an endpoint to your agent at `/.well-known/erc8004.json`:

```typescript
app.get('/.well-known/erc8004.json', (c) => {
  const baseUrl = process.env.BASE_URL;
  return c.json({
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: agent.name,
    description: agent.description,
    image: `${baseUrl}/icon.png`,
    services: [
      { name: "web", endpoint: baseUrl },
      { name: "A2A", endpoint: `${baseUrl}/.well-known/agent.json`, version: "0.3.0" }
    ],
    x402Support: true,
    active: true,
    registrations: [
      { agentId: tokenId, agentRegistry: "eip155:1:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" }
    ],
    supportedTrust: ["reputation"]
  });
});
```

### Option 2: IPFS

Host on IPFS for immutable metadata. Use the `ipfs://` URI scheme.

### Option 3: On-Chain (data: URI)

Use base64 data: URI for fully on-chain metadata:
```
data:application/json;base64,eyJ0eXBlIjoi...
```

## Generating Agent Icons

Use Gemini or other image generation to create agent icons:

```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Create a simple, modern app icon for an AI agent that ${agentDescription}. Style: flat design, minimal, single focal element, vibrant colors, 512x512px. No text.`
        }]
      }],
      generationConfig: { responseModalities: ['image', 'text'] }
    })
  }
);

const data = await response.json();
const imageBase64 = data.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
const iconBuffer = Buffer.from(imageBase64, 'base64');
await Bun.write('./public/icon.png', iconBuffer);
```

Serve the icon:

```typescript
app.get('/icon.png', async (c) => {
  const file = Bun.file('./public/icon.png');
  return new Response(file, {
    headers: { 'Content-Type': 'image/png' }
  });
});
```

## Registration Code

### Register a New Agent

```typescript
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const RPC_URL = 'https://ethereum-rpc.publicnode.com';

const abi = parseAbi([
  'function register(string _uri) external returns (uint256)'
]);

async function registerAgent(privateKey: string, agentBaseUrl: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(RPC_URL)
  });

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(RPC_URL)
  });

  // MUST use hosted ERC-8004 registration file URL
  const agentURI = `${agentBaseUrl}/.well-known/erc8004.json`;
  
  const hash = await walletClient.writeContract({
    address: REGISTRY,
    abi,
    functionName: 'register',
    args: [agentURI]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Registered! TX:', hash);
  
  return hash;
}
```

### Update agentURI After Registration

If you registered with wrong data (e.g., inline JSON), you can fix it:

```typescript
const abi = parseAbi([
  'function setAgentURI(uint256 agentId, string newURI) external'
]);

const agentId = 12345n;  // Get from registration TX logs
const newURI = 'https://my-agent.example.com/.well-known/erc8004.json';

const hash = await walletClient.writeContract({
  address: REGISTRY,
  abi,
  functionName: 'setAgentURI',
  args: [agentId, newURI]
});
```

### Register with Metadata

```typescript
const abi = parseAbi([
  'function register(string agentURI, (string metadataKey, bytes metadataValue)[] metadata) external returns (uint256 agentId)'
]);

const hash = await walletClient.writeContract({
  address: REGISTRY,
  abi,
  functionName: 'register',
  args: [
    'https://my-agent.example.com/.well-known/erc8004.json',
    [
      { metadataKey: 'version', metadataValue: '0x' + Buffer.from('1.0.0').toString('hex') }
    ]
  ]
});
```

## Agent Wallet

The `agentWallet` key is reserved for payment address:
- Initially set to owner's address on registration
- To change: call `setAgentWallet()` with EIP-712 signature proving control
- Automatically cleared on NFT transfer (new owner must re-verify)

```typescript
// Read agent wallet
const abi = parseAbi([
  'function getAgentWallet(uint256 agentId) external view returns (address)'
]);

const wallet = await publicClient.readContract({
  address: REGISTRY,
  abi,
  functionName: 'getAgentWallet',
  args: [agentId]
});
```

## Reputation Registry

ERC-8004 includes a Reputation Registry for agent feedback:

```typescript
const reputationAbi = parseAbi([
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external'
]);

// Give feedback (value is fixed-point, e.g., 4.5 = 45 with decimals=1)
await walletClient.writeContract({
  address: REPUTATION_REGISTRY,
  abi: reputationAbi,
  functionName: 'giveFeedback',
  args: [
    agentId,
    45n,           // value (4.5 as fixed-point)
    1,             // valueDecimals
    'quality',     // tag1 (optional)
    'fast',        // tag2 (optional)
    '/entrypoints/lookup/invoke',  // endpoint (optional)
    '',            // feedbackURI (optional, use IPFS)
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  ]
});
```

**Feedback restrictions:**
- Agent owner cannot give feedback to their own agent
- valueDecimals must be 0-18

### Feedback Tags

| Tag | Description | Example |
|-----|-------------|---------|
| `starred` | Quality rating (0-100) | 87/100 |
| `reachable` | Endpoint reachable (binary) | 1 = true |
| `uptime` | Endpoint uptime (%) | 9977 (2 decimals = 99.77%) |
| `successRate` | Success rate (%) | 89 |
| `responseTime` | Response time (ms) | 560 |

## ERC-8004 Registries

| Network | Registry Address |
|---------|------------------|
| Ethereum Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Base | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |

## A2A Agent Card vs ERC-8004 Registration File

These are **different formats** for different purposes:

| File | Purpose |
|------|---------|
| `/.well-known/agent.json` | A2A protocol agent card (skills, capabilities) |
| `/.well-known/erc8004.json` | ERC-8004 identity/discovery (services, registrations, trust) |

## Resources

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 Discussion](https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098)
- [x402 Protocol](https://x402.org)
