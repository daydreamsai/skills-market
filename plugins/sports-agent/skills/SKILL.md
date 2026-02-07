---
name: sports-agent
description: |
  Builds a live sports scores agent using ESPN API with x402 payments.
  Use when creating sports data agents, real-time scoreboard integrations, or multi-league sports feeds.
---

# Sports Agent

Live sports scores from ESPN. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://sports-agent-production.up.railway.app
- **GitHub:** https://github.com/Calcutatator/sports-agent

## API

**Source:** ESPN  
**Base URL:** `https://site.api.espn.com/apis/site/v2/sports`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Today's NFL + NBA scores |
| `nfl` | $0.001 | Full NFL scoreboard |
| `nba` | $0.002 | Full NBA scoreboard |
| `soccer` | $0.002 | Premier League scoreboard |
| `scores` | $0.003 | Any sport/league by parameter |
| `report` | $0.005 | Multi-sport comprehensive report |

## Key API Endpoints

```
/football/nfl/scoreboard    # NFL scores
/basketball/nba/scoreboard  # NBA scores
/soccer/eng.1/scoreboard    # Premier League
/baseball/mlb/scoreboard    # MLB scores
/hockey/nhl/scoreboard      # NHL scores
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
