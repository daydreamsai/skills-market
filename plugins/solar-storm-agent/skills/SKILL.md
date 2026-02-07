---
name: solar-storm-agent
description: |
  Builds a space weather monitoring agent using NOAA SWPC API with x402 payments.
  Use when creating solar activity trackers, aurora forecast agents, or geomagnetic alert systems.
---

# Solar Storm Agent

Space weather data from NOAA SWPC. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://solar-storm-agent-production-8034.up.railway.app
- **GitHub:** https://github.com/Calcutatator/solar-storm-agent

## API

**Source:** NOAA Space Weather Prediction Center  
**Base URL:** `https://services.swpc.noaa.gov`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Current space weather conditions |
| `kp-index` | $0.001 | Geomagnetic Kp index |
| `solar-cycle` | $0.002 | Sunspot and solar cycle data |
| `alerts` | $0.002 | Active space weather alerts |
| `aurora` | $0.003 | Aurora visibility forecast |
| `report` | $0.005 | Comprehensive space weather report |

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
