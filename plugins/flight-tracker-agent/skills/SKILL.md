---
name: flight-tracker-agent
description: |
  Builds a real-time flight tracking agent using OpenSky Network API with x402 payments.
  Use when creating aviation monitoring agents, aircraft trackers, or air traffic analysis tools.
---

# Flight Tracker Agent

Live aircraft positions from OpenSky Network ADS-B data. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://flight-tracker-agent-production.up.railway.app
- **GitHub:** https://github.com/Calcutatator/flight-tracker-agent

## API

**Source:** OpenSky Network  
**Base URL:** `https://opensky-network.org/api`  
**Auth:** None required (anonymous access)

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Aircraft in NYC metro area |
| `area` | $0.001 | Aircraft in custom bounding box |
| `track` | $0.002 | Track specific aircraft by ICAO24 |
| `regions` | $0.003 | Compare traffic across regions |
| `country` | $0.002 | Aircraft by origin country |
| `report` | $0.005 | Global air traffic report |

## Key API Endpoints

```
/states/all                                    # All aircraft worldwide
/states/all?lamin=40&lomin=-74&lamax=41&lomax=-73  # Bounding box
/states/all?icao24=abc123                      # Specific aircraft
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
