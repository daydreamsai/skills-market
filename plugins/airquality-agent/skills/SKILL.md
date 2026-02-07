---
name: airquality-agent
description: |
  Builds a real-time air quality monitoring agent using Open-Meteo AQ API with x402 payments.
  Use when creating environmental health agents, AQI trackers, or pollution monitoring systems.
---

# Air Quality Agent

Global air quality and pollutant data from Open-Meteo. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://airquality-agent-production.up.railway.app
- **GitHub:** https://github.com/Calcutatator/airquality-agent

## API

**Source:** Open-Meteo Air Quality  
**Base URL:** `https://air-quality-api.open-meteo.com/v1/air-quality`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Current AQI for New York City |
| `current` | $0.001 | Real-time AQI for any coordinates |
| `forecast` | $0.002 | Hourly AQI forecast up to 5 days |
| `compare` | $0.002 | Compare AQI across 8 world cities |
| `pollen` | $0.003 | Pollen and allergen index |
| `report` | $0.005 | Comprehensive air quality report |

## Key API Parameters

```
?latitude=40.71&longitude=-74.01&current=us_aqi,pm10,pm2_5,ozone
?hourly=us_aqi,pm2_5,pm10&forecast_days=5
?current=alder_pollen,birch_pollen,grass_pollen,ragweed_pollen
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
