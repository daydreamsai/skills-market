# Token Tables — Per-Phase Scoring

## Contents

- [READ Phase (input tokens only)](#read-phase-input-tokens-only)
- [PLAN Phase (input + output)](#plan-phase-input--output)
- [EXECUTE Phase (input + output)](#execute-phase-input--output)
- [Code Tasks](#code-tasks)
- [Content / Docs Tasks](#content--docs-tasks)
- [Tool Call Overhead](#tool-call-overhead)
- [VERIFY Phase (input + output)](#verify-phase-input--output)
- [Iteration / Retry Budget](#iteration--retry-budget)

Use these tables to score each phase of a task. Look up the closest match, interpolate for in-between cases.

---

## READ Phase (input tokens only)

What gets read: task description, existing repo files, API docs, SDK source, existing tests.

| Scenario | Input tokens |
|----------|-------------|
| Short task description only (<500 words) | 2,000 |
| Long task description + spec doc | 5,000 |
| Task + small existing codebase (< 5 files) | 10,000 |
| Task + medium codebase (5–20 files) | 25,000 |
| Task + large codebase (20+ files) | 50,000–80,000 |
| Task + SDK source reading (@lucid-agents) | 20,000–40,000 |
| Task + API docs (external service) | 10,000–20,000 |
| Task + multiple repos / monorepo | 60,000–120,000 |

**Typical `api-agent` read:** 30,000–50,000 tokens (task + Lucid SDK source + Railway docs)
**Typical `pr-code` read:** 40,000–80,000 tokens (task + repo files + related code)
**Typical `pr-docs` read:** 5,000–15,000 tokens (task + reference material)

---

## PLAN Phase (input + output)

Reasoning about approach, architecture, what to build. Often happens in scratchpad / extended thinking.

| Complexity | Input | Output |
|-----------|-------|--------|
| Trivial (clear spec, no decisions) | 5,000 | 1,000 |
| Low (minor decisions, clear path) | 8,000 | 3,000 |
| Medium (multiple approaches, tradeoffs) | 15,000 | 8,000 |
| High (architecture design, novel integration) | 25,000 | 15,000 |
| Very High (system design, multi-component) | 40,000 | 25,000 |

**Typical `api-agent` plan:** Medium → 23,000 tokens
**Typical `pr-code` plan:** Medium–High → 30,000–40,000 tokens
**Typical `blueprint` plan:** High → 40,000 tokens (plan IS the output)

---

## EXECUTE Phase (input + output)

Writing code, content, configs. The heavy lifting. Output tokens dominate here.

### Code Tasks

| Deliverable | Input | Output |
|------------|-------|--------|
| Single file < 100 LOC | 10,000 | 5,000 |
| Single file 100–300 LOC | 15,000 | 15,000 |
| Single file 300–600 LOC | 20,000 | 30,000 |
| Package (3–6 files, 200–500 LOC total) | 30,000 | 40,000 |
| Package (6–15 files, 500–1500 LOC total) | 50,000 | 80,000 |
| Package (15+ files, 1500+ LOC) | 80,000 | 120,000 |
| Full Lucid Agent (src + tests + config) | 50,000 | 70,000 |
| Full Lucid Agent with complex business logic | 70,000 | 100,000 |
| PR touching 5–10 existing files | 40,000 | 30,000 |
| PR touching 10–30 existing files | 70,000 | 60,000 |
| CI pipeline (yml + scripts) | 20,000 | 25,000 |

### Content / Docs Tasks

| Deliverable | Input | Output |
|------------|-------|--------|
| README update | 5,000 | 3,000 |
| Full README from scratch | 8,000 | 8,000 |
| Tutorial (1,000–2,000 words) | 10,000 | 15,000 |
| Tutorial (3,000+ words, multi-step) | 15,000 | 25,000 |
| Technical writeup | 10,000 | 20,000 |
| SEO article (1,500 words) | 8,000 | 12,000 |
| API documentation (full package) | 20,000 | 30,000 |

### Tool Call Overhead

Each file read/write/exec in the execute loop costs tokens. Add:

| Tool calls (approx) | Overhead |
|--------------------|---------|
| 10–20 tool calls | +10,000 |
| 20–50 tool calls | +25,000 |
| 50–100 tool calls | +50,000 |
| 100+ tool calls | +80,000 |

A typical Lucid Agent build has ~40–60 tool calls.

---

## VERIFY Phase (input + output)

Running tests, checking deployment, reviewing output, fixing issues, formatting submission.

| Scenario | Input | Output |
|---------|-------|--------|
| No tests required | 2,000 | 1,000 |
| Run existing tests, fix failures | 10,000 | 8,000 |
| Write + run tests (10–15 tests) | 20,000 | 15,000 |
| Write + run tests (20–30 tests) | 35,000 | 25,000 |
| Write + run tests (30+ tests) | 50,000 | 35,000 |
| Deploy to Railway + verify health | +8,000 | +3,000 |
| Open GitHub PR + verify CI | +10,000 | +5,000 |
| Write submission file | +3,000 | +2,000 |
| Debug failed tests / retry loop | +20,000 | +10,000 |

---

## Iteration / Retry Budget

Real agents don't get it right first try. Add a retry budget:

| Risk level | Extra tokens |
|-----------|-------------|
| Low (clear spec, familiar stack) | +15% |
| Medium (some unknowns, API integration) | +25% |
| High (novel stack, complex logic, TDD) | +40% |

Apply to total before final cost calculation.
