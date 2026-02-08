# Agent Factory Web Launcher

Local app for non-dev users that runs the Lucid `agent-factory` skill in batches.

## Non-dev quick start (no terminal typing)

1. Open Finder to `apps/agent-factory-web`.
2. Double-click `Install Agent Factory Apps.command` once.
3. Double-click `Agent Factory.app`.
4. Follow the on-screen setup guide:
   - install Claude Code or Codex
   - install Railway CLI
   - paste Railway API key (saved to macOS Keychain)
   - choose how many agents (1-100)
5. Click **Create Agents**.
6. Watch live progress in **Agent Activity**.

To stop the local service later, open `Agent Factory Stop.app`.

## What the launcher does

- starts a local backend as a macOS LaunchAgent
- opens the app in browser on `http://127.0.0.1:8890`
- checks tools: Claude/Codex, Railway CLI, git, bun
- streams run output in real time from `/api/run-batch-stream`

## Backup launch option

If app wrappers are missing, double-click:

- `Agent Factory Launcher.command`
- `Agent Factory Stop.command`

## Developer mode

```bash
cd apps/agent-factory-web
npm install
npm run dev
```

- UI: `http://localhost:5174`
- API: `http://localhost:8890`
