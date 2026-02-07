---
name: gamedeals-agent
description: |
  Builds a video game deal aggregator agent using CheapShark API with x402 payments.
  Use when creating game price trackers, deal alert agents, or gaming marketplace integrations.
---

# Game Deals Agent

Game deals across 30+ stores from CheapShark. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://gamedeals-agent-production.up.railway.app
- **GitHub:** https://github.com/Calcutatator/gamedeals-agent

## API

**Source:** CheapShark  
**Base URL:** `https://www.cheapshark.com/api/1.0`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Top 5 game deals right now |
| `deals` | $0.001 | Filtered deals by price/Metacritic |
| `search` | $0.002 | Search deals by game title |
| `stores` | $0.001 | List all 30+ tracked stores |
| `steals` | $0.003 | Biggest discount percentages |
| `report` | $0.005 | Comprehensive deals market report |

## Key API Endpoints

```
/deals?upperPrice=15&sortBy=DealRating
/deals?metacritic=85&upperPrice=5
/games?title=civilization&limit=5
/stores
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
