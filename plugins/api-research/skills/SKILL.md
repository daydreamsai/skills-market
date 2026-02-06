---
name: api-research
description: |
  Researches and validates live data APIs for a given topic. Finds free/public
  endpoints that work without authentication. Use when sourcing data APIs before
  building a paid agent.
---

# API Research

Find and validate real, live data sources. **No hardcoded data allowed.**

## Step 1: Search for APIs

```bash
# Web search for APIs
web_search "<topic> free API"
web_search "<topic> public API documentation"
web_search "<topic> real-time data API"
web_search "<topic> JSON API no auth"
```

## Step 2: Validate API Endpoints

Test each potential API:

```bash
# Test endpoint directly
curl -s "<api_endpoint>" | head -c 500

# Check response
# ✅ Returns JSON with real data
# ✅ No authentication required (or has free tier)
# ✅ Response time < 5 seconds
# ❌ Returns error or empty
# ❌ Requires paid API key
```

## Common Free Data Sources

### Finance & Crypto
| API | Endpoint | Notes |
|-----|----------|-------|
| DeFiLlama | `https://api.llama.fi/v2/chains` | TVL, yields, derivatives |
| CoinGecko | `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd` | Prices, trending |
| Yahoo Finance | `https://query1.finance.yahoo.com/v8/finance/chart/AAPL` | Stocks (unofficial) |
| Exchange Rates | `https://api.exchangerate.host/latest` | Currency rates |

### Weather & Environment
| API | Endpoint | Notes |
|-----|----------|-------|
| Open-Meteo | `https://api.open-meteo.com/v1/forecast?latitude=52&longitude=13&current_weather=true` | No key needed |
| wttr.in | `https://wttr.in/London?format=j1` | Simple weather |
| NOAA Space Weather | `https://services.swpc.noaa.gov/products/noaa-scales.json` | Space weather |

### Geology & Space
| API | Endpoint | Notes |
|-----|----------|-------|
| USGS Earthquakes | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson` | Real-time |
| NASA APOD | `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY` | Demo key works |
| ISS Location | `http://api.open-notify.org/iss-now.json` | Real-time position |

### General Purpose
| API | Endpoint | Notes |
|-----|----------|-------|
| IP Geolocation | `http://ip-api.com/json/` | IP info |
| Countries | `https://restcountries.com/v3.1/all` | Country data |
| Universities | `http://universities.hipolabs.com/search?country=united+states` | School data |
| Random User | `https://randomuser.me/api/` | Test data |
| Quotes | `https://api.quotable.io/random` | Random quotes |
| Jokes | `https://v2.jokeapi.dev/joke/Any` | Random jokes |
| Books | `https://openlibrary.org/search.json?q=lord+of+the+rings` | Book data |
| Wikipedia | `https://en.wikipedia.org/api/rest_v1/page/summary/Claude_(AI)` | Summaries |
| GitHub | `https://api.github.com/users/langoustine69` | User/repo data |

### Sports & Entertainment
| API | Endpoint | Notes |
|-----|----------|-------|
| ESPN | `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` | Live scores |
| OMDB | `https://www.omdbapi.com/?t=inception&apikey=<free_key>` | Movies (free key) |

## Step 3: Design Endpoints

Based on validated APIs, design 6 endpoints:

| Endpoint | Type | Price | Data Source |
|----------|------|-------|-------------|
| `overview` | Free | $0 | Quick summary for discovery |
| `lookup` | Paid | $0.001 | Single item by ID/name |
| `search` | Paid | $0.002 | Filtered list query |
| `top` | Paid | $0.002 | Rankings/leaderboards |
| `compare` | Paid | $0.003 | Multi-item comparison |
| `report` | Paid | $0.005 | Comprehensive analysis |

## Output

Provide:
1. **Validated API endpoints** (tested, working)
2. **6 endpoint designs** with descriptions
3. **Data mapping** (which API feeds which endpoint)

## Red Flags

- ❌ API requires paid key with no free tier
- ❌ Rate limits too strict (< 100 req/day)
- ❌ Data is stale (not updated regularly)
- ❌ Endpoint returns HTML instead of JSON
- ❌ Requires OAuth/complex auth flow

## Next Step

→ Use **lucid-agents-sdk** skill to create the agent code
