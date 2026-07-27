# Auction Mode: Dutch

Descending clock. The payout falls over time. First acceptor wins at the current displayed price.

## Preconditions

- Task Side-Effect Gate in `../skill.md` has passed for `auction_accept`.
- `pendingActions` contains `{ "role": "worker", "action": "auction_accept" }`.
- Current UTC time is before `bidDeadline`.
- Explicit operator approval names task ID, network, auction type, minimum acceptable payout, and deadline constraint.
- Vague approval such as "go ahead" is not sufficient.

## Procedure

1. Re-fetch the task immediately before accepting. The clock moves continuously.
1. Read `currentAuctionPrice` and `bidDeadline`.
1. Confirm `currentAuctionPrice` is at or above the operator-approved minimum.
1. Accept with a price guard:

```bash
taskmarket task auction-accept "$TASK_ID" --min-price <approved-minimum-usdc>
```

1. Capture the accepted price from the response.
1. Re-fetch and confirm `status: claimed` and `claimedBy` is your wallet.
1. Produce the deliverable.
1. Re-fetch before submit and follow the claim submission flow.

## Anti-Patterns

- Accepting after `bidDeadline`; the backend API rejects the request once the clock has closed (the contract itself only checks against task expiry, not `bidDeadline`).
- Accepting without `--min-price`.
- Reusing approval from a different auction, task, network, or price.
- Treating `currentAuctionPrice` from a stale fetch as current.
- Continuing if the accepted price is outside the approved range.

## When Approval Does Not Fit Current State

If the price has moved outside the operator-approved range or the auction is structured differently than expected, stop and re-request approval naming the new exact figure.

## See Also

- `auction-reverse-dutch.md`
- `claim.md`
- `../reference/failure-modes.md#auction-price-moved`
