# Skills Market Authoring Standard

This repository contains skills and skill plugins only. Every newly submitted skill and every PR that changes skill behavior must conform to the open [Agent Skills specification](https://agentskills.io/specification), be checked against the [skills.sh](https://skills.sh) catalog, and satisfy the stricter repository rules below.

`AGENTS.md` is the definitive authoring and review standard for this repository. `README.md` is an introduction, not a second copy of the specification. If an external recommendation and a repository rule differ, follow the stricter repository rule.

## What Belongs in This Market

A skill belongs here when it packages specialized procedural knowledge that materially improves how an agent completes a recurring task for monetizable Lucid Agents.

Accept a skill only when it has:

- A distinct invocation boundary: a user request can clearly require this skill.
- Specialized judgment, workflow, or integration knowledge that a capable model would not reliably infer.
- A checkable outcome and explicit completion criteria.
- Current, authoritative sources for SDK, API, protocol, or service behavior.
- Enough standalone value to compose with other skills without copying their guidance.

Reject or request consolidation for:

- Generic prompts, personas, example applications, marketing campaigns, or one-off project instructions.
- CLI, language, framework, or HTTP basics a capable agent already knows.
- Static copies of fast-changing API or command documentation.
- Thin wrappers around another skill with no independent trigger or judgment.
- Duplicates, near-duplicates, and skills whose behavior fits cleanly as a branch of an existing skill.
- Workflows based on hardcoded mocks, stale SDK patterns, or unverifiable claims.

The quality target is predictable process, not identical prose: the skill should reliably choose the right workflow, gather the required evidence, and stop only when its completion criteria are met.

## Context Engineering Contract

Skills consume shared agent context. Every line must earn its place by improving invocation, decisions, execution, or verification.

### 1. Optimize the description for invocation

Frontmatter descriptions are discovery metadata and routing context loaded before the skill body. Every description must:

1. Use third-person voice.
2. State what the skill does.
3. Include an explicit `Use when ...` trigger.
4. Name the concrete terms and intent branches users naturally express.
5. Avoid history, examples, implementation detail, and claims already explained in the body.
6. Stay under 1024 characters.

Each distinct trigger phrase should correspond to a real workflow branch.

```yaml
---
name: payment-schema
description: Generates x402 payment schemas for Lucid Agents. Use when adding paid HTTP routes, pricing resources, or validating payment metadata.
---
```

Bad: `Discover trending topics on X/Twitter.`

Good: `Discovers trending topics on X/Twitter for agent content planning. Use when researching live social trends, hashtags, or conversation clusters.`

### 2. Make `SKILL.md` a decision procedure

Put the universal workflow in `SKILL.md`. Write ordered actions, decision points, constraints, and failure handling—not an essay about the domain.

- End every substantial phase with an observable completion criterion.
- State what evidence must be inspected before acting.
- Define branches close to the decision that selects them.
- Define output shape, validation, and stopping conditions.
- Remove motivational prose, repeated warnings, no-op instructions, and generic advice.
- Keep rules beside the step they govern so the agent does not have to reconcile distant sections.

### 3. Use progressive disclosure

Use this information hierarchy:

1. **Frontmatter** — identification, compatibility, permissions, metadata, and invocation routing.
2. **`SKILL.md`** — the workflow and rules needed on every invocation.
3. **References, examples, assets, and scripts** — branch-specific or detailed material loaded only when needed.

Keep `SKILL.md` under 500 lines and preferably well below 5,000 tokens. Move conditional detail into files linked directly from `SKILL.md`. Do not create nested reference chains.

A reference is justified only when at least one workflow branch needs it and other branches can avoid loading it. If every branch needs the information, keep the concise version in `SKILL.md`.

### 4. Maintain one source of truth

State each rule once at its natural authority:

- Repository-wide rules live in this file.
- Skill-specific procedure lives in that skill's `SKILL.md`.
- Detailed domain facts live in one named reference.
- Reusable executable behavior lives in a script.

Link to the authority instead of copying it. Repetition creates context bloat and contradictory maintenance paths.

### 5. Design for freshness

For rapidly changing SDKs, APIs, protocols, prices, endpoints, or CLI surfaces:

- Prefer the installed dependency, generated schema, official documentation, or live service as the source of truth.
- Record the supported version or a reliable discovery step.
- Do not freeze a large command or API catalog into prose unless it is version-pinned and tested.
- Use primary sources; label assumptions and fallbacks.
- Verify external links, commands, imports, and endpoint examples before submission.

## Required Package Structure

New plugins and migrations must use the standard Agent Skills nesting:

```text
plugins/<plugin-name>/
├── .claude-plugin/plugin.json
└── skills/
    └── <skill-name>/
        ├── SKILL.md
        ├── references/           # Optional detailed guidance
        ├── examples/             # Optional verified examples
        ├── scripts/              # Optional executable helpers
        └── assets/               # Optional output resources
```

Every plugin directory must contain exactly one valid plugin manifest and at least one standard skill directory. The skill `name` must match the directory containing its `SKILL.md`. All referenced files must stay inside that skill directory.

Some existing plugins use the legacy flat path `plugins/<plugin-name>/skills/SKILL.md`. That layout is not precedent for new work. A PR that changes a legacy skill's behavior must migrate it to the standard nested layout and update its manifest, links, and marketplace metadata in the same PR. A removal-only or repository-documentation PR does not need to migrate unrelated legacy skills.

## `SKILL.md` Format

Every skill requires YAML frontmatter followed by Markdown instructions:

```yaml
---
name: my-skill
description: Describes the behavior. Use when [specific trigger conditions].
---
```

### Frontmatter

| Field | Type | Requirement |
|:------|:-----|:------------|
| `name` | string | Required. 1–64 lowercase letters, numbers, or hyphens; no leading, trailing, or consecutive hyphens; must match the skill directory name. |
| `description` | string | Required. What the skill does and when to use it; max 1024 characters. |
| `license` | string | Optional. License name or bundled license-file reference. |
| `compatibility` | string | Optional. Environment requirements; max 500 characters. |
| `metadata` | object | Optional. String key-value metadata. |
| `allowed-tools` | string | Optional Agent Skills field. Space-separated pre-approved tools; experimental and not portable to every client. |

Quote YAML strings that contain colons or other ambiguous syntax. New and migrated skills must not add top-level fields outside the Agent Skills specification. Put portable, string-valued annotations under `metadata`.

### Reference, example, and script rules

- Link every supporting file directly from `SKILL.md` using a relative path.
- Keep references one level deep; references must not link to more required references.
- Give files descriptive names such as `form_validation_rules.md`, not `doc2.md`.
- Add a `## Contents` section near the top of every reference over 100 lines.
- Production workflows and validation must use live, runtime-generated, or user-provided data. Clearly labeled synthetic fixtures are allowed for safe examples, but fixture success must never be presented as live integration evidence.
- Make scripts self-contained, validate inputs, surface failures, and avoid destructive or external side effects unless the skill explicitly gates them.
- Document non-obvious dependencies and environment requirements.

## `.claude-plugin/plugin.json` Specification

Required fields:

| Field | Type | Requirement |
|:------|:-----|:------------|
| `name` | string | Must match the plugin directory, using lowercase letters and hyphens. |
| `description` | string | One-line plugin purpose. |
| `version` | string | Semantic version, for example `1.0.0`. |
| `author` | object | Must be `{ "name": "...", "email": "..." }`, never a plain string. |
| `license` | string | License identifier, for example `MIT`. |
| `keywords` | array | Discovery tags; core skills must include `lucid-agents`. |
| `skills` | string | Must be `"./skills"`. |

Recommended fields:

| Field | Type | Description |
|:------|:-----|:------------|
| `homepage` | string | Project homepage. |
| `repository` | string | Source repository. |

```json
{
  "name": "my-skill",
  "description": "Generates payment schemas for x402 agents",
  "version": "1.0.0",
  "author": { "name": "Jane Doe", "email": "jane@example.com" },
  "license": "MIT",
  "keywords": ["lucid-agents", "x402", "payments"],
  "skills": "./skills"
}
```

## Lucid Agents Market Requirements

Every market skill must help create, operate, monetize, evaluate, or maintain Lucid Agents, including x402 and ERC-8004 workflows where relevant.

### When applicable, must use

- Zod v4 rather than v3 when a skill contains TypeScript schemas.
- Modern package imports such as `@lucid-agents/core` and `@lucid-agents/http` when a skill uses the Lucid Agents TypeScript SDK.
- Live, runtime-generated, or user-provided data for operational workflows and validation.
- Current package and protocol behavior verified against primary sources.

### Must not use

- Outdated patterns such as `agent.listen()` or monolithic SDK imports.
- Hardcoded production data or mock-only operational validation.
- Verbose explanations of common programming concepts.
- Unnecessary setup or package-installation walkthroughs.

Dynamic context may be injected with `` !`command` ``. Slash-command arguments may use `$ARGUMENTS` or positional `$0`, `$1`, and so on. Use either only when it improves the workflow; do not add dynamic execution by default.

## Mandatory Submission Gates

A PR is mergeable only when all applicable gates pass.

### 1. Market fit

- The PR explains the recurring problem and the specialized knowledge the skill adds.
- The skill has a clear paid-agent or Lucid Agents outcome.
- The PR explains why this is a separate skill rather than a branch of an existing one.
- The local market and skills.sh catalog were checked for overlap.

### 2. Structural conformance

- `SKILL.md` has valid Agent Skills frontmatter and stays under 500 lines.
- The plugin manifest contains every required field and a correctly shaped `author`.
- Names, directories, manifest paths, and marketplace entries agree.
- All links and disclosed resources resolve directly from `SKILL.md`.
- Reference files over 100 lines have a `## Contents` section.

The upstream [`skills-ref` validator](https://github.com/agentskills/agentskills/tree/main/skills-ref) is useful as a supplemental check, but it is not the repository's normative production validator. If used, record the exact version or commit in the PR; passing it never replaces the gates in this document.

### 3. Context quality

- The description selects the skill for positive prompts and stays silent for plausible negative prompts.
- The body contains only behavior-changing procedure and necessary constraints.
- Universal instructions are inline; conditional detail is disclosed on demand.
- Rules are not duplicated across `README.md`, `SKILL.md`, references, and sibling skills.
- The skill has explicit completion criteria and failure paths.

### 4. Technical validity and freshness

- Imports, schemas, commands, URLs, and endpoints were tested against current supported versions.
- Operational examples use live or user-provided data and state prerequisites; synthetic fixtures are clearly labeled.
- Fast-changing facts come from a primary or runtime source rather than stale prose.
- Scripts validate inputs and fail visibly.
- Any permissions, secrets, network calls, writes, publishing, payments, or destructive effects are clearly disclosed and safely gated.

### 5. Behavioral validation

Every new or behavior-changing skill must be exercised with:

- At least three positive prompts representing distinct supported phrasing or branches.
- At least three near-miss negative prompts that should not invoke the skill.
- At least one end-to-end workflow check for each material branch.
- Verification that the output and stopping condition match the skill's stated contract.

Automated evaluations are preferred. Until repository automation covers a check, include concise manual evidence in the PR.

## Required PR Evidence

PR descriptions must identify:

1. The problem, intended user, and unique skill value.
2. The source of truth and supported versions for volatile integrations.
3. Local and skills.sh overlap checked and why a new skill or split is warranted.
4. Routing or explicit-invocation validation, plus end-to-end checks performed.
5. Commands or checks run, plus any unresolved limitations.
6. External side effects, permissions, secrets, or security considerations.

## Quality Examples

```text
Bad:  "Run npm install to install dependencies."
Good: "Requires Zod v4 and @lucid-agents/payments."

Bad:  50 lines explaining how fetch() works.
Good: A verified endpoint table plus the decisions the agent must make for each response class.

Bad:  A copied SDK command catalog that will drift.
Good: A version check and instructions to inspect the installed SDK or official generated reference.

Bad:  "Make sure the result is correct."
Good: "Complete when every paid route returns a valid x402 challenge and the schema test passes."
```

## Troubleshooting

| Problem | Fix |
|:--------|:----|
| Skill does not trigger | Add concrete intent terms and distinct `Use when` branches; test positive prompts. |
| Skill triggers too often | Narrow the description and remove unrelated synonyms or intent branches. |
| Agent misses important detail | Move universal rules into `SKILL.md` and link conditional references at the selecting step. |
| Context is bloated | Remove generic explanation, duplicated rules, sediment, and branches that belong in disclosed references. |
| Guidance becomes stale | Replace copied facts with runtime discovery or a primary versioned source. |
| YAML does not parse | Quote ambiguous strings and validate the frontmatter delimiters and field types. |

## Primary References

- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Skills overview](https://agentskills.io/home)
- [skills.sh documentation](https://skills.sh/docs)
- [skills.sh API and registry metadata](https://skills.sh/docs/api)
- [Claude Code documentation](https://code.claude.com/docs/llms.txt)
