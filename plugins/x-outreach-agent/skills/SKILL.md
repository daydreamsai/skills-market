---
name: x-outreach-agent
description: Autonomous UGC creator discovery on X, multi-channel outreach (X DM + email), and deterministic rate negotiation with budget guardrails. End-to-end creator partnership pipeline.
version: 1.1.0
author: Calclawd
allowed-tools: [Bash, Read, Write, Exec]
tags:
  - lucid-agents
  - daydreams
  - x-api
  - agentmail
  - creator-outreach
  - negotiation
  - automation
requires:
  - zod@^3.24
  - svix@^1.15
  - ioredis@^5.3
env:
  - X_BEARER_TOKEN
  - X_USER_ACCESS_TOKEN
  - AGENTMAIL_API_KEY
  - AGENTMAIL_WEBHOOK_SECRET
  - OPENCLAW_BASE_URL
  - OPENCLAW_HOOK_TOKEN
  - REDIS_URL (optional)
---

# X Outreach Agent

Autonomous lead discovery → multi-channel outreach → negotiation with deterministic guardrails.

## Overview

This skill enables an agent to:
1. **Discover leads** on X using recent search (7-day window)
2. **Outreach** via X DMs (preferred) or AgentMail email (fallback)
3. **Negotiate** rates/terms using deterministic guardrails
4. **Escalate** deals that exceed configured thresholds

The agent runs always-on inside OpenClaw, with AgentMail webhooks triggering negotiation turns in real-time.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BOOTSTRAP                                       │
│  x_outreach_bootstrap                                                        │
│  ├─ Validate X tokens (bearer + user OAuth)                                 │
│  ├─ Create AgentMail inbox (if missing)                                     │
│  ├─ Register webhook for message.received                                   │
│  └─ Persist campaign config + credentials to agent state                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DISCOVERY                                       │
│  discover_leads                                                              │
│  ├─ Build query: (topic1) OR (topic2) -antiTopic1 -antiTopic2              │
│  ├─ X recent search (7-day window, bearer token)                           │
│  ├─ Score leads: signals (+15ea), followers (+10-20), DMs open (+10)       │
│  ├─ Extract email from bio (if present)                                    │
│  └─ Dedupe against existing leads, return sorted by score                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTREACH ROUTING                                   │
│  plan_outreach                                                               │
│  ├─ Check email available? → email                                          │
│  ├─ Check DMs open + under cap? → x_dm                                      │
│  └─ Else → x_reply (draft for human)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OUTREACH EXECUTION                                 │
│  send_outreach                                                               │
│                                                                              │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐          │
│  │   X DM      │     │  AgentMail      │     │  X Reply Draft   │          │
│  │ (user OAuth)│     │  (API key)      │     │  (human posts)   │          │
│  └──────┬──────┘     └────────┬────────┘     └──────────────────┘          │
│         │                     │                                             │
│         │  POST /2/dm_...     │  POST /v0/.../send                          │
│         ▼                     ▼                                             │
│    status: dm_sent      status: email_sent                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                              ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────────┐
│      X DM INGESTION          │  │         AGENTMAIL WEBHOOK                 │
│  ingest_replies_x            │  │  agentmail_ingest_event                   │
│  (polling DM events)         │  │  (real-time via webhook adapter)          │
│                              │  │                                           │
│  GET /2/dm_events            │  │  Svix verify → dedupe → wake OpenClaw    │
└──────────────┬───────────────┘  └─────────────────┬─────────────────────────┘
               │                                    │
               └──────────────┬─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPLY PARSING                                        │
│  parseReplyText() — heuristic extraction (LLM in production)                │
│                                                                              │
│  Extract:                                                                    │
│  ├─ intent: interested | not_interested | needs_info | sends_rate | other  │
│  ├─ rateUsd: $XXX pattern matching                                         │
│  ├─ asksExclusivity: "exclusive", "only work with", "no competitors"       │
│  ├─ asksWhitelisting: "whitelist", "paid ads", "ad rights", "boost"        │
│  └─ timeline: "within X days/weeks"                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEGOTIATION ENGINE (DETERMINISTIC)                        │
│  decide_next                                                                 │
│                                                                              │
│  Ladder (first match wins):                                                 │
│  1. intent = not_interested         → PASS                                  │
│  2. rate > maxUsdPerDeal            → ESCALATE                              │
│  3. rate > max * (1 + aboveMaxPct)  → ESCALATE                              │
│  4. asksExclusivity (if flagged)    → ESCALATE                              │
│  5. asksWhitelisting (if flagged)   → ESCALATE                              │
│  6. usage unclear (if flagged)      → CLARIFY                               │
│  7. rate <= baseline offer          → ACCEPT                                │
│  8. rate <= maxUsd                  → COUNTER (with best offer)             │
│  9. intent = needs_info             → CLARIFY (provide details)             │
│  10. intent = interested            → CLARIFY (request rate)                │
│  11. default                        → CLARIFY                               │
│                                                                              │
│  Output: { action, counterOffer?, rationale[], replyDraft }                 │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SEND REPLY                                           │
│  agentmail_send_reply                                                        │
│                                                                              │
│  POST /v0/inboxes/:inbox_id/threads/:thread_id/messages                     │
│                                                                              │
│  Update lead status:                                                        │
│  ├─ accept   → "won"                                                        │
│  ├─ pass     → "lost"                                                       │
│  ├─ escalate → "escalated" (human review)                                   │
│  └─ else     → "negotiating"                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Entrypoints

### 1. `x_outreach_bootstrap`

One-shot setup. Run once per campaign to initialize infrastructure.

**Location:** `scripts/bootstrap.ts`

**Input:** `BootstrapPayload` schema (see references/schemas.md)

**Output:**
```typescript
{
  ready: boolean;
  inboxEmail?: string;
  webhookId?: string;
  errors: string[];
}
```

**Execution Flow:**
1. Parse + validate bootstrap payload
2. Validate X bearer token via test search query
3. Validate X user token via `/2/users/me`
4. If `inboxId` empty → `POST /v0/inboxes` (display_name: "{campaign.name} Outreach")
5. If `webhookId` empty → `POST /v0/webhooks` with adapter URL
6. Persist to agent state:
   - `campaign` — full campaign config
   - `x` — bearer + user tokens
   - `agentmail` — apiKey, inboxId, inboxEmail, webhookId, webhookSecret
   - `openclaw` — baseUrl, token, path
   - `leads` — empty array
   - `dailyDmCount` — 0
   - `lastDmDate` — today's date

**Error Handling:**
- Invalid bearer token → error, don't persist
- Invalid user token → error, don't persist  
- AgentMail API failure → error with details
- Partial success → return errors array, don't persist

---

### 2. `discover_leads`

Search X for leads matching campaign criteria.

**Location:** `scripts/discovery.ts`

**Input:**
```typescript
{
  maxResults?: number;      // default 50, max 100
  customQuery?: string;     // override auto-built query
}
```

**Output:**
```typescript
{
  leads: Lead[];
  query: string;           // the query that was executed
  total: number;
}
```

**Query Construction:**
```typescript
// Auto-built from campaign config:
const topicPart = campaign.topics.map(t => `(${t})`).join(" OR ");
const exclusions = campaign.antiTopics.map(t => `-${t}`).join(" ");
const filters = "-is:retweet -is:reply";
// Example: (ugc OR "content creator") -airdrop -giveaway -is:retweet -is:reply
```

**Scoring Algorithm:**
```
Base score: 50

Signals in bio:
  +15 per signal match (from campaign.creatorSignals)

Followers:
  100K+ → +20
  10K+  → +15
  1K+   → +10
  <500  → -10

Follower/Following ratio:
  >10   → +10
  <0.5  → -5

Bio signals:
  "dms open" / "dm open"           → +10
  "collab" / "partnership"          → +10
  Protected account                 → -20
  Email in bio                      → +5

Final: clamp(0, 100)
```

**Rate Limits:**
- 450 requests / 15 min (bearer)
- On 429: implement exponential backoff

---

### 3. `plan_outreach`

Route each lead to optimal channel.

**Location:** `scripts/outreach.ts`

**Input:**
```typescript
{
  leads: Lead[];
}
```

**Output:**
```typescript
{
  planned: Array<{
    lead: Lead;
    channel: "x_dm" | "email" | "x_reply";
    reason: string;
  }>;
}
```

**Routing Logic:**
```typescript
for (const lead of leads) {
  // 1. Email preferred if available
  if (lead.email && campaign.outreach.emailEnabled) {
    channel = "email";
    reason = "Email available";
  }
  // 2. DM if open and under cap
  else if (lead.bio?.toLowerCase().includes("dm") && 
           dailyDmCount < campaign.outreach.dmDailyCap) {
    channel = "x_dm";
    reason = "DMs open, under daily cap";
  }
  // 3. Fallback to public reply draft
  else {
    channel = "x_reply";
    reason = "DMs not available, generating draft";
  }
}
```

---

### 4. `send_outreach`

Execute outreach messages.

**Location:** `scripts/outreach.ts`

**Input:**
```typescript
{
  planned: Array<{ lead: Lead; channel: string }>;
  templates: {
    dm: string;
    email: { subject: string; body: string };
  };
}
```

**Output:**
```typescript
{
  results: Array<{
    lead: Lead;
    channel: string;
    status: "sent" | "failed" | "draft";
    error?: string;
  }>;
}
```

**X DM Execution:**
1. Check `dailyDmCount < dmDailyCap`
2. Apply jitter: `Math.random() * dmJitterMinutes * 60 * 1000`
3. `POST /2/dm_conversations/with/:participant_id/messages`
4. Requires user OAuth token (app-only NOT supported)
5. Update `dailyDmCount++`
6. On 429: queue for retry, exponential backoff

**Email Execution:**
1. `POST /v0/inboxes/:inbox_id/messages/send`
2. Headers: `Authorization: Bearer {apiKey}`
3. Body: `{ to: [lead.email], subject, text }`

---

### 5. `ingest_replies_x`

Poll X DM events for replies.

**Location:** `scripts/outreach.ts`

**Input:**
```typescript
{
  since?: string;  // ISO datetime, only fetch newer
}
```

**Output:**
```typescript
{
  replies: Array<{
    lead: Lead;
    parsed: ParsedReply;
    rawEvent: any;
  }>;
  lastEventAt?: string;
}
```

**X Endpoints:**
- `GET /2/dm_events` — list DM events
- `GET /2/dm_conversations/with/:participant_id/dm_events` — per-user events

---

### 6. `agentmail_ingest_event`

Handle AgentMail webhook payload.

**Location:** `scripts/negotiation.ts`

**Input:** `AgentMailMessageEvent` schema

**Output:**
```typescript
{
  lead: Lead | null;
  reply: ParsedReply;
  decision: NegotiationDecision | null;
}
```

**Execution Flow:**
1. Extract `from`, `subject`, `text` from event.message
2. Match to lead by email or thread_id
3. Parse reply text into `ParsedReply`
4. If lead found → call `decide_next_logic()`
5. Update lead status based on decision
6. Return for `agentmail_send_reply`

---

### 7. `decide_next`

Deterministic negotiation ladder.

**Location:** `scripts/negotiation.ts`

**Input:**
```typescript
{
  lead: Lead;
  reply: ParsedReply;
  campaign: Campaign;
}
```

**Output:** `NegotiationDecision`

**Decision Ladder (pseudocode):**
```typescript
function decide_next_logic(reply, campaign, lead): NegotiationDecision {
  const { guardrails, offerMenu } = campaign;
  const { escalation } = guardrails;

  // 1. Not interested → pass
  if (reply.intent === "not_interested") {
    return { action: "pass", rationale: ["Creator declined interest"] };
  }

  // 2. Rate exceeds hard max → escalate
  if (reply.rateUsd > guardrails.maxUsdPerDeal) {
    return { action: "escalate", rationale: [`Rate exceeds max $${guardrails.maxUsdPerDeal}`] };
  }

  // 3. Rate exceeds soft max (baseline + aboveMaxPct) → escalate
  const threshold = guardrails.maxUsdPerDeal * (1 + escalation.aboveMaxPct / 100);
  if (reply.rateUsd > threshold) {
    return { action: "escalate", rationale: [`Rate exceeds threshold $${threshold}`] };
  }

  // 4. Asks exclusivity → escalate if configured
  if (reply.asksExclusivity && escalation.asksExclusivity) {
    return { action: "escalate", rationale: ["Creator requests exclusivity"] };
  }

  // 5. Asks whitelisting → escalate if configured
  if (reply.asksWhitelisting && escalation.asksWhitelisting) {
    return { action: "escalate", rationale: ["Creator requests whitelisting/ad rights"] };
  }

  // 6. Usage unclear → clarify if configured
  if (!reply.usage && escalation.unclearUsage && reply.intent === "sends_rate") {
    return { action: "clarify", rationale: ["Usage rights unclear"], replyDraft: "..." };
  }

  // 7. Rate within baseline → accept
  const matchingOffer = offerMenu.find(o => reply.rateUsd <= o.baselineUsd);
  if (matchingOffer) {
    return { action: "accept", rationale: [`Rate within ${matchingOffer.key} baseline`], replyDraft: "..." };
  }

  // 8. Rate above baseline but within max → counter
  if (reply.rateUsd <= guardrails.maxUsdPerDeal) {
    const bestOffer = offerMenu.reduce((best, curr) => 
      (curr.baselineUsd > (best.baselineUsd || 0)) ? curr : best
    );
    return { 
      action: "counter", 
      counterOffer: { offerKey: bestOffer.key, rateUsd: bestOffer.baselineUsd },
      rationale: [`Countering with $${bestOffer.baselineUsd}`],
      replyDraft: "..."
    };
  }

  // 9. Needs info → provide details
  if (reply.intent === "needs_info") {
    return { action: "clarify", rationale: ["Creator needs more information"], replyDraft: "..." };
  }

  // 10. Interested but no rate → continue conversation
  if (reply.intent === "interested") {
    return { action: "clarify", rationale: ["Creator interested — continuing"], replyDraft: "..." };
  }

  // 11. Default
  return { action: "clarify", rationale: ["Could not determine clear action"] };
}
```

**Reply Generation:**
The implementation includes template generators for each action:
- `generateAcceptReply()` — confirms deal, requests email for agreement
- `generateCounterReply()` — proposes alternative rate with reasoning
- `generateClarifyReply()` — asks specific questions (usage, general)
- `generateInfoReply()` — provides campaign details
- `generateInterestFollowup()` — continues conversation, requests rate

---

### 8. `agentmail_send_reply`

Send negotiation reply via AgentMail.

**Location:** `scripts/negotiation.ts`

**Input:**
```typescript
{
  lead: Lead;
  decision: NegotiationDecision;
  threadId: string;
}
```

**Output:**
```typescript
{
  sent: boolean;
  messageId?: string;
}
```

**Execution:**
1. Check `decision.replyDraft` exists
2. Get `agentmail` config from state
3. `POST /v0/inboxes/:inbox_id/threads/:thread_id/messages`
4. Return message ID

---

## State Management

The agent persists these keys via `ctx.setState()` / `ctx.getState()`:

| Key | Type | Set By | Used By |
|-----|------|--------|---------|
| `campaign` | Campaign | bootstrap | all |
| `x` | { bearerToken, userAccessToken } | bootstrap | discovery, outreach |
| `agentmail` | { apiKey, inboxId, inboxEmail, webhookId, webhookSecret } | bootstrap | outreach, negotiation |
| `openclaw` | { baseUrl, token, path } | bootstrap | webhook adapter |
| `leads` | Lead[] | bootstrap, discovery | all |
| `dailyDmCount` | number | bootstrap, outreach | outreach |
| `lastDmDate` | string (YYYY-MM-DD) | bootstrap, outreach | outreach |

**Daily Reset Logic:**
```typescript
const today = new Date().toISOString().split("T")[0];
if (lastDmDate !== today) {
  dailyDmCount = 0;
  lastDmDate = today;
}
```

---

## External APIs

### X API

| Endpoint | Method | Auth | Rate Limit | Purpose |
|----------|--------|------|------------|---------|
| `/2/tweets/search/recent` | GET | Bearer | 450/15min | Search (7-day) |
| `/2/users/me` | GET | User OAuth | 75/15min | Validate token |
| `/2/users/by/username/:username` | GET | Bearer | 900/15min | User lookup |
| `/2/dm_conversations` | GET | User OAuth | 100/15min | List DMs |
| `/2/dm_conversations/with/:id/messages` | POST | User OAuth | 1000/24hr | Send DM |
| `/2/dm_events` | GET | User OAuth | 100/15min | DM events |

**Critical:** DM endpoints require user-level OAuth. App-only bearer tokens will NOT work.

### AgentMail API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /v0/inboxes` | Create | New inbox |
| `GET /v0/inboxes/:id` | Read | Inbox details |
| `POST /v0/inboxes/:id/messages/send` | Create | Send email |
| `POST /v0/webhooks` | Create | Register webhook |
| `DELETE /v0/webhooks/:id` | Delete | Remove webhook |

**Webhook Verification:**
- Uses Svix for signature verification
- Headers: `svix-id`, `svix-timestamp`, `svix-signature`
- MUST verify against raw request body (not parsed JSON)

### OpenClaw Hooks

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /hooks/agent` | Wake agent | Trigger turn |

**Auth:** `Authorization: Bearer {token}` or `?token={token}` or `x-openclaw-token: {token}`

**Payload:**
```json
{
  "name": "AgentMail",
  "sessionKey": "hook:agentmail:{inbox_id}:{thread_id}",
  "wakeMode": "now",
  "deliver": false,
  "message": "AgentMail: new inbound email reply.\nFrom: ...\nSubject: ...\nPreview: ..."
}
```

---

## Webhook Adapter

**Location:** `webhook-adapter/server.ts`

**Purpose:** Bridge AgentMail webhooks to OpenClaw hook endpoint.

**Flow:**
1. Receive POST `/webhooks/agentmail`
2. Extract raw body (CRITICAL for Svix verify)
3. Verify signature using `svix` library
4. Dedupe by `event_id` (30-day TTL in Redis)
5. Wake OpenClaw with structured message

**Deployment:**
```bash
cd webhook-adapter
npm install
# Environment variables:
export AGENTMAIL_WEBHOOK_SECRET="whsec_..."
export OPENCLAW_BASE_URL="https://your-vps:18789"
export OPENCLAW_HOOK_TOKEN="your-token"
export REDIS_URL="redis://localhost:6379"
npm start
```

**Docker:**
```bash
docker build -t x-outreach-webhook .
docker run -p 3000:3000 --env-file .env x-outreach-webhook
```

---

## Compliance & Safety

### X Automation Rules
- Don't send automated spammy DMs
- Respect rate limits (429 = stop immediately)
- Include opt-out mechanism in messages
- Don't impersonate or mislead

### Outreach Best Practices
- `dmDailyCap` prevents spam behavior (default: 50)
- `dmJitterMinutes` makes timing natural (default: 90)
- Track and honor opt-outs
- Escalate unclear situations to human

### Data Handling
- Credentials in env vars, never hardcoded
- Webhook secrets kept private
- Lead data is PII — handle appropriately
- Redis dedupe keys expire after 30 days

---

## Files Reference

```
x-outreach-agent/
├── skills/
│   ├── SKILL.md                          # This file
│   ├── references/
│   │   ├── schemas.md                    # Zod schemas
│   │   ├── x-api.md                      # X endpoint reference
│   │   ├── agentmail-api.md              # AgentMail reference
│   │   └── bootstrap-template.json       # Bootstrap payload template
│   └── scripts/
│       ├── index.ts                      # Entrypoint exports
│       ├── schemas.ts                    # TypeScript schema definitions
│       ├── bootstrap.ts                  # x_outreach_bootstrap
│       ├── discovery.ts                  # discover_leads
│       ├── outreach.ts                   # plan_outreach, send_outreach, ingest_replies_x
│       ├── negotiation.ts                # decide_next, agentmail_ingest_event, agentmail_send_reply
│       ├── x-client.ts                   # X API client wrapper
│       └── agentmail-client.ts           # AgentMail API client wrapper
└── webhook-adapter/
    ├── server.ts                         # Express webhook receiver
    ├── package.json
    ├── tsconfig.json
    └── Dockerfile
```

---

## Changelog

- **1.0.0** — Initial release with 8 entrypoints, deterministic negotiation ladder, webhook adapter
