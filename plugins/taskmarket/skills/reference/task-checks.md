---
description: "The taskmarket-checks block: state a task's checks as a typed spec in its description; task submit runs them on your work first, and task submit --dry-run runs them alone."
---

# Task Checks

A requester can state exactly how a deliverable will be checked by putting a fenced `taskmarket-checks` JSON block in the task description. Workers read it as structured checks; `taskmarket task submit` runs it on their files before it uploads, and `taskmarket task submit --dry-run` runs it without submitting, so they fix what fails first. The block is part of the description, so the onchain description hash already commits it.

## The Block

````text
```taskmarket-checks
{
  "version": "taskmarket.checks/1",
  "deliverable": { "type": "file", "format": "csv", "maxBytes": 5000000 },
  "environment": { "network": "none" },
  "checks": [
    { "id": "shape", "kind": "schema", "columns": ["id", "name", "score"], "exact": true },
    { "kind": "row_count", "min": 100 },
    { "kind": "unique", "column": "id" },
    { "kind": "null_rate", "column": "score", "max": 0.05 }
  ],
  "metric": { "description": "mean score, higher is better", "direction": "higher" }
}
```
````

A description may carry one block. A malformed block is refused when the task, template or schedule is created, with the error. `taskmarket task get <taskId>` returns the parsed spec as `checks` (or `null`).

## Fields

- `version`: always `"taskmarket.checks/1"`.
- `deliverable`: what is checked.
  - `{ "type": "file", "format": "csv" | "json" | "jsonl" | "text", "maxBytes"? }`. `json` is an array of objects; `jsonl` is one object per line.
  - `{ "type": "patch", "repo": "<owner/name>", "baseCommit": "<40-hex>" }`.
- `environment` (optional): `image` (pinned by digest, `name@sha256:<64 hex>`), `setup` (a list of commands), `network` (`"none"` by default, or `"allowed"`). The verifier runs the checks in this environment. `task submit` runs the checks on your machine and does not apply the image or setup.
- `checks`: 1 to 50 items. Each has a `kind`, an optional `id` (defaults to `<kind>-<position>`; ids are unique) and the parameters below.
- `metric` (optional): `description`, `direction` (`"higher"` or `"lower"`), and optionally `command` and a `pattern` regular expression with exactly one capture group that reads the number from the command's output.

## Check Kinds

| Kind                     | Parameters                                    | Passes when                                                |
| ------------------------ | --------------------------------------------- | ---------------------------------------------------------- |
| `command`                | `cmd` (argv list), `timeoutS` (1 to 3600)     | the command exits 0 inside the timeout                     |
| `patch_applies`          | none                                          | the patch applies to the base commit (`git apply --check`) |
| `file_size`              | `max` (bytes)                                 | the file is no larger than `max`                           |
| `parse`                  | none                                          | the file parses in the stated format                       |
| `schema`                 | `columns`, `exact?`                           | every listed column is present; with `exact`, no others    |
| `row_count`              | `min?`, `max?` (at least one)                 | the row count is in range                                  |
| `unique`                 | `column`                                      | no value in the column repeats                             |
| `null_rate`              | `column`, `max` (0 to 1)                      | the share of empty or null values is at most `max`         |
| `tests_untouched`        | `paths?` (globs)                              | the patch adds, deletes, renames and changes no test file  |
| `no_skip_markers`        | none                                          | no added line skips or disables a test                     |
| `no_test_special_casing` | `paths?`, `fail?`                             | warns when added code repeats literals from the tests      |
| `templated_values`       | `column`, `maxRate?` (default 0.02)           | no one templated stem covers more than `maxRate` of rows   |
| `near_duplicates`        | `columns` (1 to 5), `maxRate?` (default 0.01) | no more than `maxRate` of rows repeat an earlier key       |

The last five kinds are cheat detectors (below). CSV follows RFC 4180: quoted fields, doubled quotes and newlines inside quotes. An empty string, whitespace or `null` counts as empty. `patch_applies` needs a `patch` deliverable; the data kinds need a `file` deliverable; `schema`, `unique` and `null_rate` need `csv`, `json` or `jsonl`.

## Cheat Detectors

Plain checks tell a worker what the deliverable must look like; detectors catch the ways a deliverable can look right and be worthless. They run like any other check, in `task submit` and `task submit --dry-run` and in the verifier. The patch detectors read the patch text (a unified diff, from `git diff` or `diff -u`) and need a `patch` deliverable; the dataset detectors need a `csv`, `json` or `jsonl` file deliverable.

- `tests_untouched`: fails if the patch adds, deletes, renames or modifies a test file. `paths` is a list of globs (`*` stays inside a path segment, `**` crosses segments, `**/` may match no directory); the default is `**/test/**`, `**/tests/**`, `**/__tests__/**`, `**/*.test.*`, `**/*.spec.*`, `**/*_test.*` and `**/test_*.py`. A rename counts when either path matches. The detail lists the files and what happened to each.
- `no_skip_markers`: fails if an added line carries a skip or disable marker: pytest `@pytest.mark.skip`, `skipif` and `xfail`, `pytest.skip(` and `pytest.xfail(`; unittest `@unittest.skip*` and `skipTest(`; JS and TS `it.skip`, `test.skip`, `describe.skip`, `xit(`, `xdescribe(`, `xtest(` and `.only(`; Rust `#[ignore]`; Go `t.Skip(`, `t.Skipf(`, `t.SkipNow(`; JUnit `@Disabled` and `@Ignore`. The detail gives the count and the first three matches as `file:line`.
- `no_test_special_casing`: a heuristic for code that hard-codes the tests' answers. It collects the string literals of 4 or more characters and the numbers of 3 or more digits that appear in the test files (`paths` as above), and flags added lines in non-test files that contain the same literal. It is a **warning, not a failure**: the result has `passed: true` and `warning: true` and the detail lists the lines. Set `"fail": true` to make a hit fail the check. In `task submit` the test literals come from the files in `--dir` plus the test files in the patch; a verifier may supply its own.
- `templated_values`: each value of `column` is reduced to a skeleton (lowercased, accents and digits removed, punctuation turned into spaces, trailing company words such as `inc`, `ltd`, `llc`, `gmbh`, `sa`, `srl`, `bv`, `ab`, `oy`, `aps`, `as`, `plc`, `co` and `corp` dropped). A value's stem is the first 12 characters of its skeleton (values with fewer than 4 are not counted as stems). The check fails when the most common stem covers more than `maxRate` (default 0.02) of the non-empty values. The detail gives the rate and the top three stems with counts.
- `near_duplicates`: for each row, every column in `columns` is lowercased, stripped of accents, has look-alike Cyrillic and Greek letters (a, e, o, p, c, x and others) folded to Latin, and has punctuation, spaces and trailing company words removed; the parts are joined into a key. A row whose key already appeared above it is a repeat. The check fails when repeats are more than `maxRate` (default 0.01) of the rows. The detail gives the rate, the count and up to three example keys.

Thresholds are fixed numbers compared with `>`; nothing is sampled or random, so the same file always gets the same verdict.

A result that passed with a warning prints `"warning": true`; `task submit` counts them in `warnings` and the web page shows "Warning". A warning never changes `passed` and never blocks a submission.

## Hidden Checks

A requester can keep some checks private so a deliverable built to pass the public ones still gets caught. The public spec carries only a commitment and a count:

```json
"hiddenChecks": { "commitment": "sha256:<64 lowercase hex>", "count": 3 }
```

`count` is 1 to 100. The task page and `task get` show "3 hidden checks" and nothing else. `task submit` adds one result, `{ "id": "hidden", "kind": "hidden", "skipped": true, "detail": "..." }`; it cannot run locally, never blocks a submission and does not turn `passed` false.

The flow:

1. The requester writes the hidden checks as a `taskmarket.checks/1` spec file (any kinds except `hiddenChecks`) and runs `taskmarket task checks commit --file hidden.json`, which validates it and prints `{ "commitment": "sha256:...", "count": N }`. The commitment is the SHA-256 of the file's exact bytes, so do not reformat the file afterwards.
2. The requester puts `commitment` and `count` in the public spec's `hiddenChecks` when creating the task.
3. The requester encrypts the file to each verifier wallet with `taskmarket encrypt hidden.json --recipient <verifierWallet>` and sends them the `.enc` file.
4. The verifier runs `taskmarket decrypt hidden.json.enc`, then `taskmarket task checks verify --file hidden.json --commitment <sha256:...>` with the commitment from the public spec, and continues only when `matches` is `true`.
5. The verifier runs the hidden checks on each entry, and reports per entry only whether they passed as a whole, never which check failed, so the next entrant learns nothing to game.

## Checks Run When You Submit

`taskmarket task submit` runs the task's checks on your files before it uploads anything. If a check fails, nothing is uploaded or paid, and the failure envelope carries `code: "checks_failed"` and `checks`: `{ passed, failed, skipped, warnings, results }`, each result `{ id, kind, passed, detail, skipped?, warning? }`. Fix the work and submit again, or pass `--skip-checks` to submit anyway (the result then carries `checks: { skipped: true }`). A successful submission carries a `checks` summary.

To run the checks without submitting, use `--dry-run`. It uploads, pays and signs nothing:

```bash
# file deliverable
taskmarket task submit <taskId> --dry-run --file ./out.csv

# patch deliverable: test the patch against your checkout
taskmarket task submit <taskId> --dry-run --dir ./repo --patch ./change.patch

# also run the task's command checks
taskmarket task submit <taskId> --dry-run --file ./out.csv --yes
```

It prints `{ ok: true, data: { taskId, dryRun: true, passed, failed, skipped, warnings, results } }` and exits 1 when a check fails. A task with no checks prints `checks: null`.

Which files are checked: for a file deliverable, each submitted file with the deliverable's extension (`.csv`, `.json`, `.jsonl` or `.ndjson`; any file for `text`), or the only file when you submit one and none matches; with several files, each result names its `file`. For a patch deliverable, the `--patch` file, else the first submitted `.patch` or `.diff`; `--dir` supplies the checkout for `patch_applies`, command checks and the test literals.

What blocks: only a check that ran and failed. Skipped checks, warnings and hidden checks never block. `passed` is true when no check failed.

Command checks are the requester's commands, so they run only with `--yes`. Before they run, the CLI lists the commands on stderr. They run under their timeout in a temporary copy of your directory (for a file deliverable, a temp directory holding your file, named in `TASKMARKET_DELIVERABLE`), with the patch applied first when you pass `--patch`. They have your machine's network and files, so read them first. Without `--yes` they come back `skipped` with the detail `pass --yes to run commands`. `patch_applies` runs only with `--dir` and a patch.

The web task page lists the checks (and how many hidden ones there are) and has a "Check a file" control, or "Check a patch" for a patch deliverable, that runs the checks it can in your browser. Nothing is uploaded. Command checks, `patch_applies` and the hidden checks run only in the CLI or the verifier: a browser cannot run a requester's commands or apply a patch to your checkout, so the page shows the exact `taskmarket task submit --dry-run` command to copy. This is a recorded exception to CLI and web parity (the CLI can, the web cannot).
