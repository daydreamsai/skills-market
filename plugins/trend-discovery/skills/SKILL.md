---
name: trend-discovery
description: |
  Discovers trending topics on X/Twitter and the web. Finds opportunities where
  people need data/APIs. Use when starting any agent creation workflow.
---

# Trend Discovery

Find trending topics with monetization potential across any domain.

## Prerequisites

```bash
# Bird CLI for X/Twitter (optional but recommended)
npm install -g @anthropics/bird

# Set X cookies for bird
export AUTH_TOKEN="your-twitter-auth-token"
export CT0="your-twitter-ct0"
```

## Step 1: Search X for Trends

```bash
# Broad discovery
bird search "need API for" --limit 50
bird search "where can I get data" --limit 50
bird search "real-time analytics" --limit 50

# Domain-specific
bird search "sports betting odds API" --limit 50
bird search "stock market data API" --limit 50
bird search "weather forecast API" --limit 50
bird search "flight tracker API" --limit 50
bird search "crypto defi data" --limit 50
bird search "AI model comparison" --limit 50
bird search "job market salary data" --limit 50
bird search "real estate trends API" --limit 50
bird search "gaming stats API" --limit 50
bird search "health fitness tracker" --limit 50
```

## Step 2: Alternative Discovery (No X Access)

```bash
# CoinGecko trending
curl -s https://api.coingecko.com/api/v3/search/trending | jq '.coins[].item.name'

# GitHub trending topics
web_fetch https://github.com/trending

# Hacker News top
web_fetch https://news.ycombinator.com

# Reddit rising topics
web_fetch https://www.reddit.com/r/programming/rising/

# Product Hunt trending
web_fetch https://www.producthunt.com
```

## Step 3: Evaluate Topics

Score each topic 1-10 on:

| Criteria | Weight | Questions |
|----------|--------|-----------|
| **Market Size** | 3x | How many people need this? |
| **Data Availability** | 2x | Are there free/public APIs? |
| **Pain Point** | 2x | Is current access difficult/expensive? |
| **Uniqueness** | 2x | Are there existing solutions? |
| **Simplicity** | 1x | Can we build it in < 2 hours? |

**Minimum score to proceed:** 7/10

## Example Topic Ideas by Domain

| Domain | Topic | Why It Works |
|--------|-------|--------------|
| Space | Solar storms | NOAA free API, niche audience |
| Geology | Earthquakes | USGS free API, global demand |
| Finance | Stock screener | Yahoo Finance free, traders need tools |
| Weather | Severe alerts | weather.gov free, safety critical |
| Crypto | DEX analytics | DeFiLlama free, active traders |
| Sports | Live odds | odds-api.com, betting audience |
| Travel | Flight prices | Skyscanner API, price sensitive |
| Gaming | Player stats | Steam API, competitive gamers |

## Output

Provide:
1. **Topic name** and one-line description
2. **Score** with breakdown
3. **Target audience** (who would pay?)
4. **Potential data sources** (to research in next step)

## Next Step

→ Use **api-research** skill to find live data sources
