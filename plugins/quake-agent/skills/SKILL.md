---
name: quake-agent
description: |
  Builds a real-time earthquake tracking agent using USGS API with x402 payments.
  Use when creating seismic monitoring agents, earthquake alert systems, or natural disaster data feeds.
---

# Quake Agent

Real-time earthquake data from USGS. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://quake-agent-production.up.railway.app
- **GitHub:** https://github.com/Calcutatator/quake-agent

## API

**Source:** USGS Earthquake Hazards Program  
**Base URL:** `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Significant earthquakes this week |
| `lookup` | $0.001 | Earthquakes by magnitude threshold |
| `recent` | $0.002 | All earthquakes past hour |
| `significant` | $0.002 | Significant earthquakes past month |
| `major` | $0.003 | Major (4.5+) past 24h with stats |
| `report` | $0.005 | Comprehensive weekly seismic report |

## Key API Endpoints

```
/significant_week.geojson   # Significant quakes this week
/4.5_day.geojson            # 4.5+ magnitude past day
/all_hour.geojson            # All quakes past hour
/significant_month.geojson   # Significant past month
/4.5_week.geojson            # 4.5+ past week
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
