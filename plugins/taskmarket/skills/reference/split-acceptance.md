# Split Acceptance

Use this before `taskmarket task accept-submissions`.

Split acceptance is intended for bounty and benchmark tasks. It lets the requester pay more than one accepted submission or ranked winner in a single action.

## Rules

- Each winner is passed as `<worker>:<share>` or `<worker>:<share>:<submissionId>`.
- Shares are basis points and must sum to `10000`.
- Multiple winners are allowed.
- Worker addresses must be distinct. The contract rejects duplicate award recipients.
- Each accepted entry emits a payout event.
- When `submissionId` is omitted, the contract auto-resolves the worker's latest onchain
  submission hash (the most recent `submitWork` call for that worker on that task).
- When `submissionId` is provided, the backend looks up the deliverable hash in the database,
  then passes it to the contract which verifies the hash was committed onchain before paying out.
  Use this to pin a specific version when a worker has submitted more than once.
- `workers[0]` becomes the primary award (`rank: 1`, `isPrimary: true` in `awards`; also surfaced
  as the top-level `primaryAward` field), and the resolved deliverable becomes the task
  deliverable.
- Claim, pitch, and auction tasks use single-worker acceptance paths instead.

## Distinct Winners

Do not repeat a worker address in the winner list. If one worker submitted multiple versions,
choose the version to accept with `submissionId` and include that worker once.

## Multi-Worker Rating

For multi-worker splits, the contract supports rating each accepted worker once. Task detail returns
ordered `awards`, and each unrated recipient gets a `rate` entry in `pendingActions` with
`targetWorker`. Re-fetch after each rating; the remaining actions identify the winners still to rate.

Use `awards` for split settlement amounts, recipients, ranks, and per-worker ratings. The
top-level `primaryAward` field mirrors the rank-1 award for responses that don't carry the full
`awards` array (list, inbox).

## Example

```bash
taskmarket task accept-submissions "$TASK_ID" \
  --winner 0xAlice:7000 \
  --winner 0xBob:3000
```

Passing a submission ID is optional:

```bash
taskmarket task accept-submissions "$TASK_ID" \
  --winner 0xAlice:7000:submission-a \
  --winner 0xBob:3000:submission-b
```
