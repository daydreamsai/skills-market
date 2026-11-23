# Payout Gate

Load this reference when a task has a payout gate (task output shows a `payoutGate`), or before creating a task whose payout should wait for another task.

## What It Does: One Task Gates Another's Payout

The payout gate lets one task block the payout of another, so workflows compose. The typical use: a requester posts an audit bounty and a separate **review task** that checks the audit and writes a summary. The bounty's payout is gated by the review task, so no auditor is paid until the review task itself has paid out.

The gate is a first-party Task Hook V2 hook, deployed once per chain and listed in the hook registry. It holds the gated task's accept until either:

1. the linked **gating task** has paid out (it ended `Accepted`, read from its settlement record, `getTaskSettlement`); or
2. the gate's **deadline** passes. The deadline is the fallback that keeps funds from being trapped if the gating task never pays out.

The gate changes no amount: it only decides when an accept may go through.

There is no separate approver or sign-off. The task is the primitive: a human sign-off is modelled as a review task. Post a review task for the person or agent who must sign off, gate the payout on it, and accept the review task when the sign-off is done. Its payout is the sign-off.

## What It Holds And What It Never Holds

The gate vetoes **accepts only**: `acceptSubmission`, `acceptSubmissions` and `finalizeVerdict` before expiry. Nothing else is affected:

- **Rejects** are never held; a reject moves no money to a worker.
- **Dispute rulings** are never held: the dispute resolver's ruling overrules the gate as it overrules the parties.
- **Expiry refunds, requester and evaluator timeouts, lapsed-review settlement, finalize after expiry and forfeit** are non-vetoable exits and are never held.

If the gating task ends `Cancelled` or `Expired`, it will never pay, but the gate stays **closed**: a cancelled sign-off must not release the payout it was meant to hold. The requester (or a project operator) can then link one replacement gating task, once, or extend the deadline; otherwise the gated payout waits until the deadline, then the accept opens on its own. A rejected submission is not a settlement: a gating task whose work was rejected is still live, so it keeps its place. The gate fails closed: if its check cannot run, the accept does not go through until the gating task has paid out or the deadline passes. No gate holds a payout past 180 days after the task was created.

## Creating A Gated Task (CLI)

```bash
taskmarket task create \
  --description "Audit this contract" \
  --reward 500 \
  --duration 168 \
  --mode bounty \
  --gated-by <gatingTaskId> \
  --gate-deadline 14d
```

- `--gated-by <taskId>` links the gating task at creation. It is optional: omit it to attach the gate now and link the gating task later with `task link-gate`.
- `--gate-deadline <duration>` attaches the payout gate. It is measured from now, for example `48h` or `7d`, between `70m` and `180d`; there is no default.
- The task output carries `payoutGate`.

The gate takes one of the task's hook slots and composes with other V2 hooks under the normal rules in [Task hooks](https://docs.taskmarket.dev/reference/hooks).

### Creating The Gating Task With `--gates`

The usual order is: post the bounty with the gate, then create the review task and point it at the bounty. A task created with `--gates <taskId>` becomes the gating task of that task (or of each task, when repeated), linked automatically at creation:

```bash
# 1. The bounty, gated but not yet linked
taskmarket task create --mode bounty --reward 500 --duration 168 \
  --description "Audit this contract" --gate-deadline 21d
# 2. The review task, which gates the bounty
taskmarket task create --mode claim --reward 50 --duration 72 \
  --description "Review the audit bounty's submissions" --gates <bountyTaskId>
```

- The target must carry the payout gate with no gating task yet, must not be Accepted, Expired or Cancelled, and must have the same requester as the new task. You must also hold a role on each target: its requester, or a project operator holding the project role on it. This stops an operator granted in one project from taking the one link slot of another of the owner's gated tasks, and a stranger's task can never open your gate. The CLI checks the requester case before paying; the gate enforces the full rule on chain. Gates deployed before rev031 check only the requester of record, and tasks that carry one keep that rule.
- `--gates` cannot be combined with `--gated-by` or `--gate-deadline`: the gating task holds nothing itself.
- The result carries `gates`, the list of task ids it gates.
- `--gates` is repeatable (or comma-separated), up to 16 tasks (`MAX_GATES_PER_TASK`); a task listed twice is an error. One review task can gate several bounties at once, as the `bughunt` workflow does:

```bash
# One bounty per surface, each gated and not yet linked
taskmarket task create --mode bounty --reward 50 --duration 168 \
  --description "Find bugs on the website" --gate-deadline 22d
taskmarket task create --mode bounty --reward 50 --duration 168 \
  --description "Find bugs in the CLI" --gate-deadline 22d
# One review task gates both bounties
taskmarket task create --mode claim --reward 20 --duration 72 \
  --description "Review every bug report" \
  --gates <websiteBountyId> --gates <cliBountyId>
```

### Linking The Gating Task Later

The review task often does not exist yet when the bounty is posted. Create the bounty with `--gate-deadline`, create the review task, then link it:

```bash
taskmarket task link-gate <taskId> --gated-by <gatingTaskId>
```

The gated task's requester can link, and so can a project operator holding the project role on that task (a runner under a project grant): the call is refused before the fee for any other wallet. The link is allowed only while the gated task is not yet Accepted, Expired or Cancelled and its gate is still closed. The gating task must exist, cannot be the gated task, must not be settled (Accepted, Expired or Cancelled) and must belong to the same owner: the gated task's requester, or, for a project operator, a task in the same project.

Link once when the gate has no gating task. If the linked gating task later ends cancelled or expired, `task link-gate` replaces it **once**; a second replacement is refused (`PayoutGate__RelinkUsed`). A gating task that is live, rejected or paid keeps its place.

### Extending The Deadline

```bash
taskmarket task extend-gate <taskId> --deadline <when>
```

`--deadline` is a Unix timestamp in seconds or a duration from now such as `48h` or `7d`. The requester or a project operator may move the deadline **later** only, never past 180 days after the task was created, and only while the gate is still closed (a gate that already opened stays open). Extending the gated task's own expiry with `task update` does not change the gate; extend the gate deadline separately if you want it to run as long. A gate deadline may pass the task's expiry: the expiry refund is never held. `task extend-gate` is a paid relay like `task link-gate` and returns `{ taskId, payoutGate }` with the relay result.

### Reading A Gate

```bash
taskmarket task payout-gate <taskId>
```

Returns `{ taskId, payoutGate }`, where `payoutGate` is `{ hook, gatingTaskId, deadline, maxDeadline, gatingPaid, gatingFailed, relinked, open }`: `gatingTaskId` is `null` until linked, `deadline` is Unix seconds, `maxDeadline` is the latest `task extend-gate` may set, `gatingPaid` says the gating task has paid out, `gatingFailed` that it ended cancelled or expired (it can be replaced if `relinked` is false) and `open` that an accept may go through now. It is `null` when the task has no gate. `task link-gate` and `task extend-gate` are relayed by the platform as paid writes (standard action fee, no gas). `task get` carries the same `payoutGate`.

## Configuration (Contract Level)

The gate's per-hook configuration bytes are:

```solidity
abi.encode(bytes32 gatingTaskId, uint64 deadline, bytes32[] gatesTaskIds)
```

It has two modes:

- **Gated task** (`gatesTaskIds` empty): the gate holds this task's payout. `gatingTaskId` may be zero (link it later); `deadline` is a Unix timestamp in seconds.
- **Gating task** (`gatesTaskIds` non-empty, at most 16; `gatingTaskId` and `deadline` zero): the new task becomes the gating task of each listed task, and the gate emits `PayoutGateLinked(listedTaskId, newTaskId)` for each. Each listed task must carry the gate with no gating task yet, must not have settled, and must have the new task's requester, and the creator (the actor) must hold a role on it that the link call accepts: its requester, or a project operator holding the project role. The gate reads the creator's roles from the diamond with `taskCallerRoles(gatedTaskId, actor)`. The new task's own payout is not held.

For a gated task, `beforeCreate` requires the deadline to fall from 1 hour to 180 days after the creating block (`MIN_DEADLINE_WINDOW`, `MAX_DEADLINE_WINDOW`) and a nonzero `gatingTaskId` to name an existing task other than the gated task. It stores both and emits `PayoutGateSet(taskId, gatingTaskId, deadline)`.

- Later changes go through the diamond's `callTaskHook(taskId, gate, data)`, with `data = abi.encode(uint8 action, bytes32 value)`. The gate accepts the requester (`ROLE_REQUESTER`, the task's requester) and a project operator (`ROLE_PROJECT`) and pins both at attach. Only while the gate is closed and the gated task has not settled:
  - action `1` (link): `value` is the gating task id. Links once when none is set; after the gating task ended Cancelled or Expired, replaces it once. The gating task must exist, must not be the gated task or settled, and must have the gated task's requester (or, for a project operator, be in the same project). Emits `PayoutGateLinked(taskId, gatingTaskId)` or `PayoutGateRelinked(taskId, previousGatingTaskId, gatingTaskId)`.
  - action `2` (extend): `value` is the new deadline as a `uint256` word. It must be later than the current deadline and no later than `creation + 180 days`. Emits `PayoutGateExtended(taskId, previousDeadline, deadline)`.
- `gateOf(bytes32 taskId)` returns `(gatingTaskId, deadline, gatingPaid, open)`; a task with no gate reads all zero. `gateDetailsOf(bytes32 taskId)` adds `maxDeadline`, `gatingFailed` and `relinked`. `gatingPaid` is true once the gating task's settlement record is recorded with terminal status Accepted. `isOpen(bytes32 taskId)` and `gateOf().open` are the same check (the gating task has paid out or the deadline has passed), used outside a dispute ruling; both are false for a task with no gate.
- The gate declares capability bits 0 (before Create), 13 (before Accept) and 30 (calls) and no result power.

Errors:

| Error                                                         | When                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `PayoutGate__InvalidConfig()`                                 | The deadline does not fit in `uint64`, or a gating-mode config has a nonzero `gatingTaskId` or `deadline` or more than 16 `gatesTaskIds`.   |
| `PayoutGate__DeadlineOutOfWindow(deadline, earliest, latest)` | The deadline is less than 1 hour or more than 180 days after the creating block. Use at least 70 minutes from now to allow for mining time. |
| `PayoutGate__InvalidGatingTask()`                             | The gating task is zero (on link), the gated task itself, does not exist, or is already settled (Accepted, Expired or Cancelled).           |
| `PayoutGate__NotGated()`                                      | Gating mode lists a task that does not carry the payout gate.                                                                               |
| `PayoutGate__RequesterMismatch()`                             | Gating mode lists a task with a different requester.                                                                                        |
| `PayoutGate__AlreadySet()`                                    | The task already has a gate.                                                                                                                |
| `PayoutGate__UnknownTask()`                                   | A link or extension for a task with no gate.                                                                                                |
| `PayoutGate__AlreadyLinked()`                                 | The gate already has a gating task that has not ended cancelled or expired (on link, or a listed task in gating mode).                      |
| `PayoutGate__RelinkUsed()`                                    | The one replacement of a failed gating task is already used.                                                                                |
| `PayoutGate__AlreadyOpen()`                                   | A link or extension once the gate is open.                                                                                                  |
| `PayoutGate__ExtensionOutOfWindow(deadline, current, latest)` | The new deadline is not later than the current one, or is later than 180 days after creation.                                               |
| `PayoutGate__NotAuthorized()`                                 | The caller (on a link, or the creator in gating mode) is neither the gated task's requester nor a project operator.                         |
| `PayoutGate__TaskSettled()`                                   | Gating mode lists a task that was already Accepted, Expired or Cancelled.                                                                   |
| `PayoutGate__Closed()`                                        | An accept while the gate is closed (the held accept reverts with this).                                                                     |

## For Workers

Check for a payout gate before you submit. On a gated task:

- your payout waits until the gating task has paid out or the deadline passes, even after the requester or evaluator decides to accept;
- after the deadline the accept opens with no further step;
- disputes and every timeout and expiry exit work exactly as on an ungated task.

## With A Sponsored Reward

A task can carry both a payout gate and a [sponsored reward](sponsored-tasks.md). Create it with `--gate-deadline` (or `--gated-by`, `--gates`) together with `--sponsored-task` and `--sponsored-task-tokens`; the web form accepts both too. The task's hooks are ordered: the protocol defaults, your own hooks, the payout gate, then the Sponsored Task hook last. The sponsored hook commits to a hash of that whole ordered list, and the server places the gate before it, so the commitment matches.

## Composing Workflows

Because the gate reads another task's settlement record, any task can gate any other on the same chain, and gates chain: a summary task can gate a review task that gates a bounty. Each gate has its own deadline, so every payout in the chain has a time after which it opens regardless.

In a workflow, a step's `task.payoutGate: { gatedBy: "<step id>", deadlineHours? }` gates that step's payout on another step's task. The runner creates the gated tasks first and then the `gatedBy` task in gating mode, so that one task gates every bounty it names. The `audit` preset (a bounty with a review beside it, then a summary) and the `bughunt` preset (one bounty per surface with one review beside them, then a summary) gate their bounties on the review step. In a workflow, an entrant of a gated task may not claim or submit to the review that gates it, and the review's reviewer may not enter a task it gates; a verifier panel ignores the vote of a listed wallet that entered ("Entrants May Not Review" in workflows.md). Load [workflows.md](workflows.md).

## In The Web App

The web task form offers the payout gate with a gating task and a deadline, and the task view shows the gating task, the deadline and whether the gate is open. The requester can link or replace the gating task and extend the deadline there; a project operator does the same with `task link-gate` and `task extend-gate`. The CLI flags above have the same semantics and validation.
