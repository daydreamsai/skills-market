---
name: agent-factory
description: |
  Automated pipeline for discovering trending topics, building x402 paid agents,
  deploying them, and marketing. Use when: creating new monetized agents from scratch,
  running scheduled agent factory jobs, or when asked to "find trending topics and build agents".
  
  Pipeline: X trend discovery → deep research → Lucid Agent build → Railway deploy → 
  portfolio update → tweet announcement.
---

# Agent Factory

End-to-end automation for discovering trends, building paid Lucid Agents, and shipping them.

## Prerequisites

### Required Tools
```bash
# Bun runtime
curl -fsSL https://bun.sh/install | bash

# GitHub CLI
brew install gh  # macOS
# or: sudo apt install gh  # Ubuntu

# Railway CLI
npm install -g @railway/cli

# Bird CLI (for X/Twitter)
npm install -g @anthropics/bird
```

### Required Accounts & Credentials
| Service | Purpose | Setup |
|---------|---------|-------|
| GitHub | Code hosting | `gh auth login` |
| Railway | Deployment | `railway login` or set `RAILWAY_TOKEN` |
| X/Twitter | Trend discovery & announcements | Export `AUTH_TOKEN` and `CT0` cookies |
| Ethereum Wallet | Receive x402 payments | Any EVM wallet address |

### Environment Variables
```bash
# Add to ~/.bashrc or ~/.zshrc
export RAILWAY_TOKEN="your-railway-token"
export PAYMENTS_RECEIVABLE_ADDRESS="0xYourWalletAddress"
export AUTH_TOKEN="your-twitter-auth-token"
export CT0="your-twitter-ct0"
```

## Pipeline Overview

```
1. DISCOVER  → Search X for trending topics across ANY domain
2. EVALUATE  → Score topics for monetization potential
3. RESEARCH  → Find real, live data APIs for the topic
4. BUILD     → Create Lucid Agent with 5 paid + 1 free endpoint
5. TEST      → Self-test ALL endpoints with real data
6. DEPLOY    → Ship to Railway with proper env vars
7. PORTFOLIO → Update your portfolio site
8. ANNOUNCE  → Tweet about the new agent
```

## Step 1: Discover Trending Topics

Search X for trending topics across **all domains** - not just crypto!

```bash
# Broad trend discovery
bird search "API data" --limit 50
bird search "real-time analytics" --limit 50
bird search "dashboard" --limit 50

# Domain-specific searches
bird search "sports betting odds" --limit 50
bird search "stock market data" --limit 50
bird search "weather forecast API" --limit 50
bird search "flight tracker" --limit 50
bird search "job market trends" --limit 50
bird search "real estate data" --limit 50
bird search "social media analytics" --limit 50
bird search "gaming stats" --limit 50
bird search "health fitness data" --limit 50
bird search "news aggregator" --limit 50
bird search "crypto defi" --limit 50
bird search "AI model comparison" --limit 50
bird search "energy prices" --limit 50
bird search "shipping logistics" --limit 50
```

**Look for topics where people are:**
- Asking "where can I get this data?"
- Complaining about expensive/limited APIs
- Building dashboards or tools manually
- Requesting automation or aggregation

## Step 2: Evaluate Monetization Potential

Score each topic (1-10) on these criteria:

| Criteria | Weight | Questions |
|----------|--------|-----------|
| **Market Size** | 3x | How many people need this data? |
| **Data Availability** | 2x | Are there free/public APIs to source from? |
| **Pain Point** | 2x | Is current access difficult/expensive? |
| **Uniqueness** | 2x | Are there existing paid alternatives? |
| **Simplicity** | 1x | Can we build it in < 2 hours? |

**Good agent ideas by domain:**

| Domain | Agent Idea | Data Sources |
|--------|------------|--------------|
| Sports | Live odds aggregator | odds-api.com, theoddsapi.com |
| Finance | Stock screener | Yahoo Finance, Alpha Vantage |
| Weather | Severe weather alerts | weather.gov, OpenWeatherMap |
| Travel | Flight price tracker | Skyscanner API, Google Flights |
| Jobs | Salary benchmarks | levels.fyi, Glassdoor |
| Real Estate | Market trends | Zillow, Redfin APIs |
| Gaming | Player stats lookup | Steam API, game-specific APIs |
| Health | Nutrition analyzer | USDA FoodData, Nutritionix |
| News | Topic summarizer | NewsAPI, RSS feeds |
| Crypto | On-chain analytics | DeFiLlama, CoinGecko |
| AI | Model benchmark comparison | Hugging Face, OpenRouter |
| Energy | Electricity prices | EIA, regional grid APIs |
| Social | Engagement analytics | Public social APIs |

**Output:** Single topic with score ≥ 7 and confirmed data source availability.

## Step 3: Research & Find REAL Data Sources

**⚠️ CRITICAL: Agents MUST use real, live data. No hardcoded/static JSON.**

```bash
# Find APIs for your topic
web_search "<topic> free API"
web_search "<topic> public API documentation"
web_search "<topic> data source JSON"

# Evaluate data sources
web_fetch <api_docs_url>
```

**Data Source Requirements:**
- ✅ Public APIs with free tiers
- ✅ Government/open data portals
- ✅ Scraping with web_fetch (as fallback)
- ❌ Hardcoded JSON files
- ❌ Static mock data
- ❌ APIs requiring paid keys (unless you have them)

### Common Free Data Sources by Domain

| Domain | API | Endpoint Example |
|--------|-----|------------------|
| Crypto/DeFi | DeFiLlama | `https://api.llama.fi/v2/chains` |
| Crypto Prices | CoinGecko | `https://api.coingecko.com/api/v3/simple/price` |
| Weather | Open-Meteo | `https://api.open-meteo.com/v1/forecast` |
| Weather | wttr.in | `https://wttr.in/London?format=j1` |
| Stocks | Yahoo Finance | `https://query1.finance.yahoo.com/v8/finance/chart/AAPL` |
| News | RSS Feeds | Various |
| IP/Geo | ip-api | `http://ip-api.com/json/` |
| Exchange Rates | exchangerate.host | `https://api.exchangerate.host/latest` |
| Random Data | randomuser.me | `https://randomuser.me/api/` |
| Public APIs List | public-apis | `https://api.publicapis.org/entries` |
| GitHub Stats | GitHub API | `https://api.github.com/users/{user}` |
| Wikipedia | Wikipedia API | `https://en.wikipedia.org/api/rest_v1/` |
| Countries | restcountries | `https://restcountries.com/v3.1/all` |
| Universities | Hipolabs | `http://universities.hipolabs.com/search` |
| Jokes | JokeAPI | `https://v2.jokeapi.dev/joke/Any` |
| Quotes | quotable | `https://api.quotable.io/random` |
| Books | Open Library | `https://openlibrary.org/api/` |
| Movies | OMDB | `https://www.omdbapi.com/` (free key) |
| Space | NASA | `https://api.nasa.gov/` (free key) |
| Sports | ESPN | `https://site.api.espn.com/apis/` |

**Output:** Research summary with 5 endpoint ideas AND confirmed live data sources.

## Step 4: Build Lucid Agent

### 4.1 Create Project Structure

```bash
mkdir -p <agent-name>/src
cd <agent-name>
```

### 4.2 package.json (CRITICAL: Zod v4!)

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

### 4.3 .gitignore (IMPORTANT!)

```
node_modules/
.data/
*.log
.env
```

### 4.4 src/index.ts Template

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
async function fetchJSON(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// === FREE ENDPOINT (always include one for discovery) ===
addEntrypoint({
  key: 'overview',
  description: 'Free overview - try before you buy',
  input: z.object({}),
  price: { amount: 0 },
  handler: async () => {
    const data = await fetchJSON('https://api.example.com/summary');
    return { 
      output: { 
        summary: data,
        fetchedAt: new Date().toISOString(),
        dataSource: 'Example API (live)'
      } 
    };
  },
});

// === PAID ENDPOINT 1 ($0.001) - Basic query ===
addEntrypoint({
  key: 'lookup',
  description: 'Look up specific item by ID/name',
  input: z.object({ query: z.string() }),
  price: { amount: 1000 },
  handler: async (ctx) => {
    const data = await fetchJSON(`https://api.example.com/item/${ctx.input.query}`);
    return { output: data };
  },
});

// === PAID ENDPOINT 2 ($0.002) - Filtered list ===
addEntrypoint({
  key: 'search',
  description: 'Search with filters',
  input: z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }),
  price: { amount: 2000 },
  handler: async (ctx) => {
    const data = await fetchJSON(
      `https://api.example.com/search?q=${ctx.input.query}&limit=${ctx.input.limit}`
    );
    return { output: data };
  },
});

// === PAID ENDPOINT 3 ($0.002) - Rankings/Top list ===
addEntrypoint({
  key: 'top',
  description: 'Top items by metric',
  input: z.object({ 
    metric: z.enum(['popular', 'recent', 'trending']).optional().default('popular'),
    limit: z.number().optional().default(10)
  }),
  price: { amount: 2000 },
  handler: async (ctx) => {
    const data = await fetchJSON(
      `https://api.example.com/top?by=${ctx.input.metric}&limit=${ctx.input.limit}`
    );
    return { output: data };
  },
});

// === PAID ENDPOINT 4 ($0.003) - Analysis/Comparison ===
addEntrypoint({
  key: 'compare',
  description: 'Compare multiple items',
  input: z.object({ 
    items: z.array(z.string()).min(2).max(5)
  }),
  price: { amount: 3000 },
  handler: async (ctx) => {
    const results = await Promise.all(
      ctx.input.items.map(item => fetchJSON(`https://api.example.com/item/${item}`))
    );
    return { output: { comparison: results, count: results.length } };
  },
});

// === PAID ENDPOINT 5 ($0.005) - Premium/Aggregated ===
addEntrypoint({
  key: 'report',
  description: 'Full report with multiple data sources',
  input: z.object({ subject: z.string() }),
  price: { amount: 5000 },
  handler: async (ctx) => {
    const [source1, source2, source3] = await Promise.all([
      fetchJSON(`https://api.example.com/details/${ctx.input.subject}`),
      fetchJSON(`https://api.example.com/stats/${ctx.input.subject}`),
      fetchJSON(`https://api.example.com/related/${ctx.input.subject}`),
    ]);
    return { 
      output: { 
        details: source1, 
        stats: source2, 
        related: source3,
        generatedAt: new Date().toISOString()
      } 
    };
  },
});

const port = Number(process.env.PORT ?? 3000);
console.log(`Agent running on port ${port}`);

export default { port, fetch: app.fetch };
```

### 4.5 Dockerfile

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

## Step 5: Self-Test ALL Endpoints

**⚠️ DO NOT DEPLOY until all endpoints pass testing.**

```bash
cd <agent-name>
bun install

# Start server with required env vars
PAYMENTS_RECEIVABLE_ADDRESS=$PAYMENTS_RECEIVABLE_ADDRESS \
FACILITATOR_URL=https://facilitator.daydreams.systems \
NETWORK=base \
bun run src/index.ts &

sleep 5

echo "=== Testing ALL Endpoints ==="

# Health check
curl -s http://localhost:3000/health | jq .

# FREE endpoint
curl -s -X POST http://localhost:3000/entrypoints/overview/invoke \
  -H "Content-Type: application/json" -d '{}' | jq .

# PAID endpoints (test each one)
curl -s -X POST http://localhost:3000/entrypoints/lookup/invoke \
  -H "Content-Type: application/json" -d '{"query":"test"}' | jq .

curl -s -X POST http://localhost:3000/entrypoints/search/invoke \
  -H "Content-Type: application/json" -d '{"query":"test","limit":5}' | jq .

curl -s -X POST http://localhost:3000/entrypoints/top/invoke \
  -H "Content-Type: application/json" -d '{"metric":"popular","limit":5}' | jq .

curl -s -X POST http://localhost:3000/entrypoints/compare/invoke \
  -H "Content-Type: application/json" -d '{"items":["item1","item2"]}' | jq .

curl -s -X POST http://localhost:3000/entrypoints/report/invoke \
  -H "Content-Type: application/json" -d '{"subject":"test"}' | jq .

# Kill test server
pkill -f "bun run src/index"

echo "=== All tests complete ==="
```

**Validation Criteria (ALL must pass):**
- [ ] `status` = `"succeeded"` for every endpoint
- [ ] `output` contains actual data (not empty `{}`)
- [ ] Data is live (timestamps, varying values)
- [ ] Response time < 10 seconds

## Step 6: Deploy to Railway

### 6.1 Create GitHub Repo

```bash
cd <agent-name>
git init && git add . && git commit -m "Initial commit: <agent-name>"
gh repo create <your-username>/<agent-name> --public --source=. --push
```

### 6.2 Deploy to Railway

```bash
# Set environment variables
railway variables set \
  PAYMENTS_RECEIVABLE_ADDRESS=$PAYMENTS_RECEIVABLE_ADDRESS \
  FACILITATOR_URL=https://facilitator.daydreams.systems \
  NETWORK=base \
  --service <agent-name>

# Deploy
railway up --detach --service <agent-name>
```

### 6.3 Verify Deployment

```bash
sleep 90

# Test live
curl https://<agent-name>-production.up.railway.app/health
curl -X POST https://<agent-name>-production.up.railway.app/entrypoints/overview/invoke \
  -H "Content-Type: application/json" -d '{}'
```

## Step 7: Update Portfolio

Add to your portfolio with:
- Agent name and one-line description
- Domain/category tag
- Link to live API
- Link to GitHub repo
- Endpoint count (1 free + 5 paid)

## Step 8: Announce

```bash
bird tweet "🚀 Just shipped: <Agent Name>

<One-line value prop>

✅ 1 free endpoint to try
💰 5 paid endpoints via x402

Built with @daydreamsagents Lucid Agents SDK

Try it: <url>

#AI #Agents #x402 #<domain>"
```

## Complete Checklist

### Prerequisites
- [ ] Bun installed
- [ ] GitHub CLI authenticated (`gh auth status`)
- [ ] Railway CLI authenticated
- [ ] X/Twitter cookies configured
- [ ] Wallet address set in `PAYMENTS_RECEIVABLE_ADDRESS`

### Discovery & Research
- [ ] Topic selected from X trends (with evidence of demand)
- [ ] Monetization score ≥ 7
- [ ] Live data sources identified (at least 1 real API)
- [ ] NO hardcoded/static data planned

### Build
- [ ] 5 paid endpoints + 1 free endpoint
- [ ] Zod v4 in package.json (`"zod": "^4.0.0"`)
- [ ] .gitignore includes `node_modules/`
- [ ] All endpoints fetch REAL data

### Self-Test (MANDATORY)
- [ ] Server starts without errors
- [ ] `/health` returns `{"ok":true}`
- [ ] ALL 6 endpoints tested and return real data
- [ ] All responses have `status: "succeeded"`
- [ ] No empty outputs

### Deploy
- [ ] GitHub repo created and pushed
- [ ] Railway env vars set
- [ ] Deployment successful
- [ ] Live endpoints return real data

### Announce
- [ ] Portfolio updated
- [ ] Tweet composed/posted

## Common Errors

| Error | Fix |
|-------|-----|
| `z.toJSONSchema is not a function` | Use Zod v4: `bun add zod@4` |
| `PAYMENTS_RECEIVABLE_ADDRESS not set` | Set env var |
| `EADDRINUSE` | Don't call Bun.serve() - use export default |
| 404 on endpoint | Check endpoint key matches URL path |
| Empty output | API call failed - check data source URL |
| Railway build fails | Check logs: `railway logs --build` |

## Resources

- [Lucid Agents SDK](https://github.com/daydreamsai/lucid-agents)
- [x402 Protocol](https://x402.org)
- [Public APIs List](https://github.com/public-apis/public-apis)
- [Free API Directory](https://free-apis.github.io)
