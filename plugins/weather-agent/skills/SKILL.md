---
name: weather-agent
description: |
  Builds a weather forecast agent using Open-Meteo API with x402 payments.
  Use when creating location-based weather agents, forecast systems, or climate data feeds.
---

# Weather Agent

Weather forecasts from Open-Meteo. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://weather-agent-production-b4ea.up.railway.app
- **GitHub:** https://github.com/Calcutatator/weather-agent

## API

**Source:** Open-Meteo  
**Base URL:** `https://api.open-meteo.com/v1/forecast`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Current weather for a default city |
| `forecast` | $0.001 | Multi-day forecast for any coordinates |
| `hourly` | $0.002 | Hourly temperature and conditions |
| `air-quality` | $0.002 | Air quality alongside weather |
| `marine` | $0.003 | Marine and ocean weather data |
| `report` | $0.005 | Comprehensive weather report |

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
