---
description: Create, test, and deploy a production Lucid Agent
argument-hint: [agent-description] [--name=NAME] [--deploy]
allowed-tools: Skill, Bash, Read, Write, Edit, AskUserQuestion
---

Load the paid-agent skill and execute the full agent creation pipeline.

**User request:** $ARGUMENTS

If agent description not provided, ask for it. Suggest kebab-case name based on description. Ask about deployment preference before starting.
