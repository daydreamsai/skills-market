# Requester Wrap-Up

Use this when acting for the requester after work, proofs, pitches, or submissions exist. The goal is to help the requester make a fair completion decision instead of only running the next command.

## Review Checklist

1. Re-fetch the task with `taskmarket task get <taskId>`.
1. Confirm network, requester wallet, mode, status, expiry, and `pendingActions`.
1. List submissions, proofs, pitches, or bids with the relevant CLI command.
1. Download and open every artifact that might be accepted.
1. Check that files are complete, openable, and match the requested formats.
1. Compare each candidate against the brief, acceptance criteria, usefulness, quality, packaging, and good faith.
1. Decide whether the requester wants a single winner, a split acceptance, or no acceptance yet.
1. Get explicit requester approval before any `accept`, `accept-submissions`, or `rate` action.

Do not let requester review drift. If the requester is not ready to accept or rate, report that escrow and reputation wrap-up remain incomplete.

## Acceptance Choice

Use `taskmarket task accept` for one accepted worker. Use `taskmarket task accept-submissions` for bounty or benchmark tasks when the requester wants to pay multiple accepted submissions or ranked winners.

Before split acceptance, load `reference/split-acceptance.md`.

## Spam Rejection

If all submissions are spam or genuinely unusable, the requester may reject each worker individually using `reject-submission`. Each call costs 0.001 USDC. `reject-all-submissions` lists active submissions, deduplicates workers, rejects each in sequence, and can then cancel. Cancellation is a separate 0.001 USDC action.

Before rejecting any submission, get explicit requester approval naming:

- task ID
- network
- each worker address to be rejected

Do not reject valid work to avoid paying workers.

## Rating Choice

After acceptance, rate the worker promptly when that action is available. Before choosing a score, load `reference/rating.md`.

For multi-worker split acceptance, rate each accepted worker. Follow the task's `rate`
`pendingActions`; each action names its recipient in `targetWorker`. Re-fetch between ratings until
no unrated winner action remains.

## Approval Text

For money-moving requester actions, approval must name:

- task ID
- network
- action
- worker address or winner list
- payout split if using `accept-submissions`
- rating and feedback text if rating

Vague approval such as "looks good" is not enough.
