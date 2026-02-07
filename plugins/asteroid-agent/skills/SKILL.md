---
name: asteroid-agent
description: |
  Builds a near-Earth asteroid tracking agent using NASA NeoWs API with x402 payments.
  Use when creating space object trackers, asteroid alert systems, or planetary defense data feeds.
---

# Asteroid Agent

Near-Earth asteroid data from NASA NeoWs. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://asteroid-agent-production-4769.up.railway.app
- **GitHub:** https://github.com/Calcutatator/asteroid-agent

## API

**Source:** NASA Near Earth Object Web Service (JPL)  
**Base URL:** `https://api.nasa.gov/neo/rest/v1`  
**Auth:** DEMO_KEY (free, no signup)

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Today's close approaches summary |
| `today` | $0.001 | All asteroids approaching today |
| `hazardous` | $0.002 | Potentially hazardous this week |
| `lookup` | $0.002 | Specific asteroid by NASA ID |
| `week` | $0.003 | All close approaches next 7 days |
| `report` | $0.005 | Comprehensive asteroid threat report |

## Key API Endpoints

```
/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&api_key=DEMO_KEY
/neo/{id}?api_key=DEMO_KEY
/neo/browse?api_key=DEMO_KEY
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
