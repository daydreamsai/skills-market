---
name: b2a-agents
description: |
  Builds agents that serve other AI agents (B2A). Use when designing x402 agents
  for agent-to-agent data sales, evaluating if a data niche is suitable for agents,
  or when asked to "build something agents would pay for".
---

# B2A Agents: Building for Agent Consumers

Build x402 agents that other AI agents need and will pay for.

## Why B2A Wins

| Consumer (B2C) | Agent (B2A) |
|----------------|-------------|
| Friction to pay micropayments | Programmatic, zero friction |
| Irregular usage patterns | Consistent, predictable calls |
| High churn | Sticky once integrated |
| Needs UI/UX | Needs clean JSON |
| One user = one user | One agent = many end users |

**Core insight:** Build data infrastructure, not consumer apps.

## B2A Evaluation Gate

Before building, answer YES to ALL:

1. **Would another AI agent pay $0.001+ for this?** (not "would a human think this is cool")
2. **Is the data unique, aggregated, or hard to get?**
3. **Does it solve a recurring need?** (called repeatedly, not once)
4. **Can it be called programmatically without human context?**

If any answer is NO → find a different niche.

## High-Value B2A Categories

| Category | What Agents Need | Example Endpoints |
|----------|------------------|-------------------|
| **Price Aggregation** | Normalized multi-source prices | `GET /prices/crypto/{symbol}`, `GET /prices/forex/{pair}` |
| **Entity Resolution** | Company/person/domain context | `GET /entity/company/{domain}`, `GET /entity/person/{handle}` |
| **News & Events** | Filtered real-time feeds | `GET /news/breaking?topic=X`, `GET /events/earnings` |
| **Social Signals** | Trending/sentiment data | `GET /social/trending`, `GET /social/sentiment/{topic}` |
| **Geocoding** | Location intelligence | `GET /geo/lookup?address=X`, `GET /geo/timezone/{coords}` |
| **Content Analysis** | Pre-computed classification | `GET /analyze/toxicity`, `GET /analyze/language` |
| **Rate-Limit Caching** | Wrapped scarce APIs | Any limited free API with caching layer |
| **Cross-Platform** | Identity correlation | `GET /identity/resolve?handle=X` |

## Design Principles

### 1. Optimize for Programmatic Access

```typescript
// ✅ Good: Clean, typed, predictable
addEntrypoint({
  key: 'lookup',
  input: z.object({ 
    symbol: z.string(),
    exchanges: z.array(z.string()).optional()
  }),
  handler: async (ctx) => {
    return { output: { symbol, prices, timestamp } };
  }
});

// ❌ Bad: Human-oriented, vague
addEntrypoint({
  key: 'search',
  input: z.object({ query: z.string() }), // Too vague
  handler: async (ctx) => {
    return { output: { message: "Here's what I found..." } }; // Prose, not data
  }
});
```

### 2. Return Structured Data, Not Prose

```typescript
// ✅ Good: Structured, parseable
return {
  output: {
    entity: "Apple Inc",
    domain: "apple.com",
    type: "public_company",
    ticker: "AAPL",
    employees: 164000,
    founded: 1976
  }
};

// ❌ Bad: Natural language
return {
  output: {
    description: "Apple Inc is a technology company founded in 1976..."
  }
};
```

### 3. Include Metadata Agents Need

```typescript
return {
  output: {
    data: results,
    // Metadata agents use for decisions:
    fetchedAt: new Date().toISOString(),
    source: "coingecko+binance",
    cacheAge: 30, // seconds
    nextUpdate: "2025-01-30T12:00:00Z"
  }
};
```

### 4. Price by Value, Not Compute

| Endpoint Type | Suggested Price | Rationale |
|---------------|-----------------|-----------|
| Health/status | FREE | Discovery |
| Single lookup | $0.001 | Basic utility |
| Filtered list | $0.002 | More data |
| Multi-source aggregation | $0.003-0.005 | Unique value |
| Premium analysis | $0.005-0.01 | High compute or rare data |

### 5. One Free Endpoint (Always)

```typescript
// Every agent needs a free "try before buy" endpoint
addEntrypoint({
  key: 'overview',
  description: 'Free overview - see what data is available',
  price: { amount: 0 },
  handler: async () => {
    return {
      output: {
        available: ['lookup', 'search', 'aggregate', 'analyze'],
        dataSource: 'Multi-exchange aggregated',
        updateFrequency: '30 seconds',
        sampleData: await fetchSample()
      }
    };
  }
});
```

## Anti-Patterns (Avoid)

| Pattern | Why It Fails |
|---------|--------------|
| Consumer novelty (games, trivia) | Agents don't play games |
| Single API wrapper | No unique value over calling directly |
| Static/mock data | Agents need live data |
| Human-oriented output | "Here's what I found..." |
| One-time use | No recurring revenue |
| Vague inputs | `query: string` with no schema |
| Missing timestamps | Agents can't assess freshness |

## B2A Agent Template

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod';

const agent = await createAgent({
  name: 'data-feed-agent',
  version: '1.0.0',
  description: 'Aggregated data feed for AI agents',
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// Cache for rate-limit protection
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 seconds

async function fetchWithCache(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.data, fromCache: true };
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return { ...data, fromCache: false };
}

// FREE: Discovery endpoint
addEntrypoint({
  key: 'overview',
  description: 'Free overview of available data',
  input: z.object({}),
  price: { amount: 0 },
  handler: async () => ({
    output: {
      endpoints: ['lookup', 'list', 'aggregate'],
      sources: ['source1', 'source2'],
      updateFrequency: '30s',
      fetchedAt: new Date().toISOString()
    }
  })
});

// PAID: Lookup
addEntrypoint({
  key: 'lookup',
  description: 'Look up specific item',
  input: z.object({ id: z.string() }),
  price: { amount: 1000 }, // $0.001
  handler: async (ctx) => {
    const result = await fetchWithCache(`lookup:${ctx.input.id}`, async () => {
      // Fetch from real API
      return fetch(`https://api.example.com/${ctx.input.id}`).then(r => r.json());
    });
    return { output: { ...result, fetchedAt: new Date().toISOString() } };
  }
});

// PAID: Aggregated multi-source
addEntrypoint({
  key: 'aggregate',
  description: 'Aggregated data from multiple sources',
  input: z.object({ 
    ids: z.array(z.string()).max(10),
    sources: z.array(z.string()).optional()
  }),
  price: { amount: 3000 }, // $0.003
  handler: async (ctx) => {
    const results = await Promise.all(
      ctx.input.ids.map(id => fetchWithCache(`agg:${id}`, () => 
        aggregateFromSources(id, ctx.input.sources)
      ))
    );
    return { 
      output: { 
        items: results,
        count: results.length,
        fetchedAt: new Date().toISOString()
      }
    };
  }
});

export default { port: Number(process.env.PORT ?? 3000), fetch: app.fetch };
```

## Validation Checklist

Before deploying a B2A agent:

- [ ] All endpoints return structured JSON (no prose)
- [ ] Timestamps included (`fetchedAt`, `cacheAge`)
- [ ] Data sources documented
- [ ] One free endpoint exists
- [ ] Prices reflect value, not just compute
- [ ] Inputs are strongly typed (not just `query: string`)
- [ ] Rate limiting / caching implemented
- [ ] Tested with real API calls
