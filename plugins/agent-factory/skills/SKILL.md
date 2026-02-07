---
name: agent-factory
description: |
  Meta-skill that orchestrates the full agent creation pipeline. Composes:
  trend-discovery → api-research → lucid-agents-sdk → railway-deploy.
  Use when creating new monetized agents from scratch.
---

# Agent Factory

End-to-end automation for building and deploying paid Lucid Agents.

## Composed Skills

This meta-skill orchestrates:

| Step | Skill | Purpose |
|------|-------|---------|
| 1 | **trend-discovery** | Find trending topics with monetization potential |
| 2 | *(dedup check)* | Verify no existing skill in the market covers this topic |
| 3 | **api-research** | Validate free/public data APIs |
| 4 | **lucid-agents-sdk** | Build agent with x402 payments |
| 5 | **railway-deploy** | Deploy to Railway with proper config |

## Prerequisites

Requires: Bun, Railway CLI, GitHub CLI (`gh`), Bird CLI (optional for X/Twitter).

```bash
export RAILWAY_TOKEN="<your-token>"
export PAYMENTS_RECEIVABLE_ADDRESS="<your-wallet>"
export AUTH_TOKEN="<twitter-auth-token>"  # optional
export CT0="<twitter-ct0>"  # optional
```

## Pipeline Execution

### Step 1: Discover Topic

**Use skill: `trend-discovery`**

Search for trending topics and evaluate monetization potential:

```bash
bird search "need API for" --limit 50
```

**Output needed:**
- Topic name and description
- Score ≥ 7/10
- Target audience
- Potential data sources

### Step 2: Check Skills Market for Duplicates

Before building, review the skills-market repo to confirm you aren't recreating an agent that already exists.

1. List all existing plugins:
   ```bash
   ls plugins/
   ```
2. For each plugin, read its description:
   ```bash
   for d in plugins/*/; do echo "=== $(basename $d) ==="; head -10 "$d/skills/SKILL.md" 2>/dev/null; echo; done
   ```
3. Compare your chosen topic against existing skills. Check for overlap in:
   - **Topic/domain** — does a skill already cover this subject area?
   - **Data sources** — does an existing agent already consume the same APIs?
   - **Endpoints** — would your planned endpoints duplicate what's already deployed?

**If a match is found:**
- If the existing skill fully covers your topic → go back to Step 1 and pick a different topic.
- If there's partial overlap → narrow your agent's scope to cover only the gap, or pick a different angle that adds unique value.

**Output needed:**
- List of existing skills reviewed
- Confirmation that no duplicate exists (or description of how your agent differs)

### Step 3: Research APIs

**Use skill: `api-research`**

Find and validate live data sources:

```bash
web_search "<topic> free API"
curl -s "<api_endpoint>" | head -c 500
```

**Output needed:**
- 1+ validated API endpoints
- 6 endpoint designs (1 free + 5 paid)
- Data mapping

### Step 4: Build Agent

**Use skill: `lucid-agents-sdk`**

Create the agent with 6 endpoints (1 free + 5 paid). Test locally before deploying.

**Output needed:**
- All 6 endpoints tested
- All return real data
- All return `status: "succeeded"`

### Step 5: Deploy

**Use skill: `railway-deploy`**

Ship to production:

```bash
gh repo create <user>/<agent-name> --public --source=. --push
railway add -s <agent-name> -v "PAYMENTS_RECEIVABLE_ADDRESS=..."
railway up --detach --service <agent-name>
railway domain --service <agent-name>
```

**Output needed:**
- GitHub URL
- Railway URL
- Health check passing

### Step 6: Announce

Update portfolio and compose tweet:

```markdown
🚀 Just shipped: <Agent Name>

<One-line description>

✅ 1 free endpoint
💰 5 paid via x402

Built with @daydreamsagents

<url>
```

## Complete Checklist

### Discovery
- [ ] Topic selected with score ≥ 7
- [ ] Target audience identified
- [ ] Data sources proposed

### Dedup Check
- [ ] Existing skills-market plugins reviewed
- [ ] No topic/API/endpoint overlap with existing skills

### Research
- [ ] API endpoints validated (curl tested)
- [ ] 6 endpoints designed
- [ ] No auth required (or free tier available)

### Build
- [ ] package.json with Zod v4
- [ ] .gitignore includes node_modules/
- [ ] All 6 endpoints implemented
- [ ] Local tests pass
- [ ] Real data returned (no hardcoded)

### Deploy
- [ ] GitHub repo created
- [ ] Railway service created
- [ ] Env vars set (3 required)
- [ ] Domain configured
- [ ] Health check passes
- [ ] Live endpoints return data

### Announce
- [ ] Portfolio updated
- [ ] Tweet composed

## Error Recovery

| Issue | Solution |
|-------|----------|
| Topic already covered by existing skill | Pick a different topic or narrow scope to fill a gap |
| No trending topics found | Try alternative discovery (GitHub, HN, Reddit) |
| API requires auth | Find alternative or use free tier |
| Build fails | Check Zod version, fix imports |
| Deploy fails | Check Railway logs, verify token |
| Endpoint returns empty | Verify API URL, check response format |

## Example Run

```
Topic: Space Weather
Score: 8.6/10
APIs: NOAA SWPC (free, no auth)
Endpoints:
  - overview (free): Current conditions
  - kp-index ($0.001): Geomagnetic index
  - solar-cycle ($0.002): Sunspot data
  - alerts ($0.002): Active warnings
  - aurora ($0.003): Visibility forecast
  - report ($0.005): Full analysis

Result:
  GitHub: github.com/user/solar-storm-agent
  Railway: solar-storm-agent-production.up.railway.app
  Status: LIVE ✅
```

## Scheduling

Run automatically via cron:

```
0 * * * *  # Every hour
```

Each run:
1. Picks NEW topic (avoid repeats)
2. Builds and deploys agent
3. Reports results to operator
