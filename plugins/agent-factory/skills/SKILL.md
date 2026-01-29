---
name: agent-factory
description: |
  Automated pipeline for discovering trending topics, building x402 paid agents,
  deploying them, and marketing. Use when: creating new monetized agents from scratch,
  running scheduled agent factory jobs, or when asked to "find trending topics and build agents".
  
  Pipeline: Trend discovery → deep research → Lucid Agent build → Railway deploy → 
  portfolio update → tweet announcement.
---

# Agent Factory

End-to-end automation for discovering trends, building paid Lucid Agents, and shipping them.

## Pipeline Overview

```
1. DISCOVER  → Search for trending topics (X, CoinGecko, DeFiLlama)
2. RESEARCH  → Deep dive on the most promising topic, find REAL data APIs
3. BUILD     → Create Lucid Agent with 5 paid x402 endpoints + 1 free
4. TEST      → Self-test ALL endpoints with real data
5. DEPLOY    → Ship to Railway/Vercel with proper env vars
6. PORTFOLIO → Update your portfolio site
7. ANNOUNCE  → Tweet about the new agent
```

## Step 1: Discover Trending Topics

Search for trending topics in your target domain.

```bash
# CoinGecko trending
curl -s https://api.coingecko.com/api/v3/search/trending

# DeFiLlama categories
curl -s https://api.llama.fi/protocols

# Or use bird CLI for X trends
bird search "defi yield" --limit 50
bird search "crypto AI" --limit 50
```

**Selection criteria:**
- High engagement / recent activity
- Gap in existing tooling
- Monetizable (people would pay for data/analysis)
- Has accessible public APIs for live data

**Output:** Single topic with clear market need.

## Step 2: Deep Research & Find REAL Data Sources

**⚠️ CRITICAL: Agents MUST use real, live data. No hardcoded/static JSON.**

Research the selected topic thoroughly.

```bash
# Find APIs for your topic
web_search "<topic> API"
web_search "<topic> data providers free API"

# Fetch and evaluate data sources
web_fetch <api_docs_url>
```

**Data Source Requirements:**
- ✅ Public APIs (DeFiLlama, CoinGecko, etc.)
- ✅ On-chain RPC calls
- ✅ Scraping with web_fetch (as fallback)
- ❌ Hardcoded JSON files
- ❌ Static mock data
- ❌ Placeholder responses

### Common Live Data Sources

| Domain | API | Free Tier |
|--------|-----|-----------|
| DeFi TVL/Yields | https://api.llama.fi | ✅ Unlimited |
| Token Prices | https://api.coingecko.com | ✅ Rate limited |
| Derivatives | https://api.llama.fi/overview/derivatives | ✅ Unlimited |
| Bridges | https://bridges.llama.fi/bridges | ✅ Unlimited |
| Stablecoins | https://stablecoins.llama.fi | ✅ Unlimited |
| Gas Prices | https://api.etherscan.io | ✅ Free tier |

**Output:** Research summary with 5 endpoint ideas AND confirmed live data sources.

## Step 3: Build Lucid Agent

### 3.1 Create Project Structure

```bash
mkdir -p <agent-name>/src
cd <agent-name>
```

### 3.2 package.json (CRITICAL: Zod v4!)

```json
{
  "name": "<agent-name>",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "@lucid-agents/core": "latest",
    "@lucid-agents/http": "latest",
    "@lucid-agents/hono": "latest",
    "@lucid-agents/payments": "latest",
    "hono": "^4.0.0",
    "zod": "^4.0.0"
  }
}
```

### 3.3 .gitignore (IMPORTANT!)

```
node_modules/
.data/
*.log
```

### 3.4 src/index.ts Template

**⚠️ CRITICAL: All handlers MUST fetch real data. No hardcoded responses.**

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { createAgentApp } from '@lucid-agents/hono';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod';  // MUST BE v4!

const agent = await createAgent({
  name: '<agent-name>',
  version: '1.0.0',
  description: '<description>',
})
  .use(http())
  .use(payments({ config: paymentsFromEnv() }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

// === HELPER: Fetch real data ===
async function fetchLiveData(endpoint: string) {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// === FREE ENDPOINT (always include one) ===
addEntrypoint({
  key: 'overview',
  description: 'Free market overview',
  input: z.object({}),
  price: { amount: 0 },
  handler: async () => {
    // ✅ CORRECT: Fetch real data
    const data = await fetchLiveData('https://api.llama.fi/v2/chains');
    return { output: { data: data.slice(0, 5), fetchedAt: new Date().toISOString() } };
  },
});

// === PAID ENDPOINT 1 ($0.001) ===
addEntrypoint({
  key: 'details',
  description: 'Detailed analysis',
  input: z.object({ query: z.string() }),
  price: { amount: 1000 },  // microunits
  handler: async (ctx) => {
    const data = await fetchLiveData(`https://api.example.com/data?q=${ctx.input.query}`);
    return { output: data };
  },
});

// Add more paid endpoints (2-5) following same pattern...

const port = Number(process.env.PORT ?? 3000);
console.log(`Agent running on port ${port}`);

export default { port, fetch: app.fetch };
```

### 3.5 Dockerfile

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 8080
ENV PORT=8080
CMD ["bun", "run", "src/index.ts"]
```

### 3.6 MANDATORY: Self-Test ALL Endpoints

**⚠️ DO NOT DEPLOY until all endpoints pass testing.**

```bash
cd <agent-name>
bun install

# Start server with required env vars
PAYMENTS_RECEIVABLE_ADDRESS=<your-wallet> \
FACILITATOR_URL=https://facilitator.daydreams.systems \
NETWORK=base \
bun run src/index.ts &

sleep 5

# Test ALL endpoints
curl -s http://localhost:3000/health

curl -s -X POST http://localhost:3000/entrypoints/overview/invoke \
  -H "Content-Type: application/json" -d '{}'

# Test each paid endpoint...

pkill -f "bun run src/index"
```

**Test Validation Criteria:**

For EACH endpoint, verify:
- [ ] `status` = `"succeeded"` (not `"failed"`)
- [ ] `output` contains actual data (not empty `{}`)
- [ ] Data looks real (timestamps, varying values)
- [ ] Response time < 10 seconds

## Step 4: Deploy to Railway

### 4.1 Create GitHub Repo

```bash
cd <agent-name>
git init && git add . && git commit -m "Initial commit"
gh repo create <your-username>/<agent-name> --public --source=. --push
```

### 4.2 Deploy to Railway

```bash
# Set environment variables (CRITICAL!)
RAILWAY_TOKEN=<your-token> railway variables set \
  PAYMENTS_RECEIVABLE_ADDRESS=<your-wallet-address> \
  FACILITATOR_URL=https://facilitator.daydreams.systems \
  NETWORK=base \
  --service <agent-name>

# Deploy
RAILWAY_TOKEN=<your-token> railway up --detach --service <agent-name>
```

### 4.3 Verify Deployment

```bash
sleep 90
curl https://<agent-name>-production.up.railway.app/health
curl -X POST https://<agent-name>-production.up.railway.app/entrypoints/overview/invoke \
  -H "Content-Type: application/json" -d '{}'
```

## Step 5: Update Portfolio

Add the new agent to your portfolio site with:
- Agent name and description
- Link to live API
- Link to GitHub repo
- Free vs paid endpoint counts

## Step 6: Announce

Compose a tweet:
```
🚀 Just shipped: <Agent Name>

<One-line description>

✅ 1 free endpoint
💰 5 paid endpoints via x402

Built with @daydreamsagents Lucid Agents SDK

Try it: <your-url>
```

## Checklist

**⚠️ ALL items must be checked before considering the job complete.**

### Discovery & Research
- [ ] Topic selected with evidence of demand
- [ ] Live data sources identified (at least 1 real API)
- [ ] NO hardcoded/static data in any endpoint

### Build
- [ ] 5 paid endpoints + 1 free endpoint
- [ ] Zod v4 in package.json (`"zod": "^4.0.0"`)
- [ ] .gitignore includes node_modules/
- [ ] All endpoints fetch REAL data

### Self-Test (MANDATORY)
- [ ] Server starts without errors
- [ ] `/health` returns `{"ok":true}`
- [ ] ALL 6 endpoints tested and return real data
- [ ] All responses have `status: "succeeded"`
- [ ] No empty outputs `{}`

### Deploy
- [ ] GitHub repo created and pushed
- [ ] Railway env vars set (PAYMENTS_RECEIVABLE_ADDRESS, FACILITATOR_URL, NETWORK)
- [ ] Deployment successful
- [ ] Live endpoints return real data

### Announce
- [ ] Portfolio updated
- [ ] Tweet composed/posted

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `PAYMENTS_RECEIVABLE_ADDRESS` | Your wallet address to receive x402 payments |
| `FACILITATOR_URL` | `https://facilitator.daydreams.systems` |
| `NETWORK` | `base` (or other supported network) |
| `RAILWAY_TOKEN` | Your Railway API token for deployments |

## Common Errors

| Error | Fix |
|-------|-----|
| `z.toJSONSchema is not a function` | Update to Zod v4: `bun add zod@4` |
| `PAYMENTS_RECEIVABLE_ADDRESS not set` | Set required env vars |
| `EADDRINUSE` | Don't call Bun.serve() explicitly - use export default |
| Railway deploy fails | Check build logs: `railway logs --build` |

## Resources

- [Lucid Agents SDK](https://github.com/daydreamsai/lucid-agents)
- [DeFiLlama API Docs](https://defillama.com/docs/api)
- [x402 Protocol](https://x402.org)
