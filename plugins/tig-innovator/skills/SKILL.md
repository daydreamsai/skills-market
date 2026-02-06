---
name: tig-innovator
description: |
  AI-powered algorithm optimization agent for The Innovation Game protocol. Earns
  cryptocurrency by optimizing Rust algorithms. Use when optimizing TIG challenge
  algorithms or submitting solutions to the TIG network.
allowed-tools: [Bash, Read, Write]
---

# TIG Innovator Skill

Autonomous algorithm optimization agent for The Innovation Game (TIG) protocol. This skill enables AI agents to earn cryptocurrency by optimizing algorithms and submitting improvements to TIG's decentralized marketplace.

## Overview

TIG is a protocol that incentivizes algorithmic innovation. Innovators submit algorithm optimizations that compete for adoption by benchmarkers. If your algorithm is adopted by 25%+ of benchmarkers, you earn a share of block rewards.

**How this skill makes money:**
1. Download existing TIG algorithms (free)
2. Analyze code with LLM → suggest Rust optimizations
3. Test locally to verify improvement (free)
4. Submit only when competitive (costs 10 TIG ≈ $1)
5. Earn recurring rewards if adopted

## Ecosystem Integration

This skill can be wrapped as a paid Lucid Agent service -- offering algorithm optimization-as-a-service via x402 micropayments. Use `lucid-agents-sdk` to expose TIG optimization as paid entrypoints (e.g., `analyze`, `optimize`, `benchmark`).

## Quick Start

```bash
# 1. Set up environment
export ANTHROPIC_API_KEY="your-key"
export TIG_NETWORK="testnet"  # Start with testnet

# 2. List algorithms for a challenge
tig-innovator list vector_search

# 3. Analyze an algorithm for optimization opportunities
tig-innovator analyze <algorithm-id>

# 4. Generate optimized version
tig-innovator optimize <algorithm-id>

# 5. Test the optimization locally
tig-innovator test <algorithm-id> --optimized ./optimized.rs

# 6. Submit if improvement is significant (>5%)
tig-innovator submit <algorithm-id> --code ./optimized.rs
```

## Commands

### `tig-innovator list <challenge>`

Lists all algorithms for a challenge with performance metrics.

**Arguments:**
- `challenge`: One of `satisfiability`, `vehicle_routing`, `knapsack`, `vector_search`, `hypergraph`, `neural_network`

**Options:**
- `--network <mainnet|testnet>`: Network to query (default: mainnet)
- `--limit <n>`: Max algorithms to show (default: 20)
- `--sort <adoption|score>`: Sort order (default: adoption)

**Example:**
```bash
tig-innovator list vector_search --limit 10 --sort adoption
```

### `tig-innovator analyze <algorithm-id>`

Downloads and analyzes an algorithm's source code for optimization opportunities.

**Arguments:**
- `algorithm-id`: The algorithm ID from the list command

**Options:**
- `--detailed`: Show detailed analysis with code snippets

**Output:**
- Optimization opportunities ranked by impact
- Specific code locations
- Suggested improvements
- Confidence scores

**Example:**
```bash
tig-innovator analyze c003_a042_0001
```

### `tig-innovator optimize <algorithm-id>`

Generates an optimized version of the algorithm using LLM analysis.

**Arguments:**
- `algorithm-id`: The algorithm ID to optimize

**Options:**
- `--output <path>`: Output path for optimized code (default: ./optimized_<id>.rs)
- `--iterations <n>`: Number of optimization iterations (default: 3)
- `--focus <type>`: Focus on specific optimization type: `loop`, `memory`, `simd`, `cache`, `all`

**Example:**
```bash
tig-innovator optimize c003_a042_0001 --output ./my_optimization.rs --iterations 5
```

### `tig-innovator test <algorithm-id>`

Runs local benchmarks comparing original vs optimized algorithm.

**Arguments:**
- `algorithm-id`: The baseline algorithm ID

**Options:**
- `--optimized <path>`: Path to optimized code file
- `--samples <n>`: Number of test samples (default: 100)

**Requirements:**
- Docker must be running (uses TIG dev containers)

**Example:**
```bash
tig-innovator test c003_a042_0001 --optimized ./my_optimization.rs
```

### `tig-innovator submit <algorithm-id>`

Submits optimized algorithm to TIG network.

**Arguments:**
- `algorithm-id`: Reference to the algorithm being improved

**Options:**
- `--code <path>`: Path to optimized code file
- `--network <mainnet|testnet>`: Target network (default: from env)
- `--dry-run`: Validate without submitting

**Requirements (mainnet only):**
- `TIG_WALLET_ADDRESS` environment variable
- `TIG_PRIVATE_KEY` environment variable
- Sufficient TIG balance (10 TIG per submission)

**Example:**
```bash
# Testnet (free)
tig-innovator submit c003_a042_0001 --code ./optimized.rs --network testnet

# Mainnet (costs 10 TIG)
tig-innovator submit c003_a042_0001 --code ./optimized.rs --network mainnet
```

### `tig-innovator status`

Shows status of your submissions and earnings.

**Options:**
- `--network <mainnet|testnet>`: Network to query

## Workflow Recommendations

### For Best Results

1. **Start with vector_search or neural_network** - These challenges have the most opportunity for micro-optimizations that LLMs excel at (loop unrolling, SIMD, cache optimization).

2. **Always test before submitting** - The `test` command runs real benchmarks. Only submit if you see >5% improvement.

3. **Use testnet first** - Validate your workflow on testnet before spending TIG on mainnet.

4. **Focus on adopted algorithms** - Algorithms with high adoption have proven benchmarker interest. Improving them increases your chances of adoption.

5. **Iterate multiple times** - Run `optimize` with `--iterations 5` or more. Each pass finds new opportunities.

### Optimization Types

| Type | Description | Best For |
|------|-------------|----------|
| `loop` | Loop unrolling, vectorization | All challenges |
| `memory` | Memory access patterns, allocation | Large data sets |
| `simd` | SIMD intrinsics | Numeric computation |
| `cache` | Cache-friendly data layout | Matrix operations |
| `branch` | Branch prediction hints | Conditional logic |

### Example Full Workflow

```bash
# 1. Find a good target
tig-innovator list vector_search --sort adoption --limit 5

# 2. Analyze top algorithm
tig-innovator analyze c003_a042_0001 --detailed

# 3. Generate optimization (multiple iterations)
tig-innovator optimize c003_a042_0001 \
  --output ./vs_optimized.rs \
  --iterations 5 \
  --focus all

# 4. Test locally
tig-innovator test c003_a042_0001 --optimized ./vs_optimized.rs

# Output shows:
# Baseline score: 1000
# Optimized score: 1120
# Improvement: +12%
# Recommendation: SUBMIT ✓

# 5. Submit to testnet first
tig-innovator submit c003_a042_0001 \
  --code ./vs_optimized.rs \
  --network testnet

# 6. If testnet succeeds, submit to mainnet
tig-innovator submit c003_a042_0001 \
  --code ./vs_optimized.rs \
  --network mainnet

# 7. Monitor adoption
tig-innovator status --network mainnet
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | API key for Claude (code analysis) |
| `TIG_NETWORK` | No | Default network: `mainnet` or `testnet` |
| `TIG_WALLET_ADDRESS` | Mainnet | Your TIG wallet address |
| `TIG_PRIVATE_KEY` | Mainnet | Wallet private key for submissions |
| `TIG_API_URL` | No | Custom API URL (default: api.tig.foundation) |

## Challenges Reference

| Challenge | Description | Optimization Potential |
|-----------|-------------|----------------------|
| `vector_search` | Nearest neighbor search | HIGH - SIMD, cache |
| `neural_network` | NN training optimization | HIGH - Matrix ops |
| `knapsack` | Quadratic knapsack problem | MEDIUM - Loop opt |
| `satisfiability` | Boolean SAT solving | MEDIUM - Branch pred |
| `vehicle_routing` | VRPTW optimization | MEDIUM - Memory |
| `hypergraph` | Graph partitioning | LOW - Algorithm-heavy |

## Troubleshooting

### "Docker not found"
The `test` command requires Docker. Install Docker and ensure it's running.

### "Compilation failed"
The optimized code must compile as valid Rust. Check:
- All imports are valid (no external crates allowed)
- Function signature matches `solve_challenge`
- Code is deterministic

### "Score lower than baseline"
Not all optimizations improve performance. Try:
- Different `--focus` types
- More `--iterations`
- Different algorithm as baseline

### "Insufficient TIG balance"
Mainnet submissions require 10 TIG. Get TIG from:
- Exchanges (if listed)
- TIG faucet (testnet only)
- Delegation rewards

## Architecture

```
tig-innovator/
├── src/
│   ├── cli.ts              # CLI entrypoint
│   ├── tig/
│   │   ├── api.ts          # TIG API client
│   │   ├── algorithms.ts   # Algorithm fetching
│   │   └── submission.ts   # Submission logic
│   ├── optimizer/
│   │   ├── analyzer.ts     # LLM code analysis
│   │   ├── generator.ts    # Optimization generation
│   │   └── validator.ts    # Code validation
│   └── benchmark/
│       ├── runner.ts       # Docker benchmark runner
│       └── comparator.ts   # Score comparison
└── docker/
    └── tig-dev.dockerfile  # TIG dev environment
```

## License

MIT - Built for the Daydreams AI ecosystem.
