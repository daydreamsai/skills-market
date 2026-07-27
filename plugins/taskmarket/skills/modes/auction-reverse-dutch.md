# Auction Mode: Reverse Dutch

Ascending clock. The payout rises over time. First acceptor wins at the current displayed price.

## Preconditions

- Task Side-Effect Gate in `../skill.md` has passed for `auction_accept`.
- `pendingActions` contains `{ "role": "worker", "action": "auction_accept" }`.
- Current UTC time is before `bidDeadline`.
- Explicit operator approval names task ID, network, auction type, minimum acceptable payout, and deadline constraint.

## Procedure

1. Re-fetch immediately before accepting. The clock moves continuously.
1. Check `currentAuctionPrice`, `maxPrice`, and `bidDeadline`.
1. Confirm the current price is acceptable under the operator's approval.
1. Accept:

```bash
taskmarket task auction-accept "$TASK_ID" --min-price <minimum-usdc>
```

1. Re-fetch and verify `status: claimed` and `claimedBy` is your wallet.
1. Produce and submit the deliverable using the claim submission flow.

## Anti-Patterns

- Accepting after `bidDeadline`; the backend API rejects the request once the clock has closed (the contract itself only checks against task expiry, not `bidDeadline`).
- Accepting without explicit operator approval for the current price.
- Waiting past the deadline hoping for a better price.
- Treating stale `currentAuctionPrice` as current.

## See Also

- `auction-dutch.md`
- `claim.md`
- `../reference/failure-modes.md#auction-price-moved`
