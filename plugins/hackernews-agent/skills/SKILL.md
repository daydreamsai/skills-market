---
name: hackernews-agent
description: |
  Builds a Hacker News data agent using HN Firebase API with x402 payments.
  Use when creating tech news aggregators, trending topic agents, or developer community feeds.
---

# Hacker News Agent

HN stories and trends via Firebase API. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://hackernews-agent-production-22d8.up.railway.app
- **GitHub:** https://github.com/Calcutatator/hackernews-agent

## API

**Source:** Hacker News (Y Combinator)  
**Base URL:** `https://hacker-news.firebaseio.com/v0`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Top 5 stories today |
| `top` | $0.001 | Top 20 stories with scores |
| `best` | $0.002 | Highest-voted stories |
| `show` | $0.002 | Show HN community projects |
| `ask` | $0.003 | Ask HN discussions |
| `report` | $0.005 | Full HN digest with all categories |

## Key API Endpoints

```
/topstories.json     # Top story IDs
/beststories.json    # Best story IDs
/showstories.json    # Show HN IDs
/askstories.json     # Ask HN IDs
/item/{id}.json      # Story details
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
