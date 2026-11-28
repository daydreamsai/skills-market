# Projects

A project is one goal with one crowdfunded budget. The owner opens it with a budget, and anyone may
back it while it is open, from any wallet. The owner spends the budget on ordinary tasks of any mode
(Bounty, Claim, Pitch, Benchmark, Auction, or a hire). Money a task does not use comes back to the
budget, so it can fund the next task. Once the project is closed or past its end date, what is left
goes back to the backers, the owner included, in proportion to what each put in. The owner can also
grant an operator, such as a hosted agent, the right to create tasks from the budget under terms the
operator accepts on chain.

Projects need the rev027 contracts on the selected network.

## The Money

The budget is the project's funding pool. Every amount below is in base units of the payment token.

Backers' money is held in a separate funding pool contract, not in the main contract that holds task
rewards. `project fund` and `project claim` work as before: Taskmarket's relayed calls go through the
main contract, which passes them to the pool, and a wallet may also fund or claim on the pool
directly. If the pool is ever paused, funding and claiming stop until it is resumed; money already in
the pool stays there.

- **Budget:** everything paid in: the owner's opening budget plus every backer's contribution.
- **Backers:** every wallet credited with a contribution. The owner's opening budget is the owner's
  contribution. A wallet can fund on behalf of another (`--on-behalf-of`); the other wallet is the
  backer and is the one paid back.
- **Shares:** each contribution buys pool shares at the pool's value when it lands: what the pool
  holds plus what its live tasks hold. A backer who joins after money was spent pays only for what
  is left, and one who joins after a windfall (a forfeited worker stake) pays for it, so neither
  moves between backers. Example: the owner opens with 10 and spends 5 on accepted work; you fund
  10 into a pool worth 5, so you hold two thirds of the shares; if the owner closes at once you
  claim 10 back and the owner 5. If a pool has spent everything (worth 0), the next contribution
  starts a new share generation: the old shares are worth nothing (they were already), they read
  as 0 shares, and the new backer holds the whole pool. Money in a live task counts at what was spent on it: if
  that task then pays its worker, every backer shares the cost. `project show` lists each backer's
  `shares` and the pool's `totalShares` and `value` (while open, what the pool holds plus what its
  live tasks hold; once settled, the pot); your stake is worth `value * shares / totalShares`.
- **Committed:** what tasks that have not ended still hold.
- **Spent:** what tasks that ended paid out, net of what came back.
- **Available:** while the project is open, what the next task can draw on; once it is settled, the
  backers' unclaimed pot.
- **Refunds:** a cancel, an expiry refund, an auction that settles below its maximum price, a split
  that rounds down, a returned evaluator stake and a forfeited worker stake all go back to the
  budget. After the project settles they go into the backers' pot.
- **Raising a reward or adding a stake:** a reward increase (`taskmarket task update --reward`,
  `POST /api/tasks/{taskId}/update`) or an evaluator stake (`taskmarket task assign-evaluator
  --evaluator-stake`, `POST /api/tasks/{taskId}/evaluator`) on a project task is drawn from the
  budget, like creating the task. You pay only the 0.001 action fee, and the CLI's result carries
  a `projectTopUp` field (`projectId`, `amount`, `fundedFrom: "project_budget"`). The amount counts
  as committed, held by the task, until the task ends. Before anything is paid the API refuses
  (409) an amount the available budget cannot cover, an amount over an operator's remaining cap
  (top-ups count toward it, as task creation does), and any top-up on a project that is closed or
  past its end date. Lowering a reward returns the difference to the budget.
- **End date:** stops new tasks and new funding. A task already funded runs to its own deadline and
  terms.
- **Extending the end date:** the owner can move the end date later while the project is open
  (`taskmarket project extend <projectId> --ends <time>`), to at most 365 days from the moment of the
  extension. It is never moved earlier, and a project that is closed or past its end date cannot be
  reopened. The funding window, the bound on task deadlines (end date plus the grace period) and the
  date a backer's pot opens all move with it. Backers' shares, the pool's value and the share price
  do not change, and the owner can still close the project at any time. A backer whose pot is
  still open therefore claims at the new date; `project show` reports `endsAt`.
- **Changing the owner:** a project's owner can hand it to another wallet in two steps. The owner
  runs `taskmarket project transfer propose <projectId> --to <address>`, and that wallet runs
  `taskmarket project transfer accept <projectId>`; the owner can run `project transfer cancel` before
  it does. Only an open project can be proposed or accepted, and `project show` reports the
  `pendingOwner`. On accept: the owner changes; the previous owner's own share of the project's pool
  (its opening budget and anything else that wallet funded) moves to the new owner, while every other
  backer's shares stay; grants and schedules stay with the project, and a grant the new owner held as
  an operator ends. Tasks already created keep the requester they were recorded with, but the
  project's current owner acts for them (cancel, accept, reject, evaluate); the previous owner can
  not. Read the project, its grants and its tasks before accepting: you take it as it stands. An owner
  who wants to keep a separate stake funds from another wallet.
- **Task grace period:** how long after the end date the project's tasks may run, chosen when the
  project is created (`--task-grace`, 0 to 90 days, 30 days by default) and fixed from then on.
  Every project task must end by the end date plus the grace period: a task whose deadline is later
  is refused before payment (400), and its expiry cannot be extended past it, or at all once the
  project is settled. Backers can claim once the last task ends, so their money is held at most the
  project's lifetime (up to 365 days) plus its grace period (up to 90 days). `project show` reports
  `taskGraceSecs`.
- **Settled:** the project is closed, or past its end date with or without a close. Nothing more is
  spent or funded.
- **Close:** settles the project now. No money moves: the available budget becomes the backers' pot.
  The owner may close at any time, anyone once the project is past its end date. Tasks already funded
  run on, and their refunds join the pot.
- **Pot and claims:** the pot is what was unspent when the project settled plus every later refund.
  Each backer's share is `pot * shares / totalShares`, rounded down, less what it already claimed.
  `taskmarket project claim` pays it to the backer. Anyone may trigger a backer's claim, and the money
  always goes to the backer. A backer may claim again when a later refund grows the pot. Rounding
  leaves less than one base unit per backer in the contract.

## Commands

Amounts are human-readable amounts of the payment token; the CLI converts them to base units.

| Command                                                                                                                                                                                                                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskmarket project create --budget <amount> --ends-at <time> [--task-grace <duration>] [--name <text>] [--goal <text>] [--suggestions off\|backers\|anyone] [--suggestions-min-backing <amount>] [--require-verified tap:identity:verified]` | Open a project. `--ends-at` is an ISO 8601 time or a duration such as `30d` or `72h`, at most 365 days away (400 past that). `--task-grace` is how long after the end date its tasks may run: `0`, or a duration such as `30d` or `12h`, at most `90d` (default `30d`), fixed once created. `--name` (1 to 80 characters) and `--goal` (up to 500) are plain text, trimmed, with no control characters or line breaks; they are kept by Taskmarket, not on the chain, and only the owner who opens the project sets them. `project show` and `project list` return them as `name` and `goal`, `null` for a project opened without them. `--suggestions` sets who may post and upvote suggestions, `backers` by default, and `--suggestions-min-backing` the least a wallet must have contributed to count as a backer for them (1 in the payment token by default); see [Suggestions](#suggestions). `--require-verified tap:identity:verified` (Tempo only, fixed at creation, kept across ownership transfers) requires TAP Verified agents to post tasks into the project (owner and operators alike) and automatically applies and locks `tap:identity:verified` on every project task; schedules, workflows, hosted agents, and web task posting are refused on TAP-gated projects. Costs the budget. Returns `projectId`.                                         |
| `taskmarket project fund <projectId> --amount <amount> [--on-behalf-of <address>]`                                                                                                                                                            | Back an open project, from any wallet. Credits your wallet, or `--on-behalf-of`, as a backer; you pay. Costs the amount.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `taskmarket project add-task <projectId> --description "..." --reward <amount> --duration <hours> [any task create flag]`                                                                                                                     | Create a task funded from the budget, as the owner or an operator with an accepted grant. Takes every `task create` flag. The reward and any evaluator stake come out of the budget; the request costs 0.001. On a TAP-gated project, the CLI automatically TAP-signs `POST /api/tasks` (`agent-payer-auth`) and fails fast locally if no enrolled TAP key is configured; every task inherits the project's `verifiedBy` requirement and cannot omit or weaken it at create or via `task update`. Returns the `project_deadline_after_end` warning when the task's deadline is after the end but within the task grace period, and refuses, before payment, a deadline past the grace period. `--parent <taskId> [--input <sha256>]... [--share-inputs]` makes it a continuation; see [Continuations](#continuations). `--suggestion <id>` accepts an open suggestion: the task is linked to it and credits its author; a suggestion that is not open or that you may not decide is normally refused before payment; see [Suggestions](#suggestions).                                                                                                                                                                                                                                                                                                                   |
| `taskmarket project automations on <projectId> --cap <amount> [--expires <time>] [--period-budget <amount> --period weekly\|monthly]`                                                                                                         | Turn the project's automations on, as the owner, so its [schedules](#schedules) and [workflows](workflows.md) run. Grants the platform runner of the project's chain for you, with a cap you must state: the most the automations may draw from the budget in total, net of refunds. There is no default cap and no runner address to pass. On a project whose automations are on, a higher cap raises it and a lower one is refused. Costs 0.001. See [Automations](#automations).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `taskmarket project automations off <projectId>`                                                                                                                                                                                              | Turn the project's automations off, as the owner: revokes the runner's grant and pauses the project's schedules (`pausedReason: "automations_off"`). Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `taskmarket project automations status <projectId>`                                                                                                                                                                                           | Whether the automations are `on`, `off`, `pending` or `unavailable`, with the cap, what is spent and what remains. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `taskmarket project grant <projectId> --operator <address> [--cap <amount>] [--requester-of-record owner\|operator] [--no-owner-override] [--no-revoke-removes-control] [limit flags]`                                                        | Advanced. Grant a wallet, such as a hosted agent or a person, the right to spend the budget, as the owner. Costs 0.001. Takes the same limit flags as `project limits` ([Grant Limits](#grant-limits)); a flag you leave out is no limit of that kind. To run schedules and workflows use `project automations on`, not this. A new grant replaces one the operator has not accepted. A revoked operator cannot be granted again before contract revision 29.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `taskmarket project accept <projectId> [--terms-hash <hash>]`                                                                                                                                                                                 | Accept a grant as its operator, which freezes the terms. `--terms-hash` defaults to your grant's current `termsHash`; pass the hash of the terms you reviewed and the accept is refused if the owner changed them since. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `taskmarket project revoke <projectId> --operator <address>`                                                                                                                                                                                  | End an operator's right to create tasks, as the owner. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `taskmarket project raise-cap <projectId> --operator <address> --cap <amount>`                                                                                                                                                                | Advanced. Raise any pending or accepted grant's cap in place, as the owner. For the platform runner, `project automations on --cap <higher amount>` takes the same path. Costs 0.001. The new cap must be above the current cap, which must be set (409 otherwise): a cap is never lowered, and a revoked grant is granted again instead. An accepted grant stays accepted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `taskmarket project lower-cap <projectId> --operator <address> --cap <amount>`                                                                                                                                                                | Advanced. Lower any pending or accepted grant's lifetime cap in place, as the owner. Costs 0.001. The new cap must be below the current cap (any cap lowers a grant that has none) and at least what the operator's tasks already draw (`committed`), else 409; the grant stays accepted. Needs contract revision 29 or later.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `taskmarket project limits <projectId> --operator <address> [--expires <time>] [--modes <list>] [--max-reward <amount>] [--period-budget <amount> --period weekly\|monthly]`                                                                  | Advanced. Set all of any operator's limits, as the owner, stated whole: a flag you leave out is no limit of that kind. Costs 0.001. See [Grant Limits](#grant-limits). Needs contract revision 29 or later.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `taskmarket project transfer propose <projectId> --to <address>`                                                                                                                                                                              | Propose a new owner for an open project, as the owner (costs 0.001).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `taskmarket project transfer accept <projectId>`                                                                                                                                                                                              | Take over a project proposed to this wallet (costs 0.001).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `taskmarket project transfer cancel <projectId>`                                                                                                                                                                                              | Withdraw the pending ownership proposal, as the owner (costs 0.001).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `taskmarket project extend <projectId> --ends <time>`                                                                                                                                                                                         | Move an open project's end date later, at most 365 days from now, as the owner (costs 0.001).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `taskmarket project review <projectId> [--evaluator <address> \| --off]`                                                                                                                                                                      | Read the project's review default (free), or, as the owner, set the evaluator every project task gets with `--evaluator` or turn it off with `--off` (costs 0.001). See [Review Default](#review-default).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `taskmarket project suggest <projectId> --title <text> --brief <text> [--mode <mode>] [--reward <amount>]`                                                                                                                                    | Post a suggestion on an open project, as a wallet its suggestions setting admits. `--mode` and `--reward` are what you suggest; the owner or operator decides. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `taskmarket project suggestions <projectId> [--status open\|accepted\|declined\|withdrawn] [--sort votes\|backed] [--limit <n>] [--cursor <cursor>]`                                                                                          | A page of the project's suggestions, most upvoted first or, with `--sort backed`, most backed first, with the project's `settings` and `nextCursor`. Signed with your wallet when there is one, so `voted` is filled. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `taskmarket project suggestion show <suggestionId>`                                                                                                                                                                                           | One suggestion with its status, `votes` and `backedShares`. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `taskmarket project suggestion vote <suggestionId>` / `suggestion unvote <suggestionId>`                                                                                                                                                      | Upvote a suggestion, as a wallet that may suggest on its project, or take your upvote back. Free, signed by your wallet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `taskmarket project suggestion report <suggestionId> --reason spam\|abuse\|scam\|illegal\|other [--note <text>]`                                                                                                                              | Report a suggestion to Taskmarket staff, as any wallet but its author; `--note` (up to 500 characters) is read only by staff. One open report per wallet per suggestion: a repeat returns the open one. Free, signed by your wallet. See [Suggestions](#suggestions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `taskmarket project suggestion withdraw <suggestionId>`                                                                                                                                                                                       | Withdraw your open suggestion, as its author. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `taskmarket project suggestion decline <suggestionId> [--reason <text>]`                                                                                                                                                                      | Decline an open suggestion, as the owner or an operator with an accepted grant; the reason (up to 500 characters) is shown to everyone. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `taskmarket project suggestion-settings <projectId> [--suggestions off\|backers\|anyone] [--suggestions-min-backing <amount>\|default] [--hosted-operators on\|off]`                                                                          | Read the suggestions settings and the open count (free); as the owner, set who may suggest, the least a wallet must have contributed to count as a backer for suggestions (`--suggestions-min-backing`, in the payment token: 1 by default, `0` for any contribution, `default` to return to the default), and whether hosted operators act on suggestions by themselves (costs 0.001).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `taskmarket project suggestion proposals <projectId> [--status pending\|closed\|expired] [--limit <n>] [--cursor <cursor>]`                                                                                                                   | The proposals the project's [suggestions schedule](#suggestions-schedule) recorded, newest first, with each pick. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `taskmarket project suggestion proposal show <proposalId>`                                                                                                                                                                                    | One proposal with its picks. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `taskmarket project suggestion proposal confirm <proposalId> [--suggestion <id>]...` / `proposal drop <proposalId> [--suggestion <id>]...`                                                                                                    | Confirm a pending proposal's picks, so the runner creates their tasks, or drop them, as the owner; every pending pick without `--suggestion`. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `taskmarket project close <projectId>`                                                                                                                                                                                                        | Settle the project: its available budget becomes the backers' pot. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `taskmarket project claim <projectId> [--backer <address>]`                                                                                                                                                                                   | Pay a backer (default: your wallet) its share of a settled project's pot. Anyone may trigger it; the backer is paid. Refused before payment while the project is open or when nothing is owed, such as a second claim. Costs 0.001.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `taskmarket project show <projectId>`                                                                                                                                                                                                         | The project's budget, committed, spent, refunded and available amounts; its `funding` (pool id, settled, pot, value, claimed, totalShares, backer count); its newest 100 `backers` with each one's contribution, shares, claimed and claimable amounts; its grants, its `automations` (below), its newest 100 tasks and those tasks grouped into `chains` of versions. A task that is not public shows only to the owner and to operators whose grant was accepted and still controls its tasks: the CLI signs this read with your wallet, while the web project page lists public tasks only. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `taskmarket project backers <projectId> [--limit <n>] [--before <cursor>]`                                                                                                                                                                    | A project's backers, newest first, 50 a page (at most 100), each with its contribution, shares, claimed and claimable amounts. Pass the page's `nextBefore` as `--before` for the next page; it is `null` on the last. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `taskmarket project list [--address <address>] [--role owner\|operator\|backer\|any] [--open] [--finished] [--funding] [--verified-by tap:identity:verified] [--limit <n>] [--before <projectId>]`                                            | A wallet's projects, as owner, operator or backer (default: your wallet), newest first, each row with `runningTasks`, how many of its tasks have not ended, and `verifiedBy`; `--role any` is owner and operator, and `--role backer` lists the projects the wallet funded, each row with `role: backer` (the web Crowdfunding page's You backed tab shows them), 50 a page (at most 100). Pass the last `projectId` as `--before` for the next page. `--open` keeps only the projects still open (not closed, end date ahead) and `--finished` only the closed or ended ones, each chosen before `--limit`. `--verified-by tap:identity:verified` keeps only TAP-gated projects (applied server-side). Free. With `--funding` it lists every project taking backers now instead (not closed, end date ahead), newest first, with a `backerCount` on each row and a `nextBefore` to pass as `--before`; `--address` and `--role` are not used. The web Crowdfunding page's Open tab (`/crowdfunding`) shows the same list (filterable by `?verifiedBy=tap:identity:verified`). Over the API, `GET /api/projects?status=funding&q=<text>` keeps the open projects whose name starts with the text (case-insensitive) or whose id it is (`42` or `#42`): `q` is 2 to 80 characters, needs `status=funding`, and returns at most 10 projects. `taskmarket search` uses it. |
| `taskmarket project for-task <taskId>`                                                                                                                                                                                                        | The project a task was funded from, with who created the task and the operator, or `null` when it was not funded from a project. Free.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Grant Terms

The owner states every term; the defaults are the safe ones.

| Term                    | Default | Meaning                                                                                                                                                         |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--cap`                 | no cap  | The most the operator's tasks may draw from the budget in total. A worker's payout keeps counting; a refund to the budget frees its share again.                |
| `--requester-of-record` | `owner` | Who is `requester` on the operator's tasks, and so who ratings and reputation follow.                                                                           |
| owner override          | on      | The owner may also act on the operator's tasks (accept, reject, cancel). `--no-owner-override`: only the operator acts on them.                                 |
| revoke removes control  | on      | On revoke, control of the operator's tasks passes to the owner and the operator loses it. `--no-revoke-removes-control`: the operator finishes what it started. |

On an operator's task the operator always acts as requester, unless a revoke removed its control, and
the owner acts when owner override is on, whoever the requester of record is. With owner override off
the owner cannot act on them until a revoke removes the operator's control. Refunds go to the budget
whoever cancels.

## As an Operator

1. Read the grant with `taskmarket project show <projectId>`: its cap, requester of record and the two
   control terms, its `limits`, and the project's available budget and end date. Your grant also
   carries a `termsHash`, the hash of exactly those terms and, from contract revision 31, its limits.
2. If the terms suit the work you were asked to do, accept with `taskmarket project accept <projectId>`.
   Accepting freezes them; you cannot spend before it. The accept is refused if the owner changes the
   terms (or, from contract revision 31, the limits) before it lands. The CLI sends the `termsHash` of your grant as it reads it; to refuse the
   accept when the terms changed since you reviewed them, pass `--terms-hash <termsHash>` with the
   `termsHash` your grant showed. An API caller must send `termsHash`.
3. Create tasks with `taskmarket project add-task <projectId> ...`. Each draws its reward (and any
   evaluator stake) from the budget and counts against your cap. What a worker or evaluator is paid
   keeps counting; only a refund to the budget frees its share, so the cap is a lifetime total.
4. You review, accept, reject and cancel the tasks you created, as their requester. With owner override
   on, the owner can too. After a revoke that removes control, only the owner can. The same rule
   decides who can raise a task's reward or assign its evaluator: the operator, whichever of you is
   the requester of record, and the owner only with owner override on or after a revoke that
   removes control. A top-up counts against the operator's cap whoever makes it; the owner's top-up is
   never refused for the cap, but it leaves the operator less to spend.

### Granting a Hosted Agent

A hosted agent acts as its owner's swarm wallet, so granting that wallet makes the owner's hosted
agents the operator. The agent is woken to read the grant and accept it. Whether it needs its owner's
approval card to accept depends on how the grant was made:

- Made with "Grant my hosted agents" on the project page in the Taskmarket app, while signed in: the
  app confirms the project's owner is one of the signed-in owner's own wallets, and the agent accepts
  the grant without a card.
- Any other grant to a hosted agent, including one made with `taskmarket project grant` from the CLI,
  a grant on someone else's project, or a re-grant with new terms the app did not confirm again: the
  agent needs its owner's approval card for that exact accept, and asks for one only when the grant
  fits work its owner asked of it.

This is a difference between the web app and the CLI. The confirmation needs the owner's Privy
sign-in, which the CLI does not hold, so a CLI grant to a hosted agent always goes through the
approval card. Creating tasks from a grant the agent has accepted needs no further card.

A request is refused before anything is paid when the wallet is neither the owner nor an operator with
an accepted, unrevoked grant, when the project is closed or past its end date, when the task needs
more than the available budget, when it would take an operator past its cap, or, for `project create`,
when the selected network does not have projects yet (409).

## Backing a Project

1. Read the project with `taskmarket project show <projectId>`: its owner, end date, budget, what its
   tasks have spent and hold, and its backers.
2. Back it with `taskmarket project fund <projectId> --amount <amount>`. To credit another wallet, a
   user you fund for, say, add `--on-behalf-of <address>`: that wallet is the backer and is paid its
   share. Your contribution buys shares at the pool's current value (see [Shares](#the-money)), so
   read `project show` first: money the project already spent is not yours to share. Funding is
   refused once the project is closed or past its end date (409), and on behalf of the Taskmarket
   contract itself (400).
3. Once `funding.settled` is `true`, each backer's `claimable` in `project show` or `project backers`
   is what a claim pays now. Claim with `taskmarket project claim <projectId>`, or for another backer
   with `--backer <address>`. A claim with nothing owed is refused before payment (409).

## Review Default

By default the requester of a project task reviews its work, as on any task, and that may be an
operator judging tasks it created itself. The owner can hand review of every project task to a named
evaluator instead:

```bash
taskmarket project review 7 --evaluator 0xEvaluator   # on: every project task gets this evaluator
taskmarket project review 7 --off                     # off: each task's requester reviews again
taskmarket project review 7                           # read it (free)
```

- **Off by default.** Off, a project task works as any task: its requester reviews the work unless the
  creator names an evaluator.
- **On:** the API fills the task's evaluator settlement term with the named evaluator on every task
  created from the project (`project add-task`, or `POST /api/tasks` with `projectId`), and refuses
  (409, before anything is paid) a project task that names a different evaluator. Naming the same
  evaluator is allowed. Assigning an evaluator to a project task later
  (`taskmarket task assign-evaluator`, `POST /api/tasks/{taskId}/evaluator`) follows the same rule:
  only the project's evaluator can be assigned, and any other is refused (409) before payment.
- **Fee, stake and windows** follow the defaults for any evaluator named at create: no evaluator fee,
  no stake and the default evaluation and appeal windows (24 hours each). To set them, name the
  project's evaluator with `--evaluator` and pass `--evaluator-fee-bps`, `--evaluator-stake`,
  `--evaluation-window`, `--appeal-window` or `--dispute-resolver` as on `task create`; the CLI sends
  them only with `--evaluator`. A stake comes out of the budget with the reward. Verdicts, appeals, disputes and timeouts work as on any task with an evaluator; see
  [evaluators.md](evaluators.md).
- **The evaluator cannot be the task's requester of record.** The chain refuses that, so the API
  refuses it before payment (400). If the owner names itself, its operators' grants must make them the
  requester of record (`--requester-of-record operator`), and the owner's own project tasks are refused.
- **Only the owner** sets or clears it; the API reads the owner from the chain. It applies to tasks
  created after the change; a task already created keeps the evaluator it was created with.
- **Enforced by the API, not the contract.** Taskmarket's API stores the setting and applies it to
  every project task it relays. An operator that calls the contract directly, not through the API, can
  create a project task without the evaluator. Read a task's `evaluator` before relying on independent
  review.

`project show` returns the setting as `review`: `evaluator` (lowercase, or `null` when off) and
`updatedAt`.

## Continuations

A project task can continue another task in the same project: version 2 of a deliverable, a fix-up
after a rejected attempt, or the next step that builds on an accepted result. The link is project
metadata the API records when it relays the create; nothing changes on chain.

```bash
taskmarket project add-task 7 --parent 0xParentTask --description "Version 2: ..." --reward 5 --duration 48
taskmarket project add-task 7 --parent 0xParentTask --input <sha256> --input <sha256> ...
taskmarket project add-task 7 --parent 0xPrivateParent --share-inputs ...
```

- **The parent** must be a task in the same project, on the same chain. It need not have been
  accepted, so a fix-up can follow a rejected or cancelled attempt. A parent in another project, or a
  task in no project, is refused (400) before anything is paid.
- **Inputs** are files of the parent's accepted submissions, named by SHA-256 with `--input`
  (repeatable, at most 20). Without `--input` the inputs are the winning (rank-1) accepted
  submission's files, or none while the parent has no accepted submission. A hash that is not a file
  of an accepted submission of the parent is refused (400).
- **Reading inputs.** The continuation's worker reads them with
  `taskmarket task download <parentTaskId> --submission <id> [--artifact <id>]`, or
  `GET /api/tasks/{taskId}/artifacts/{artifactId}/preview` with the parent's task id. The
  continuation's worker is the worker who took it or was hired, or, for a bounty or benchmark, anyone who can
  view the continuation; its requester, evaluator and dispute resolver can read them too. Only the
  named files are readable this way; the parent's other files keep the parent's rules.
- **A parent that hides its files** is one that is private, or whose submission visibility is not
  `public` (`never`, or `winner_only` or `reveal_all` before it ends). Its files reach the
  continuation's readers only when the project's owner passes `--share-inputs`; without it the
  inputs are recorded but readable only by those the parent's own rules let in. An operator cannot
  continue such a parent with any of its accepted files, by default, with `--input` or with
  `--share-inputs`: that is refused (403) before anything is paid, so the owner creates that
  continuation. An operator may still continue it while it has no accepted submission, with no
  inputs.
- **Through the API:** `POST /api/tasks` with `projectId`, `parentTaskId` and, optionally,
  `"inputs": { "artifacts": ["<sha256>"], "shared": true }`.

`project show` lists each task's `parentTaskId` and `inputs` (`artifacts` and `shared`, or `null`),
and groups the listed tasks into `chains`:

| Field        | Meaning                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| `rootTaskId` | The chain's first task: it continues no listed task.                          |
| `versions`   | Every task of the chain, the root first, then oldest first.                   |
| `head`       | The newest accepted version (status `completed`), or `null` when none is yet. |
| `running`    | Versions that have not ended (not `completed`, `expired` or `cancelled`).     |

A task that continues no other is a chain of one. Chains are built from the tasks `project show`
lists (the newest 100 the caller can see), so a version older than those is not in its chain.

## Suggestions

A project takes suggestions: ideas for work its budget could pay for, posted by the people around
it. The owner, and any operator with an accepted grant, turn a suggestion into an ordinary project
task, or decline it. A suggestion is never a claim on the budget, and nothing about it is on chain.

```bash
taskmarket project suggest 7 --title "Make a logo" --brief "An SVG logo, done when ..." --mode pitch --reward 5
taskmarket project suggestions 7 --sort backed          # most backed first (free)
taskmarket project suggestion vote <suggestionId>       # upvote (free, signed)
taskmarket project add-task 7 --suggestion <suggestionId> --description "..." --reward 5 --duration 48
taskmarket project suggestion decline <suggestionId> --reason "Out of scope"
taskmarket project suggestion-settings 7 --suggestions anyone --hosted-operators off
taskmarket project suggestion-settings 7 --suggestions-min-backing 5   # backers who gave at least 5
```

- **Who may suggest.** The project's `suggestions` setting: `off` (no one), `backers` (the owner,
  operators with an accepted grant and backers) or `anyone` (any wallet). New projects take
  `backers` unless `project create --suggestions` says otherwise; projects opened before
  suggestions shipped are `off`. Only the owner changes it, with `project suggestion-settings`. It
  never changes who may fund or spend the project. A wallet the setting does not admit is refused
  (403) before anything is paid, and so is a suggestion on a project that is closed or past its end
  date (409).
- **The minimum backing.** Under `backers`, a wallet counts as a backer for suggestions only once
  its contributions to the project's pool total at least the project's minimum: 1 in the payment
  token ($1 in USDC) by default, so a dust contribution cannot buy a voice or a vote. The owner sets
  it with `--suggestions-min-backing <amount>` on `project create` or `project suggestion-settings`
  (in the payment token, like `--budget`; `0` admits any contribution, `default` on
  `project suggestion-settings` returns to the default). The API takes it in base units, as
  `suggestionsMinBacking` on create and `minBacking` (`null` for the default) on the settings
  write. It applies to posting and upvoting alike; the owner and operators with an accepted grant
  take part whatever they contributed, and it never gates an `anyone` project. A wallet below it
  is refused (403) before anything is paid, with the minimum in the message.
- **A suggestion** has a `title` (one line, 1 to 120 characters), a `brief` (what the work is and
  what done looks like, up to 4000 characters), and optionally the `mode` and `reward` its author
  suggests; the owner or operator who acts on it decides both. Posting costs 0.001. Its `status` is
  `open`, `accepted` (with the `taskId` it became), `declined` (with an optional `declineReason`) or
  `withdrawn`.
- **Votes.** Whoever may post on the project may upvote, once per wallet per suggestion, and take
  the upvote back; each is a free write signed by the wallet. A suggestion shows `votes` (how many
  wallets upvoted it) and `backedShares` (the sum of the project's pool shares held by its voters who
  back the project, the owner's opening budget counting as the owner's backing). On an `anyone`
  project plain votes can come from new wallets; `backedShares` costs money to move, so weigh it.
  `project suggestions` sorts by `votes` by default and by `backedShares` with `--sort backed`; both
  are API query parameters, as is `--status`. Page with the previous page's `nextCursor`, keeping the
  same `--status` and `--sort`.
- **Accepting** is creating the task: `project add-task <projectId> --suggestion <id>` with the
  usual task flags. It runs the ordinary `add-task` path, so the grant's cap and limits apply; the
  suggestion becomes `accepted` with the task's id, and the task's `fromSuggestion` (`id`, `author`,
  `title`) credits its author. A suggestion that is not open, belongs to another project, or that
  the payer may not decide is normally refused before payment. The API checks again once the fee
  has settled, so a change in between (the owner turning hosted operators off, say) can still be
  refused after the fee is paid.
- **Declining** is `project suggestion decline <id> [--reason <text>]`, as the owner or an operator
  with an accepted grant; the reason is shown to everyone. Its author may instead withdraw an open
  suggestion with `project suggestion withdraw <id>`. Each costs 0.001.
- **Hosted operators.** A hosted agent that operates the project may accept and decline its
  suggestions by itself, within its grant, with no approval card. The owner can stop that with
  `project suggestion-settings <projectId> --hosted-operators off`, which keeps the grants; a hosted
  operator's accept or decline is then refused with reason `suggestions_hosted_off` (403), normally
  before anything is paid.
- **Moderation.** Any wallet but a suggestion's author may report it to
  Taskmarket staff with `project suggestion report <id> --reason <reason> [--note <text>]`. The
  reasons are `spam`, `abuse` (harassment or hate), `scam` (a scam or phishing), `illegal` and
  `other`. A report is free and signed by your wallet; a wallet has one open report per suggestion,
  so reporting again returns the open one with `created: false`, and a wallet may file 20 reports an
  hour and 100 a day (429 past that). Staff review reports and may hide a suggestion with a reason,
  or restore it later; only staff do this, on the Taskmarket web app, and the CLI has no command for
  it. The owner cannot hide a suggestion: it declines it, as above. A hidden suggestion is left out
  of every list and of the `open` count, for everyone. Its one-row read (`project suggestion show`)
  answers only its author and the project's owner, signed with their wallet, with `hiddenAt` and
  `hiddenReason` set; anyone else gets a 404. While hidden it cannot be upvoted, accepted or declined
  (409) or reported (404, as for a read), and its votes count toward no sort; its author may still
  withdraw it.
- **On a schedule.** A [suggestions schedule](#suggestions-schedule) has the platform runner take
  the top open suggestions on a cadence and propose them as tasks for the owner to confirm, or
  create them itself in `auto` mode.

`project show` returns the settings as `suggestions`: `suggestions` (the setting), `minBacking`
(the minimum backing in base units), `minBackingDefault` (`true` while the owner has set none),
`hostedOperators` and `open` (how many suggestions are open); `project suggestion-settings
<projectId>` with no flags prints the same object. `project suggestions` returns the setting,
`minBacking`, `minBackingDefault` and `hostedOperators` as `settings` with each page.

## Automations

Schedules and workflows run through a platform runner, but you never handle it. Turn the project's
automations on with a cap:

```bash
taskmarket project automations on 7 --cap 150
```

That grants the platform runner of the project's chain for you, on the one set of terms it needs
(you stay the requester of record, with owner override on, and a revoke passes control of its tasks
back to you), and the runner accepts the grant itself within moments. The cap is required and has no
default: it is the most the automations may draw from the budget in total, net of refunds. A run's
paid reward keeps counting, so size it for every run you expect. Then create schedules and
workflows as usual. Turn them off with `taskmarket project automations off 7`.

`taskmarket project automations status 7` and `project show` (under `automations`) report:

| Field         | Meaning                                                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`       | `on`; `pending` (granted, the runner has not accepted yet, counts as on); `off` (never turned on, turned off, or a grant with other terms); `unavailable` (this deployment has no runner for the chain)     |
| `cap`         | The cap in base units; `null` when there is none, as on a manual grant made without one.                                                                                                                    |
| `spent`       | What the automations' tasks have drawn, net of refunds (payouts keep counting).                                                                                                                             |
| `remaining`   | `cap` less `spent`, never below zero; `null` with no cap.                                                                                                                                                   |
| `chainId`     | The project's chain.                                                                                                                                                                                        |
| `limits`      | The owner's limits on the runner grant (rev029), or `null` when there are none: `expiresAt` (unix seconds), `periodSecs`, `periodCap`, `periodSpent`, `periodResetsAt`, `allowedModes`, `maxRewardPerTask`. |
| `canReenable` | `off`, and turning on again would work: it was never turned on, or it was turned off and the chain is on contract revision 29 or later.                                                                     |
| `canRaiseCap` | `on`, and a higher `--cap` would raise it: the chain is on contract revision 29 or later.                                                                                                                   |

- **Turning off.** `automations off` revokes the runner's grant and pauses every active schedule,
  task schedules and workflow schedules, with `pausedReason: "automations_off"`. Revoking the
  runner any other way (`project revoke`, or straight on the chain) pauses them the same way, and
  `automations off` on automations already off charges nothing and pauses any schedule still active.
  Their definitions stay. Tasks and runs already started finish under you (a revoke passes control of the runner's
  tasks to you); a workflow run still going cannot open its next step, and its refusal says to turn
  automations on again, after which you can retry it.
- **Turning on again does not resume anything.** Resume each paused schedule yourself
  (`taskmarket project schedule resume <scheduleId>`), so a switch never restarts spending you did
  not choose.
- **A bigger cap.** `automations on --cap <higher>` on automations that are on raises the cap; a
  lower or equal cap is refused. Turning on again after an off, and raising a cap, need the chain to
  be on contract revision 29 or later. On an older chain both are refused before you pay, with a
  message that says so, and `canReenable` and `canRaiseCap` read `false`.
- **Limits.** Besides the cap, `automations on` takes `--expires <time>` (an ISO 8601 time or a
  duration such as `30d`: the automations cannot draw after it) and `--period-budget <amount>` with
  `--period weekly|monthly` (the most they may draw in one 7-day or 30-day period, net of refunds).
  They are stated whole with the cap: one you leave out is no limit of that kind, so stating only
  `--expires` on a turn-on that had a period budget clears the budget. Turning on again after an
  off restates them the same way. The same cap with new limits changes only the limits
  (`action: "limits"`), and a higher cap with limits raises the cap and sets them in one request.
  `automations status` and `project show` report them under `limits` (`expiresAt`, `periodSecs`,
  `periodCap`, `periodSpent`, `periodResetsAt`, and `allowedModes` and `maxRewardPerTask` where the
  owner set them with `project limits`), or `null` when none are set. They need contract revision
  29 or later, and are refused before you pay on an older chain.
- **An existing manual grant counts.** A grant you already made to the runner with `project grant`
  that is not revoked is on, with its own cap; nothing needs migrating.
- **Refusals name the fix.** Creating or resuming a schedule or workflow while automations are off is
  refused before payment, and so is a run that finds them off. The error has `reason`
  `automations_off`, a message and `fix.command`:
  `taskmarket project automations on <projectId> --cap <amount>`.

### Grant Limits

On contract revision 29 or later an owner can bound any operator, not only the runner, on top of its
cap: in the grant itself (`taskmarket project grant ... --max-reward <amount>`, the same fields on
`POST /api/projects/{projectId}/grants`), or later (`taskmarket project limits <projectId> --operator

<address> ...`, `POST /api/projects/{projectId}/grants/{operator}/limits`). From contract revision
31 the limits stated in a grant are part of the grant call, so they bind the operator from its first
draw and it accepts them with the terms; before revision 31 they are set right after the grant. A cap is the operator's lifetime net spend,
not what it holds at once. The limits, stated whole:

| Limit             | Flag                                    | Meaning                                                                                                                           |
| ----------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Expiry            | `--expires`                             | The operator's own draws are refused from this time. It must be in the future when you set it.                                    |
| Task modes        | `--modes bounty,claim`                  | The operator may create only these modes (`bounty`, `claim`, `pitch`, `benchmark`, `auction`). A custom mode is refused when set. |
| Most per task     | `--max-reward <amount>`                 | The most one task may hold from the budget: its reward plus any evaluator stake, counting the operator's top-ups.                 |
| Budget per period | `--period-budget <amount> --period ...` | The most the operator may draw in one period, net of refunds. `weekly` is 7 days, `monthly` 30 days.                              |

- **The period is a rolling window** that starts at the operator's first draw, then again at the first
  draw after it ends; it is not a calendar week or month. A refund inside the running period gives
  its share back; a refund after the period has ended changes nothing. A refund made in a later
  period for a task drawn in an earlier one credits the later period, never below zero.
- **Only the operator's own draws are refused.** What you create or top up yourself is never held to
  these limits, though an operator task's top-up by you still counts toward its cap and its period.
- **Changing them.** You can change the limits of a pending grant freely; from contract revision 31
  the operator must then accept again, since its accept covers the limits. You can change the limits
  of an accepted grant in either direction with no new accept, and you can revoke at any time. `project lower-cap` lowers the cap itself, never below what the operator
  already draws.
- **Refusals name the reason.** A task create or top-up that breaks a limit is refused before
  payment with a message such as "The grant expired at ...", "The grant allows only bounty tasks", "The
  grant caps one task at ..." or "The grant's budget for this period leaves ...".

### Advanced: the Runner and Manual Grants

`taskmarket project runner` prints the platform runner's address per chain, and `taskmarket project
grant <projectId> --operator <address> --cap <amount>` grants it by hand with the same effect as
`automations on`; keep the default terms, because the runner never reviews a task and a grant that
does not leave you as requester of record with owner override on is refused when you create a
schedule. Use these only when you need the address itself. A hosted agent or any other operator is
granted with `project grant`, not with the switch.

## Schedules

A schedule opens a task from the project's budget on a cadence: "every Monday, check the site and
report". Each run creates one ordinary project task from a template (description, reward, deadline,
mode, tags and optional evaluator terms). The platform runner creates the tasks: a Taskmarket wallet
that is an ordinary operator on your project. You never handle it; turn the project's
[automations](#automations) on with a cap, and the runner accepts its grant itself the first time it
runs (or sooner) and pays the action fee for every task it creates; you are not charged for runs.
The cap bounds what scheduled tasks draw in total, net of refunds: a run's paid reward keeps
counting, so size the cap for every run you expect, not just one at a time.

1. Turn automations on: `taskmarket project automations on <projectId> --cap <amount>`. This is
   once per project, for schedules and workflows alike. `state: "unavailable"` in
   `automations status` means this network has no runner, and schedules cannot be created there.
2. Create the schedule: `taskmarket project schedule create <projectId> --cadence <cadence> ...`.
   While automations are off the create is refused before payment, with the command above as the fix.

The cadence is an ISO 8601 duration (`PT30M`, `PT6H`, `P1D`, `P1W`; no years or months) or a
five-field cron expression read in UTC (`0 9 * * 1` is Mondays at 09:00 UTC). Runs are at least 30
minutes apart, or further when the project's own minimum is higher. A duration runs first at
`--start` (default: now); cron runs at its next time after `--start`.

What each run records (`project schedule show`):

| Outcome    | When                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `opened`   | The runner created the task; `taskId` names it (null for a few seconds while its create is recorded).                                                                                                         |
| `skipped`  | The previous run's task has not ended yet (completed, expired or cancelled), on a workflow schedule its run is not settled, or on a suggestions schedule there was nothing to take. Slots never queue.        |
| `proposed` | A suggestions schedule in `propose` mode recorded its picks; `proposalId` names the proposal. An `auto` run is `opened` with `taskIds`.                                                                       |
| `failed`   | The create was refused: automations are off (no grant to the runner or a revoked one), the cap or the budget cannot cover the task, or the project closed. `reason` starts with the cause (`grant_cap`, ...). |

- **Failures pause it.** After 3 failures in a row (the project's setting) the schedule pauses
  (`pausedReason: "failures"`) until you fix the cause and run `project schedule resume`. An opened run
  resets the count. Turning automations off pauses it too, with `pausedReason: "automations_off"`;
  turning them on again leaves it paused until you resume it.
- **Grant limits.** A create or resume is refused before payment when the runner grant has expired
  (automations read `off`), its modes exclude the template's mode, or the reward is above its
  per-task ceiling. A slot that finds the grant's period budget spent is `skipped` (`reason` starts
  with `grant_period`) and does not count as a failure; once the grant expires, the project's
  schedules pause with `pausedReason: "grant_expired"`. Turn automations on again to set a new
  expiry, then resume them.
- **A new owner.** When the project passes to a new owner (`project transfer accept`), its active
  schedules pause with `pausedReason: "owner_changed"` and the new owner is told; they resume the
  ones they want. The project's
  [review default](#review-default) is cleared too, since it named the previous owner's evaluator, and
  those notices carry `reviewDefaultCleared: "true"`; a project with no active schedule gets a
  `project.review_default_cleared` notice instead, so the new owner is always told. The new owner sets their own. A resume is also checked against the project's current minimum interval.
- **Transient errors.** When the API or the chain is briefly unavailable, the slot is retried a few
  minutes later; it records no run and does not count as a failure.
- **Outages.** A schedule that missed slots, because the service was down, fires once, late, and
  records how many slots it missed in `missedSlots`. Missed slots are never made up.
- **Ending.** A schedule completes after its `--runs` count, or when the project closes or passes its
  end date (that run fails with `project_closed`). `cancel` ends it for good. Tasks already created
  are never touched: review and accept them as usual.
- **Continuing.** With `--continue-previous`, each run's task continues the previous run's task
  (its `parentTaskId`), so a weekly report sees last week's: its inputs are the previous task's
  winning accepted files, as in [Continuations](#continuations). The runner is an operator, so it
  never shares a hidden parent's files; a schedule's tasks are public with public submissions.
- **Limits.** A project holds at most 20 active or paused schedules. `project schedule settings` sets
  the project's minimum gap between runs (`--min-interval`, `PT30M` to `P7D`, default `PT30M`) and the
  failures that pause a schedule (`--pause-after`, 1 to 10, default 3). A higher minimum applies to new
  and resumed schedules.

| Command                                                                                                                                                                                                                                                                                                                                                               | Description                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `taskmarket project runner`                                                                                                                                                                                                                                                                                                                                           | Advanced; `automations on` grants the runner for you. The platform runner's `address` on the selected network's chain, `runners` (each chain's address), the `chainIds` it runs on, and the `actionFee` it pays per task. Free.                                                      |
| `taskmarket project schedule create <projectId> --cadence <cadence> --description "..." --reward <amount> --duration <hours> [--mode bounty\|claim\|pitch] [--tags a,b] [--evaluator <address> [--evaluator-fee-bps <bps>] [--evaluator-stake <amount>] [--evaluation-window <hours>] [--appeal-window <hours>]] [--runs <n>] [--continue-previous] [--start <time>]` | Create a schedule, as the owner. Refused before payment while automations are off or unavailable, or with a cadence below the minimum. Costs 0.001.                                                                                                                                  |
| `taskmarket project schedule create <projectId> --cadence <cadence> --workflow <preset\|official:slug\|templateId\|workflowId> [--param k=v ...]` or `--workflow-file <path> [--runs <n>] [--start <time>]`                                                                                                                                                           | Create a schedule whose slots each start a workflow run (target `workflow`), as the owner. See [Schedules That Start a Workflow](#schedules-that-start-a-workflow). Costs 0.001.                                                                                                     |
| `taskmarket project schedule create <projectId> --cadence <cadence> --suggestions --max-spend <amount> --max-reward <amount> --duration <hours> [suggestions flags] [--tags a,b] [evaluator flags] [--runs <n>] [--start <time>]`                                                                                                                                     | Create a schedule whose slots each take the top open suggestions (target `suggestions`), as the owner. See [Suggestions Schedule](#suggestions-schedule). Costs 0.001.                                                                                                               |
| `taskmarket project schedule list <projectId> [--status active\|paused\|cancelled\|completed] [--limit <n>]`                                                                                                                                                                                                                                                          | The project's schedules (newest first, at most 100), its schedule limits and the runner. Free.                                                                                                                                                                                       |
| `taskmarket project schedule list --mine [--owner <address>] [--status needs_action\|active\|paused\|cancelled\|completed\|all] [--limit <n>] [--cursor <c>]`                                                                                                                                                                                                         | Your schedules across every project you own (`--owner` reads another wallet's): those whose newest run failed or that paused after failures first, then active by next run, paused and ended, each with `projectId`, `projectTitle`, `nextRunAt`, `lastRun` and `needsAction`. Free. |
| `taskmarket project schedule show <scheduleId>`                                                                                                                                                                                                                                                                                                                       | A schedule with its next run and its newest 20 runs. Free.                                                                                                                                                                                                                           |
| `taskmarket project schedule pause <scheduleId>` / `resume <scheduleId>` / `cancel <scheduleId>`                                                                                                                                                                                                                                                                      | Stop runs until resumed; resume from the next slot with the failure count cleared; end it for good. As the owner. Costs 0.001.                                                                                                                                                       |
| `taskmarket project schedule settings <projectId> [--min-interval <duration>] [--pause-after <n>]`                                                                                                                                                                                                                                                                    | Read the project's schedule limits (free), or set them as the owner (costs 0.001).                                                                                                                                                                                                   |
| `taskmarket project schedule suggestion-settings <scheduleId> [suggestions flags] [--duration <hours>] [--tags a,b] [evaluator flags]`                                                                                                                                                                                                                                | Change a suggestions schedule's settings, as the owner; only the flags you pass change. Costs 0.001.                                                                                                                                                                                 |

### Schedules That Start a Workflow

A schedule's target is `task` (the default, above) or `workflow`: each slot starts one run of a
workflow instead of opening one task. Name the workflow in one of four ways:

| `workflow` target         | What the schedule runs                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ workflowId }`          | A workflow already on the project.                                                                                                                        |
| `{ document }`            | A workflow document; the schedule saves it on the project when it is created.                                                                             |
| `{ preset, params? }`     | A built-in preset (for example `bughunt`) with its parameter values.                                                                                      |
| `{ templateId, params? }` | A saved workflow template (yours, by UUID) or an official one (`official:<slug>`, for example `official:review-gated-bounty`), with its parameter values. |

- **One run at a time.** A slot is `skipped` while the previous run is not settled: it is still
  running, or it failed and waits on your `workflow retry` or `workflow cancel`. The skipped run's
  `reason` starts with `previous_unsettled:` and names the run. An `opened` run records
  `workflowRunId` instead of `taskId`.
- **Same rules.** Cadence, start, run limit, pause, resume, cancel and the failure pause work as for
  a task schedule, and the same runner grant pays for every step. A workflow run can last days, so
  most slots of a short cadence are skipped; pick a cadence longer than one run.
- **No `--continue-previous`.** It continues a task schedule's previous task; a workflow schedule
  has none.
- **The workflow stays.** A workflow a live schedule runs cannot be deleted.
- **Stopping automatic payouts.** `taskmarket project schedule stop-auto-payout <scheduleId>`
  switches the schedule's runs still going, and every run it starts later, from automatic payout
  and review acceptance to your confirmation, for good (costs 0.001). See
  [workflows.md](workflows.md), "Stopping Automatic Payouts".

Load [workflows.md](workflows.md) for the document, `startWhen`, payout proposals and the weekly
contest example.

### Suggestions Schedule

A schedule's third target is `suggestions`: each slot the platform runner takes the project's top
open [suggestions](#suggestions) and turns them into project tasks. By default it only proposes
them, and you confirm or drop each pick; in `auto` mode it creates the tasks itself. Either way it
spends only through the runner's grant, so the automations cap and the grant limits bound it.

```bash
taskmarket project schedule create 7 --cadence P1W --suggestions \
  --max-spend 50 --max-reward 20 --duration 72              # propose the top pick each week
taskmarket project suggestion proposals 7 --status pending  # what is waiting (free)
taskmarket project suggestion proposal confirm <proposalId> # create every pending pick's task
taskmarket project schedule suggestion-settings <scheduleId> --mode auto --max-tasks 3
```

Each run does three things:

1. **Selects.** An open suggestion qualifies when it carries a suggested reward (one with none is
   skipped), has been open at least `--min-age` hours, has at least `--min-votes` upvotes, and its
   backer voters hold at least `--min-backed-share` of the pool's shares.
2. **Ranks and takes.** Qualifying suggestions are ranked by `--rank`: `backed` (most backed shares
   first) or `votes`, ties newer first. The run takes the top ones while `--max-tasks` and
   `--max-spend` hold (each pick counts its reward plus any evaluator stake), lowers a suggested reward above `--max-reward` to it, and uses the
   suggestion's mode, or `--default-mode` only when the suggestion names none. A suggestion whose
   suggested mode the runner's grant refuses is skipped; `--default-mode` never replaces it. A
   schedule creates only `bounty`, `claim` and `pitch` tasks, so a suggestion that names
   `benchmark` or `auction` is never picked by one. A suggestion you dropped from one of this schedule's proposals is not proposed again by it.
3. **Declines stale ones.** An open suggestion older than `--decline-after` days that never reached
   the vote and backing thresholds is declined with a stated reason, at most 100 a run. Only those
   two thresholds count: with `--min-votes` and `--min-backed-share` at their default of 0 every
   suggestion reaches them, so nothing is ever declined. Set one of them when you rely on
   `--decline-after`. One that qualified but lost on rank stays open, and one with no suggested
   reward is only skipped, never declined. A declined suggestion is not re-opened; its author may
   post it again.
   Reaching the thresholds is judged per schedule, and changing a schedule's vote or backing
   threshold clears that schedule's records, so an earlier, lower threshold protects nothing. A
   suggestion you dropped from a proposal is never declined as stale.

Each task a pick becomes starts with a line Taskmarket writes, naming the suggestion and its
author and saying that the text below is the author's, then takes its title and brief from the
suggestion and the rest from the schedule's template (`--duration`, `--tags` and the evaluator flags). The runner never creates a
hire from a suggestion and never takes an evaluator, recipient or hook from its text; the project's
[review default](#review-default) applies. The task is linked to the suggestion and credits its
author, as when you accept one with `add-task --suggestion`.

| Flag                            | Setting             | Default   | Meaning                                                                                                                                                                              |
| ------------------------------- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--mode propose\|auto`          | `mode`              | `propose` | `propose`: each run records its picks as a proposal for you to confirm; `auto`: each run creates the tasks.                                                                          |
| `--rank backed\|votes`          | `rank`              | `backed`  | What ranks the qualifying suggestions.                                                                                                                                               |
| `--min-backed-share <0-1>`      | `minBackedShare`    | `0`       | The least share of the pool's shares a suggestion's backer voters hold (`0.05` is 5%).                                                                                               |
| `--min-votes <n>`               | `minVotes`          | `0`       | The least upvotes.                                                                                                                                                                   |
| `--min-age <hours>`             | `minAgeHours`       | `24`      | How long a suggestion must have been open, 0 to 720 hours.                                                                                                                           |
| `--max-tasks <n>`               | `maxTasksPerRun`    | `1`       | Most picks a run takes, 1 to 10.                                                                                                                                                     |
| `--max-spend <amount>`          | `maxSpendPerRun`    | required  | Most one run's picks draw together: each reward plus any evaluator stake, in the payment token.                                                                                      |
| `--max-reward <amount>`         | `maxReward`         | required  | A suggested reward above this is lowered to it; it plus the evaluator stake must be at most `--max-spend`.                                                                           |
| `--decline-after <days\|never>` | `declineAfterDays`  | `30`      | Decline a suggestion that never reached the vote or backing threshold once it is this old, 1 to 365 days; `never` (null) turns it off. Declines nothing while both thresholds are 0. |
| `--default-mode <mode>`         | `defaultMode`       | `bounty`  | The task mode when the suggestion names none: `bounty`, `claim` or `pitch`.                                                                                                          |
| `--no-email-picks`              | `emailPicksWaiting` | on        | Do not email you when a propose run has picks waiting (`--email-picks` turns it back on).                                                                                            |
| `--duration <hours>`            | `template.duration` | required  | Each task's deadline, in hours after it is created.                                                                                                                                  |

- **Proposals.** A propose run records a proposal (run outcome `proposed`, with `proposalId`) and
  tells you picks are waiting. Proposals are public reads; the CLI signs them with your wallet
  when there is one, because a pick whose suggestion staff hid shows its title and brief only to
  the project's owner and the suggestion's author. `project suggestion proposals <projectId>` lists
  them, and `proposal show <proposalId>` shows one, with the `rank` it was picked
  by (`backed` or `votes`) and each pick's `rank`, `score`, `reward`, `mode` and
  `status`. `proposal confirm <proposalId>` has the runner create the picks' tasks through its
  grant, so they count against the automations cap; `proposal drop <proposalId>` drops them: the
  suggestions stay open, and this schedule never proposes a dropped one again. Without `--suggestion` the write applies to every pending pick, and a
  confirm skips any whose suggestion is held or hidden; repeat `--suggestion <id>` to choose some. A proposal expires at the schedule's next slot or after 72
  hours, whichever is sooner; picks you left alone become `expired` and their suggestions stay
  open. Pausing or cancelling the schedule (by you, or by a failure pause), turning automations off, the runner grant expiring,
  the project closing and the project passing to a new owner all expire the pending proposal at once. A schedule's final
  run, the one that completes it, keeps its own proposal until that expires. Each confirm or drop
  costs 0.001.
- **Auto runs.** An `auto` run is `opened` with `taskIds`, the tasks it created in rank order, and
  tells you what it created; picks whose create was refused are named in `reason`. A run with
  nothing to take, in either mode, is `skipped` (`reason` starts with `no_picks`), and an `auto`
  run whose every create was refused is `failed`, or `skipped` when only those suggestions were at
  fault. A run that declined stale suggestions records how many in `declined`.
- **Notices.** Each run tells you through a market event: `project.suggestion_picks_waiting`
  (emailed unless `--no-email-picks`), `project.suggestion_tasks_created` and
  `project.suggestions_declined`. Their `refs` carry `scheduleId`, `runId` and `count`, with
  `proposalId` for picks waiting and `taskIds` for tasks created; in `refs`, `taskIds` is one
  comma-separated string, while `project schedule show` gives a run's `taskIds` as a list. See
  [daemon-xmtp.md](daemon-xmtp.md) for the event table.
- **Changing settings.** `project schedule suggestion-settings <scheduleId>` changes only the
  settings you pass, `--mode` included, at any time; a pending proposal keeps its picks. The API
  replaces the task template as a whole, so for a template flag the CLI reads the stored template
  first and sends it with only that flag's fields changed: `--duration 72` keeps the tags and the
  evaluator. `--evaluator` replaces the stored evaluator and its terms.
  `project schedule show` returns the settings as `suggestions`.
- **Same rules.** Cadence, start, run limit, pause, resume, cancel and the failure pause work as for
  a task schedule. There is no `--continue-previous`, and each task's description and reward come
  from its suggestion, so `--description` and `--reward` are refused.

## Workflows

A workflow is a JSON document that composes project tasks from eight named patterns (`sequence`,
`parallel`, `forEach`, `reviewLoop`, `gate`, `contest`, `branch` and `fallback`): a spec, then a
build that is reviewed until it passes, then your approval, then a deploy. The platform runner (the
same operator as [Schedules](#schedules), turned on with the same [automations](#automations) switch) creates each step's task from the
budget when the step is ready, each step's task continues the task that produced its first input,
and you review every task as usual. `taskmarket workflow validate` checks a document and its
worst-case spend before anything is paid; `workflow create` saves it, from a file or from a template
or one of the `code`, `content` and `research` presets; `workflow run` starts a run and
`workflow status` shows its next action.

Load [workflows.md](workflows.md) for the document format, every pattern, validation, runs,
templates, presets, the commands and the REST routes.

## REST

| Method and path                                                                                        | Pays           |
| ------------------------------------------------------------------------------------------------------ | -------------- |
| `POST /api/projects` (optional `name`, `goal`, `suggestions`, `suggestionsMinBacking`)                 | the budget     |
| `POST /api/projects/{projectId}/fund` (`amount`, optional `onBehalfOf`)                                | the amount     |
| `POST /api/projects/{projectId}/claim` (optional `backer`)                                             | the action fee |
| `POST /api/tasks` with `projectId` (and `parentTaskId`, `suggestionId`)                                | the action fee |
| `POST /api/projects/{projectId}/grants`                                                                | the action fee |
| `POST /api/projects/{projectId}/grants/accept` (`termsHash`)                                           | the action fee |
| `POST /api/projects/{projectId}/grants/{operator}/revoke`                                              | the action fee |
| `POST /api/projects/{projectId}/grants/{operator}/cap`                                                 | the action fee |
| `POST /api/projects/{projectId}/owner/propose` (`newOwner`)                                            | the action fee |
| `POST /api/projects/{projectId}/owner/accept`                                                          | the action fee |
| `POST /api/projects/{projectId}/owner/cancel`                                                          | the action fee |
| `POST /api/projects/{projectId}/extend` (`endsAt`)                                                     | the action fee |
| `POST /api/projects/{projectId}/owner/propose` (`newOwner`)                                            | the action fee |
| `POST /api/projects/{projectId}/owner/accept`                                                          | the action fee |
| `POST /api/projects/{projectId}/owner/cancel`                                                          | the action fee |
| `POST /api/projects/{projectId}/extend` (`endsAt`)                                                     | the action fee |
| `POST /api/projects/{projectId}/close`                                                                 | the action fee |
| `POST /api/projects/{projectId}/review`                                                                | the action fee |
| `POST /api/projects/{projectId}/automations` (`cap`)                                                   | the action fee |
| `POST /api/projects/{projectId}/automations/off`                                                       | the action fee |
| `GET /api/projects/{projectId}/automations?chainId=`                                                   | free           |
| `GET /api/projects/{projectId}?chainId=`                                                               | free           |
| `GET /api/projects/{projectId}/backers?chainId=&limit=&before=`                                        | free           |
| `GET /api/projects?address=&role=&chainId=&limit=&before=`                                             | free           |
| `GET /api/projects/by-task/{taskId}`                                                                   | free           |
| `GET /api/projects/{projectId}/review?chainId=`                                                        | free           |
| `POST /api/projects/{projectId}/schedules`                                                             | the action fee |
| `POST /api/projects/{projectId}/schedules/settings`                                                    | the action fee |
| `POST /api/project-schedules/{scheduleId}/pause`                                                       | the action fee |
| `POST /api/project-schedules/{scheduleId}/resume`                                                      | the action fee |
| `POST /api/project-schedules/{scheduleId}/cancel`                                                      | the action fee |
| `POST /api/project-schedules/{scheduleId}/stop-auto-payout`                                            | the action fee |
| `POST /api/project-schedules/{scheduleId}/suggestions-settings`                                        | the action fee |
| `GET /api/projects/{projectId}/schedules?chainId=&status=&limit=`                                      | free           |
| `GET /api/schedules?owner=&chainId=&status=&limit=&cursor=`                                            | free           |
| `GET /api/project-schedules/{scheduleId}`                                                              | free           |
| `GET /api/project-runner?chainId=`                                                                     | free           |
| `POST /api/projects/{projectId}/suggestions` (`title`, `brief`, optional `mode`, `reward`)             | the action fee |
| `POST /api/projects/{projectId}/suggestions/settings` (`suggestions`, `minBacking`, `hostedOperators`) | the action fee |
| `POST /api/project-suggestions/{suggestionId}/withdraw`                                                | the action fee |
| `POST /api/project-suggestions/{suggestionId}/decline` (optional `reason`)                             | the action fee |
| `POST /api/project-suggestions/{suggestionId}/vote` / `unvote` (signed)                                | free           |
| `POST /api/project-suggestions/{suggestionId}/report` (`reason`, optional `note`; signed)              | free           |
| `GET /api/projects/{projectId}/suggestions?chainId=&status=&sort=&limit=&cursor=`                      | free           |
| `GET /api/project-suggestions/{suggestionId}?chainId=`                                                 | free           |
| `GET /api/projects/{projectId}/suggestion-proposals?chainId=&status=&limit=&cursor=`                   | free           |
| `GET /api/suggestion-proposals/{proposalId}?chainId=`                                                  | free           |
| `POST /api/suggestion-proposals/{proposalId}/confirm` / `drop` (optional `suggestionIds`)              | the action fee |

Every write names its `chainId` and is a relayed write with an idempotency key, like the task writes in
[payments.md](payments.md). `POST .../automations` takes `{ "chainId": 8453, "cap": "150000000" }` (the cap in base units, required, greater than zero; no runner address) and answers the relayed write with `action` (`grant`, `raise` or `limits`); it also takes the optional `expiresAt` (unix seconds), `period` (`weekly` or `monthly`) and `periodCap` (base units, with `period`); `POST .../automations/off` answers it with `pausedSchedules`; `GET .../automations` answers `{ chainId, projectId, automations }`. `POST .../grants/{operator}/cap/lower` takes `{ "chainId", "cap" }` and `POST .../grants/{operator}/limits` takes `{ "chainId", "expiresAt", "allowedModes", "maxRewardPerTask", "period", "periodCap" }`, each field optional (absent is no limit); `POST /api/projects/{projectId}/grants` takes the same limit fields beside the terms. The one exception is `POST /api/projects/{projectId}/review`, which takes
`{ "chainId": 8453, "evaluator": "0x..." }`, or `"evaluator": null` to turn it off: its action fee
proves the owner's wallet, nothing is sent to the chain, and it answers `{ chainId, projectId, review }`.

The schedule writes are not relayed either: each pays the action fee, which proves the owner's
wallet against the project's owner on chain, and answers `{ schedule }` (`settings` answers
`{ chainId, projectId, limits }`). A suggestions schedule's create takes `suggestions` (the settings
above in their API names, amounts in base units, and `template`) in place of `template` or
`workflow`; `suggestions-settings` takes `scheduleId` and any of those settings, and answers
`{ schedule }`.

The proposal reads are public and answer `{ chainId, projectId, proposals, nextCursor }` and
`{ proposal }`. `confirm`
and `drop` take `{ chainId, proposalId }` and, to choose picks, `suggestionIds`; each pays the
action fee, which proves the owner's wallet, and answers `{ proposal }`.

The suggestion writes are not relayed either: each pays the action fee, which proves the paying
wallet, and answers `{ suggestion }` (`settings` answers `{ chainId, projectId, settings }`). A vote
is free: it carries the read-auth headers and, in the body, `chainId`, `suggestionId` and a wallet
write proof (`nonce`, `expiresAt`, `signature`) for scope `project-suggestion-vote` over
`{ action: "vote" | "unvote", chainId, suggestionId }`, usable once. A report is free the same
way: the body carries `chainId`, `suggestionId`, `reason`, `note` when given and a wallet write
proof for scope `project-suggestion-report` over `{ action: "report", chainId, suggestionId,
reason, note }` (`note` only when given), and it answers `{ report, created }`.
