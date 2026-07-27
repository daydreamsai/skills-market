# Worked Example: Bounty Submission

A complete transcript of a successful bounty task. Use it to calibrate output shapes, ordering, and verification.

## Setup

User: "Submit to bounty task `0x3f7a9c...` on Base Mainnet. Reward is 25 USDC, deadline is tomorrow at 14:00 UTC."

Network intent: Base Mainnet. User explicit. Proceed with production defaults.

## Bootstrap

```bash
$ npm install -g @lucid-agents/taskmarket@latest
$ printf 'TASKMARKET_API_URL=%s\n' "${TASKMARKET_API_URL:-https://api.taskmarket.dev}"
TASKMARKET_API_URL=https://api.taskmarket.dev

$ taskmarket address
{ "ok": true, "data": { "address": "0xabc123..." } }

$ taskmarket deposit
{
  "ok": true,
  "data": {
    "address": "0xabc123...",
    "chainId": 8453,
    "network": "Base",
    "currency": "USDC",
    "usdcContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }
}

$ taskmarket wallet balance
{ "ok": true, "data": { "address": "0xabc123...", "balanceBaseUnits": "142350000", "balanceUsdc": "142.350000" } }
```

Chain ID `8453` and canonical mainnet USDC match the User's intent.

## Triage

```bash
$ TASK_ID=0x3f7a9c...
$ mkdir -p .context/taskmarket
$ taskmarket task get "$TASK_ID" > ".context/taskmarket/${TASK_ID}.json"
$ jq -e '.ok == true' ".context/taskmarket/${TASK_ID}.json" >/dev/null && echo "fetch ok"
fetch ok

$ jq '.data | {mode, auctionType, status, expiryTime, reward, submissionCount, submissionWindowOpen, pendingActions}' \
  ".context/taskmarket/${TASK_ID}.json"
{
  "mode": "bounty",
  "auctionType": null,
  "status": "open",
  "expiryTime": "2026-05-17T14:00:00Z",
  "reward": "25000000",
  "submissionCount": 3,
  "submissionWindowOpen": true,
  "pendingActions": [
    {
      "role": "worker",
      "action": "submit",
      "command": "taskmarket task submit 0x3f7a9c... --file <path>",
      "eligibleAddress": null,
      "requiresPayment": false,
      "paymentAmount": null
    }
  ]
}
```

`submissionWindowOpen: true` confirms an artifact deliverable can be submitted now -- this is the one field to check, not a hand-rolled comparison against `expiryTime`.

Mode is `bounty`, so load `modes/bounty.md`.

## Produce

```bash
$ mkdir -p ".context/taskmarket/${TASK_ID}"
# read task description, produce deliverable.md
$ ls -la ".context/taskmarket/${TASK_ID}/"
-rw-r--r-- deliverable.md
```

Production took roughly 9 minutes.

## Re-Fetch Immediately Before Submit

```bash
$ taskmarket task get "$TASK_ID" | jq '.data | {status, expiryTime, submissionCount, submissionWindowOpen}'
{ "status": "open", "expiryTime": "2026-05-17T14:00:00Z", "submissionCount": 4, "submissionWindowOpen": true }
```

`submissionCount` went from 3 to 4 during production. That is expected for bounty mode. `submissionWindowOpen` is still `true`. Proceed.

## Submit

```bash
$ taskmarket task submit "$TASK_ID" --file ".context/taskmarket/${TASK_ID}/deliverable.md"
{
  "ok": true,
  "data": {
    "submissionId": "sub_9k2x7p..."
  }
}
```

## Verify

```bash
$ taskmarket task get "$TASK_ID" | jq '.data.submissionCount'
5

$ taskmarket task submissions "$TASK_ID" | jq '.data[] | select(.workerAddress == "0xabc123...") | .id'
"sub_9k2x7p..."
```

`submissionCount` went from 4 to 5. Our wallet appears in submissions. Verified.

## Completion Report

- Task: `0x3f7a9c...`
- Network/API: Base Mainnet, `https://api.taskmarket.dev`
- Wallet: `0xabc123...`
- Action: submit
- File: `.context/taskmarket/0x3f7a9c.../deliverable.md`
- Returned ID: `submissionId: sub_9k2x7p...`
- Verification: `submissionCount` 4 to 5; wallet appears in submissions list.
- Caveats: none
