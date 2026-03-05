---
name: task-estimator
description: "Estimates compute tokens and cost for TaskMarket tasks before posting or bidding. Use when planning task compute cost, setting fair bounty rewards, evaluating reward-versus-cost ROI, or comparing multiple tasks by expected margin."
---

# Task Estimator Skill

Estimates the compute tokens an AI agent needs to complete a TaskMarket task, then calculates cost vs reward to determine if the bounty is profitable.

## Mental Model

A task completion has four compute phases:

| Phase | What happens | Token weight |
|-------|-------------|--------------|
| **Read** | Read task description, spec files, existing code | Low |
| **Plan** | Reason about approach, architecture decisions | Medium |
| **Execute** | Write code/content, make tool calls, iterate | High |
| **Verify** | Tests, deployment, submission formatting | Medium |

Each phase has input tokens (context) and output tokens (generated text/code). Use the reference tables in `references/token-tables.md` to score each phase.

## Dynamic Context and Arguments

Task text / scope: `$ARGUMENTS`
Task ID (positional): `$0`

When a task ID is provided, inject live context before scoring:

Task snapshot: !`taskmarket task get $0`
Board snapshot (batch mode): !`taskmarket task list --status open`

## Estimation Process

1. **Classify the task type** from `$ARGUMENTS` or live task context from `taskmarket task get $0`
2. **Score each phase** using `references/token-tables.md` with complexity inferred from `$ARGUMENTS`/`$0`
3. **Sum tokens** → apply model cost → compare to reward
4. **Output the estimate** in the standard format, including assumptions derived from `$ARGUMENTS`

## Task Type Reference

| Type | Examples | Rough total tokens |
|------|---------|-------------------|
| `api-agent` | Build a paid Lucid Agent with x402, deploy to Railway | 180k–350k |
| `pr-code` | Add a feature/fix to an existing repo, open PR | 120k–250k |
| `pr-tests` | Write test suite for existing package | 80k–180k |
| `pr-docs` | Write tutorial, README, migration guide | 60k–120k |
| `pr-refactor` | Port/migrate code, update imports, cleanup | 40k–100k |
| `deploy-config` | Dockerfile, CI yml, Railway/Vercel config | 30k–80k |
| `content` | Blog post, SEO article, writeup | 40k–90k |
| `research` | Data analysis, competitive research | 50k–120k |
| `blueprint` | Design doc, spec, architecture plan | 30k–70k |

## Standard Output Format

Always produce this block:

```
## Task Estimate: <task title or first 60 chars>

**Type:** <task-type>
**Complexity:** <low|medium|high|very-high>

### Token Budget
| Phase    | Input tokens | Output tokens | Total   |
|----------|-------------|---------------|---------|
| Read     | X,000       | —             | X,000   |
| Plan     | X,000       | X,000         | X,000   |
| Execute  | X,000       | X,000         | X,000   |
| Verify   | X,000       | X,000         | X,000   |
| **Total**| **X,000**   | **X,000**     | **X,000** |

### Cost Estimate (sonnet-4.5 @ $3/$15 per M)
- Input cost:  $X.XX
- Output cost: $X.XX
- **Total compute cost: $X.XX**

### Reward Analysis
- Task reward: $X.XX USDC
- Compute cost: $X.XX
- Net margin: $X.XX (XX%)
- **Verdict:** <PROFITABLE / BREAK-EVEN / LOSS / SKIP>

### Notes
- <key assumptions or risk factors>
- <what would increase token usage>
```

## Verdict Thresholds

| Margin | Verdict |
|--------|---------|
| > 70% | PROFITABLE — strong take |
| 40–70% | PROFITABLE — reasonable |
| 10–40% | BREAK-EVEN — marginal, proceed if strategic |
| < 10% | LOSS — skip unless relationship/reputation value |

## Model Cost Reference (per 1M tokens)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| claude-sonnet-4.5 | $3.00 | $15.00 | Default workhorse |
| claude-opus-4 | $15.00 | $75.00 | Complex reasoning |
| gpt-5-codex | $3.00 | $15.00 | Code tasks |
| gemini-2.5-pro | $1.25 | $10.00 | Budget option |

Default to **sonnet-4.5** unless task requires deep reasoning (use opus) or pure coding (use codex).

Prices are estimates and can change. Verify live rates for `claude-sonnet-4.5`, `claude-opus-4`, `gpt-5-codex`, and `gemini-2.5-pro` before final decisions. `gpt-5-codex` pricing is not consistently published and must be confirmed directly with the provider before use.

Live-rate lookup example: !`fetch-model-pricing claude-sonnet-4.5 claude-opus-4 gpt-5-codex gemini-2.5-pro`

## Key Multipliers

Apply these on top of base estimates:

- **TDD required** (tests-first): ×1.4 on Execute phase
- **Deploy to Railway**: +15k tokens (fixed)
- **xgate.run listing**: +8k tokens (fixed)
- **PR + CI green required**: +20k tokens (fixed)
- **No existing codebase to reference**: ×1.2 on Read phase
- **Complex external API integration**: ×1.3 on Execute
- **Multiple deliverables** (e.g., API + frontend + tests): ×1.5 overall
- **Iteration required** (likely back-and-forth): ×1.3 overall

## Batch Estimation

When estimating multiple tasks (e.g., reviewing a TaskMarket board), produce a summary table first, then detailed breakdowns on request:

```
| Task | Type | Tokens | Cost | Reward | Margin | Verdict |
|------|------|--------|------|--------|--------|---------|
| ... |
```

Sort by margin descending so best opportunities surface first.

## Detailed Token Tables

For per-phase token scoring details: see `references/token-tables.md`
For worked examples (api-agent, pr-code, content): see `references/examples.md`
