# Task Hooks

Load this reference when task detail contains a non-null `hookContract`, or before constructing a task that should be gated or observed by an external contract.

## What A Hook Is

A hook is an external contract implementing `ITMPHook` (ERC-8195), registered immutably on a task at creation time via `--hook`. Once set, it cannot be changed or removed. TaskMarket calls into the hook at defined points in the task lifecycle; the hook can validate or react to those transitions, but it never holds escrowed funds itself.

```bash
taskmarket task create \
  --description "..." \
  --reward <usdc> \
  --duration <hours> \
  --mode <mode> \
  --hook <address> \
  --hook-data <hex>
```

`--hook-data` is opaque configuration bytes forwarded to `checkFund`. Encode a `uint32` as 4 big-endian bytes, e.g. `0x000006b4` for an 1800-second TWAP window. Confirm the hook address and hook-data encoding with the requester's operator before funding -- a wrong or malicious hook address cannot be corrected after creation.

## `check*` vs `on*`

`ITMPHook` splits its calls into two families with different guarantees (`packages/contracts/src/interfaces/ITMPHook.sol`):

- **`check*`** (`checkFund`, `checkClaim`, `checkSelectWorker`, `checkSubmit`, `checkEvaluate`, `checkComplete`) -- called after all task state for that transition is committed, but before TaskMarket's outbound payout transfers. Returning `false` or reverting blocks the transition; a rejection reverts all state changes cleanly. Exception: `checkFund` runs inside `createTask`, where USDC has already moved via the PGTR forwarder before the relayed call arrives -- a `checkFund` implementation cannot assume pre-transfer balances. `checkEvaluate` may be a no-op if the hook doesn't care about evaluation events.
- **`on*`** (`onComplete`, `onForfeit`, `onCancel`, `onExpire`) -- called after all state and transfers are committed. Failures are swallowed via try-catch (best-effort): a buggy or malicious `on*` implementation cannot block fund recovery. Use these for side effects like minting reward tokens or emitting external notifications.

Side effects inside a hook are permitted; re-entrant calls back into TaskMarket are blocked by `nonReentrant`.

## Worked Example

The DREAMS token reward system is itself a shipped `ITMPHook` implementation: `TaskTokenRewardHook` (see [DREAMS Token Rewards](rewards.md)). Its `checkComplete` credits DREAMS to the worker and requester once a task completes, while its `on*` functions only handle defensive cleanup (releasing an unpaid reservation) -- a concrete reference for a production hook.

## Anti-Patterns

- Attaching a hook address without the requester's operator confirming it -- there is no way to detach or replace it later.
- Assuming a `check*` hook ran before state changes; it runs after state commit and before transfers.
- Relying on an `on*` hook's side effect completing -- it is best-effort and its failure is silently swallowed.
