# Needs Review

Issues from the documentation audit that require owner input or cross-repo coordination to resolve.

## C-3: `hono-runtime-api` skill cross-repo dependency

**File:** `plugins/lucid-agent-editor/skills/SKILL.md` (line 450)

The `hono-runtime-api` skill lives in the `lucid-client` repo (`.claude/skills/hono-runtime-api/SKILL.md`), not in this marketplace. The `lucid-agent-editor` skill references it as a related skill.

**Decision needed:** Should `hono-runtime-api` be cross-referenced with a note about its location, or copied into this marketplace as a standalone plugin?

**Current workaround:** Updated the reference to point to `lucid-client-api` instead, with a note that `hono-runtime-api` lives in the lucid-client repo.

---

## ~~C-8: Referenced scripts don't exist at documented paths~~ RESOLVED

**Fixed:** Updated `plugins/lucid-agent-creator/skills/SKILL.md` to reference `packages/hono-runtime/scripts/create-agent-x402-test.ts` (the correct script path in lucid-client).

---

## W-8: `moltbook-promotion` alignment with marketplace goal

**File:** `plugins/moltbook-promotion/`

This skill focuses on social media promotion on Moltbook (drafting comments, campaign management) rather than building paid Lucid Agents. While it mentions Lucid Agents and x402, its primary purpose does not align with the marketplace's stated goal: "Every skill should help create monetizable Lucid Agents."

**Decision needed:** Should this skill remain in the marketplace? It could confuse users expecting agent-building skills, but it does serve the broader ecosystem by promoting agent adoption.

---

## C-7: `api.xgate.run` vs `xgate.run` API base URL

**File:** `plugins/xgate-server/skills/SKILL.md` (line 87 vs lines 31, 36, 44)

The skill documents the API base URL as `https://api.xgate.run` (line 87), but the MCP setup URLs use `https://xgate.run` (lines 31, 36, 44). The xgate MCP server source code uses `https://xgate.run` as the base URL.

**Decision needed:** Is `api.xgate.run` a separate endpoint (e.g., a public REST API), or is it an error? If both exist, document the distinction. If only `xgate.run` is correct, fix line 87.

---

## C-9: Lucid API URL -- `lucid-dev.daydreams.systems/api` vs `api-lucid-dev.daydreams.systems`

**File:** `plugins/lucid-agent-creator/skills/GUIDE.md` (lines 68, 80)

The GUIDE.md documents `https://lucid-dev.daydreams.systems/api` as the Lucid API base URL. The client-auditor reports the actual API is at `https://api-lucid-dev.daydreams.systems` (separate subdomain), not a `/api` path on the site URL.

However, the MCP server source code (`create-agent.ts` line 15) defaults to:
```
const LUCID_API_BASE_URL = process.env.LUCID_API_URL || "https://lucid-dev.daydreams.systems/api";
```

This means the MCP server uses `lucid-dev.daydreams.systems/api` by default.

**Decision needed:** Which is the canonical API URL? If both work (e.g., one proxies to the other), document both. If one is deprecated, update all references.
