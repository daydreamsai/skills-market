# AI Brief Review: Evaluator Versions

This page is about the evaluator of the AI brief review, the private advisory report a requester can run over a task's submissions. It is not the onchain evaluator a task can name to judge a delivery and settle a dispute; for that, load [evaluators.md](evaluators.md).

## What an evaluator version is

An evaluator version is the profile's `version`: the set of model roles (planner, vision and decision), the question set, the thresholds and the cost policy a review ran with. The web shows it as "Profile N". The CLI returns it as `profile.version`, and every saved report keeps the profile it was made with.

## When it changes

Taskmarket publishes a new version when an approved change moves the pinned decision build, the question set, the thresholds, the image input to the decision model or the cost policy. A change to the cost policy alone also counts as a new version, because the version covers everything the profile pins.

## What happens to existing reports

A report made with an earlier version reads **Outdated** with the reason `evaluator_changed`. It leaves the ranking, because a score from one evaluator is not comparable with a score from another. It stays readable until its 30-day expiry, labelled with its profile. Nothing is re-reviewed automatically, and loading the page never calls a model.

## Why a report reads Outdated

`taskmarket task review results` returns `outdatedReason` on every row whose `state` is `outdated`. It is a list in this order, or `null` when the row is current. The assessment returned by `task review assessment` carries the same field.

| Value               | Meaning                                                                              | What to do                                                 |
| ------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `source_changed`    | The task brief, or the submission itself, changed after the review.                  | Review the new version of the submission.                  |
| `evaluator_changed` | A newer evaluator version is available; the report was made with an earlier one.     | Preview and sign a re-review if you want a current report. |
| `evidence_expired`  | A public page the review read was captured more than a day ago and may have changed. | Re-review, or check the page yourself.                     |

A row can carry several values, for example `["evaluator_changed", "evidence_expired"]` when the evaluator changed more than a day after a public page was read.

## Re-reviewing with a newer evaluator

When the evaluator changed and the work did not, `results` adds an `upgrade` object next to `rows`:

```json
{
  "upgrade": {
    "profileVersion": "2",
    "submissionIds": ["<submission id>", "<submission id>"],
    "estimatedUsd": "0.00"
  }
}
```

`upgrade` lists every reviewed submission whose `outdatedReason` contains `evaluator_changed` and does not contain `source_changed`. It is `null` when there is none, when you read a single run with `--run-id`, or when review runs are not open to you. It lists at most 100 submissions, which is one run's limit; the rest appear after that run. `estimatedUsd` is the price of the re-review, a decimal string. It is `"0.00"` during the free pilot.

On the web, the review panel shows "A newer evaluator is available for N reviewed submissions" with the cost. The button opens the same preview as below; you still sign the start.

To re-review from the CLI:

1. Read `upgrade` from `taskmarket task review results <taskId>`.
2. Preview exactly those submissions and save the output: `taskmarket task review preview <taskId> --scope selected --submission-id <id> --submission-id <id> > preview.json`. Repeat the flag for each id.
3. Start the run: `taskmarket task review start <taskId> --preview-file preview.json`.

The start is the normal signed, idempotent one. The older reports stay readable until they expire.

## Version history

Newest first. Each entry says what changed; none claims a measured improvement.

Production has no published profile yet. These are the profiles of the DEVNET pilot (`atti-devnet-review`).

### Profile 2 (2026-11-01)

The decision model is called through OpenRouter, using the build `typesafe/jev-1.13-20260917` (ADR-0465). Reports made with profile 1 read Outdated with `evaluator_changed`.

### Profile 1 (2026-10-27)

The first DEVNET pilot profile.
