---
name: paid-agent
description: This skill should be used when the user asks to "create a paid agent", "build a lucid agent", "deploy an agent", "make a monetized agent", "publish agent to GitHub", "deploy to Railway", "agent development pipeline", or wants end-to-end agent creation with testing and deployment.
allowed-tools: [Skill, Bash, Read, Write, AskUserQuestion]
requires:
  - ralph-wiggum:ralph-loop
  - feature-dev:code-reviewer
  - commit
  - railway
---

# Paid Agent Pipeline

Complete pipeline for creating, testing, and deploying production-ready Lucid Agents.

## When to Use

Activate this skill when the user wants to:
- "Create a paid agent for X"
- "Build and deploy a Lucid agent"
- "Make a new agent and publish it"
- "Build a monetized agent for X"

## What This Skill Does

Orchestrates a complete agent development pipeline:

1. **Development Loop** - Uses Ralph Wiggum to iteratively build the agent
2. **Code Review** - Reviews the implementation for quality and best practices
3. **Test Refinement Loop** - Second Ralph loop focused solely on making tests pass
4. **Git Publishing** - Creates a new GitHub repository and pushes the code
5. **Railway Deployment** - Deploys the agent to Railway for production hosting

## Instructions

### Step 1: Gather Requirements

Ask the user for:
- **Agent description**: What the agent should do
- **Agent name**: Repository/project name (kebab-case)
- **Additional requirements**: Any specific features or constraints

If not provided, use AskUserQuestion:

```
AskUserQuestion with:
- "What should the agent do?"
- "What should we name it?" (suggest based on description)
- "Should it be deployed immediately?" (yes/no)
```

### Step 2: Initial Development Loop

Launch the first ralph-wiggum loop to build the agent:
- The agent description as the prompt
- 50 max iterations
- Completion promise: "agent implemented"

```bash
Skill("ralph-wiggum:ralph-loop", args: "make a lucid agent that {DESCRIPTION} --max-iterations 50 --completion-promise \"agent implemented\"")
```

**Wait for completion** before proceeding. The loop will run until the agent is fully implemented.

### Step 3: Code Review

After the agent is built, review the implementation:

```bash
Skill("feature-dev:code-reviewer")
```

The reviewer will analyze:
- Code quality and adherence to best practices
- Security vulnerabilities
- Logic errors and bugs
- Test coverage and quality

### Step 4: Test Refinement Loop

Run a second ralph loop focused ONLY on making tests pass (no feature changes):

```bash
Skill("ralph-wiggum:ralph-loop", args: "fix any failing tests - do not add features, only fix tests --max-iterations 30 --completion-promise \"tests pass\"")
```

This loop should:
- Fix any test failures identified in the review
- Ensure all tests pass
- NOT add new features or functionality

**Wait for completion** before proceeding.

### Step 5: Push to GitHub

After tests pass, create and push to a new GitHub repo:

1. Initialize git and stage files:
```bash
cd {project-directory}
git init
git add -A
```

2. Commit using the /commit skill:
```bash
Skill("commit")
```

The /commit skill will:
- Create the commit without Claude attribution
- Generate reasoning.md for the session
- Use a proper commit message format

3. Create GitHub repo and push:
```bash
gh repo create {repo-name} --public --source=. --remote=origin --push --description "{Agent description}"
```

### Step 6: Deploy to Railway (Optional)

If the user wants immediate deployment, use the railway skill:

```bash
Skill("railway", args: "deploy {project-directory}")
```

Otherwise, provide instructions for manual deployment later.

### Step 7: Summary

Provide the user with:
- GitHub repository URL
- Railway deployment URL (if deployed)
- Quick start commands
- Next steps (e.g., configure payment address, add custom logic)

## Example Usage

```
User: "Create a paid agent that analyzes GitHub PRs for security issues"
Assistant response:
1. Ask for repo name: "What should we name the GitHub repo? (e.g., 'pr-security-agent')"
2. Run first ralph loop to build the agent:
   Skill("ralph-wiggum:ralph-loop", args: "make a lucid agent that analyzes GitHub PRs for security issues --max-iterations 50 --completion-promise \"agent implemented\"")
3. Review the code:
   Skill("feature-dev:code-reviewer")
4. Run second ralph loop to fix tests:
   Skill("ralph-wiggum:ralph-loop", args: "fix any failing tests - do not add features, only fix tests --max-iterations 30 --completion-promise \"tests pass\"")
5. After all tests pass:
   - Initialize git and stage files
   - Use Skill("commit") to commit with proper formatting
   - Push to GitHub with gh CLI
6. Ask: "Deploy to Railway now?"
7. Provide summary with links and next steps
```

## Pipeline Stages

### Stage 1: Initial Development (Ralph Wiggum #1)
- Iteratively builds the agent
- Implements all required features
- Writes comprehensive tests
- Continues until agent is fully implemented
- May take multiple iterations

### Stage 2: Code Review
- Analyzes implementation for bugs and issues
- Checks security vulnerabilities
- Reviews code quality and best practices
- Identifies test failures or gaps

### Stage 3: Test Refinement (Ralph Wiggum #2)
- Fixes failing tests identified in review
- NO new features or functionality added
- Only test fixes and refinements
- Continues until all tests pass
- Maximum 30 iterations

### Stage 4: Git Publishing
- Initializes git repository
- Stages all files with git add
- Uses /commit skill for proper commit formatting (removes Claude attribution, generates reasoning.md)
- Creates public GitHub repository
- Pushes code

### Stage 5: Deployment (Optional)
- Uses railway skill for deployment
- Configures environment variables
- Provides deployment URL

## Error Handling

If Ralph Wiggum fails to complete:
- Check the iteration limit
- Review test failures
- May need to adjust the prompt or requirements

If GitHub push fails:
- Check gh CLI authentication
- Verify repo name is unique
- Check network connectivity

If Railway deployment fails:
- Check railway CLI authentication
- Verify project configuration
- Check for required environment variables

## Notes

- Two-phase Ralph approach: first builds features, second fixes tests
- Code review happens between the two Ralph loops to identify issues
- First Ralph loop uses "agent implemented" completion promise
- Second Ralph loop uses "tests pass" completion promise and is limited to test fixes only
- The /commit skill removes Claude attribution and generates reasoning.md
- GitHub repo is created as public by default
- Railway deployment is optional based on user preference
- Each stage can be retried independently if needed

## Required Tools

- Ralph Wiggum skill (for agent development and test refinement)
- Code Reviewer skill (for quality analysis)
- /commit skill (for git operations)
- gh CLI (for GitHub operations)
- Railway skill/CLI (for deployment)
- Git (for version control)

## See Also

- `/ralph-wiggum:ralph-loop` - The iterative development loop
- `/feature-dev:code-reviewer` - Code quality and security review
- `/commit` - For git operations
- Railway skill - For deployment automation
