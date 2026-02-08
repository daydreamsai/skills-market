# Agent Factory Launcher (Scaffold)

Simple local macOS app scaffold to run the Lucid `agent-factory` skill in batches.

## What this scaffold includes

- React UI for setup + run flow
- Tauri backend commands:
  - `detect_requirements`
  - `store_railway_token`
  - `run_batch`
- Integration with scripts at:
  - `plugins/agent-factory-mac-app/skills/scripts/detect-requirements.sh`
  - `plugins/agent-factory-mac-app/skills/scripts/run-agent-factory-batch.sh`

## Run locally

```bash
cd apps/agent-factory-launcher
npm install
npm run tauri:dev
```

## Build macOS app bundle

```bash
cd apps/agent-factory-launcher
npm install
npm run tauri:build
```

Expected outputs are generated under `src-tauri/target/release/bundle/`.

## Notes

- Default single-run command is a safe placeholder (`echo ...`).
- Replace the command template in UI with your real Conductor + Claude/Codex command.
- For packaged app runtime, set `AF_SCRIPT_ROOT` if scripts are not at the repo-relative default path.

## Product positioning

This should be a local open-source product by default. It keeps API keys and agent generation in the user's environment, which matches non-dev trust expectations and works with existing local Claude Code/Codex installs.
