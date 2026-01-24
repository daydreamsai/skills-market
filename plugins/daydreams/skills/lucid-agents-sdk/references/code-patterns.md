# Lucid Agents SDK - Code Patterns

Complete code examples and patterns for building Lucid Agents.

## Core Agent Creation

### Basic Agent

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { z } from 'zod';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
  description: 'My first agent',
})
  .use(http())
  .build();

agent.entrypoints.add({
  key: 'greet',
  input: z.object({ name: z.string() }),
  async handler({ input }) {
    return { output: { message: `Hello, ${input.name}` } };
  },
});
```

### Full-Featured Agent

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

## Adapter Patterns

### Hono Adapter

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

addEntrypoint({
  key: 'echo',
  description: 'Echo back input',
  input: z.object({ text: z.string() }),
  handler: async ctx => {
    return { output: { text: ctx.input.text } };
  },
});

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
```

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

## Extension Patterns

### Payments Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(
    payments({
      config: {
        ...paymentsFromEnv(),
        policyGroups: [
          {
            name: 'Daily Limits',
            outgoingLimits: {
              global: { maxTotalUsd: 100.0, windowMs: 86400000 },
            },
            incomingLimits: {
              global: { maxTotalUsd: 5000.0, windowMs: 86400000 },
            },
          },
        ],
      },
      storage: { type: 'sqlite' }, // or 'in-memory' or 'postgres'
    })
  )
  .build();
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

### A2A Extension

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { a2a } from '@lucid-agents/a2a';

const agent = await createAgent({
  name: 'my-agent',
  version: '1.0.0',
})
  .use(http())
  .use(a2a())
  .build();

// Call another agent
const result = await agent.a2a.client.invoke(
  'https://other-agent.com',
  'skillId',
  { input: 'data' }
);
```

## Streaming Entrypoints

```typescript
addEntrypoint({
  key: 'chat',
  description: 'Chat with AI assistant',
  input: z.object({ message: z.string() }),
  streaming: true,
  async stream(ctx, emit) {
    const stream = await ai.chat.stream({ messages: [{ role: 'user', content: ctx.input.message }] });

    for await (const chunk of stream) {
      await emit({
        kind: 'delta',
        delta: chunk.delta,
        mime: 'text/plain',
      });
    }

    return {
      output: { completed: true },
      usage: { total_tokens: stream.usage.total_tokens },
    };
  },
});
```

## CLI Usage

### Interactive Mode
```bash
bunx @lucid-agents/cli my-agent
```

### With Adapter Selection
```bash
# Hono adapter
bunx @lucid-agents/cli my-agent --adapter=hono

# Express adapter
bunx @lucid-agents/cli my-agent --adapter=express

# TanStack UI (full dashboard)
bunx @lucid-agents/cli my-agent --adapter=tanstack-ui

# TanStack Headless (API only)
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
  --NETWORK=base-sepolia \
  --DEFAULT_PRICE=1000
```

## Testing Local Packages

Use bun's linking feature for testing local changes:

1. **Register packages globally**:
   ```bash
   cd packages/types
   bun link

   cd ../wallet
   bun link
   ```

2. **Update test project's `package.json`**:
   ```json
   {
     "dependencies": {
       "@lucid-agents/wallet": "link:@lucid-agents/wallet"
     }
   }
   ```

3. **Install and test**:
   ```bash
   cd my-test-agent
   bun install
   ```

4. **Make changes and rebuild**:
   ```bash
   cd lucid-agents/packages/wallet
   # Make changes
   bun run build
   # Changes reflected immediately
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
