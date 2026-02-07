# Skills Market Documentation Audit Report

**Auditor:** skills-auditor
**Date:** 2026-02-07
**Branch:** `frontboat/agent-team-review`
**Scope:** All documentation in `daydreamsai/skills-market`

---

## Summary

The skills-market repository contains 15 plugins (skills) with well-structured documentation. The top-level docs (README.md, CLAUDE.md, AGENTS.md) establish clear guidelines for skill authoring. However, there are several critical issues around cross-repo accuracy, broken references to non-existent skills, a significant network contradiction in `lucid-agent-creator`, and incomplete README coverage. Most skills comply with the stated spec (YAML frontmatter, plugin.json format, description rules), but a few edge cases need attention.

**Total issues found: 29**
- Critical: 9
- Warning: 12
- Info: 8

---

## Critical Issues

### C-1: Network contradiction in `lucid-agent-creator`
**File:** `plugins/lucid-agent-creator/skills/SKILL.md` (lines 64, 71, 90, 98, 230, 249)
**File:** `plugins/lucid-agent-creator/skills/GUIDE.md` (line 88)

The documentation states "All agents use Ethereum mainnet" (line 230, 249 in SKILL.md; line 88 in GUIDE.md), but the SDK code examples use `baseSepolia` (chain 84532):
- `import { baseSepolia } from 'viem/chains'` (line 64)
- `chain: baseSepolia` (lines 71, 98)
- `network: 'eip155:84532'` (line 90)

Meanwhile `paymentsConfig` states `network: "ethereum"`. A new developer following these docs would be confused about which network to use. The code examples and the prose directly contradict each other.

**Confirmed by server-mcp-auditor:** The MCP server hardcodes `network: "ethereum"` in both `lucid-402.ts` and `create-agent.ts`, but the actual payment chain depends on the Lucid platform's server-side 402 response. **Confirmed by sdk-auditor:** The SDK is network-agnostic; CLI templates default to Base Sepolia (chain 84532). There is no SDK-side statement that "All agents use Ethereum mainnet" -- the prose in the skills-market docs appears to be the error. The code examples using `baseSepolia` are actually more aligned with SDK defaults than the prose claiming "Ethereum mainnet."

### C-2: Broken skill references in `autonomous-lucid`
**File:** `plugins/autonomous-lucid/skills/SKILL.md` (lines 101-109, 245, 326, 441)
**File:** `plugins/autonomous-lucid/skills/ARCHITECTURE.md` (lines 30, 163, 294)

References to skills that do not exist in the skills-market:
- `research-agent` -- referenced 7+ times as a dependency, but no `plugins/research-agent/` exists
- `Skill("railway", args: "deploy $agent")` (line 245) -- the actual skill name is `railway-deploy`, not `railway`
- `ralph-wiggum:ralph-loop` (ARCHITECTURE.md line 38, 40) -- external skill not documented or available

This skill cannot function as documented because its core dependency (`research-agent`) is missing.

### C-3: Undocumented cross-repo skill dependency in `lucid-agent-editor`
**File:** `plugins/lucid-agent-editor/skills/SKILL.md` (line 450)

References `hono-runtime-api` as a related skill: `"- **hono-runtime-api**: Complete API reference for all operations"`. This skill does not exist in the skills-market repository. **Confirmed by client-auditor:** the skill exists in the lucid-client repo at `.claude/skills/hono-runtime-api/SKILL.md`, not in skills-market. This cross-repo dependency is not documented -- a user installing only skills-market would not have access to it.

### C-4: External skill dependencies not documented
**Files:** `plugins/paid-agent/skills/SKILL.md` (line 47), `plugins/autonomous-lucid/skills/SKILL.md` (lines 232, 304)

Multiple skills depend on external skills that are not part of this marketplace:
- `feature-dev:code-reviewer` (paid-agent line 47, autonomous-lucid ARCHITECTURE.md line 39)
- `commit` (paid-agent line 57, autonomous-lucid line 232)
- `research-agent` (autonomous-lucid)

None of these are documented as external dependencies. A new user installing only the skills-market would find these skills broken. There is no documentation explaining where to get these external skills or what marketplace/plugin they belong to.

### C-5: `lucid-agent-creator` contradicts itself on entrypoint-level network
**File:** `plugins/lucid-agent-creator/skills/SKILL.md` (lines 230, 240)

Line 230: "Entrypoint-level `network` field (for payment network) is **not accepted**. All agents use Ethereum mainnet."
Line 240: "Do not provide or see the Lucid API base URL - that is MCP config only"
Line 249: `network: "ethereum"` (Ethereum mainnet)

But immediately below, line 243 describes `paymentsConfig` as auto-built with `network: "ethereum"`, while the code example at line 90 sends `network: 'eip155:84532'` (Base Sepolia). The entrypoint-level network restriction and the actual network used are contradictory.

### C-6: `lucid-agent-editor` references non-existent `edit_lucid_agent` MCP tool
**File:** `plugins/lucid-agent-editor/skills/SKILL.md` (line 37)

The skill documents an `edit_lucid_agent` MCP tool as Option 1 for editing agents. **Confirmed by server-mcp-auditor:** this tool does not exist in the xgate MCP server codebase (`apps/xgate-mcp-server/`). Zero matches found. This is either a planned-but-unimplemented feature or a documentation error. A user following this skill's "Option 1" instructions would fail immediately because the MCP tool is not available.

### C-7: `xgate-server` API base URL inconsistency
**File:** `plugins/xgate-server/skills/SKILL.md` (line 87 vs lines 31, 36, 44)

The skill documents the API base URL as `https://api.xgate.run` (line 87), but the MCP setup URLs all use `https://xgate.run` (lines 31, 36, 44). **Confirmed by server-mcp-auditor:** the MCP server source code uses `https://xgate.run` as the base URL for both `xgate_search` and `agents_search` tools. If `api.xgate.run` is a separate endpoint, this is undocumented; if it is the same, the URL is inconsistent.

### C-8: `lucid-agent-creator` references non-existent scripts in lucid-client
**File:** `plugins/lucid-agent-creator/skills/SKILL.md` (line 136)

References `scripts/create-agent-with-payment-auth.ts` and `scripts/test-setup-payment-x402.ts` "in the lucid-client repo." **Confirmed by client-auditor:** neither script exists. The `scripts/` directory in lucid-client contains only `dev.ts` and `hono-runtime-api.ts`. The closest match is `packages/hono-runtime/scripts/create-agent-x402-test.ts` (different name, different location). A developer following the "Option 3" path would be unable to find the referenced examples.

### C-9: `lucid-agent-creator` GUIDE.md has wrong API base URL
**File:** `plugins/lucid-agent-creator/skills/GUIDE.md` (line 68, 80)

Documents the Lucid API base URL as `https://lucid-dev.daydreams.systems/api` and the invokeUrl as `https://lucid-dev.daydreams.systems/agents/{id}/entrypoints/{key}/invoke`. **Confirmed by client-auditor:** the actual API is on a separate subdomain: `https://api-lucid-dev.daydreams.systems`, NOT a `/api` path on the site URL. The site URL `https://lucid-dev.daydreams.systems` is the frontend, not the API. A developer using the documented URL would get 404 errors or hit the wrong service.

---

## Warning Issues

### W-1: README.md missing 4 plugins from listing
**File:** `README.md`

The "Available Skills" section does not list these plugins that exist in the repository:
- `b2a-agents`
- `cult-film-curtis`
- `moltbook-promotion`
- `tig-innovator`

A new user reading only the README would not know these skills exist.

### W-2: AGENTS.md and CLAUDE.md are near-duplicates
**Files:** `AGENTS.md`, `CLAUDE.md`

These files are nearly identical (only 12 lines of diff -- the title, intro line, and section header). CLAUDE.md says "For the full spec, see `AGENTS.md`" but contains the exact same content. This creates a maintenance burden where updates must be made in two places.

### W-3: `lucid-agents-sdk` references external URLs without verification
**File:** `plugins/lucid-agents-sdk/skills/SKILL.md` (lines 14-15)

The `see-also` field references:
- `https://github.com/daydreamsai/lucid-agents/blob/master/AGENTS.md`
- `https://github.com/daydreamsai/lucid-agents/blob/master/CONTRIBUTING.md`

These are GitHub blob URLs that may break if the default branch changes or files are renamed. **Confirmed by sdk-auditor:** `AGENTS.md` is current and accurate, but `CONTRIBUTING.md` has stale content (uses old package names like `agent-kit` instead of `core`) -- flagged as critical issue C-9 in the SDK audit report. So this skills-market `see-also` link points to a stale document.

### W-4: `lucid-client-api` references external URLs without verification
**File:** `plugins/lucid-client-api/skills/SKILL.md` (lines 12-13)

The `see-also` field references:
- `https://github.com/daydreamsai/lucid-client/blob/master/AGENTS.md`
- `https://github.com/daydreamsai/lucid-client/blob/master/CLAUDE.md`

Same concern as W-3. Cannot verify these URLs are live.

### W-5: `lucid-agent-creator` references scripts in another repo
**File:** `plugins/lucid-agent-creator/skills/SKILL.md` (line 136)

References `scripts/create-agent-with-payment-auth.ts` and `scripts/test-setup-payment-x402.ts` "in the lucid-client repo." These scripts cannot be verified from this repository.

### W-6: `autonomous-lucid` SKILL.md is verbose (443 lines) and close to 500-line limit
**File:** `plugins/autonomous-lucid/skills/SKILL.md` (443 lines)

At 443 lines, this is close to the stated 500-line limit. The ARCHITECTURE.md file (331 lines) already exists as a reference file, but much of the content in SKILL.md (performance estimates, configuration options, advanced features, limitations) could be moved there to keep SKILL.md focused on actionable instructions.

### W-7: `cult-film-curtis` entire implementation in SKILL.md
**File:** `plugins/cult-film-curtis/skills/SKILL.md` (331 lines)

Contains the complete TypeScript implementation (~250 lines of code) inline in SKILL.md. This makes the file long and violates the spirit of "be concise" from the quality bar. The code could be in a separate reference or template file.

### W-8: `moltbook-promotion` skill focuses on marketing, not agent building
**File:** `plugins/moltbook-promotion/skills/SKILL.md`

This skill is about social media promotion on Moltbook rather than building paid Lucid Agents. While it mentions Lucid Agents and x402, its primary purpose (comment drafting, campaign management) does not align with the marketplace's stated goal: "Every skill should help create monetizable Lucid Agents." This may confuse users expecting agent-building skills.

### W-9: Installation command not verified
**File:** `README.md` (lines 43-46)

The installation commands reference a plugin system:
```
/plugin marketplace add daydreamsai/skills-market
/plugin install <skill-name>@daydreams-skills
```

This is a Claude Code plugin system that may or may not exist. The command format cannot be verified from this repository. No alternative installation method (e.g., git clone) is documented.

### W-10: `tig-innovator` references CLI that may not be bundled
**File:** `plugins/tig-innovator/skills/SKILL.md`

Documents a `tig-innovator` CLI tool with commands like `tig-innovator list`, `tig-innovator analyze`, etc. However, there is no CLI binary or script in the `plugins/tig-innovator/` directory. The architecture section shows a `src/cli.ts` structure, but no actual code exists. A new user cannot use this skill as documented.

### W-11: `xgate-server` CLI path assumes relative execution
**File:** `plugins/xgate-server/skills/SKILL.md` (lines 63-81)

CLI examples use `./plugins/xgate-server/scripts/xgate` which assumes the user is in the skills-market root directory. No installation instructions or PATH setup are provided.

### W-12: Stale version pinning for `@lucid-agents/hono`
**File:** `plugins/lucid-agents-sdk/skills/SKILL.md` (line 89)

Documents `@lucid-agents/hono@0.7.20+` as the critical minimum for Base x402 support. **Confirmed by sdk-auditor:** the current version is `0.9.3`. While `0.7.20` is still a valid minimum threshold, the gap is significant (0.7.20 vs 0.9.3) and could mislead developers into thinking `0.7.20` is recent. The docs should note the current version or use `latest`.

---

## Info Issues

### I-1: Marketplace.json and plugin.json versions are in sync
All 15 plugins have matching versions between `marketplace.json` and their respective `plugin.json` files. No version mismatches found.

### I-2: All plugin.json files have `author` as object (not string)
All 15 plugins correctly use `{ "name": "...", "email": "..." }` format for the author field, matching the spec requirement.

### I-3: All SKILL.md files have valid YAML frontmatter
All 15 SKILL.md files have `name` and `description` fields in their frontmatter. All descriptions use third-person voice and include activation triggers.

### I-4: No SKILL.md files exceed the 500-line limit
The longest is `lucid-agent-editor` at 451 lines, under the 500-line limit. `autonomous-lucid` is at 443 lines.

### I-5: Reference files over 100 lines include `## Contents` TOC
Both `ARCHITECTURE.md` (331 lines) and `ERC8004_REFERENCE.md` (329 lines) include a `## Contents` section. `SDK_REFERENCE.md` (280 lines) also includes `## Contents`. Compliant with spec.

### I-6: `GUIDE.md` in `lucid-agent-creator` has `## Contents` TOC
The 117-line GUIDE.md includes a Contents section. Compliant with spec.

### I-7: CI workflow properly validates plugin versions
The `.github/workflows/plugin-version-check.yml` correctly triggers on PRs affecting `plugins/**` and runs `check-plugin-versions.sh`. The workflow is well-structured.

### I-8: `.gitignore` only ignores `mcp.json`
The `.gitignore` contains only `mcp.json`, which is appropriate for this repository type.

---

## User Journey Assessment

**Question:** "If I'm a new developer, can I find, install, and use a skill from this marketplace using just these docs?"

**Assessment: Partially -- significant gaps exist.**

1. **Finding skills:** The README lists 11 of 15 skills. A new user would miss 4 plugins (b2a-agents, cult-film-curtis, moltbook-promotion, tig-innovator).

2. **Installing skills:** The installation command (`/plugin marketplace add`) references a Claude Code plugin system. No alternative (git clone, manual copy) is documented. A developer using Cursor gets partial guidance in `lucid-agent-creator/GUIDE.md` but not for other skills.

3. **Using skills:** Core pipeline skills (trend-discovery, api-research, railway-deploy, agent-factory) form a coherent workflow and reference each other well. However, meta-skills (`autonomous-lucid`, `paid-agent`) depend on external skills (`research-agent`, `feature-dev:code-reviewer`, `commit`) that are not in this repo and not documented as external dependencies.

4. **Network confusion:** A developer trying to build paid agents via `lucid-agent-creator` would encounter contradictory network information (Ethereum mainnet vs. Base Sepolia) that could lead to failed transactions or misrouted payments.

5. **Understanding the ecosystem:** The relationship between SDK skills (lucid-agents-sdk), platform-hosted skills (lucid-agent-creator), and client API skills (lucid-client-api) is not clearly explained anywhere. A new developer would not know when to use which approach.

---

## Cross-Repo References Summary

| Skills-market doc | References | Target repo |
|:---|:---|:---|
| `lucid-agents-sdk` SKILL.md, SDK_REFERENCE.md, ERC8004_REFERENCE.md | `@lucid-agents/*` packages, AGENTS.md, CONTRIBUTING.md | lucid-agents (SDK) |
| `lucid-client-api` SKILL.md | Lucid Client API endpoints, AGENTS.md, CLAUDE.md | lucid-client |
| `lucid-agent-creator` SKILL.md, GUIDE.md | `create_lucid_agent` MCP tool, scripts, Lucid API URLs | lucid-client, xgate-server |
| `lucid-agent-editor` SKILL.md | `edit_lucid_agent` MCP tool, `hono-runtime-api` (broken) | lucid-client, xgate-server |
| `xgate-server` SKILL.md | xgate API, MCP setup | xgate-server |
| `cult-film-curtis`, `b2a-agents` SKILL.md | `@lucid-agents/*` import patterns | lucid-agents (SDK) |
| `moltbook-promotion` SKILL.md | Lucid Agents features, xgate.run | lucid-agents, xgate-server |

All cross-repo references have been reported to the relevant auditors (sdk-auditor, client-auditor, server-mcp-auditor) and alignment-checker.

---

## Recommendations (not fixes -- audit only)

1. Resolve the Ethereum mainnet vs. Base Sepolia contradiction in `lucid-agent-creator`
2. Add the 4 missing plugins to the README.md Available Skills section
3. Document external skill dependencies (research-agent, feature-dev:code-reviewer, commit) or add them to the marketplace
4. Fix the `railway` skill name to `railway-deploy` in `autonomous-lucid`
5. Remove or fix the `hono-runtime-api` reference in `lucid-agent-editor`
6. Deduplicate AGENTS.md and CLAUDE.md
7. Add alternative installation instructions (for non-Claude-Code users)
8. Add a "choosing the right skill" guide explaining SDK vs. platform-hosted vs. client API approaches
