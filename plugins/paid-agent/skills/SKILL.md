---
name: paid-agent
description: |
  Build and deploy a production-ready paid Lucid Agent from user requirements.
  Scaffolds with CLI, implements entrypoints, reviews code, tests, publishes to GitHub, and deploys to Railway.
  Use when: "create a paid agent for X", "build and deploy an agent", "make a monetized agent".
  Not for: automated topic discovery (agent-factory) or platform-hosted JS handlers (lucid-agent-creator).
allowed-tools: [Skill, Bash, Read, Write, Edit, AskUserQuestion]
---

# Paid Agent Pipeline

## Step 1: Gather Requirements

Ask the user for:
- **What the agent does**
- **Agent name** (kebab-case)
- **Endpoints** — which are free vs paid, and pricing
- **Deploy now?**

## Step 2: Scaffold

```bash
bunx @lucid-agents/cli {agent-name} --adapter=hono --non-interactive
cd {agent-name}
bun install
```

## Step 3: Implement Entrypoints

Edit `src/index.ts` to add entrypoints. Use `lucid-agents-sdk` skill for API patterns.

At least 1 free + N paid endpoints. All must return real data.

## Step 4: Test

```bash
bun test
bun run dev
curl -X POST http://localhost:3000/entrypoints/{key}/invoke \
  -H 'Content-Type: application/json' -d '{"input": { ... }}'
```

## Step 5: Code Review

```bash
Skill("feature-dev:code-reviewer")
```

Fix issues, re-run tests.

## Step 6: Push to GitHub

```bash
git init
git add src/ package.json tsconfig.json .gitignore README.md
Skill("commit")
gh repo create {agent-name} --public --source=. --remote=origin --push --description "{description}"
```

## Step 7: Deploy (Optional)

```bash
Skill("railway-deploy")
```

## Step 8: Summary

Report to user: GitHub URL, Railway URL (if deployed), endpoint table with prices, `curl` examples.
