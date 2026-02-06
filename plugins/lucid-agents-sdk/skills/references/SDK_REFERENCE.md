# Lucid Agents SDK Reference

Detailed reference material for monorepo development. For core SDK patterns, see [SKILL.md](../SKILL.md).

## Contents

- Code Structure Principles
- Monorepo Structure
- Common Commands
- Additional Adapter Examples (Express, TanStack, Analytics, Identity)
- CLI Usage
- Coding Standards
- Testing Local Packages
- Common Development Tasks
- Troubleshooting
- Key Files

## Code Structure Principles

1. **Single Source of Truth** - One type definition per concept. Use type composition, not duplicates.
2. **Encapsulation at the Right Level** - Domain complexity belongs in the owning package.
3. **Direct Exposure** - Expose runtimes directly without unnecessary wrappers.
4. **Consistency** - Similar concepts follow the same pattern.
5. **Public API Clarity** - Include needed methods in public types. No hidden methods or type casts.
6. **Simplicity Over Indirection** - Avoid unnecessary getters, wrappers, and intermediate objects.
7. **Domain Ownership** - Each package owns its complexity and returns what consumers need.
8. **No Premature Abstraction** - YAGNI applies.

## Monorepo Structure

```text
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

## Common Commands

### Workspace-Level

```bash
bun install                  # Install dependencies
bun run build:packages       # Build all packages
bun run changeset            # Create changeset
bun run release:version      # Version packages
bun run release:publish      # Publish packages
```

### Package-Level

```bash
cd packages/[package-name]
bun run build                # Build this package
bun test                     # Run tests
bunx tsc --noEmit            # Type check
```

## Additional Adapter Examples

### Express Adapter

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/express';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// Express apps need to listen on a port
const server = app.listen(process.env.PORT ?? 3000);
```

### TanStack Adapter

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createTanStackRuntime } from '@lucid-agents/tanstack';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .build();

const { runtime: tanStackRuntime, handlers } = await createTanStackRuntime(agent);

// Use runtime.addEntrypoint() instead of addEntrypoint()
tanStackRuntime.addEntrypoint({ ... });

// Export for TanStack routes
export { runtime: tanStackRuntime, handlers };
```

### Analytics Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { analytics, getSummary, exportToCSV } from '@lucid-agents/analytics';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(payments({ config: paymentsFromEnv() }))
  .use(analytics())
  .build();

// Get payment summary
const summary = await getSummary(agent.analytics.paymentTracker, 86400000);

// Export to CSV for accounting
const csv = await exportToCSV(agent.analytics.paymentTracker);
```

### Identity Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { wallets, walletsFromEnv } from '@lucid-agents/wallet';
import { identity, identityFromEnv } from '@lucid-agents/identity';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(wallets({ config: walletsFromEnv() }))
  .use(identity({ config: identityFromEnv() }))
  .build();

// Identity automatically handles ERC-8004 registration
```

## CLI Usage

### Interactive Mode

```bash
bunx @lucid-agents/cli my-agent
```

### With Adapter Selection

```bash
bunx @lucid-agents/cli my-agent --adapter=hono
bunx @lucid-agents/cli my-agent --adapter=express
bunx @lucid-agents/cli my-agent --adapter=tanstack-ui
bunx @lucid-agents/cli my-agent --adapter=tanstack-headless
```

### Non-Interactive Mode

```bash
bunx @lucid-agents/cli my-agent \
  --adapter=hono \
  --template=axllm \
  --non-interactive \
  --AGENT_NAME="My AI Agent" \
  --AGENT_DESCRIPTION="AI-powered assistant" \
  --OPENAI_API_KEY=your_api_key_here \
  --PAYMENTS_RECEIVABLE_ADDRESS=0xYourAddress \
  --NETWORK=ethereum \
  --DEFAULT_PRICE=1000
```

## Coding Standards

### General
- **No emojis** in code, comments, or commit messages unless explicitly requested
- **Re-exports are banned** - Define types in `@lucid-agents/types` or in the owning package

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

## Testing Local Packages

Use bun's linking feature for testing local changes:

1. Register packages globally:
   ```bash
   cd packages/types && bun link
   cd ../wallet && bun link
   ```

2. Update test project's `package.json`:
   ```json
   { "dependencies": { "@lucid-agents/wallet": "link:@lucid-agents/wallet" } }
   ```

3. Install and test:
   ```bash
   cd my-test-agent && bun install
   ```

4. Make changes and rebuild:
   ```bash
   cd lucid-agents/packages/wallet
   bun run build  # Changes reflected immediately
   ```

## Common Development Tasks

### Adding a New Feature to a Package

1. Create implementation in `packages/[package]/src/feature.ts`
2. Add types to `types.ts` or inline
3. Export from `index.ts`
4. Add tests in `__tests__/feature.test.ts`
5. Update package `README.md` and `AGENTS.md`
6. Create changeset: `bun run changeset`

### Creating a New Template

1. Create directory: `packages/cli/templates/my-template/`
2. Add required files: `src/agent.ts`, `src/index.ts`, `package.json`, `tsconfig.json`
3. Create `template.json` with wizard configuration
4. Create `template.schema.json` documenting all arguments
5. Create `AGENTS.md` with comprehensive examples
6. Test: `bunx ./packages/cli/dist/index.js test-agent --template=my-template`

## Troubleshooting

### "Module not found" errors
1. Build all packages: `bun run build:packages`
2. Install dependencies: `bun install`
3. Check import paths are correct

### TypeScript errors in templates
1. Build packages first
2. Check template `package.json` references correct versions
3. Run `bunx tsc --noEmit` in template directory

### Build fails
1. Check TypeScript version matches across packages
2. Verify all imports are resolvable
3. Check for circular dependencies
4. Run `bun install` again

## Key Files

- **packages/core/src/core/** - AgentCore, entrypoint management
- **packages/core/src/extensions/** - AgentBuilder, extension system
- **packages/http/src/extension.ts** - HTTP extension definition
- **packages/payments/src/extension.ts** - Payments extension
- **packages/identity/src/extension.ts** - Identity extension
- **packages/hono/src/app.ts** - Hono adapter implementation
- **packages/express/src/app.ts** - Express adapter implementation
- **packages/tanstack/src/runtime.ts** - TanStack adapter implementation
- **packages/cli/src/index.ts** - CLI implementation
