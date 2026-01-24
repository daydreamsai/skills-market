# Lucid Agents SDK - Architecture

Detailed architecture documentation for the Lucid Agents SDK.

## Monorepo Structure

```
/
├── packages/
│   ├── core/               # Protocol-agnostic runtime
│   ├── http/               # HTTP extension
│   ├── wallet/             # Wallet SDK
│   ├── payments/           # x402 payment utilities
│   ├── analytics/          # Payment analytics
│   ├── identity/           # ERC-8004 identity
│   ├── a2a/                # A2A Protocol client
│   ├── ap2/                # AP2 extension
│   ├── hono/               # Hono adapter
│   ├── express/            # Express adapter
│   ├── tanstack/           # TanStack adapter
│   └── cli/                # CLI scaffolding tool
├── scripts/
└── package.json            # Workspace config
```

## Extension System

The framework uses an extension-based architecture where features are added via composable extensions:

```typescript
const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .use(wallets({ config: walletsFromEnv() }))
  .use(payments({ config: paymentsFromEnv() }))
  .use(identity({ config: identityFromEnv() }))
  .use(a2a())
  .build();
```

### Available Extensions

| Extension | Package | Purpose |
|-----------|---------|---------|
| http | @lucid-agents/http | HTTP request/response handling, streaming, SSE |
| wallets | @lucid-agents/wallet | Wallet management for agents |
| payments | @lucid-agents/payments | x402 payment verification and tracking |
| analytics | @lucid-agents/analytics | Payment analytics and reporting |
| identity | @lucid-agents/identity | ERC-8004 on-chain identity and trust |
| a2a | @lucid-agents/a2a | Agent-to-agent communication protocol |
| ap2 | @lucid-agents/ap2 | Agent Payments Protocol extension |

## Adapter System

The framework supports multiple runtime adapters:

| Adapter | Package | Description |
|---------|---------|-------------|
| Hono | @lucid-agents/hono | Lightweight HTTP server, edge-compatible |
| Express | @lucid-agents/express | Traditional Node.js/Express server |
| TanStack Start | @lucid-agents/tanstack | Full-stack React with dashboard (UI) or API-only (headless) |

Templates are adapter-agnostic and work with any compatible adapter.

## Payment Networks

### EVM Networks

| Network | ID | Description |
|---------|-----|-------------|
| base | 8453 | Base mainnet (L2, low cost) |
| base-sepolia | 84532 | Base Sepolia testnet |
| ethereum | 1 | Ethereum mainnet |
| sepolia | 11155111 | Ethereum Sepolia testnet |

### Solana Networks

| Network | Description |
|---------|-------------|
| solana | Solana mainnet (high throughput, low fees) |
| solana-devnet | Solana devnet |

### Key Differences

| Aspect | EVM | Solana |
|--------|-----|--------|
| Signatures | EIP-712 | Ed25519 |
| Tokens | ERC-20 (USDC) | SPL tokens (USDC) |
| Addresses | 0x-prefixed | Base58 |
| Finality | 12s-12min | ~400ms |
| Gas costs | $0.01-$10 | ~$0.0001 |

## Code Structure Principles

### 1. Single Source of Truth
One type definition per concept. Avoid duplicate types. Use type composition or generics, not separate type definitions.

### 2. Encapsulation at the Right Level
Domain complexity belongs in the owning package. The payments package should handle all payments-related complexity.

### 3. Direct Exposure
Expose runtimes directly without unnecessary wrappers. If the type matches what's needed, pass it through.

### 4. Consistency
Similar concepts should follow the same pattern. Consistency reduces cognitive load.

### 5. Public API Clarity
If something needs to be used by consumers, include it in the public type. Don't hide methods or use type casts.

### 6. Simplicity Over Indirection
Avoid unnecessary getters, wrappers, and intermediate objects. Prefer straightforward code.

### 7. Domain Ownership
Each package should own its complexity and return what consumers need.

### 8. No Premature Abstraction
Keep it simple until you actually need the complexity. YAGNI (You Aren't Gonna Need It) applies.

## Coding Standards

### General
- **No emojis** - Do not use emojis in code, comments, or commit messages unless explicitly requested
- **Re-exports are banned** - Do not re-export types or values from other packages. Define types in `@lucid-agents/types` or in the package where they are used.

### TypeScript
- **ESM only** - Use `import`/`export`, not `require()`
- **Strict mode** - All packages use `strict: true`
- **Explicit types** - Avoid `any`, prefer explicit types or `unknown`
- **Type exports** - Export types separately: `export type { MyType }`

### File Naming
- Source: `kebab-case.ts`
- Types: `types.ts` or inline
- Tests: `*.test.ts` in `__tests__/`
- Examples: Descriptive names in `examples/`

## Key Files

| File | Purpose |
|------|---------|
| packages/core/src/core/ | AgentCore, entrypoint management |
| packages/core/src/extensions/ | AgentBuilder, extension system |
| packages/http/src/extension.ts | HTTP extension definition |
| packages/payments/src/extension.ts | Payments extension |
| packages/identity/src/extension.ts | Identity extension |
| packages/hono/src/app.ts | Hono adapter implementation |
| packages/express/src/app.ts | Express adapter implementation |
| packages/tanstack/src/runtime.ts | TanStack adapter implementation |
| packages/cli/src/index.ts | CLI implementation |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun (Node.js 20+ compatible) |
| Language | TypeScript (ESM, strict mode) |
| Build | tsup |
| Package Manager | Bun workspaces |
| Versioning | Changesets |

## Common Commands

### Workspace-Level
```bash
# Install dependencies
bun install

# Build all packages
bun run build:packages

# Create changeset
bun run changeset

# Version packages
bun run release:version

# Publish packages
bun run release:publish
```

### Package-Level
```bash
cd packages/[package-name]

# Build this package
bun run build

# Run tests
bun test

# Type check
bunx tsc --noEmit
```

## Resources

- [AGENTS.md](https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md) - Full AI coding guide
- [CONTRIBUTING.md](https://github.com/daydreamsai/lucid-agents/blob/master/CONTRIBUTING.md) - Contribution guidelines
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [x402 Protocol](https://github.com/paywithx402)
- [A2A Protocol](https://a2a-protocol.org/)
