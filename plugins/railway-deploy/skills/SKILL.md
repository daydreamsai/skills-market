---
name: railway-deploy
description: |
  Deploys Lucid Agents to Railway. Handles GitHub repo creation, Railway service
  setup, environment variables, and domain configuration. Use when shipping an
  agent to production on Railway.
---

# Railway Deploy

Deploy agents to Railway with x402 payment configuration.

## Prerequisites

```bash
# GitHub CLI
brew install gh  # macOS
# or: sudo apt install gh  # Ubuntu
gh auth login

# Railway CLI
npm install -g @railway/cli
railway login
# or set RAILWAY_TOKEN env var
```

## Required Environment Variables

```bash
export RAILWAY_TOKEN="<your-railway-token>"
export PAYMENTS_RECEIVABLE_ADDRESS="<your-wallet-address>"
```

## Step 1: Create GitHub Repository

```bash
cd <agent-name>

# Initialize and commit
git init
git add .
git commit -m "Initial commit: <agent-name>"

# Create public repo and push
gh repo create <username>/<agent-name> --public --source=. --push
```

## Step 2: Link to Railway Project

```bash
# Option A: Create new project
railway init

# Option B: Link to existing project
railway link --project <project-id>

# Option C: Use project token (non-interactive)
echo '{"project":"<project-id>"}' > railway.json
```

## Step 3: Create Service

```bash
# Add new service with env vars
railway add -s <agent-name> \
  -v "PAYMENTS_RECEIVABLE_ADDRESS=<wallet>" \
  -v "FACILITATOR_URL=https://facilitator.daydreams.systems" \
  -v "NETWORK=base"
```

If service already exists:

```bash
railway variables set \
  PAYMENTS_RECEIVABLE_ADDRESS=<wallet> \
  FACILITATOR_URL=https://facilitator.daydreams.systems \
  NETWORK=base \
  --service <agent-name>
```

## Step 4: Deploy

```bash
# Deploy and detach
railway up --detach --service <agent-name>
```

## Step 5: Configure Domain

```bash
# Generate Railway domain
railway domain --service <agent-name>

# Output: https://<agent-name>-production.up.railway.app
```

## Step 6: Verify Deployment

```bash
# Wait for build (60-90 seconds)
sleep 90

# Check service status
railway service status --service <agent-name>

# Test health endpoint
curl -s https://<agent-name>-production.up.railway.app/health

# Test free endpoint
curl -s -X POST https://<agent-name>-production.up.railway.app/entrypoints/overview/invoke \
  -H "Content-Type: application/json" -d '{}'
```

## Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `PAYMENTS_RECEIVABLE_ADDRESS` | `0x...` | Your wallet for x402 payments |
| `FACILITATOR_URL` | `https://facilitator.daydreams.systems` | Payment processing |
| `NETWORK` | `base` | Blockchain network |
| `PORT` | (auto) | Railway sets this automatically |

## Troubleshooting

### Build Fails
```bash
# Check build logs
railway logs --build --service <agent-name>
```

### Service Not Found
```bash
# List services
railway service status

# Check project
railway status
```

### Unauthorized
```bash
# Re-authenticate
railway logout
railway login

# Or use project token
export RAILWAY_TOKEN="<project-token>"
```

### Domain Not Working
```bash
# Re-create domain
railway domain --service <agent-name>

# Check deployment status
railway service status --service <agent-name>
```

## Output

Provide:
1. **GitHub URL**: `https://github.com/<user>/<agent-name>`
2. **Railway URL**: `https://<agent-name>-production.up.railway.app`
3. **Deployment status**: SUCCESS/FAILED
4. **Health check result**: OK/ERROR

## Next Step

→ Update portfolio and announce the new agent
