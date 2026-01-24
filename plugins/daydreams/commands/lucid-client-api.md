---
description: Interact with the Lucid Client API (multi-agent runtime)
argument-hint: [operation] [--agent-id=ID] [--endpoint=URL]
allowed-tools: Skill, Bash, Read, Write, WebFetch
---

Load the lucid-client-api skill and execute the requested API operation.

**User request:** $ARGUMENTS

Handle 402 Payment Required responses by explaining the x402 payment flow. For authenticated endpoints, remind user about session cookie requirements.
