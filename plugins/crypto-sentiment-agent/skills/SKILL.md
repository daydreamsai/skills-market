---
name: crypto-sentiment-agent
description: |
  Builds a crypto market sentiment agent using the Fear and Greed Index with x402 payments.
  Use when creating crypto trading signal agents, market psychology trackers, or sentiment analysis tools.
---

# Crypto Sentiment Agent

Crypto Fear & Greed Index from Alternative.me. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://crypto-sentiment-agent-production-7ad2.up.railway.app
- **GitHub:** https://github.com/Calcutatator/crypto-sentiment-agent

## API

**Source:** Alternative.me Crypto Fear & Greed Index  
**Base URL:** `https://api.alternative.me/fng/`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Today's Fear & Greed reading |
| `history` | $0.001 | Sentiment history for N days |
| `trend` | $0.002 | Week-over-week trend analysis |
| `extremes` | $0.002 | Extreme fear/greed episodes |
| `signal` | $0.003 | Contrarian buy/sell signal |
| `report` | $0.005 | Comprehensive sentiment report |

## Key API Parameters

```
?limit=1&format=json    # Current reading
?limit=30&format=json   # Last 30 days
?limit=0&format=json    # All-time history
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
