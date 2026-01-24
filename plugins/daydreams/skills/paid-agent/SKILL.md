---
name: paid-agent
description: This skill should be used when the user asks to "create a paid agent", "build a lucid agent", "deploy an agent", "make a monetized agent", "publish agent to GitHub", "deploy to Railway", "agent development pipeline", or wants end-to-end agent creation with testing and deployment.
allowed-tools: Skill, Bash, Read, Write, AskUserQuestion
requires:
  - ralph-wiggum:ralph-loop
  - feature-dev:code-reviewer
  - commit
  - railway
---

# Paid Agent Pipeline

End-to-end pipeline for creating, testing, and deploying production-ready Lucid Agents.

## Pipeline Overview

1. **Gather Requirements** - Agent description, name, deployment preference
2. **Development Loop** - Ralph Wiggum builds the agent (50 iterations max)
3. **Code Review** - Quality and security analysis
4. **Test Refinement** - Second Ralph loop fixes tests only (30 iterations max)
5. **Git Publishing** - Create GitHub repository and push
6. **Deployment** - Optional Railway deployment

## Execution Steps

### Step 1: Gather Requirements

Collect or ask for:
- **Agent description**: What the agent does
- **Agent name**: Repository name (kebab-case)
- **Deployment**: Immediate or later?

```
AskUserQuestion:
- "What should the agent do?"
- "What should we name it?"
- "Deploy to Railway immediately?"
```

### Step 2: Development Loop

Build the agent with Ralph Wiggum:

```
Skill("ralph-wiggum:ralph-loop", args: "make a lucid agent that {DESCRIPTION} --max-iterations 50 --completion-promise \"agent implemented\"")
```

Wait for completion before proceeding.

### Step 3: Code Review

Review implementation quality:

```
Skill("feature-dev:code-reviewer")
```

### Step 4: Test Refinement

Fix failing tests with second Ralph loop (no new features):

```
Skill("ralph-wiggum:ralph-loop", args: "fix any failing tests - do not add features, only fix tests --max-iterations 30 --completion-promise \"tests pass\"")
```

Wait for completion before proceeding.

### Step 5: Git Publishing

Initialize and push to GitHub:

```bash
cd {project-directory}
git init
git add -A
```

Commit using the commit skill:
```
Skill("commit")
```

Create GitHub repository:
```bash
gh repo create {repo-name} --public --source=. --remote=origin --push --description "{Agent description}"
```

### Step 6: Deploy (Optional)

If user requested deployment:

```
Skill("railway", args: "deploy {project-directory}")
```

### Step 7: Summary

Provide:
- GitHub repository URL
- Railway deployment URL (if deployed)
- Quick start commands
- Next steps (configure payments, add custom logic)

## Critical Notes

- **Two-phase Ralph approach**: First loop builds features, second fixes tests only
- **Code review between loops**: Catches issues before test fixing phase
- **No feature creep**: Second loop is strictly constrained to test fixes
- **/commit skill**: Removes Claude attribution, generates reasoning.md
- **GitHub repos**: Created as public by default

## Error Handling

| Error | Resolution |
|-------|------------|
| Ralph fails to complete | Check iteration limit, review test failures |
| GitHub push fails | Verify `gh auth status`, check repo name uniqueness |
| Railway deployment fails | Check `railway whoami`, verify env vars |

## Additional Resources

### Reference Files

For detailed pipeline documentation:
- **`references/pipeline.md`** - Complete stage details, error recovery, example invocations, and output artifacts
