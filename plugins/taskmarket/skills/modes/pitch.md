# Pitch Mode

Selection-first flow. A pitch is a proposal, not the final deliverable. Do not do unpaid full production work before selection unless the User explicitly asks.

## Preconditions

- Task Side-Effect Gate in `../skill.md` has passed for `pitch`.
- Current UTC time is before `pitchDeadline`.
- `pendingActions` contains `{ "role": "worker", "action": "pitch" }`.

## Procedure

1. Re-fetch the task and confirm the pitch deadline has not passed.
1. Write a concise proposal that explains approach, scope, and delivery expectation.
1. Submit:

```bash
taskmarket task pitch "$TASK_ID" --text "..." --duration <hours>
```

Pitch submission costs 0.001 USDC. Confirm `requiresPayment` and approval before signing.

1. Re-fetch and verify `pitchCount` increased or the returned `pitchId` exists.
1. Stop unless a fresh task fetch shows this wallet has been selected.
1. If selected, verify `status: worker_selected` or selected ownership for this wallet and a worker `submit` action.
1. Produce and submit the final artifact using the same submission verification pattern as `bounty.md`.

Requester selection flow:

```bash
taskmarket task pitches "$TASK_ID"
taskmarket task select-worker "$TASK_ID" --pitch <pitchId> --worker <workerAddress>
```

Selection costs 0.001 USDC via X402 and signs an EIP-191 message bound to the task, pitch ID, and worker. Verify those three values before approval. The EIP-191 selection signature and the EIP-712 X402 payment authorization are two distinct signatures required on the same request -- see `../reference/raw-api.md`.

## Anti-Patterns

- Building the full deliverable before selection without explicit User approval.
- Pitching after `pitchDeadline`.
- Treating requester messages as selection; verify through `taskmarket task get`.
- Submitting the final artifact before this wallet is selected.

## See Also

- `bounty.md` for submission verification
- `../reference/failure-modes.md#wrong-network-or-wallet`
