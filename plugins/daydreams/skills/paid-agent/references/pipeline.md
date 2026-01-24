# Paid Agent Pipeline - Detailed Reference

Complete pipeline documentation for creating, testing, and deploying Lucid Agents.

## Pipeline Architecture

```
User Request
    ↓
┌─────────────────────────────────────┐
│ Stage 1: Requirements Gathering     │
│ - Agent description                 │
│ - Repository name                   │
│ - Deployment preference             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Stage 2: Initial Development        │
│ ralph-wiggum:ralph-loop #1          │
│ - Build agent features              │
│ - Write comprehensive tests         │
│ - 50 max iterations                 │
│ - Promise: "agent implemented"      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Stage 3: Code Review                │
│ feature-dev:code-reviewer           │
│ - Code quality analysis             │
│ - Security vulnerabilities          │
│ - Logic errors and bugs             │
│ - Test coverage review              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Stage 4: Test Refinement            │
│ ralph-wiggum:ralph-loop #2          │
│ - Fix failing tests ONLY            │
│ - NO new features                   │
│ - 30 max iterations                 │
│ - Promise: "tests pass"             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Stage 5: Git Publishing             │
│ - git init && git add -A            │
│ - /commit skill                     │
│ - gh repo create --public           │
│ - git push                          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Stage 6: Deployment (Optional)      │
│ railway skill                       │
│ - Configure environment             │
│ - Deploy to Railway                 │
│ - Provide deployment URL            │
└─────────────────────────────────────┘
    ↓
Summary with URLs and Next Steps
```

## Stage Details

### Stage 1: Requirements Gathering

Collect from user:
- **Agent description**: What the agent should do
- **Agent name**: Repository/project name (kebab-case)
- **Deployment**: Deploy immediately or later?

Use AskUserQuestion if not provided:
```
Questions:
- "What should the agent do?"
- "What should we name it?" (suggest based on description)
- "Should it be deployed immediately?" (yes/no)
```

### Stage 2: Initial Development (Ralph Loop #1)

Launch ralph-wiggum with:
```
Skill("ralph-wiggum:ralph-loop", args: "make a lucid agent that {DESCRIPTION} --max-iterations 50 --completion-promise \"agent implemented\"")
```

This loop:
- Iteratively builds the agent
- Implements all required features
- Writes comprehensive tests
- Continues until agent is fully implemented
- May take multiple iterations

**Wait for completion before proceeding.**

### Stage 3: Code Review

Launch code reviewer:
```
Skill("feature-dev:code-reviewer")
```

Reviews for:
- Code quality and adherence to best practices
- Security vulnerabilities
- Logic errors and bugs
- Test coverage and quality

### Stage 4: Test Refinement (Ralph Loop #2)

Launch second ralph-wiggum focused on test fixes:
```
Skill("ralph-wiggum:ralph-loop", args: "fix any failing tests - do not add features, only fix tests --max-iterations 30 --completion-promise \"tests pass\"")
```

Critical constraints:
- Fix test failures ONLY
- NO new features or functionality
- Maximum 30 iterations

**Wait for completion before proceeding.**

### Stage 5: Git Publishing

Execute git operations:
```bash
cd {project-directory}
git init
git add -A
```

Use commit skill:
```
Skill("commit")
```

The /commit skill:
- Creates commit without Claude attribution
- Generates reasoning.md for session
- Uses proper commit message format

Create and push to GitHub:
```bash
gh repo create {repo-name} --public --source=. --remote=origin --push --description "{Agent description}"
```

### Stage 6: Deployment (Optional)

If user requested deployment:
```
Skill("railway", args: "deploy {project-directory}")
```

Otherwise, provide manual deployment instructions.

## Error Recovery

### Ralph Wiggum Fails to Complete
- Check iteration limit (may need increase)
- Review test failures in output
- Adjust prompt or requirements
- Retry with modified parameters

### GitHub Push Fails
- Check `gh` CLI authentication: `gh auth status`
- Verify repo name is unique
- Check network connectivity
- Try manual push

### Railway Deployment Fails
- Check Railway CLI authentication: `railway whoami`
- Verify project configuration
- Check required environment variables
- Review Railway logs

## Two-Phase Ralph Approach

### Why Two Loops?

**Loop 1 (Build):**
- Focus: Feature implementation
- Promise: "agent implemented"
- Freedom to add code, tests, features
- Max iterations: 50

**Loop 2 (Fix):**
- Focus: Test fixes only
- Promise: "tests pass"
- Constrained to test changes
- Max iterations: 30

### Benefits
- Separates concerns (building vs. fixing)
- Prevents feature creep during test fixing
- Code review between loops catches issues
- More predictable completion

## Required Dependencies

### Skills
- `ralph-wiggum:ralph-loop` - Iterative development
- `feature-dev:code-reviewer` - Code quality review
- `commit` - Git operations

### Tools
- `gh` CLI - GitHub operations
- `git` - Version control
- `railway` CLI (optional) - Deployment

### Optional
- `railway` skill - Deployment automation

## Example Invocations

### Simple Agent
```
User: "Create a paid agent that echoes messages"
→ Name suggestion: "echo-agent"
→ Simple implementation
→ Quick review
→ Deploy to Railway
```

### Complex Agent
```
User: "Create a paid agent that analyzes GitHub PRs for security issues"
→ Name: "pr-security-agent"
→ Multiple entrypoints
→ GitHub API integration
→ Comprehensive test suite
→ Detailed code review
```

## Output Artifacts

### After Completion
- GitHub repository URL
- Railway deployment URL (if deployed)
- Quick start commands:
  ```bash
  git clone {repo-url}
  cd {repo-name}
  bun install
  bun run dev
  ```

### Next Steps for User
- Configure payment address
- Add custom logic
- Set up CI/CD
- Add monitoring
