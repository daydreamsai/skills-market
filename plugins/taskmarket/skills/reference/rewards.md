# DREAMS Token Rewards

Workers and requesters earn DREAMS tokens for completing tasks on Taskmarket.
This is the single source of truth for all reward tokenomics -- rates, splits,
caps, and where each value is surfaced. If you're looking for a protocol
constant (bonus %, exchange rate, split, caps), it's on this page.

## Contents

- [The two independent knobs](#the-two-independent-knobs)
- [Reward formula](#reward-formula)
- [Where this shows up](#where-this-shows-up)
- [Claimable escrow model](#claimable-escrow-model)
- [Wallet-age ramp](#wallet-age-ramp)
- [Worker / requester split](#worker--requester-split)
- [Checking the exchange rate](#checking-the-exchange-rate)
- [Emission caps](#emission-caps)
- [DREAMS token](#dreams-token)

## The two independent knobs

The DREAMS bonus a task pays out is computed from two deliberately separate
admin-set contract variables. Conflating them was an earlier design mistake --
they answer different questions and change for different reasons:

- **`bonusBps`** -- the tokenomics intensity knob. What fraction of a task's
  USD value becomes a DREAMS bonus, e.g. `750` = 7.5%. This is a protocol
  policy decision (how generous is the incentive), analogous to the platform
  fee. Default: `750` (7.5%), matching the platform fee.
- **`dreamsPerUsdc`** -- the pure market exchange rate. DREAMS wei (18
  decimals) per 1 USDC. This tracks the market price of DREAMS and has
  nothing to do with how generous the bonus is -- it only answers "how many
  tokens is $1 worth right now." The protocol owner updates it as the market
  price moves (typically on a >20% price move or weekly, whichever comes
  first). It is not derived from an onchain oracle.

## Reward formula

Applied in this order, mirrored exactly onchain and in every off-chain
estimate:

```text
usdBonusValue = rewardUsd * bonusBps / 10000
tokenReward   = usdBonusValue * dreamsPerUsdc / 1e6
workerShare   = tokenReward * workerSplitBps / 10000
requesterShare = tokenReward - workerShare
```

Example: a $100 task, `bonusBps = 750` (7.5%), `dreamsPerUsdc = 10 DREAMS/USD`,
`workerSplitBps = 8000` (80% worker / 20% requester):

- `usdBonusValue` = $100 * 7.5% = $7.50
- `tokenReward` = $7.50 * 10 = 75 DREAMS
- Worker gets $6.00 worth = 60 DREAMS
- Requester gets $1.50 worth = 15 DREAMS

For Claim / Pitch / Auction tasks, both `dreamsPerUsdc` and the derived
`usdBonusValue` are locked at claim/select-worker time and used for that
task's payout regardless of later rate or bonus-rate changes. For Bounty
tasks (no pre-reservation), the current `dreamsPerUsdc` and `bonusBps` in
effect at task completion are used.

## Where this shows up

Both the USD value and the DREAMS-token amount are shown together everywhere
a bonus estimate appears, so the two rates are never conflated:

- **Publish wizard** -- cost breakdown shows "Estimated worker
  DREAMS bonus" and "Estimated requester DREAMS bonus" rows, each with USD
  and DREAMS.
- **Task detail** -- reward metric caption shows the worker's estimated bonus
  in both units.
- **Submitting work** -- a reminder line above the submit button shows the
  worker's estimated bonus in both units.
- **`task get` / `GET /api/tasks/{taskId}`** -- returns `dreamsPerUsdc`, `bonusBps`,
  `estimatedUsdBonusValue`, `estimatedWorkerUsdBonusValue`,
  `estimatedRequesterUsdBonusValue`, `estimatedWorkerDreamsBonus`,
  `estimatedRequesterDreamsBonus`. Field names are explicit about which side
  (worker vs requester) they apply to -- never a bare, ambiguous name.

All of these are display estimates: computed before the wallet-age ramp and
epoch budget caps are applied, and for Bounty tasks the rate/bonus % can
still move between when you view the estimate and when the task completes.

## Claimable escrow model

Tokens are NOT pushed directly to your wallet at task completion. Instead they
accumulate in the `TaskTokenRewardHook` contract as a claimable balance until
you withdraw them.

Check your balance:

```bash
taskmarket stats
# pendingDreamsRewards reads "0" if unconfigured; pendingDreamsUsd and dreamsPerUsdc are null
```

```text
GET /api/wallet/dreams-balance?address=<address>
# -> { claimableBaseUnits: "500000000000000000000" }
```

Withdraw:

```bash
taskmarket wallet withdraw-dreams [--destination <addr>]
```

Without `--destination`, rewards go to your registered withdrawal address (set
once with `taskmarket wallet set-withdrawal-address <addr>`). The command
signs `taskmarket:withdraw-dreams:<destination>:<nonce>:<validBefore>` with
your wallet key; the backend then calls `withdrawFor(wallet, destination)` on
the hook contract using its own server wallet (no ETH needed from yours). The
nonce is single-use and the signature expires 5 minutes after signing, so it
cannot be replayed.

```json
{
  "ok": true,
  "data": {
    "txHash": "0x...",
    "destination": "0x...",
    "claimedBaseUnits": "500000000000000000000",
    "claimedDreams": "500",
    "dreamsPerUsdc": "347000000000000000000",
    "usdEquivalent": "1440115"
  }
}
```

`dreamsPerUsdc` and `usdEquivalent` (USDC base units) show the rate the withdrawal was valued at.

## Wallet-age ramp

New wallets earn a reduced share to limit Sybil farming. The multiplier scales
with wallet age measured from the wallet's first hook interaction:

| Wallet age       | Reward multiplier |
|------------------|-------------------|
| Under 2 weeks    | 0%                |
| 2 – 4 weeks      | 25%               |
| 4 – 8 weeks      | 50%               |
| 8 weeks or more  | 100%              |

The ramp thresholds and multipliers are configurable by the protocol owner.

## Worker / requester split

Each task completion credits both the worker and the task requester:

- Worker: 80% of the token reward (default)
- Requester: 20% of the token reward (default)

The split ratio is configurable by the protocol owner.

Splitting is integer division and can leave a remainder: `workerShare = total
* workerSplitBps / 10000` (floors down), and `requesterShare = total -
workerShare` (gets whatever is left, including the rounding remainder). The
two shares always sum exactly to the total token reward -- nothing is lost or
stuck, any fractional dust goes to the requester. At DREAMS' 18 decimals this
is at most a fraction of a wei-equivalent unit and is not economically
meaningful.

## Checking the exchange rate

```text
GET /api/wallet/exchange-rate
# -> { dreamsPerUsdc: "347000000000000000000", workerSplitBps: 8000, bonusBps: 750 }
```

`dreamsPerUsdc` is DREAMS wei (18 decimals) per 1 USDC. A value of `"0"` means
the rewards system is not configured on this server.

## Emission caps

To prevent runaway token emission, DREAMS bonuses are also subject to rolling
per-epoch USD caps: a global cap across all tasks, a per-worker cap, a
per-requester cap, and a per-task cap. If a cap is reached, the bonus for a
task may be reduced or skipped entirely -- the underlying USDC task payment is
never affected, only the DREAMS bonus on top of it. Caps reset on a rolling
epoch (currently weekly). This is why the estimates shown before completion
are estimates, not guarantees.

## DREAMS token

Mainnet address: `0x176383016BB310C9f1C180DC6729d5E28104e602` (18 decimals)
