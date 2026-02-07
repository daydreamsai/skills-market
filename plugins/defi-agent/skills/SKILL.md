---
name: defi-agent
description: |
  Builds a DeFi analytics agent using DeFiLlama API with x402 payments.
  Use when creating TVL trackers, DEX volume agents, or DeFi protocol monitoring systems.
---

# DeFi Agent

DeFi analytics from DeFiLlama. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://defi-agent-production.up.railway.app
- **GitHub:** https://github.com/Calcutatator/defi-agent

## API

**Source:** DeFiLlama  
**Base URL:** `https://api.llama.fi`  
**Auth:** None required

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Top chains by TVL |
| `chains` | $0.001 | All chains ranked by TVL |
| `dexes` | $0.002 | DEX volume overview |
| `protocols` | $0.002 | Top protocols by TVL |
| `chain` | $0.003 | Specific chain detail |
| `report` | $0.005 | Comprehensive DeFi market report |

## Key API Endpoints

```
/v2/chains                          # Chain TVL data
/protocols                           # All protocols
/overview/dexs                       # DEX volumes
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
