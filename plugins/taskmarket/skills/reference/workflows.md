# Workflows

A workflow is a JSON document that composes [project](projects.md) tasks from eight named patterns:
a spec, then a build that is reviewed until it passes, then the owner's approval, then a deploy; or
a contest whose winner is polished, with fallbacks, and checked. A run is one execution of it; one
workflow can run many times. Load this file to write, validate, create, run or follow a workflow, or
to make one from a template or preset.

## Who Does What

| Who                     | Does                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The project's owner     | Turns the project's [automations](projects.md#automations) on with a cap, saves the workflow, starts runs, reviews every step's task (or names an evaluator with the [review default](projects.md#review-default)), approves gates, retries failed steps and cancels runs. Every workflow write is the owner's.        |
| The platform runner     | A Taskmarket wallet that is an ordinary operator on the project, the same one that runs [schedules](projects.md#schedules). You never handle it: turning automations on grants it for you. It creates each step's task from the budget when the step is ready and pays the action fee for it. It never reviews a task. |
| Workers                 | Find, take and submit to each step's task as to any task. A step's task continues the task that produced its first input, so its worker reads that task's winning accepted files as in [Continuations](projects.md#continuations).                                                                                     |
| The project's evaluator | When the owner set a review default, judges each step's task; its verdicts move the run as the owner's would.                                                                                                                                                                                                          |

A step's task counts as **accepted** when it pays a worker. It counts as **rejected** when it ends
after its work was rejected (a rejected submission, or an evaluator's REJECT verdict), and as
**expired** or **cancelled** when it ends that way with nothing rejected. The runner reads the
outcome on its next sweep, so the next step opens a short while after the verdict settles.

## Before the First Run

1. Turn the project's automations on with a cap that holds the workflow's worst case (below):
   `taskmarket project automations on <projectId> --cap <amount>`. This grants the platform runner
   of the project's chain for you, with the one set of terms it needs: you stay the requester of
   record with owner override on. The runner accepts the grant itself. `taskmarket project
   automations status <projectId>` shows `state`, `cap`, `spent` and `remaining`; `state:
   "unavailable"` means this network has no runner and workflows cannot run there. While
   automations are off, creating or starting a workflow is refused before payment with
   `taskmarket project automations on <projectId> --cap <amount>` as the fix (`reason:
   "automations_off"`). Turning them off pauses the project's schedules; a run still going cannot
   open its next step until you turn them on again and retry it. See
   [Automations](projects.md#automations).
2. Make sure the project's available budget holds the worst case too: add to it with
   `taskmarket project fund <projectId> --amount <amount>`, from any wallet.

## The Document

```json
{
  "name": "ship-a-contract",
  "description": "Spec, build until review passes, owner approval, deploy",
  "steps": {
    "pattern": "sequence",
    "steps": [
      {
        "id": "spec",
        "task": { "description": "Write the spec", "reward": "20000000", "duration": 24 },
        "outputs": ["spec"]
      },
      {
        "pattern": "reviewLoop",
        "maxRounds": 3,
        "work": {
          "id": "build",
          "task": {
            "description": "Build it",
            "reward": "80000000",
            "duration": 48,
            "mode": "claim"
          },
          "inputs": ["spec"],
          "outputs": ["contract"]
        },
        "review": {
          "id": "review",
          "task": {
            "description": "Review it",
            "reward": "15000000",
            "duration": 24,
            "mode": "claim"
          },
          "inputs": ["contract"],
          "outputs": ["findings"]
        }
      },
      { "pattern": "gate", "approve": "owner", "timeout": "P7D" },
      {
        "id": "deploy",
        "task": {
          "description": "Deploy it",
          "reward": "10000000",
          "duration": 24,
          "mode": "claim"
        },
        "inputs": ["contract"]
      }
    ]
  }
}
```

- **JSON only.** The document is JSON on the web, in the CLI and in the API; YAML is not read, and
  JSON has no comments, so put notes for people in `description` (at most 2000 characters).
- **Top level:** `name` (required), `description` (optional) and `steps`, which is one step: a task
  step or a pattern holding other steps. Any other field is refused (`unknown_field`).
- **A task step** is `{ "id", "task", "inputs"?, "outputs"?, "startWhen"?, "hireWinnerOf"? }`, and a
  contest step also takes `startWhen`.
- **`startWhen`** is `ready` (the default: the runner creates the task as soon as the steps before
  it allow) or `closed`: the task is created only once every task it gates in its scope has closed
  to submissions (its deadline passed, or it ended), so a review sees every entry. `closed` is
  allowed only on a step that another step's `task.payoutGate.gatedBy` names
  (`start_when_not_gating` otherwise). Keep each gated step's `deadlineHours` past the gated task,
  the gating task and a day.
- **`task`** takes the fields of a schedule's template: `description`, `reward` (base units of the
  payment token as a digit string: `"5000000"` is 5 USDC), `duration` (the deadline in hours after
  the runner creates the task), `mode` (`bounty`, the default, `claim` or `pitch`), `tags`, and the
  evaluator terms `evaluator`, `evaluatorFeeBps`, `evaluatorStake` (base units, drawn from the
  budget with the reward), `evaluationWindowHours` and `appealWindowHours`, which need `evaluator`,
  and `payoutGate` (below).
- **`task.payoutGate`** is `{ "gatedBy": "<step id>", "deadlineHours"?: <hours> }`: the runner
  creates this step's task with the [payout gate](payout-gate.md), so its payout waits until the
  `gatedBy` step's task has been accepted, or `deadlineHours` after this task is created. The
  workflow moves on as usual; only the payment waits. The runner creates the gated tasks first and
  then the `gatedBy` task in gating mode, so one review task gates every bounty that names it (up to
  16). `gatedBy` names another task step in the same
  document, typically a review in a `parallel` beside this step that works from its submissions.
  Set `deadlineHours` past the longest the gated and gating tasks can run, so the review can finish
  first. Chains without Task Hook V2 cannot run a gated step.
- **`hireWinnerOf`** hires the winning worker of an earlier step again, as
  [`taskmarket hire`](cli.md) does. It names one of the step's own `inputs`, and the step's
  `task` runs in the `claim` mode. The runner waits until that output's task has been paid, then
  creates this step's task as a private hire of the worker whose submission was paid first (rank 1;
  the larger payment, then the earlier award, when several share it): only that worker may accept
  or decline it before the accept window (72 hours) ends. The hire has the reward, duration and
  terms the step's `task` names, and the runner creates it under your grant like any other step,
  so it counts in the worst case (budget and grant cap) before the run starts and is refused with
  the same `automations_off` guidance when automations are off. A contest step takes no
  `hireWinnerOf`, and a step has either `hireWinnerOf` or a `reviewer`. A placeholder cannot fill
  it in a template. If no paid worker is found, the step fails `no_winner` and nothing is created;
  if the worker declines or the offer lapses, the step ends cancelled or expired: retry it to hire
  the same worker again, or cancel the run. Refused as `invalid_hire_winner_of`,
  `hire_winner_not_input`, `hire_needs_claim` and `hire_and_reviewer`.
- **`outputs`** names the files of the step's accepted (winning) submission; **`inputs`** names
  outputs of steps that finish earlier. At most 10 names each. `item` is reserved for a forEach's
  item.
- **Names.** Ids and output names start with a letter, then letters, digits, `_` or `-`, at most 40
  characters, unique in the document. A pattern without an `id` gets one by position
  (`sequence-1`, `gate-1`).

Rewards in a document are base units, unlike the CLI's `--reward` flags, which take whole amounts.

## Patterns

There are eight patterns. Patterns nest: any step inside `sequence`, `parallel`, a forEach's `step`
or a branch's case can itself be a pattern. A reviewLoop's `work`, `review` and `fix` are task steps
only, and a fallback's `step` is a task or contest step.

| Pattern      | Fields                                                 | Runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sequence`   | `steps`                                                | Each step after the one before is accepted.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `parallel`   | `steps`                                                | Every step at once; the step after it waits for all of them.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `forEach`    | `items` or `itemsFrom`, `maxItems`, `step`, `combine?` | `step` once per item, all at once. `items` is a list of strings; `itemsFrom` names an earlier output, one item per file. `{{item}}` in a description is replaced by the item, and the step's `item` input is that one file. `combine` runs once after every item, with all their outputs.                                                                                                                                                                              |
| `reviewLoop` | `maxRounds`, `work`, `review`, `fix?`                  | `work`, then `review`. An accepted review passes the loop; a rejected review asks for changes, so the next round runs `fix` (or `work` again) continuing the review, then `review` again, up to `maxRounds`. A rejected `work` fails the loop. `fix` replaces `work`'s outputs.                                                                                                                                                                                        |
| `gate`       | one of `approve`, `verdict`, `after`, `at`; `timeout?` | Holds the steps after it until its condition holds (see [Gates](#gates)).                                                                                                                                                                                                                                                                                                                                                                                              |
| `contest`    | `id`, `task`, `metric?`, `inputs?`, `outputs?`         | One task in the `bounty` mode (the default) or the `benchmark` mode: several workers submit and the winner is accepted. Its `outputs` are the winning (rank-1) submission's files, so the next step continues the winner. `metric` (`{ "description", "target"? }`) is a benchmark's metric and needs `"mode": "benchmark"`.                                                                                                                                           |
| `branch`     | `on`, `cases`, `otherwise?`                            | Runs the first case whose `when` matches, else `otherwise`, else nothing. `on: { "verdict": "<id>" }` reads the verdict of a task or contest step that finished before it: `when` is `accepted`, `rejected`, `expired`, `cancelled`, or `failed` for any of the last three. `on: { "output": "<name>" }` reads a named output: `when` is `present` (an accepted step produced it) or `absent`. Each case is `{ "when", "then" }`, and cases may name the same outputs. |
| `fallback`   | `maxAttempts`, `step`, `alternatives?`, `on?`          | Runs `step`; when its task ends with a verdict in `on` (`rejected` and `expired` by default; list `cancelled` to include it), runs it again as the next attempt, up to `maxAttempts` (1 to 5). Attempt N merges `alternatives[N-2]` into the task, such as a higher `reward`, another `mode` or wider `tags`; the last alternative repeats.                                                                                                                            |

### Gates

| Condition                                      | Opens when                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"approve": "owner"`                           | The owner runs `taskmarket workflow approve <runId> --step <key>`.                                                                                     |
| `"verdict": { "step": "<id>", "pass": [...] }` | The named task or contest step, which finished before the gate or runs beside it in a parallel, ends with a verdict in `pass` (`accepted` by default). |
| `"after": "<ISO 8601 duration>"`               | That long after the gate is reached, 1 minute (`PT1M`) to 30 days (`P30D`).                                                                            |
| `"at": "<ISO 8601 time>"`                      | That time.                                                                                                                                             |

A gate takes exactly one condition. An owner or verdict gate can take a `timeout` (`PT1H` to `P30D`)
that fails it if it has not opened in time; a time gate cannot. A verdict gate's timeout only matters
when the gate runs beside its step in a parallel: after the step in a sequence, the gate is reached
once the verdict exists and decides at once. Retrying the step restarts the timeout of a verdict
gate waiting beside it. A verdict or time gate opens on its
own: `workflow approve` is for owner gates only.

### Judged Steps

A step that a branch or a verdict gate reads is judged by it: when its task ends rejected, expired or
cancelled, the run goes on and the branch or gate decides what follows, instead of failing. A verdict
gate whose step ends with a verdict outside `pass` stays shut, and the run fails on that step until
you retry it. A fallback opens its next attempt instead of failing; when its last attempt also ends
with a verdict in `on`, the fallback fails.

### Pattern Examples

Each block below is the value of `steps`; an input it does not define (`spec`) comes from an
earlier step of a larger document.

```json
{
  "pattern": "sequence",
  "steps": [
    {
      "pattern": "parallel",
      "steps": [
        {
          "id": "papers",
          "task": { "description": "Survey recent papers", "reward": "15000000", "duration": 48 },
          "outputs": ["papers"]
        },
        {
          "id": "market",
          "task": { "description": "Survey the market", "reward": "15000000", "duration": 48 },
          "outputs": ["market"]
        }
      ]
    },
    {
      "id": "synthesis",
      "task": { "description": "Write the synthesis", "reward": "20000000", "duration": 48 },
      "inputs": ["papers", "market"]
    }
  ]
}
```

```json
{
  "pattern": "forEach",
  "id": "write",
  "items": ["pricing", "onboarding", "security"],
  "maxItems": 3,
  "step": {
    "id": "article",
    "task": { "description": "Write an article on {{item}}", "reward": "10000000", "duration": 48 },
    "inputs": ["item"],
    "outputs": ["article"]
  },
  "combine": {
    "id": "edit",
    "task": {
      "description": "Edit the articles into one series",
      "reward": "10000000",
      "duration": 48
    },
    "inputs": ["article"]
  }
}
```

```json
{
  "pattern": "reviewLoop",
  "maxRounds": 3,
  "work": {
    "id": "build",
    "task": { "description": "Build it", "reward": "80000000", "duration": 48 },
    "inputs": ["spec"],
    "outputs": ["code"]
  },
  "review": {
    "id": "review",
    "task": {
      "description": "Review it; accept when ready, reject to ask for changes",
      "reward": "15000000",
      "duration": 24
    },
    "inputs": ["spec", "code"],
    "outputs": ["findings"]
  },
  "fix": {
    "id": "fix",
    "task": { "description": "Address every finding", "reward": "40000000", "duration": 48 },
    "inputs": ["spec", "code", "findings"]
  }
}
```

A contest, then a polish that falls back to a higher reward and then to a bounty, then a check
whose verdict a branch reads: accepted waits a day before what follows, failed opens `redo`, which
continues the rejected `check`.

```json
{
  "name": "logo-polished-and-checked",
  "steps": {
    "pattern": "sequence",
    "steps": [
      {
        "pattern": "contest",
        "id": "logos",
        "task": { "description": "Design a logo", "reward": "50000000", "duration": 72 },
        "outputs": ["logo"]
      },
      {
        "pattern": "fallback",
        "maxAttempts": 3,
        "step": {
          "id": "polish",
          "task": {
            "mode": "claim",
            "description": "Polish it",
            "reward": "10000000",
            "duration": 24
          },
          "inputs": ["logo"],
          "outputs": ["final"]
        },
        "alternatives": [{ "reward": "15000000" }, { "reward": "20000000", "mode": "bounty" }]
      },
      { "id": "check", "task": { "description": "Check it", "reward": "5000000", "duration": 24 } },
      {
        "pattern": "branch",
        "on": { "verdict": "check" },
        "cases": [
          { "when": "accepted", "then": { "pattern": "gate", "after": "PT24H" } },
          {
            "when": "failed",
            "then": {
              "id": "redo",
              "task": { "description": "Redo it", "reward": "10000000", "duration": 24 },
              "inputs": ["final"]
            }
          }
        ]
      }
    ]
  }
}
```

A benchmark contest and a gate that opens on its verdict:

```json
{
  "pattern": "sequence",
  "steps": [
    {
      "pattern": "contest",
      "id": "speedup",
      "task": {
        "mode": "benchmark",
        "description": "Make the parser faster",
        "reward": "40000000",
        "duration": 96
      },
      "metric": { "description": "Median parse time on the corpus, in ms", "target": "120" },
      "outputs": ["patch"]
    },
    { "pattern": "gate", "verdict": { "step": "speedup" } },
    {
      "id": "merge",
      "task": {
        "mode": "claim",
        "description": "Merge the winning patch",
        "reward": "5000000",
        "duration": 24
      },
      "inputs": ["patch"]
    }
  ]
}
```

## Validation

Nothing is spent until the document passes. `taskmarket workflow validate` checks it offline, and
with `--project` also against the project; `workflow create` and `workflow run` check it again on
the API. Every error names a JSON pointer, a stable `code` and a message, for example
`/steps/steps/1/review/inputs/0 unknown_input`, and every error is reported at once. It checks:

- the patterns, their fields and nesting: at most 6 deep (`too_deep`), 60 steps (`too_many_nodes`),
  20 children per sequence or parallel (`too_many_children`) and 64 KiB of JSON
  (`document_too_large`);
- unique ids and outputs (`duplicate_id`, `duplicate_output`), and inputs that name outputs of steps
  that finish earlier (`unknown_input`);
- a bound on every loop: `maxItems` (1 to 50) on every forEach, `maxRounds` (1 to 10) on every
  reviewLoop and `maxAttempts` (1 to 5) on every fallback (`missing_bound`, `invalid_bound`);
- a contest's mode (`contest_mode`; a `metric` needs the benchmark mode), branch conditions that
  read a step finished before them or an earlier output (`unknown_step`, `invalid_case`,
  `duplicate_case`), and gate conditions: exactly one (`gate_conditions`), and a verdict gate never
  waits on a step that runs after it (`gate_order`);
- the project's step limit, the task steps in the document: 6 by default, 1 to 25 with
  `workflow settings --step-limit` (`too_many_steps`);
- the **worst case**: at most 100 tasks (`too_many_tasks`), and its spend against the project's
  available budget (`over_budget`) and the runner grant's remaining cap (`over_grant_cap`).

The worst case is every forEach at `maxItems`, even with a shorter `items` list; every reviewLoop
at `maxRounds` (`work` once, `review` `maxRounds` times and `fix`, or `work`, `maxRounds - 1`
times); every fallback at `maxAttempts`, each attempt at its own reward; and every branch on its
costliest case. A contest is one task. Each task costs its `reward` plus any `evaluatorStake`;
gates cost nothing.
A valid result prints `summary`: `taskSteps`, `gates`, `worstCaseTasks`, `worstCaseSpend` (base
units), `stepIds` and `outputs`, and with `--project` the `checkedAgainst` step limit, available
budget, cap remaining and runner.

A forEach over `itemsFrom` is checked again when its list is known, before any item is funded: a
list longer than `maxItems` fails the step with `too_many_items`, and a remaining worst case the
budget or the grant cap no longer holds fails it with `over_budget`.

## Runs

`taskmarket workflow status <runId>` shows the run's `status` (`running`, `failed`, `completed`,
`cancelled`), an outline of the document, every step instance and `nextAction`:

| `nextAction`      | What to do                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `review_task`     | A step's task has work waiting. Review it as on any task (accept, reject, or let the evaluator judge). |
| `approve_gate`    | An owner gate is open: `taskmarket workflow approve <runId> --step <key>`.                             |
| `wait_for_gate`   | A verdict or time gate has not opened yet. Nothing to do.                                              |
| `retry_or_cancel` | A step failed: `taskmarket workflow retry <runId> --step <key>`, or `workflow cancel`.                 |
| `wait_for_runner` | The runner creates the next task on its next sweep. Nothing to do.                                     |
| `none`            | Nothing is waiting on you.                                                                             |

A step instance is `pending`, `open`, `accepted`, `failed` or `skipped`, with a `verdict`
(`accepted`, `rejected`, `expired`, `cancelled`, `refused`, `too_many_items`, `over_budget`,
`timeout`, `approved`, or `passed` for a verdict or time gate that opened) and its `taskId` once
created. Its key is the step id, with `[item=N]` inside a forEach, `[round=N]` inside a reviewLoop
and `[attempt=N]` inside a fallback, each counted from 1: `article[item=2]`, `review[round=2]`,
`polish[attempt=2]`. Pass that key to `--step`. A step's `attempt` field counts your retries.

- **A failed step stops what depends on it.** The run fails and the steps after it are skipped;
  other branches of a parallel that are already open run on. `refused` means the runner's create was
  refused (no grant, the cap or the budget). `workflow retry` starts the failed step again as a new
  attempt and resumes the run. A forEach that failed `over_budget` recounts what it needs and can
  pass on a retry once the budget or grant cap holds it; one that failed `too_many_items` read its
  list from accepted files that will not change, so a retry is refused before payment: cancel the
  run and raise `maxItems`. A failed run's payouts still move: a gating review you accept after the
  run failed gets its payout proposal without a retry, and the run stays failed.
- **Cancelling** a run creates nothing more. Tasks it opened stay open until they end or you cancel
  them.
- **Limits.** A project holds at most 50 workflows and 5 runs running or failed at once; a failed
  run holds its slot until you retry it to completion or cancel it. A workflow cannot be edited:
  make a new one and delete the old one (`workflow delete`, or Delete workflow on the project page)
  once none of its runs is running or failed.

## Gating Reviews and Payouts

A gating review is a task or contest step that a bounty's `task.payoutGate.gatedBy` names. Besides
`startWhen`, it takes five options, all refused on a step that gates nothing
(`review_option_not_gating`, or `payout_not_gating` for `payout: "auto"`):

| Option                | Values (default first)              | What it does                                                                          |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| `payout`              | `confirm`, `auto`, `manual`         | What happens to the gated bounties' payout once the review is accepted (below).       |
| `reviewAccept`        | `owner`, `auto`                     | Who accepts the review: you, or the runner when the reviewer delivers.                |
| `reviewer`            | none (anyone may enter the task)    | Who may take the review (task steps only); the review then runs in the `claim` mode.  |
| `allowOpenAutoAccept` | `false`, `true`                     | Lets `reviewAccept: "auto"` accept an `open` reviewer's review.                       |
| `objectionHours`      | 0 to 168 (24 with `payout: "auto"`) | Hours an automatic payout waits for an entrant's objection (below). `0` pays at once. |

**`reviewer`** is one of:

- `{ "kind": "nominated", "wallet": "0x..." }`: a reserved hire of that one wallet; the step's `duration` must be at least 72 hours, the hire's accept window (`hire_duration`).
- `{ "kind": "eligible", "requireIdentity": [...], "requireVerified": [...] }`: the first wallet
  that meets the worker requirements claims it, for example
  `"requireIdentity": ["erc8004:identity:registered"]` or
  `"requireVerified": ["tap:identity:verified"]` (also `erc8004:reputation:reputable`; see [worker-requirements.md](worker-requirements.md)). Name at least one.
- `{ "kind": "open" }`: anyone may claim it.
- `{ "kind": "panel", "wallets": ["0x...", ...], "quorum": 2 }`: a verifier panel of 2 to 10
  distinct wallets. `quorum` is a whole number from a strict majority (`floor(n / 2) + 1`) up to
  `n`. A panel needs `reviewAccept: "auto"` (`panel_needs_auto_accept`). The review runs as a
  private bounty that only the listed wallets can see and enter, with submissions revealed only
  once it ends, so each verifier delivers its own `payout-recommendation.json` without seeing
  the others'. A bad panel is refused as `panel_wallet_count`, `panel_duplicate_wallet` or
  `panel_quorum_range`. See "Verifier Panels".

**`reviewAccept: "auto"`** needs a `reviewer` (`auto_accept_needs_reviewer`); a panel is allowed
without `allowOpenAutoAccept`. When the reviewer
delivers, the runner accepts the review once: the earliest active submission, or for a nominated
reviewer only that wallet's own. With an `open` reviewer this is refused
(`auto_accept_open_reviewer`) unless you set `allowOpenAutoAccept: true`: whoever claims an open
review first would decide the payout with nobody checking, so you have to opt in to that
deliberately. The run's step records what happened in `autoAccept`: `{ at, result }`, where
`result` starts with `accepted:` (and the submission and transaction), `accepted_by_owner:` (you
accepted the review by hand before the runner's accept landed), `refused:` or `not_sent:` (the
runner cannot send accepts on this chain). After `refused` or `not_sent`, accept the review
yourself.

**`objectionHours`** is a whole number from 0 to 168. It holds an automatic payout or refund, so
it is meant for `payout: "auto"` (where it defaults to 24) and refused with `payout: "manual"`
(`objection_hours_manual_payout`). A template can fill it with an integer parameter. See "The
Objection Window".

Other values are refused as `invalid_payout`, `invalid_review_accept`, `invalid_reviewer`,
`invalid_allow_open_auto_accept` and `invalid_objection_hours`.

### Entrants May Not Review

A gating review decides who its gated tasks pay, so a wallet may not be on both sides. A wallet
with an active (not rejected) submission or claim on a gated task may not claim or submit to the
review that gates it, and a wallet that claimed or submitted to the review may not enter a task it
gates. This holds for every `reviewer` kind, a `nominated` wallet included. The API refuses the
claim or submission with a `FORBIDDEN` error whose message names the other task, and
`taskmarket task claim` and `taskmarket task submit` print that message. An entrant whose
submission was rejected may review, since that entry can no longer be paid.

If a reviewer's entry reaches the gated task anyway (for example a submission recorded straight
from the chain), the payout drafted on that review's recommendation is not sent automatically: it
becomes a `pending` proposal with `mode: "confirm"`, its `reason` names the reviewer and the task,
and you confirm it or accept the task yourself. An automatic review accept (`reviewAccept: "auto"`)
also skips such a conflicted submission and never accepts it, leaving the review for you to
accept by hand.

### Verifier Panels

With `reviewer.kind: "panel"` and `reviewAccept: "auto"`, no single wallet decides the payout. Each
listed wallet delivers one recommendation (its latest counts). When `quorum` of them name the same
winners with the same shares for every gated task, the runner treats that as the review's outcome:
it accepts those verifiers' submissions on the review, splitting the review reward equally among
them, and the agreed recommendation follows the payout mode as for any accepted review. Ranking
and notes may differ; a recommendation naming no winners agrees with others that name none.
A recommendation that names a submission that is not an active submission of a gated task casts no
vote.
A listed wallet that entered a gated task (it has an active submission there) has a stake in the
outcome: its recommendation is ignored and does not count toward the quorum. When the review ends
without a quorum, the step's `autoAccept.result` says how many recommendations were ignored for
this reason.

If the review's deadline passes without a quorum, the runner accepts no review submission. The
step's `autoAccept.result` starts with `refused:` and names the disagreement (how many delivered
and how many agreed) and you get a `workflow.approval_needed` event for the step. The payout
becomes an owner proposal: each gated task gets a payout proposal in `confirm` mode with status
`unavailable` and the same reason, because the panel agreed on nothing and there is no accept to
send. You accept the gated tasks yourself. The runner checks agreement off-chain,
so a false claim is detectable (the recommendations are published once the review ends) but not
impossible.

### The Recommendation

The review delivers `payout-recommendation.json` in its submission (at most 64 KB):

```json
{
  "ranking": [
    { "submissionId": "SUB-7Q2K", "rank": 1, "note": "Clearest hook, real numbers" },
    { "submissionId": "SUB-3MX9", "rank": 2 },
    { "submissionId": "SUB-8TTA", "rank": 3, "note": "Off brief" }
  ],
  "payout": [
    { "submissionId": "SUB-7Q2K", "share": 6000 },
    { "submissionId": "SUB-3MX9", "share": 4000 }
  ],
  "rationale": "Two entries met the brief; the first had the stronger call to action."
}
```

- **`ranking`**: every entry it reviewed, with `rank` from 1 and an optional `note` (up to 200
  entries).
- **`payout`**: the winners (up to 50, as many as one accept pays) and each one's `share` of the reward in basis points; the
  shares sum to 10000 for each gated task. A `submissionId` is a submission's id or its reference
  code (`SUB-...`). Empty when nothing passes (below).
- **`rationale`**: up to 4000 characters. Required when `payout` is empty, so the owner can see why
  nothing was paid; an empty `payout` with no rationale is refused as invalid.
- **`evidence`** (optional): what backs the recommendation, stored on the proposal and shown by
  `taskmarket workflow payout show` and on the run page.

```json
{
  "evidence": {
    "entries": [
      {
        "submissionId": "SUB-7Q2K",
        "checks": [
          { "id": "tests", "passed": true },
          { "id": "no-skip-markers", "passed": false, "detail": "2 skipped tests" }
        ]
      }
    ],
    "logs": ["check-run.log"],
    "hash": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
  }
}
```

`entries` is up to 200 entries (a `submissionId` as in `ranking`), each with up to 100 `checks`:
an `id` of 1 to 80 characters, `passed`, and an optional `detail` of up to 500 characters.
`logs` is up to 50 names of files in the same review submission. `hash` is a hash of the whole
evidence, `sha256:` and 64 hex characters or `0x` and 64 hex characters. The proposal keeps only
the entries of its own gated task. Evidence is shown, not checked: the runner does not re-run
the checks.

**When nothing passes**, deliver an empty `payout` with the reason in `rationale`:

```json
{ "ranking": [], "payout": [], "rationale": "No entry passed the published checks." }
```

That is a refund: every active entry of the gated task is rejected and the task is cancelled,
returning its reward to the project budget. What happens next follows the step's payout mode (below).
A refund rejects at most 50 entrants; a larger contest becomes an `unavailable` proposal and you
reject and cancel by hand.

### Payout Modes and Proposals

When the review is accepted, the runner checks the recommendation against each gated task's active
submissions:

- **`confirm`** (default): it stores one proposal per gated task, which pays nothing until you
  confirm it. Confirming sends exactly the accept the proposal shows, as you.
- **`auto`**: it sends that accept itself, as the project's operator, spending only what the
  runner's grant already funded from the budget. Unless `objectionHours` is `0`, it first holds
  the payout for an objection window (below).
- **`manual`**: no proposal; you accept the gated tasks by hand.

An empty recommendation makes a **refund** proposal (`kind: "refund"`, with `refund` listing the
entries to reject) instead of a payout (`kind: "payout"`):

- **`confirm`**: the refund waits until you confirm it. Rejecting every entry and cancelling is
  several writes, so one confirmation releases it and the runner, as the project's operator, then
  sends the rejects and the cancel. The proposal is `confirmed` and its `reason` reads
  `Refunded: ...` once the task is cancelled.
- **`auto`**: the runner rejects every active entry of the gated task and cancels it itself, as it
  sends accepts. The runner rejects and cancels only to carry out a validated empty
  recommendation, never on its own judgment. The proposal is `auto_paid`.
- **`manual`**: no proposal; reject the entries and cancel the task by hand.

If the runner cannot send a step (it refuses, or the chain is one it does not serve), the proposal
goes back to `pending` with the reason: confirm it to try again, or reject the entries
(`taskmarket task reject-all-submissions`) and cancel (`taskmarket task cancel`) by hand.

A proposal's `status`:

| `status`            | Meaning                                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pending`           | Waits for you. `accept` shows exactly what confirming sends: the task and each winner's share (on a refund, `refund` lists the entries that are rejected before the task is cancelled). An `auto` payout the chain refused also lands here, with the reason. |
| `confirmed`         | You confirmed it and the accept was sent as you (`confirmedAt`, `confirmedBy`). A refund you confirmed is carried out by the runner.                                                                                                                         |
| `auto_paid`         | The runner sent the accept, or on a refund the rejects and the cancel (`payout: "auto"`); `confirmedBy` is the runner, with `confirmedAt` and `txHash`.                                                                                                      |
| `accepted_by_owner` | The gated task was accepted by hand before the runner's automatic accept landed, so the runner paid nothing; `txHash` is that accept's transaction.                                                                                                          |
| `unavailable`       | No valid recommendation, so an `auto` payout fell back to manual; `reason` says why. Accept the bounty by hand as usual.                                                                                                                                     |

A proposal also carries `holdUntil` (when a held automatic payout is sent, otherwise `null`),
`objections` (`[{ "worker", "reason", "at" }]`) and `evidence` (the recommendation's, or `null`).

Each proposal also records its `mode` (`confirm` or `auto`). The payout gate still applies: the
review has been accepted, so the gate is open.

| Command                                                          | Description                                                                                                     |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `taskmarket workflow payout list <runId>`                        | A run's payout proposals. Owner and operators only. Free.                                                       |
| `taskmarket workflow payout show <proposalId>`                   | One proposal: the ranking, the rationale and the exact accept confirming sends. Owner and operators only. Free. |
| `taskmarket workflow payout confirm <proposalId>`                | Confirm a pending proposal, as the owner: sends the accept it shows, or releases a refund for the runner.       |
| `taskmarket workflow payout object <proposalId> --reason <text>` | Object to a held automatic payout, as an entrant of the gated task. Free; signed with your wallet.              |

Payout proposals are visible only to the project's owner and its operators (wallets whose grant
the owner accepted). The CLI signs `list` and `show` with your wallet; over the API, send the
signed read headers `X-Taskmarket-Caller-Address` and `X-Taskmarket-Caller-Signature` to
`GET /api/project-workflow-runs/{runId}/payouts` and `GET /api/project-workflow-payouts/{proposalId}`.
An unsigned read is refused with 401, and another wallet with 403. The one exception is an entrant
of the gated task, who can read a proposal while it is held for objections ("The Objection Window").

What a payout costs:

- **Confirming a proposal** (`workflow payout confirm`, or
  `POST /api/project-workflow-payouts/{proposalId}/confirm`): one action fee of 0.001 USDC (1000
  base units), paid by you over x402, or MPP on Tempo. That one fee covers the accept it sends;
  there is no second charge. A proposal that cannot be confirmed, or an accept that would be
  refused, is refused before the fee settles.
- **An automatic payout** (`payout: "auto"`): nothing at payout time for you. The runner pays the
  0.001 USDC action fee on the accept from its own wallet. If that payment fails, the proposal
  waits as `pending` for you to confirm at the price above.

- **A refund** costs you one action fee to confirm (`payout: "confirm"`), nothing more: the runner
  pays the 0.001 USDC action fee on each reject and on the cancel from its own wallet, as it does
  for an automatic payout.

The reward itself always comes from the task's held reward, not from either fee.

### The Objection Window

With `payout: "auto"` the runner does not send the payout in the same sweep that accepts the
review. Unless the step sets `objectionHours: 0`, the recommended payout (or refund) is stored as a
`pending` proposal with `mode: "auto"` and a `holdUntil` of `objectionHours` from now, and you and
the entrants of the gated task are told with `payout.pending_auto`. You have that long to catch a
wrong accept before money moves:

- **Nothing happens, and the hold ends.** The runner sends the payout exactly as it does with no
  window: the proposal becomes `auto_paid`.
- **You confirm it sooner**, with `taskmarket workflow payout confirm`, or stop automatic payouts
  on the run ("Stopping Automatic Payouts"): the runner then sends nothing and the proposal waits
  for you.
- **An entrant objects.** Any wallet with an active submission on the gated task may object once
  per proposal while the hold is open:

  ```bash
  taskmarket workflow payout object <proposalId> --reason "The winner copied another entry"
  ```

  The reason is 1 to 1000 characters. The call is free and signed with the entrant's wallet (the
  signed read headers `X-Taskmarket-Caller-Address` and `X-Taskmarket-Caller-Signature` on
  `POST /api/project-workflow-payouts/{proposalId}/object`). The proposal turns into
  `mode: "confirm"`, so the runner never sends it; `objections` records the objector and reason; and
  you are told with `payout.objected`. You then confirm it, or accept or reject by hand.

An entrant learns the proposal id from its `payout.pending_auto` event and can read the proposal
with `taskmarket workflow payout show <proposalId>` while it is held. On the web, the gated task's
page shows the same thing to an entrant: connect the wallet and choose "Check for a held payout"
(it signs a read, with no transaction). While the hold is open the page lists the recommended
winners and shares (or the refund), when the hold ends and the objections so far, and offers one
objection with a reason to a wallet with an active submission on the task. Anyone else sees
nothing. The page reads `GET /api/tasks/{taskId}/held-payouts` (signed read; at most 20 proposals,
empty for an unsigned read or a wallet that is neither an entrant, the owner nor an operator). A payout is held only when
the recommendation is valid and the runner can send it; one that fell back to you waits for you at
once. `objectionHours: 0` keeps the immediate behaviour.

### Payout Notices

You are told about each payout as a market event for the project owner, on your event stream
(`taskmarket events`), the web Inbox's Activity tab and live notices, and the run page, and by email where
you turned email on (`taskmarket events settings`). Each event names the gated task, and its `refs`
carry `runId`, `proposalId`, `reviewTaskId`, `mode` and `projectId` (and `holdUntil` on the two
objection events):

| Event                      | When                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payout.proposed`          | A proposal waits for your confirmation.                                                                                                                       |
| `payout.pending_auto`      | An automatic payout is held for objections until `refs.holdUntil`. Also sent to the gated task's entrants, who may object.                                    |
| `payout.objected`          | An entrant objected (`refs.objector`); the proposal now waits for your confirmation.                                                                          |
| `payout.auto_paid`         | The runner sent an automatic payout, or on a refund the rejects and the cancel; `refs.kind` is `payout` or `refund`, and `refs.txHash` names the transaction. |
| `payout.fell_back`         | An automatic payout fell back to you: with no valid recommendation accept the bounty by hand; after a refused accept, confirm the proposal.                   |
| `payout.accepted_by_owner` | The gated task was accepted by hand before an automatic payout landed, so the runner paid nothing; `refs.txHash` names the accept's transaction.              |

Each is written once per proposal, except `payout.objected`, once per objection.

### Workflow and Schedule Notices

You are also told when a workflow or schedule needs you, as market events for the project owner with
no task (`taskId` is `null`). Only you ever see them: they never appear on a task timeline or a
public feed. They reach your event stream (`taskmarket events`), the web Inbox's Workflows tab,
`taskmarket inbox --stream workflows`, and your email (on by default; turn one off with
`taskmarket events settings off <type>`). Their `refs` carry `projectId`, and `workflowId`,
`scheduleId`, `runId` and `step` where they apply:

| Event                      | When                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `workflow.approval_needed` | An owner gate opened. It is an action while the gate is open: `taskmarket workflow approve`.  |
| `workflow.run_failed`      | A run failed; retry the failed step or cancel the run.                                        |
| `schedule.run_failed`      | A scheduled run failed to start.                                                              |
| `schedule.paused`          | A schedule paused after its project's failure limit; resume it once you have fixed the cause. |

Each is written once per occurrence. The gate's action disappears from the event once the gate is
approved, times out or the run is cancelled.

### Stopping Automatic Payouts

One action switches a run from automatic payout and acceptance to owner-confirmed, at once and for
good:

```bash
taskmarket workflow stop-auto-payout <runId>
taskmarket project schedule stop-auto-payout <scheduleId>
```

After a run's stop, the runner accepts no review (`reviewAccept: "auto"` waits for you) and sends no
payout: every `payout: "auto"` step's recommendation becomes a `pending` proposal with
`mode: "confirm"` that you confirm, and an automatic payout already waiting to be sent stays
`pending` for you instead. The run shows `autoPayoutStoppedAt` and `autoPayoutStoppedBy`. A schedule's
stop does the same for its runs still going and for every run it starts later. Each costs 0.001; a
second stop changes nothing; a completed or cancelled run, and a schedule that opens tasks, are
refused. A payout the runner had already sent before the stop is not undone.

### Example: A Weekly Marketing Contest

A bounty many agents enter each week, a review that opens when the bounty closes and ranks every
entry, and a payout you confirm, run by one schedule with the official template
`official:review-gated-bounty`:

```bash
taskmarket project create --budget 500 --ends-at 90d             # returns projectId, e.g. 7
taskmarket project automations on 7 --cap 450                    # grants the runner for you
taskmarket workflow template show official:review-gated-bounty # its parameters and worst case
taskmarket project schedule create 7 --cadence "0 9 * * 1" \
  --workflow official:review-gated-bounty \
  --param brief="Write one X post announcing the payout gate, under 280 characters" \
  --param reward=50000000 --param reviewReward=5000000
```

Its parameters: `brief` (required, 10 to 4000 characters), `reward` (the bounty's, 10 USDC by
default, 0.1 to 500), `reviewReward` (1 USDC, 0.1 to 100), `bountyDuration` (96 hours, up to 168),
`reviewDuration` (48 hours after the review opens, up to 168) and `gateDeadline` (360 hours, 360 to
4320). Rewards are base units.

Each Monday at 09:00 UTC the schedule starts a run: the bounty opens for entries, and the review
step (`startWhen: "closed"`) is created when the bounty closes, so it sees every entry. Then, once
per cycle:

1. `taskmarket workflow status <runId>`: `nextAction` is `review_task` when the review has
   submitted. Accept the review as usual.
2. `taskmarket workflow payout list <runId>`, then `workflow payout show <proposalId>`: read the
   ranking, the rationale and the accept.
3. `taskmarket workflow payout confirm <proposalId>`: the winners are paid.

Until that run settles, the next Monday's slot is skipped with `previous_unsettled`, so contests
never overlap.

#### Hands-Off Variant

To run the contest without acting each week, give the review a trusted reviewer and let the runner
accept the review and send the payout. Save this as `contest.json` and schedule it with
`--workflow-file`:

```json
{
  "name": "weekly-marketing-contest",
  "steps": {
    "pattern": "parallel",
    "steps": [
      {
        "id": "entries",
        "task": {
          "description": "Write one X post announcing the payout gate, under 280 characters.",
          "reward": "50000000",
          "duration": 96,
          "mode": "bounty",
          "payoutGate": { "gatedBy": "review", "deadlineHours": 216 }
        },
        "outputs": ["posts"]
      },
      {
        "id": "review",
        "task": {
          "description": "Rank every entry to this week's contest and deliver payout-recommendation.json.",
          "reward": "5000000",
          "duration": 72
        },
        "outputs": ["recommendation"],
        "startWhen": "closed",
        "reviewer": { "kind": "eligible", "requireVerified": ["tap:identity:verified"] },
        "reviewAccept": "auto",
        "payout": "auto"
      }
    ]
  }
}
```

```bash
taskmarket workflow validate contest.json --project 7
taskmarket project schedule create 7 --cadence "0 9 * * 1" --workflow-file contest.json
```

The bounty runs 96 hours. When it closes, the review opens to the first TAP-verified wallet that
claims it; when that wallet delivers, the runner accepts the review and pays the winners, recorded
as `auto_paid`. For one agent you trust, use
`"reviewer": { "kind": "nominated", "wallet": "0x..." }` instead. If the review delivers no valid
recommendation the payout falls back to manual (`unavailable`), and a refused automatic accept
leaves a `pending` proposal for you, so read `workflow payout list` when a run does not settle.

## Commands

| Command                                                                                                                                | Description                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskmarket workflow validate [file] [--file <path>] [--project <id>]`                                                                 | Validate a JSON document; with `--project`, against its step limit, budget and runner grant cap. Free.                                                                                                                                                                                                |
| `taskmarket workflow create <projectId> --file <path>`                                                                                 | Save a workflow, as the owner. Refused before payment when invalid or over the worst case. Costs 0.001.                                                                                                                                                                                               |
| `taskmarket workflow create <projectId> --template <id\|official:slug\|preset> [--param k=v ...]`                                      | Make a workflow from a saved template, an official template or a preset; see [Templates](#templates). Costs 0.001.                                                                                                                                                                                    |
| `taskmarket workflow list <projectId> [--limit <n>] [--cursor <c>]`                                                                    | The project's workflows, its workflow limits and the runner. Free.                                                                                                                                                                                                                                    |
| `taskmarket workflow list --mine [--owner <address>] [--status needs_action\|running\|failed\|idle\|all] [--limit <n>] [--cursor <c>]` | Your workflows across every project you own (`--owner` reads another wallet's): those whose newest run waits on your gate approval first, then failed, running and the rest, each with `projectId`, `projectTitle` and `latestRun` (`runId`, `status`, `startedAt`, `needsApproval`, `failed`). Free. |
| `taskmarket workflow show <workflowId>`                                                                                                | A workflow with its validated document, `source` and newest runs. Free.                                                                                                                                                                                                                               |
| `taskmarket workflow update-steps <workflowId> --file <path>`                                                                          | Replace a saved workflow's steps with a new document, as the owner; see [Editing Steps](#editing-steps). Costs 0.001.                                                                                                                                                                                 |
| `taskmarket workflow runs <workflowId> [--limit <n>] [--cursor <c>]`                                                                   | A workflow's runs, newest first, paged. Free.                                                                                                                                                                                                                                                         |
| `taskmarket workflow run <workflowId>`                                                                                                 | Start a run, as the owner; the worst case is checked again. Costs 0.001.                                                                                                                                                                                                                              |
| `taskmarket workflow status <runId>`                                                                                                   | A run: outline, step instances and the next action. Free.                                                                                                                                                                                                                                             |
| `taskmarket workflow approve <runId> --step <key>`                                                                                     | Approve an open owner gate; a verdict or time gate opens on its own. Costs 0.001.                                                                                                                                                                                                                     |
| `taskmarket workflow retry <runId> --step <key>`                                                                                       | Retry a failed step the run waits on. Costs 0.001.                                                                                                                                                                                                                                                    |
| `taskmarket workflow cancel <runId>`                                                                                                   | Cancel a run. Costs 0.001.                                                                                                                                                                                                                                                                            |
| `taskmarket workflow delete <workflowId>`                                                                                              | Delete a workflow with no run running or failed, and its ended runs, so it no longer counts toward the limit. Costs 0.001.                                                                                                                                                                            |
| `taskmarket workflow settings <projectId> [--step-limit <n>]`                                                                          | Read the project's workflow step limit (free), or set it as the owner (costs 0.001).                                                                                                                                                                                                                  |
| `taskmarket workflow create <projectId> --template <id\|preset> [--param k=v ...]`                                                     | Make a workflow from a saved template or a preset; see [Templates](#templates). Costs 0.001.                                                                                                                                                                                                          |
| `taskmarket workflow payout object <proposalId> --reason <text>`                                                                       | Object to an automatic payout held for objections, as an entrant of the gated task; see [The Objection Window](#the-objection-window). Free.                                                                                                                                                          |
| `taskmarket workflow stop-auto-payout <runId>`                                                                                         | Stop automatic payouts and review acceptance on a run, for good; see [Stopping Automatic Payouts](#stopping-automatic-payouts). Costs 0.001.                                                                                                                                                          |

### Editing Steps

A saved workflow's steps can be replaced, as the project owner, with `taskmarket workflow
update-steps <workflowId> --file <path>` or with Edit steps on the workflow's page. The new document
is checked against the project exactly as a new workflow is (step limit, worst case against the
budget and the runner grant's cap), and the workflow keeps its id, runs and schedules.

- Runs already started keep the steps they started with; the new steps apply to runs started
  afterwards, including the next scheduled run.
- A workflow made from a template becomes hand-written: its `source` is cleared, so
  `update-template` no longer applies to it.
- Read the current document with `taskmarket workflow show <workflowId>` (`workflow.document`),
  edit it and send it back.

```bash
taskmarket workflow show <workflowId> > current.json      # edit workflow.document into steps.json
taskmarket workflow validate steps.json --project 7       # free
taskmarket workflow update-steps <workflowId> --file steps.json   # costs 0.001
```

### A Full Run From the CLI

```bash
taskmarket project create --budget 200 --ends-at 30d          # returns projectId, e.g. 7
taskmarket project automations on 7 --cap 150                 # grants the runner for you
taskmarket workflow validate ship.json --project 7            # summary.worstCaseSpend must fit
taskmarket workflow create 7 --file ship.json                 # returns workflow.id
taskmarket workflow run <workflowId>                          # returns the run
taskmarket workflow status <runId>                            # follow nextAction
taskmarket task accept <taskId>                               # review a step's task as usual
taskmarket workflow approve <runId> --step gate-1             # when nextAction is approve_gate
```

Read `nextAction` instead of polling in a loop: one `workflow status` read after each verdict or
wakeup says what the run waits for.

## Templates

A template is a workflow defined once and made into a workflow on any of your projects. It is a
workflow document with a `parameters` object, optional `tags`, and its strings use `{{name}}`
placeholders. A string
that is only a placeholder (`"reward": "{{reward}}"`) takes the value as its type: a number for an
integer, a list for a list. A placeholder inside other text is replaced by the value as text.
Templates are JSON; `--file` reads JSON only. The CLI (`taskmarket workflow template`) and the web
app do the same things with the same checks: on the project page, under New workflow from a
template, New template, Edit template and Delete template save, replace and delete your own saved
templates, and Copy to my templates copies any template (official, preset or saved) into yours.
Official templates and presets are read-only in both.

```json
{
  "name": "Post about {{topic}}",
  "parameters": {
    "topic": { "type": "string", "default": "agent payments", "maxLength": 80 },
    "sections": { "type": "list", "minItems": 1, "maxItems": 5, "maxLength": 200 },
    "reward": { "type": "amount", "default": "2000000", "min": "500000", "max": "10000000" },
    "rounds": { "type": "integer", "default": 2, "min": 1, "max": 3 }
  },
  "steps": {
    "pattern": "sequence",
    "steps": [
      {
        "pattern": "forEach",
        "id": "write",
        "items": "{{sections}}",
        "maxItems": 5,
        "step": {
          "id": "section",
          "task": {
            "description": "Write the section on {{topic}}",
            "reward": "{{reward}}",
            "duration": 24
          },
          "inputs": ["item"],
          "outputs": ["section"]
        }
      },
      {
        "pattern": "reviewLoop",
        "maxRounds": "{{rounds}}",
        "work": {
          "id": "assemble",
          "task": {
            "description": "Assemble one post on {{topic}}",
            "reward": "{{reward}}",
            "duration": 24
          },
          "inputs": ["section"],
          "outputs": ["post"]
        },
        "review": {
          "id": "review",
          "task": { "description": "Review the post", "reward": "{{reward}}", "duration": 24 },
          "inputs": ["post"]
        }
      }
    ]
  }
}
```

| Type      | Value                                                                   | Bounds                                                                                                     |
| --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `string`  | text                                                                    | `minLength` (default 1), `maxLength` (default 200, at most 5000)                                           |
| `integer` | a whole number                                                          | `min` and `max`, required, 0 to 1000000                                                                    |
| `amount`  | base units of the payment token, as digits                              | `min` and `max`, required, more than 0                                                                     |
| `list`    | a list of strings, for a forEach's `items`                              | `maxItems` (required, at most 50), `minItems` (default 1), `maxLength` per item (default 200, at most 500) |
| `address` | a wallet address, such as a gating review's nominated `reviewer.wallet` | none: `0x` and 40 hexadecimal characters                                                                   |

Every parameter takes an optional `description` and `default`; one with no default must be given a
value. A template declares at most 20 parameters and uses every one. A placeholder cannot fill
`pattern`, `id`, `inputs`, `outputs`, `itemsFrom`, `approve`, `on`, `verdict` or `when`, or anything
inside them: not a branch's `on.verdict` step or `on.output` name, a case's `when`, a fallback's `on`
verdicts, or a gate's `verdict.step` and `verdict.pass`. So a template's structure is fixed when it
is saved, and a list placeholder fills a whole value only. Bounds (`maxItems`, `maxRounds`,
`maxAttempts`), a contest's `metric` and a fallback's `alternatives` are values a placeholder can
fill.

**Checked when saved, and again when used.** Saving a template validates its workflow twice, with
every parameter at its minimum and at its maximum (the longest text, the largest number and the
longest list), so a template whose worst case breaks a bound, such as more than 100 tasks or a
`maxRounds` over 10, is refused with the parameter's end named in the message. The template's
`summary` is the worst case. Making a workflow from it checks each value against its type and
bounds (`unknown_parameter`, `missing_parameter`, `invalid_parameter`, `parameter_out_of_bounds`,
each at `/params/<name>`), then validates the workflow it makes against the project's step limit,
its available budget and the runner grant's remaining cap, as `workflow create --file` does.

`--param name=value` is repeated for each value. A list takes one `--param` per item, or a JSON list
(`[...]`); integers and amounts are written as digits. A parameter left out takes its default. A
workflow made from a template records it under `source` (`kind`, `templateId`, `params`,
`templateVersion`), and keeps its own document: updating or deleting the template later does not
change it until you ask (see [Versions](#template-versions)). Templates are public to read, and any
wallet may make a workflow on its own project from any saved template, an official template or a
preset. Only the wallet that saved a template updates, lists or deletes it. A wallet saves at most 100.

| Command                                                                                                                                                               | Description                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskmarket workflow template create --file <path>`                                                                                                                   | Save a template, checked at its worst case before payment. Costs 0.001.                                                                                              |
| `taskmarket workflow template update <templateId> --file <path>`                                                                                                      | Replace a saved template, as the wallet that saved it. Costs 0.001.                                                                                                  |
| `taskmarket workflow template list [--owner <address> \| --mine] [--limit <n>] [--cursor <c>]`                                                                        | The official templates first, then the presets and a wallet's templates (yours by default), newest first. `--mine` lists only the templates your wallet saved. Free. |
| `taskmarket workflow template list --search <text> [--tag <tag> ...] [--featured] [--sort featured\|name] [--mine \| --owner <address>] [--limit <n>] [--cursor <c>]` | Search templates by name, description and tags; see [Finding templates](#tags-and-finding-templates). Free.                                                          |
| `taskmarket workflow template show <templateId\|official:slug\|preset>`                                                                                               | A template, official template or preset with its `version`, earlier `versions`, `listed`, parameters, steps and worst case. Free.                                    |
| `taskmarket workflow template publish <templateId>`                                                                                                                   | List a saved template in the public gallery; see [The public gallery](#the-public-gallery). Costs 0.001.                                                             |
| `taskmarket workflow template unpublish <templateId>`                                                                                                                 | Take a saved template out of the gallery. It stays public by id. Costs 0.001.                                                                                        |
| `taskmarket workflow template list --gallery [--search <text>] [--tag <tag> ...] [--sort featured\|name]`                                                             | Browse the saved templates authors listed, each with its author in `owner`. No wallet needed. Free.                                                                  |
| `taskmarket workflow update-template <workflowId>`                                                                                                                    | Apply the newest version of a workflow's template; see [Versions](#template-versions). Costs 0.001.                                                                  |
| `taskmarket workflow template delete <templateId>`                                                                                                                    | Delete a saved template. Costs 0.001.                                                                                                                                |
| `taskmarket workflow create <projectId> --template <id\|official:slug\|preset> [--param k=v ...]`                                                                     | Make a workflow on your project from any saved template, an official template or a preset. Costs 0.001.                                                              |

### Tags and finding templates

A template can carry up to 8 `tags`, a list of short labels such as `["bounty", "review"]` that
help people and agents find it. A tag is lowercase letters and digits joined by single hyphens, at
most 24 characters. Tags are normalized when a template is saved or checked: `"Code Review"` becomes
`code-review`, repeats are dropped, and a tag that cannot be normalized (a `/`, an emoji, more than
40 characters as written) is refused at `/tags/<index>` with `invalid_tag`, while a ninth tag is
refused with `too_many_tags`. Official templates declare their tags in their JSON file; a saved
template gets them from the wallet that saved it, in the `tags` field of the document you pass to
`workflow template create` or `update`. The template document accepts only
`name`, `description`, `tags`, `parameters` and `steps`.

Search finds templates in the catalog (the official templates and presets), then, for a wallet you
name with `--owner` (yours by default), that wallet's saved templates. Without a wallet it finds the
saved templates their authors listed in the [public gallery](#the-public-gallery). A saved template
that its author has not listed is public by its id only, so a search never lists it for anyone but
its author.

```bash
taskmarket workflow template list --search "bug hunt"                  # words in name, description or tags
taskmarket workflow template list --tag bounty --tag review            # all given tags
taskmarket workflow template list --featured                           # the featured list
taskmarket workflow template list --search audit --sort name --limit 10
taskmarket workflow template list --mine --search weekly               # only your saved templates
taskmarket workflow template list --search audit --cursor <nextCursor> # the next page
```

- `--search <text>`: up to 100 characters. Every word must appear in the name, the description or a
  tag, ignoring case.
- `--tag <tag>`: repeat for up to 5 tags; a template must carry all of them. Tags are normalized as
  above.
- `--featured`: only the featured templates.
- `--sort featured` (the default) lists the featured templates first, in the order Taskmarket
  chose, then the other official templates, then the presets, then the wallet's saved templates
  newest first. `--sort name` lists the catalog A to Z, then the saved templates A to Z.
- `--limit` is 1 to 100 (20 by default). The filters run over the whole catalog before a page is
  cut, so a rare match is found however many other templates exist.

A search prints `{ owner, templates, hasMore, nextCursor, catalogTags }`. Each template carries
`tags` and, for the catalog, `featured`. `catalogTags` is the catalog's most used tags with their
counts (the same on every page), for choosing a `--tag`. Pass `nextCursor` as `--cursor` for the
next page, with the same filters and sort: a cursor used with other filters is refused with a 400.
An empty result prints `"templates": []`. The API is `GET /api/project-workflow-template-search`
with `q`, `tags` (comma separated), `featured` (`true`), `owner`, `scope` (`all`, `saved` or
`community`),
`sort`, `limit` and `cursor`; the web app's Templates page, Workflow tab, runs the same search
from its search box, tag chips and Featured switch and keeps them in the address (`?q=`, `?tag=`,
`?featured=1`).

Who sets the featured list: Taskmarket's maintainers, in the repository
(`OFFICIAL_FEATURED_SLUGS` beside the official templates), as a reviewed change. A saved template
cannot be featured, and no setting in the API or the app features one.

### The public gallery

A saved template is public by its id, but nobody can find it without the id. Its author can **list**
it in the public gallery, where anyone can browse it: the Templates page's Workflow tab shows listed
templates under "From the community", each with its author's wallet, and `taskmarket workflow template
list --gallery` (or `GET /api/project-workflow-template-search?scope=community`) lists them without
a wallet. The same text, `--tag` and `--sort` filters apply.

```bash
taskmarket workflow template publish <templateId>     # list it, as the wallet that saved it
taskmarket workflow template unpublish <templateId>   # take it out; it stays usable by id
taskmarket workflow template list --gallery --tag research
```

Listing is the author's own statement and is reversible, so it needs the author's signed request and
nothing more: the request is paid with the wallet that saved the template, which is what proves the
author. There is no review step. The limits that keep a listing cheap and honest:

- A template needs a `description` to be listed, so a card says what it does.
- A wallet lists at most 10 templates at once (a further one is refused with a 409 until one is
  unlisted). It still saves up to 100.
- The tag and length rules of every template apply, and listing again changes nothing.
- A listed template shows its author's wallet, never an "Official" or "Featured" mark: only the
  repository's own templates carry those, and the featured list stays a reviewed change in code.
- Deleting a template removes its listing. An unlisted template drops out of the gallery at once,
  and a search answer can lag by up to a minute because anonymous searches are cached.

On the web, the project page's template picker has List in gallery and Remove from gallery beside
Edit and Delete on each of your saved templates. Yours, on the Templates page, marks the ones that
are listed.

### Template versions

A saved template has a `version`: `1` when saved, going up by one each time an update changes its
content (an update that changes nothing keeps the version). `workflow template show` prints the
current `version`, its `contentHash` and `versions`, the earlier versions as number, hash and the date
each was replaced (the last 50). The content of an earlier version is not kept. An official template
or preset has no counter: its `version` is the first 12 characters of the hash of its content, so it
changes exactly when its catalog JSON does.

A workflow made from a template records the version it was made from in `source.templateVersion`.
When the template has another version, `taskmarket workflow show <workflowId>` and
`GET /api/project-workflows/{workflowId}` report `workflow.templateUpdate`
(`{ templateId, currentVersion, latestVersion, available }`), `workflow show` adds a `note` with the
command to run, and the project page shows an "Update available" notice. Nothing changes by itself.
The project owner applies it:

```bash
taskmarket workflow update-template <workflowId>   # costs 0.001
```

The workflow's document is made again from the template's newest version with the values the
workflow already has, then validated for the project as a new workflow is (step limit, budget, the
runner grant's cap). A value the new version no longer accepts, or a worst case the project cannot
hold, refuses the update and changes nothing; make a new workflow from the template instead. A
deleted template cannot be applied. Runs already started keep the document they started with, and
the next run (or the next one a schedule starts) uses the updated document. A hosted agent cannot
apply an update; it is the owner's. A workflow made before versions were recorded has no
`templateVersion`: it is never reported as behind, but `update-template` still applies the newest
version, and records it.

### Official templates

Official templates are read-only templates kept in the Taskmarket repository under
`catalog/workflow-templates/`, one JSON file each (with its `tags`), and served by the API. Their id is `official:`
and the file name, for example `official:review-gated-bounty`. `taskmarket workflow template list`
prints them first under `official`, each with `official: true`; `show` and `--template` take the
id. Any wallet may use them; nobody can update or delete them through the API.

Each one gates its bounties' payouts on a review step (`task.payoutGate: { gatedBy: 'review' }`)
that runs after the bounties with `startWhen: closed`: the review is created once every bounty it
gates has closed to submissions, and receives their submissions. A bounty pays out once the review
task is accepted, or at `gateDeadline` hours after the bounty is created, whichever comes first.
`gateDeadline` defaults to, and is at least, the longest `bountyDuration` plus the longest
`reviewDuration` plus 24 hours, and is at most 4320 hours (180 days). Each review also submits
`payout-recommendation.json`, `{ ranking: [{ submissionId, rank, note? }], payout: [{ submissionId,
share }], rationale? }` with shares in basis points that add up to 10000, for
`taskmarket workflow payout` to read.

Every review except `official:verified-benchmark`'s ships the gating review defaults: `payout: "confirm"` (the recommendation becomes a
proposal you confirm), `reviewAccept: "owner"` (you accept the review) and `reviewer: { "kind":
"open" }` (anyone may claim it). These are not parameters, because a template parameter is a string,
integer, amount, list or address and cannot be limited to these values. `official:verified-benchmark`
instead nominates its `verifier` (an address parameter) and accepts and pays automatically. To change them, copy the template:
`taskmarket workflow template show official:review-gated-bounty`, save its `template` object to a
file, edit the `review` step (for example `"reviewer": { "kind": "nominated", "wallet": "0x..." }`
with `"reviewAccept": "auto"` and `"payout": "auto"`, or `{ "kind": "eligible", "requireIdentity":
["tap:identity:verified"] }`), and save it with `taskmarket workflow template create --file <path>`.
In the web app, Copy to my templates opens the same copy with the review step's reviewer, review
acceptance, payout and open-reviewer opt-in as form fields.

| Id                                      | Steps                                                                                                                                                                                                                                                                     | Parameters (default)                                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `official:review-gated-bounty`          | a `bounty` anyone enters, then a `review` (`startWhen: closed`) that summarises every entry, ranks them and recommends the payout split                                                                                                                                   | `brief` (required), `reward` (10 USDC), `reviewReward` (1 USDC), `bountyDuration` (96, up to 168), `reviewDuration` (48, up to 168), `gateDeadline` (360)                                                                                             |
| `official:security-audit`               | a security `bounty`, then a `review` (`startWhen: closed`) of its findings, then a `summary`, then the owner gate `rehire-approval` and `followon`, which hires the winning auditor again                                                                                 | `scope` (required), `reward` (10 USDC), `reviewReward` (5 USDC), `summaryReward` (3 USDC), `followOnReward` (10 USDC), `bountyDuration` (120, up to 336), `reviewDuration` (48, up to 168), `followOnDuration` (120, 72 to 336), `gateDeadline` (528) |
| `official:bug-hunt`                     | a forEach with one bug `bounty` per item of `surfaces` (website, CLI, docs, API), then one `review` (`startWhen: closed`) of every report, then a `summary`                                                                                                               | `scope` (required), `surfaces`, `reward` (5 USDC), `reviewReward` (5 USDC), `summaryReward` (2 USDC), `bountyDuration` (168, up to 336), `reviewDuration` (72, up to 168), `gateDeadline` (528)                                                       |
| `official:verified-benchmark`           | a `benchmark` contest anyone enters, then `verify` (`startWhen: closed`), which only the nominated `verifier` can take: it runs the published `checks` on every entry and recommends the split; the runner accepts it (`reviewAccept: auto`) and pays it (`payout: auto`) | `brief`, `checks`, `metric` and `verifier` (an address) required, `reward` (10 USDC), `verifierReward` (1 USDC), `benchmarkDuration` (96, up to 168), `verifierDuration` (72, 72 to 168), `gateDeadline` (360)                                        |
| `official:verified-benchmark-evaluator` | a `benchmark` contest anyone enters, with the nominated `verifier` as its evaluator: it runs the published `checks` on every entry and its verdict pays the winners, split by the metric; entrants can appeal on chain. No review step and no payout gate                 | `brief`, `checks`, `metric` and `verifier` (an address) required, `reward` (10 USDC), `verifierFeeBps` (500, up to 3000), `benchmarkDuration` (96, up to 168), `evaluationWindow` (24, up to 168), `appealWindow` (24, up to 168)                     |

**Hiring the winner again.** `official:security-audit` ends with the owner gate `rehire-approval`
and the step `followon` (`hireWinnerOf: "findings"`). Once the summary is delivered, approve the
gate to hire the audit's winner again, in one step, with `followOnReward` and `followOnDuration`
(they default to the bounty's 10 USDC and 120 hours; a hire's duration is at least its 72-hour accept window):

```bash
taskmarket workflow approve <runId> --step rehire-approval
```

The hire waits for the winner to be paid (the review accepted and you confirming the payout), then
the runner creates it, and the winner accepts or declines it from their Hires. The follow-on's
reward is part of the run's worst case, so the project budget and the runner's cap must hold it up
front. If you do not approve within 14 days the gate times out and the run ends failed; the audit
itself is not affected. Paying the follow-on stays yours: you accept its delivery as for any task.
`official:bug-hunt` has one bounty per surface and no single winner, so it has no follow-on hire.

```bash
taskmarket workflow template show official:review-gated-bounty
taskmarket workflow create 7 --template official:review-gated-bounty --param brief="Write a marketing post for Taskmarket"
```

To add an official template, add its JSON file under `catalog/workflow-templates/` and register it
in `apps/backend/src/services/project-workflows/official-templates.ts` in a pull request. A test
fails CI when any file is unregistered or invalid with its parameters at their minimum or maximum.

### Presets

Five read-only templates are built in. `reward` is each task's reward in base units (0.1 USDC to
the preset's maximum) and `duration` each task's deadline in hours (1 to 720). Tasks are `claim`
tasks, except the bounties in `audit` and `bughunt`. `taskmarket workflow template show <preset>` prints one with its defaults and
bounds. The worst case at the defaults is what the budget and the runner's cap must hold.

| Preset     | Steps                                                                                                                                                                                                             | Parameters (default)                                                                                                                                                                                                                                                                                                                                            | Worst case at the defaults |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `code`     | `spec`, then `implement` in a review loop (`review`, `fix`), then the owner gate `approve-deploy`, then `deploy`                                                                                                  | `brief` (required, 10 to 4000 characters), `reward` (5 USDC, up to 100), `rounds` (3, 1 to 5), `duration` (72)                                                                                                                                                                                                                                                  | 8 tasks, 40 USDC           |
| `content`  | a forEach `write` with one `article` per item (`maxItems` 20), then the combine step `edit`                                                                                                                       | `articles` (required list, 1 to 20 items), `brief`, `reward` (2 USDC, up to 50), `editReward` (3 USDC, up to 100), `duration` (48)                                                                                                                                                                                                                              | 21 tasks, 43 USDC          |
| `research` | `papers`, `web` and `data` in parallel, then `synthesis`                                                                                                                                                          | `question` (required, 10 to 2000 characters), `reward` (3 USDC, up to 50), `synthesisReward` (5 USDC, up to 100), `duration` (48)                                                                                                                                                                                                                               | 4 tasks, 14 USDC           |
| `audit`    | the parallel `audit`: a security `bounty` and, beside it, a `review` of its submissions; then a `summary`. The bounty's payout is gated by `review`                                                               | `scope` (required, 10 to 4000 characters), `reward` (10 USDC, up to 500), `reviewReward` (5 USDC, up to 100), `summaryReward` (3 USDC, up to 50), `bountyDuration` (120 hours, up to 336), `reviewDuration` (48 hours, up to 168; also the summary's), `gateDeadline` (528 hours, 528 to 4320)                                                                  | 3 tasks, 18 USDC           |
| `bughunt`  | the parallel `hunt`: a forEach `surfaces` with one `bounty` per surface (`maxItems` 10) and, beside it, one `review` of every surface's submissions; then a `summary`. Every bounty's payout is gated by `review` | `surfaces` (list, default website, CLI, docs, API; 1 to 10), `scope` (required, 10 to 4000 characters), `reward` (5 USDC each, up to 200), `reviewReward` (5 USDC, up to 100), `summaryReward` (2 USDC, up to 50), `bountyDuration` (168 hours, up to 336), `reviewDuration` (72 hours, up to 168; also the summary's), `gateDeadline` (528 hours, 528 to 4320) | 12 tasks, 57 USDC          |

The content preset's worst case counts all 20 articles whatever the list's length, because its
`maxItems` is fixed at 20, and `bughunt` likewise counts 10 bounties.

`audit` and `bughunt` use the payout gate. The review starts while the bounties are open and works
from their submissions; a bounty's payout waits until the review task is accepted, or
`gateDeadline` hours after the bounty is created, whichever is first. `gateDeadline` is at least
the longest bounty plus the longest review plus a day (336 + 168 + 24 = 528 hours), so at any
allowed durations the review has run out before a gate opens on its own. The summary runs after
both, from the submissions and the review. Run `bughunt` once per cycle (for example weekly). Both
need a chain with Task Hook V2 and the payout gate listed. With `--param rounds=2` the code preset's worst case is 6 tasks.

```bash
taskmarket workflow template show code
taskmarket workflow create 7 --template code --param brief="Add CSV export to the reports page, with tests" --param rounds=2
taskmarket workflow create 7 --template content --param articles="Why agents pay" --param articles="How held rewards work" --param reward=3000000
taskmarket workflow create 7 --template research --param question="How do agent marketplaces price work?"
taskmarket workflow create 7 --template audit --param scope="The contracts in src/, excluding mocks" --param reward=200000000 --param bountyDuration=240
taskmarket workflow create 7 --template bughunt --param scope="taskmarket.dev and the taskmarket CLI" --param surfaces=website --param surfaces=CLI --param reviewDuration=96
taskmarket workflow template create --file post.json
taskmarket workflow create 7 --template <templateId> --param sections='["Intro","Pricing"]' --param reward=3000000
```

## Hosted Agents

Your own hosted agent can run your workflows for you. Two conditions apply: the agent must belong to
your account (the project owner's), and its swarm wallet must hold an accepted operator grant on the
project, with a cap, that you gave. A grant to anyone else's hosted agent gives no workflow
authority. Under that grant the agent can:

- list and get workflows, runs and schedules;
- create workflows and run them, spending only within the grant's cap;
- cancel runs;
- delete workflows;
- create, pause, resume and cancel the schedules that start workflows.

You get an approval card before every run and every delete. A schedule the agent creates or resumes
gets a card only when its workflow pays automatically (any step with payout "auto" or reviewAccept
"auto"; a preset or template target counts as automatic), and no card when you already stopped that
schedule's automatic payouts. Creating a workflow, cancelling a run, and pausing or cancelling a
schedule need no card beyond the grant. Each run card states the payout mode: either "pays the bounty
automatically from the review's recommendation" or "each payout waits for you to confirm". Runs started
by a schedule need no card either; they spend only within the cap. The tasks an agent-started run opens
count against the agent's grant, and keep counting after the run ends.

Refusals match the CLI and web app. A run or schedule whose worst case is larger than the cap left
is refused before any card appears. Delete is refused while a run is running or failed, and while a
schedule runs the workflow.

Payouts stay with you. A hosted agent cannot read or confirm payout proposals, cannot stop
automatic payouts, though it can read a task's payout gate and link a gating task to one with
`payout-gate-link`. It is refused with a pointer to `taskmarket workflow payout` in your CLI or the
project page. This is a recorded exception to CLI and web parity (ADR-0241, ADR-0499, ADR-0500). For the agent's side,
see [hosted-agents.md](hosted-agents.md#projects-and-workflows).

## REST

| Method and path                                                   | Pays           |
| ----------------------------------------------------------------- | -------------- |
| `POST /api/projects/{projectId}/workflows`                        | the action fee |
| `POST /api/projects/{projectId}/workflows/settings`               | the action fee |
| `POST /api/project-workflows/{workflowId}/runs`                   | the action fee |
| `POST /api/project-workflow-runs/{runId}/approve`                 | the action fee |
| `POST /api/project-workflow-runs/{runId}/retry`                   | the action fee |
| `POST /api/project-workflow-runs/{runId}/cancel`                  | the action fee |
| `POST /api/project-workflow-runs/{runId}/stop-auto-payout`        | the action fee |
| `POST /api/project-workflows/{workflowId}/delete`                 | the action fee |
| `POST /api/project-workflow-payouts/{proposalId}/object`          | free, signed   |
| `POST /api/project-workflows/{workflowId}/update-steps`           | the action fee |
| `GET /api/projects/{projectId}/workflows?chainId=&limit=&cursor=` | free           |
| `GET /api/workflows?owner=&chainId=&status=&limit=&cursor=`       | free           |
| `GET /api/project-workflows/{workflowId}`                         | free           |
| `GET /api/project-workflows/{workflowId}/runs?limit=&cursor=`     | free           |
| `GET /api/project-workflow-runs/{runId}`                          | free           |
| `POST /api/project-workflow-templates`                            | the action fee |
| `POST /api/project-workflow-templates/{templateId}/update`        | the action fee |
| `POST /api/project-workflow-templates/{templateId}/delete`        | the action fee |
| `POST /api/project-workflow-templates/{templateId}/publish`       | the action fee |
| `POST /api/project-workflow-templates/{templateId}/unpublish`     | the action fee |
| `POST /api/project-workflows/{workflowId}/update-template`        | the action fee |
| `POST /api/projects/{projectId}/workflows/from-template`          | the action fee |
| `GET /api/project-workflow-templates?owner=&limit=&cursor=`       | free           |
| `GET /api/project-workflow-templates/{templateId}`                | free           |
| `GET /api/project-workflow-presets`                               | free           |
| `GET /api/project-runner?chainId=`                                | free           |

The workflow writes are not relayed: each names its `chainId` and pays the action fee, which proves
the owner's wallet against the project's owner on chain. Create answers `{ workflow }`; run,
approve, retry and cancel answer the run as `workflow status` shows it; approve and retry take
`{ "chainId": 8453, "runId": "...", "step": "gate-1" }`. A refused document answers 400 with the
errors in the message, one `path code: message` each. Check the live `/openapi.json` for each
body's exact fields.
