---
name: taskmarket-scanner
description: |
  Polls TaskMarket for new open tasks and autonomously builds, deploys, and submits
  Lucid Agents for each one. Uses Claude Code in non-interactive mode to scaffold agents,
  push to GitHub, deploy to Railway, and submit deliverables.
  Use when setting up autonomous TaskMarket task processing or continuous agent generation.
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep]
---

# TaskMarket Scanner

Autonomous pipeline that watches TaskMarket for new tasks and handles the full lifecycle: build, deploy, submit.

## When to Use

- "Set up TaskMarket scanning"
- "Auto-build agents for TaskMarket tasks"
- "Run the taskmarket scanner"
- "Start watching for new tasks"

## Prerequisites

- `jq`, `bun`, `gh` (authenticated), `railway` (authenticated), `claude` CLI
- Environment variables (set before running):

| Variable | Required | Default |
|----------|----------|---------|
| `GITHUB_ORG` | Yes | — |
| `PAYMENTS_RECEIVABLE_ADDRESS` | Yes | — |
| `FACILITATOR_URL` | No | `https://facilitator.daydreams.systems` |
| `NETWORK` | No | `eip155:8453` |

## Setup Instructions

### Step 1: Create Scanner Directory

```bash
mkdir -p ~/taskmarket-scanner
touch ~/taskmarket-scanner/seen-tasks.txt
```

### Step 2: Write scan.sh

Create `~/taskmarket-scanner/scan.sh` with the following content, then `chmod +x` it:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCANNER_DIR="${SCANNER_DIR:-$HOME/taskmarket-scanner}"
SEEN_FILE="$SCANNER_DIR/seen-tasks.txt"
LOG_FILE="$SCANNER_DIR/scanner.log"
TASKMARKET="npx @lucid-agents/taskmarket@0.6.3"
GITHUB_ORG="${GITHUB_ORG:?GITHUB_ORG must be set}"
PAYMENTS_RECEIVABLE_ADDRESS="${PAYMENTS_RECEIVABLE_ADDRESS:?PAYMENTS_RECEIVABLE_ADDRESS must be set}"
FACILITATOR_URL="${FACILITATOR_URL:-https://facilitator.daydreams.systems}"
NETWORK="${NETWORK:-eip155:8453}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
touch "$SEEN_FILE"

log "=== Scanner run started ==="

if ! command -v jq &>/dev/null; then log "ERROR: jq not found"; exit 1; fi

RAW_JSON=$($TASKMARKET task list 2>/dev/null) || { log "ERROR: Failed to fetch tasks"; exit 1; }
TASKS_JSON=$(echo "$RAW_JSON" | jq '.data.tasks // []')
TASK_COUNT=$(echo "$TASKS_JSON" | jq 'length')
log "Found $TASK_COUNT total tasks"

NEW=0
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK=$(echo "$TASKS_JSON" | jq ".[$i]")
  TASK_ID=$(echo "$TASK" | jq -r '.id // .taskId // empty')
  [ -z "$TASK_ID" ] && continue
  grep -qx "$TASK_ID" "$SEEN_FILE" 2>/dev/null && continue

  SUBMISSION_COUNT=$(echo "$TASK" | jq -r '.submissionCount // 0')
  STATUS=$(echo "$TASK" | jq -r '.status // "unknown"')
  TITLE=$(echo "$TASK" | jq -r '.title // .name // "unnamed"')
  DESCRIPTION=$(echo "$TASK" | jq -r '.description // ""')
  REWARD=$(echo "$TASK" | jq -r '.reward // .price // "unknown"')

  echo "$TASK_ID" >> "$SEEN_FILE"

  if [ "$SUBMISSION_COUNT" != "0" ]; then
    log "Skip $TASK_ID ($TITLE): $SUBMISSION_COUNT submissions"; continue
  fi
  if [ "$STATUS" != "open" ] && [ "$STATUS" != "unknown" ]; then
    log "Skip $TASK_ID ($TITLE): status=$STATUS"; continue
  fi

  NEW=$((NEW + 1))
  log "NEW TASK: ID=$TASK_ID Title='$TITLE' Reward=$REWARD"

  AGENT_NAME=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g;s/--*/-/g;s/^-//;s/-$//' | head -c 40)
  PROJECT_DIR="$HOME/lucid-$AGENT_NAME"

  log "Building agent '$AGENT_NAME' for task $TASK_ID..."

  claude --print --dangerously-skip-permissions "You are building a Lucid agent for TaskMarket.

TASK ID: $TASK_ID
TITLE: $TITLE
DESCRIPTION: $DESCRIPTION
REWARD: $REWARD

Build in $PROJECT_DIR following this pipeline:
1. mkdir -p $PROJECT_DIR && cd $PROJECT_DIR && bun init -y
2. bun add @anthropic-ai/sdk @lucid-agents/sdk @lucid-agents/http @lucid-agents/payments @x402/crypto
3. Write src/index.ts: createAgent().use(http()).use(payments({config: paymentsFromEnv()})).build()
   Then createAgentApp(agent) with addEntrypoint(). Server: Bun.serve({port: parseInt(process.env.PORT||'3000'), fetch: app.fetch})
4. Core logic in separate file (src/logic.ts), tests import from there
5. bun test - all must pass
6. git init && git add -A && git commit -m 'Initial implementation'
7. gh repo create $GITHUB_ORG/lucid-$AGENT_NAME --public --source=. --push
8. railway init && railway variables set PAYMENTS_RECEIVABLE_ADDRESS=$PAYMENTS_RECEIVABLE_ADDRESS && railway variables set FACILITATOR_URL=$FACILITATOR_URL && railway variables set NETWORK=$NETWORK && railway up --detach && railway domain
9. Create submission.md with Railway URL + GitHub URL
10. npx @lucid-agents/taskmarket@0.6.3 task submit $TASK_ID --file $PROJECT_DIR/submission.md

CRITICAL: NETWORK=eip155:8453 (CAIP-2, not 'base'). FACILITATOR_URL=https://facilitator.daydreams.systems (not x402.org). Do NOT use export default (causes EADDRINUSE). Use Bun.serve() instead." >> "$LOG_FILE" 2>&1 \
    && log "SUCCESS: task $TASK_ID" \
    || log "FAILURE: task $TASK_ID (exit $?)"
done

[ "$NEW" -eq 0 ] && log "No new tasks" || log "Processed $NEW new task(s)"
log "=== Scanner run completed ==="
```

### Step 3: Create .env File

```bash
cat > ~/taskmarket-scanner/.env << 'EOF'
export GITHUB_ORG=YourGitHubOrg
export PAYMENTS_RECEIVABLE_ADDRESS=0xYourWallet
export FACILITATOR_URL=https://facilitator.daydreams.systems
export NETWORK=eip155:8453
EOF
```

### Step 4: Test Manually

```bash
source ~/taskmarket-scanner/.env && ~/taskmarket-scanner/scan.sh
```

Check `~/taskmarket-scanner/scanner.log` for output.

## Scheduling

### macOS (launchd)

Create `~/Library/LaunchAgents/com.taskmarket.scanner.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.taskmarket.scanner</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>source "$HOME/taskmarket-scanner/.env" &amp;&amp; exec "$HOME/taskmarket-scanner/scan.sh"</string>
    </array>
    <key>StartInterval</key>
    <integer>300</integer>
    <key>StandardOutPath</key>
    <string>/tmp/taskmarket-scanner.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/taskmarket-scanner.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.taskmarket.scanner.plist    # start
launchctl unload ~/Library/LaunchAgents/com.taskmarket.scanner.plist  # stop
```

### Linux/CI (cron)

```bash
*/5 * * * * source ~/taskmarket-scanner/.env && ~/taskmarket-scanner/scan.sh
```

## How It Works

```
TaskMarket API ──→ Filter new tasks ──→ For each unseen task:
                   (seen-tasks.txt)       │
                                          ├─ Mark seen (prevent double-processing)
                                          ├─ claude --print --dangerously-skip-permissions
                                          │   ├─ Scaffold agent (bun init, SDK deps)
                                          │   ├─ Write code + tests
                                          │   ├─ Push to GitHub
                                          │   ├─ Deploy to Railway
                                          │   └─ Submit deliverable to TaskMarket
                                          └─ Log outcome
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Mark seen before building | Prevents duplicate processing if script is interrupted |
| `claude --print --dangerously-skip-permissions` | Fully autonomous — no human approval needed per task |
| Env vars, not hardcoded values | Portable across different users/wallets |
| `NETWORK=eip155:8453` | CAIP-2 format required by @x402/core 2.5.0+ |
| `Bun.serve()` not `export default` | Avoids EADDRINUSE on Railway (Bun auto-serves default exports) |
| `facilitator.daydreams.systems` | `x402.org` is unreachable from some hosts |

## Error Recovery

| Issue | Resolution |
|-------|------------|
| `jq not found` | `brew install jq` or `apt install jq` |
| Task list fetch fails | Check network; TaskMarket CLI version |
| Claude build fails | Check `scanner.log` for details; task stays in seen-tasks.txt |
| Railway deploy fails | Verify `railway` CLI auth; check Railway dashboard |
| Double-processing | Won't happen — task ID written to seen-tasks.txt before build starts |

## Composing with Other Skills

This skill works well combined with:
- **agent-factory**: Provides the build template the scanner dispatches
- **railway-deploy**: Handles the deployment step in detail
- **lucid-agents-sdk**: SDK patterns used in generated agents

## Source

Full source with `.gitignore`, `.env.example`, and launchd plist:
[github.com/Calcutatator/taskmarket-scanner](https://github.com/Calcutatator/taskmarket-scanner)
