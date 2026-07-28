# Skills Market

A curated market of high-quality skills for building, operating, and monetizing Lucid Agents.

This repository is for reusable skills and skill plugins—not example applications, generic prompts, frozen documentation, or one-off workflows. New skills and PRs that change skill behavior follow the open [Agent Skills specification](https://agentskills.io/specification) and the repository's stricter [authoring standard](./AGENTS.md).

## What makes a market-quality skill

A skill adds specialized procedure or judgment that a capable agent would not reliably infer on its own. It has a precise invocation boundary, a concise decision process, current sources, safe side-effect handling, and a verifiable stopping condition.

Strong skills use progressive disclosure: routing metadata stays small, the universal workflow lives in `SKILL.md`, and branch-specific detail is loaded from focused references only when needed. Each rule has one source of truth, and behavioral checks cover both successful execution and incorrect invocation.

Before proposing a skill, read [AGENTS.md](./AGENTS.md) for the package structure, context-engineering contract, Lucid Agents requirements, mandatory submission gates, and PR evidence. Search the existing market and [skills.sh catalog](https://skills.sh) for overlap before creating another skill.

## Install

```bash
/plugin marketplace add daydreamsai/skills-market
/plugin install <plugin-name>@daydreams-skills
```
