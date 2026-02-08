import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { BatchResult, Provider, Requirements } from "./types";

const counts = Array.from({ length: 100 }, (_, idx) => idx + 1);

const docs = {
  claude: "https://code.claude.com/docs/en/overview",
  codex: "https://developers.openai.com/codex/",
  railway: "https://docs.railway.com/",
  conductor: "https://docs.conductor.build/"
};

function isTauriAvailable(): boolean {
  return "__TAURI__" in window;
}

function inferDefaultProvider(req: Requirements | null): Provider {
  if (!req) {
    return "claude";
  }

  if (req.provider === "codex") {
    return "codex";
  }

  return "claude";
}

function buildAgentFactoryCommand(provider: Provider): string {
  const providerHint =
    provider === "claude"
      ? "Use Claude Code through Conductor"
      : "Use Codex through Conductor";

  const prompt = [
    "Run the Lucid Agents skill agent-factory once.",
    "Use RUN_INDEX for a unique agent name suffix.",
    "Deploy to Railway in this run.",
    "Return the final deployed URL in plain text.",
    providerHint
  ].join(" ");

  // Scaffold default command; teams can replace this with their exact Conductor execution command.
  return `echo \"[RUN $RUN_INDEX] ${prompt}\"`;
}

function getLineCount(text: string): number {
  if (!text.trim()) {
    return 0;
  }
  return text.trim().split(/\r?\n/).length;
}

export default function App() {
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [provider, setProvider] = useState<Provider>("claude");
  const [count, setCount] = useState<number>(1);
  const [railwayToken, setRailwayToken] = useState("");
  const [commandTemplate, setCommandTemplate] = useState(buildAgentFactoryCommand("claude"));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [tokenStatus, setTokenStatus] = useState("");
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  const needsRailwayToken = useMemo(
    () => requirements !== null && !requirements.railway_auth,
    [requirements]
  );

  const environmentReady = useMemo(() => {
    if (!requirements) {
      return false;
    }

    const providerReady = requirements.claude_installed || requirements.codex_installed;
    return providerReady && requirements.railway_installed && requirements.git_installed && requirements.bun_installed;
  }, [requirements]);

  async function refreshRequirements() {
    setError("");

    if (!isTauriAvailable()) {
      setRequirements({
        claude_installed: false,
        codex_installed: false,
        railway_installed: false,
        git_installed: true,
        bun_installed: true,
        railway_auth: false,
        railway_auth_source: "none",
        provider: "none"
      });
      return;
    }

    try {
      const next = await invoke<Requirements>("detect_requirements");
      setRequirements(next);
      const inferred = inferDefaultProvider(next);
      setProvider(inferred);
      setCommandTemplate(buildAgentFactoryCommand(inferred));
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    void refreshRequirements();
  }, []);

  useEffect(() => {
    setCommandTemplate(buildAgentFactoryCommand(provider));
  }, [provider]);

  async function createAgents() {
    setRunning(true);
    setError("");
    setBatchResult(null);

    try {
      if (!isTauriAvailable()) {
        throw new Error("Batch execution is available when running in Tauri.");
      }

      const result = await invoke<BatchResult>("run_batch", {
        request: {
          count,
          commandTemplate,
          railwayToken: railwayToken.trim() || null,
          workRoot: null
        }
      });

      setBatchResult(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  async function saveRailwayToken() {
    setError("");
    setTokenStatus("");

    try {
      if (!isTauriAvailable()) {
        throw new Error("Keychain save is available when running in Tauri.");
      }
      if (!railwayToken.trim()) {
        throw new Error("Railway API key is empty.");
      }

      await invoke("store_railway_token", { token: railwayToken.trim() });
      setTokenStatus("Saved to Keychain.");
      await refreshRequirements();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>Agent Factory Launcher</h1>
        <p className="subtitle">Simple local launcher for non-dev users.</p>

        <div className="row">
          <button type="button" onClick={() => void refreshRequirements()} disabled={running}>
            Refresh Checks
          </button>
          <a href={docs.conductor} target="_blank" rel="noreferrer">
            Conductor Docs
          </a>
        </div>

        <ul className="status-list">
          <li>{requirements?.claude_installed ? "Ready" : "Needs setup"} - Claude Code <a href={docs.claude} target="_blank" rel="noreferrer">Install</a></li>
          <li>{requirements?.codex_installed ? "Ready" : "Needs setup"} - Codex <a href={docs.codex} target="_blank" rel="noreferrer">Install</a></li>
          <li>{requirements?.railway_installed ? "Ready" : "Needs setup"} - Railway CLI <a href={docs.railway} target="_blank" rel="noreferrer">Install</a></li>
          <li>{requirements?.railway_auth ? `Ready (${requirements.railway_auth_source})` : "Needs setup"} - Railway Auth</li>
          <li>{requirements?.git_installed ? "Ready" : "Needs setup"} - git</li>
          <li>{requirements?.bun_installed ? "Ready" : "Needs setup"} - bun</li>
        </ul>

        <label>
          Provider
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            disabled={running}
          >
            <option value="claude">Claude Code</option>
            <option value="codex">Codex</option>
          </select>
        </label>

        <label>
          Agents to create
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={running}>
            {counts.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {needsRailwayToken ? (
          <label>
            Railway API Key
            <input
              value={railwayToken}
              onChange={(e) => setRailwayToken(e.target.value)}
              placeholder="Paste Railway token"
              type="password"
              disabled={running}
            />
            <div className="row token-row">
              <button type="button" onClick={() => void saveRailwayToken()} disabled={running}>
                Save Key
              </button>
              {tokenStatus ? <span className="ok">{tokenStatus}</span> : null}
            </div>
          </label>
        ) : null}

        <label>
          Single-run command template
          <textarea
            value={commandTemplate}
            onChange={(e) => setCommandTemplate(e.target.value)}
            rows={4}
            disabled={running}
          />
        </label>

        <div className="row">
          <button type="button" onClick={() => void createAgents()} disabled={running || !environmentReady}>
            {running ? "Creating..." : "Create Agents"}
          </button>
          {!environmentReady ? <span className="warn">Finish setup checks before running.</span> : null}
        </div>

        {error ? <p className="error">{error}</p> : null}

        {batchResult ? (
          <section className="result">
            <h2>Run Summary</h2>
            <p>
              total: {batchResult.summary.total}, success: {batchResult.summary.success}, failed: {batchResult.summary.failed}
            </p>
            <p>work root: {batchResult.work_root}</p>
            <p>log lines: {getLineCount(batchResult.stdout)}</p>
            <pre>{batchResult.stdout || batchResult.stderr}</pre>
          </section>
        ) : null}
      </section>
    </main>
  );
}
