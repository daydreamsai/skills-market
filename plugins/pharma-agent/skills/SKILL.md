---
name: pharma-agent
description: |
  Builds an FDA drug safety monitoring agent using openFDA API with x402 payments.
  Use when creating pharmacovigilance agents, drug adverse event trackers, or healthcare data feeds.
---

# Pharma Agent

FDA drug adverse event intelligence from openFDA FAERS. 6 endpoints (1 free + 5 paid).

## Live

- **URL:** https://pharma-agent-production-06c2.up.railway.app
- **GitHub:** https://github.com/Calcutatator/pharma-agent

## API

**Source:** openFDA (FDA Adverse Event Reporting System)  
**Base URL:** `https://api.fda.gov/drug/event.json`  
**Auth:** None required (240 req/min without key)

## Endpoints

| Key | Price | Description |
|:----|:------|:------------|
| `overview` | Free | Top 10 most-reported drugs |
| `drug` | $0.001 | Side effects for a specific drug |
| `serious` | $0.002 | Drugs with most serious events |
| `reactions` | $0.002 | Most common adverse reactions |
| `compare` | $0.003 | Compare two drugs side by side |
| `report` | $0.005 | Comprehensive drug safety report |

## Key API Patterns

```
?count=patient.drug.openfda.brand_name.exact&limit=10
?search=patient.drug.openfda.brand_name:"OZEMPIC"&count=patient.reaction.reactionmeddrapt.exact
?search=serious:1&count=patient.drug.openfda.brand_name.exact
```

## Stack

Bun + Hono + `@lucid-agents/core` + `@lucid-agents/payments` + Zod v4
