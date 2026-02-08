---
name: agent-factory-mac-app
description: |
  Designs and builds a simple installable macOS launcher that guides non-developers through prerequisites, captures Railway credentials, and runs the Lucid Agents agent-factory skill in a counted batch. Use when building a one-click interface for creating and deploying 1-100 paid Lucid Agents through Conductor with Claude Code or Codex.
---

# Agent Factory Mac App

Build a minimal, non-dev-first macOS app that wraps `agent-factory` execution.

## Required Outcome

Ship an installable `.dmg` or `.app` with this exact behavior:

1. Detect whether `claude` or `codex` is installed.
2. If neither is installed, show guided install CTAs with links.
3. Detect Railway auth from `RAILWAY_TOKEN` or active `railway` session.
4. Prompt for missing required setup and persist secrets in macOS Keychain.
5. Provide a simple dropdown for number of agents (1-100).
6. Execute `agent-factory` repeatedly until the selected count is completed.

## Implementation Constraints

- Keep UI intentionally simple: one setup screen, one run screen, clear status chips.
- Prefer Tauri + React + TypeScript for small binary and easy macOS packaging.
- Keep all agent outputs real (no mocks), following Lucid Agent standards.
- For generated agent code, use Zod v4 and modern imports from `@lucid-agents/core` and `@lucid-agents/http`.

## Build Flow

### 1) Scaffold App Shell

Create a desktop shell with:
- Rust/Tauri backend for command execution + Keychain access.
- React frontend with two views: `Setup` and `Run`.
- Persistent app config for preferred provider (`claude` or `codex`) and run defaults.

### 2) Add Preflight Detection

Use `scripts/detect-requirements.sh` to gather environment state:
- `claude` presence
- `codex` presence
- `railway` presence
- `RAILWAY_TOKEN` environment availability
- `railway whoami` session availability
- `git` and `bun` presence

Map each check to a user-facing status row:
- `Ready` when available
- `Needs setup` when missing
- CTA button text must be handholding and specific (example: `Install Claude Code`).

### 3) Setup Prompts (Handholding)

When required tools are missing, show explicit next steps with one-click docs links:
- Claude Code: `https://code.claude.com/docs/en/overview`
- Codex: `https://developers.openai.com/codex/`
- Railway: `https://docs.railway.com/`
- Conductor: `https://docs.conductor.build/`

Railway credential flow:
- If `RAILWAY_TOKEN` exists, mark auth complete.
- Else if `railway whoami` succeeds, mark auth complete.
- Else prompt for Railway API key and store in Keychain, then set it for subprocess execution.

### 4) Batch Runner

Use `scripts/run-agent-factory-batch.sh` to execute batch runs.

Runner contract:
- Input: count (`1-100`), work root, single-run command template (`AGENT_FACTORY_COMMAND`).
- Behavior: create isolated run directories and invoke the command once per agent.
- Output: streaming status lines per run and final success/failure totals.

### 5) Command Template

Build one single-run command template from selected provider:

- Claude path: invoke agent workflow with `agent-factory` prompt context.
- Codex path: invoke equivalent workflow with `agent-factory` prompt context.

Template must include:
- unique run index
- unique agent name seed
- instruction to deploy on Railway
- instruction to return final deployed URL

### 6) UI Actions

- Dropdown: integer 1-100 (default `1`).
- Primary button: `Create Agents`.
- While running: disable setup edits, show progress `completed / total`.
- On completion: list deployed URLs grouped by run index.
- On failures: show run log location and a retry button for failed runs only.

## Files in This Skill

- `scripts/detect-requirements.sh`: deterministic local requirement checks.
- `scripts/run-agent-factory-batch.sh`: deterministic batch loop executor.

## Acceptance Checklist

- App launches on macOS and can be installed by non-dev users.
- At least one AI provider (`claude` or `codex`) is auto-detected or guided.
- Railway auth is auto-detected from env/session or requested once.
- Batch size selector enforces `1-100`.
- Run loop executes exactly N times with per-run logs.
- Final view shows success/failure counts and deployed endpoints.
