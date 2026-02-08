import { useEffect, useMemo, useState } from "react";
import type { BatchResult, Provider, Requirements } from "./types";

const counts = Array.from({ length: 100 }, (_, idx) => idx + 1);

const docs = {
  claude: "https://code.claude.com/docs/en/overview",
  codex: "https://developers.openai.com/codex/",
  railway: "https://docs.railway.com/",
  conductor: "https://docs.conductor.build/"
};

function inferDefaultProvider(req: Requirements | null): Provider {
  if (!req) {
    return "claude";
  }

  if (req.provider === "codex") {
    return "codex";
  }

  return "claude";
}

function buildCommandTemplate(provider: Provider): string {
  const prompt = [
    "Run skill agent-factory once.",
    "Current run index is $RUN_INDEX.",
    "Use run-$RUN_INDEX as a unique agent name suffix.",
    "Write any generated files in $RUN_DIR.",
    "Deploy to Railway.",
    "Return only the final deployed URL in plain text."
  ].join(" ");

  if (provider === "claude") {
    return `claude -p --permission-mode bypassPermissions --output-format text \"${prompt}\"`;
  }

  return `codex exec --full-auto --skip-git-repo-check -c 'model_reasoning_effort=\"high\"' \"${prompt}\"`;
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  const text = await response.text();
  let body: (T & { error?: string }) | null = null;

  if (text.trim()) {
    try {
      body = JSON.parse(text) as T & { error?: string };
    } catch {
      if (!response.ok) {
        const short = text.replace(/\s+/g, " ").slice(0, 180);
        if (short.includes("<!DOCTYPE") || short.startsWith("<")) {
          throw new Error(
            `request failed: ${response.status}. API returned HTML, not JSON. Confirm backend is running (use Agent Factory Launcher.command).`
          );
        }

        throw new Error(`request failed: ${response.status}. Response: ${short}`);
      }

      throw new Error("invalid JSON response from API");
    }
  }

  if (!response.ok) {
    throw new Error(body?.error || `request failed: ${response.status}`);
  }

  return (body ?? ({} as T));
}

function getLineCount(text: string): number {
  if (!text.trim()) {
    return 0;
  }

  return text.trim().split(/\r?\n/).length;
}

type SetupStep = {
  id: string;
  title: string;
  description: string;
  done: boolean;
};

type StreamEvent =
  | { type: "start"; work_root: string }
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "end"; ok: boolean; exit_code: number; stdout: string; stderr: string; summary: BatchResult["summary"]; work_root: string }
  | { type: "error"; error: string };

export default function App() {
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [provider, setProvider] = useState<Provider>("claude");
  const [count, setCount] = useState(1);
  const [commandTemplate, setCommandTemplate] = useState(buildCommandTemplate("claude"));
  const [railwayToken, setRailwayToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState("");
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheckedLabel, setLastCheckedLabel] = useState("");
  const [error, setError] = useState("");
  const [liveLog, setLiveLog] = useState("");
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  const hasRailwayAuth = useMemo(() => {
    if (!requirements) {
      return false;
    }

    return requirements.railway_auth || railwayToken.trim().length > 0;
  }, [requirements, railwayToken]);

  const environmentReady = useMemo(() => {
    if (!requirements) {
      return false;
    }

    const providerReady = requirements.claude_installed || requirements.codex_installed;
    return providerReady && requirements.railway_installed && requirements.git_installed && requirements.bun_installed && hasRailwayAuth;
  }, [requirements, hasRailwayAuth]);

  const setupSteps = useMemo<SetupStep[]>(() => {
    const providerReady = Boolean(requirements?.claude_installed || requirements?.codex_installed);
    const railwayCliReady = Boolean(requirements?.railway_installed);
    const railwayAuthReady = hasRailwayAuth;
    const readyToRun = environmentReady;

    return [
      {
        id: "provider",
        title: "Install Claude Code or Codex",
        description: "At least one runner is required.",
        done: providerReady
      },
      {
        id: "railway-cli",
        title: "Install Railway CLI",
        description: "Used by agent-factory to deploy endpoints.",
        done: railwayCliReady
      },
      {
        id: "railway-auth",
        title: "Connect Railway account",
        description: "Paste API key once. It saves to Keychain.",
        done: railwayAuthReady
      },
      {
        id: "run",
        title: "Pick count and click Create Agents",
        description: "Choose 1-100 and run batch deployment.",
        done: readyToRun
      }
    ];
  }, [environmentReady, hasRailwayAuth, requirements]);

  const completedSetupSteps = useMemo(
    () => setupSteps.filter((step) => step.done).length,
    [setupSteps]
  );

  async function refreshRequirements() {
    setChecking(true);
    setError("");

    try {
      const next = await http<Requirements>("/api/requirements");
      setRequirements(next);
      const inferred = inferDefaultProvider(next);
      setProvider(inferred);
      setCommandTemplate(buildCommandTemplate(inferred));
      setLastCheckedLabel(new Date().toLocaleTimeString());
    } catch (e) {
      setError(String(e));
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void refreshRequirements();
  }, []);

  useEffect(() => {
    setCommandTemplate(buildCommandTemplate(provider));
  }, [provider]);

  async function saveRailwayToken() {
    setError("");
    setTokenStatus("");

    try {
      if (!railwayToken.trim()) {
        throw new Error("Railway API key is empty.");
      }

      await http<{ ok: boolean }>("/api/token", {
        method: "POST",
        body: JSON.stringify({ token: railwayToken.trim() })
      });

      setTokenStatus("Saved to Keychain.");
      await refreshRequirements();
    } catch (e) {
      setError(String(e));
    }
  }

  async function createAgents() {
    setRunning(true);
    setError("");
    setLiveLog("");
    setBatchResult(null);

    try {
      const response = await fetch("/api/run-batch-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          count,
          commandTemplate,
          railwayToken: railwayToken.trim() || null,
          workRoot: null
        })
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const body = JSON.parse(text) as { error?: string };
          throw new Error(body.error || `request failed: ${response.status}`);
        } catch {
          const short = text.replace(/\s+/g, " ").slice(0, 180);
          if (short.includes("<!DOCTYPE") || short.startsWith("<")) {
            throw new Error(
              `request failed: ${response.status}. API returned HTML, not JSON. Re-open the app with Agent Factory Launcher.command.`
            );
          }
          throw new Error(`request failed: ${response.status}. Response: ${short}`);
        }
      }

      if (!response.body) {
        throw new Error("stream response body is not available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: BatchResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) {
            continue;
          }

          const event = JSON.parse(line) as StreamEvent;

          if (event.type === "start") {
            setLiveLog((prev) => `${prev}[START] work_root=${event.work_root}\n`);
            continue;
          }

          if (event.type === "stdout") {
            setLiveLog((prev) => `${prev}${event.data}`);
            continue;
          }

          if (event.type === "stderr") {
            setLiveLog((prev) => `${prev}[stderr] ${event.data}`);
            continue;
          }

          if (event.type === "error") {
            throw new Error(event.error);
          }

          if (event.type === "end") {
            finalResult = {
              ok: event.ok,
              exit_code: event.exit_code,
              stdout: event.stdout,
              stderr: event.stderr,
              summary: event.summary,
              work_root: event.work_root
            };
            setLiveLog((prev) => `${prev}\n[END] code=${event.exit_code} ok=${event.ok}\n`);
          }
        }
      }

      if (!finalResult) {
        throw new Error("stream ended without final summary");
      }

      setBatchResult(finalResult);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>Agent Factory</h1>
        <p className="subtitle">Guided launcher for non-dev users. No terminal commands required.</p>

        <section className="guide">
          <div className="guide-head">
            <h2>Setup Guide</h2>
            <span className="progress-chip">
              {completedSetupSteps}/{setupSteps.length} complete
            </span>
          </div>
          <ol className="setup-steps">
            {setupSteps.map((step, idx) => (
              <li className={step.done ? "step done" : "step"} key={step.id}>
                <div className="step-number">{idx + 1}</div>
                <div className="step-copy">
                  <p className="step-title">{step.title}</p>
                  <p className="step-description">{step.description}</p>
                </div>
                <div className={step.done ? "step-state done" : "step-state pending"}>
                  {step.done ? "Ready" : "Pending"}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="row top-row">
          <button type="button" onClick={() => void refreshRequirements()} disabled={running || checking}>
            {checking ? "Checking..." : "Refresh Checks"}
          </button>
          {lastCheckedLabel ? <span className="refresh-meta">Last checked: {lastCheckedLabel}</span> : null}
          <a href={docs.conductor} target="_blank" rel="noreferrer">
            Conductor Docs
          </a>
        </div>

        <ul className="status-list">
          <li>
            {requirements?.claude_installed ? "Ready" : "Needs setup"} - Claude Code{" "}
            <a href={docs.claude} target="_blank" rel="noreferrer">
              Install
            </a>
          </li>
          <li>
            {requirements?.codex_installed ? "Ready" : "Needs setup"} - Codex{" "}
            <a href={docs.codex} target="_blank" rel="noreferrer">
              Install
            </a>
          </li>
          <li>
            {requirements?.railway_installed ? "Ready" : "Needs setup"} - Railway CLI{" "}
            <a href={docs.railway} target="_blank" rel="noreferrer">
              Install
            </a>
          </li>
          <li>
            {requirements?.railway_auth
              ? `Ready (${requirements.railway_auth_source})`
              : railwayToken.trim()
                ? "Token entered (not saved yet)"
                : "Needs setup"}{" "}
            - Railway Auth
          </li>
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

        {!requirements?.railway_auth ? (
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

        <details className="advanced">
          <summary>Advanced: command template</summary>
          <label>
            Single-run command template
            <textarea
              value={commandTemplate}
              onChange={(e) => setCommandTemplate(e.target.value)}
              rows={4}
              disabled={running}
            />
          </label>
          <p className="hint">
            Change this only if your local Claude/Codex command differs from the default.
          </p>
        </details>

        <div className="row">
          <button type="button" onClick={() => void createAgents()} disabled={running || !environmentReady}>
            {running ? "Creating Agents..." : "Create Agents"}
          </button>
          {!environmentReady ? <span className="warn">Complete pending setup items first.</span> : null}
        </div>

        {error ? <p className="error">{error}</p> : null}

        <section className="result">
          <h2>Agent Activity</h2>
          <textarea
            className="log-panel"
            readOnly
            value={liveLog}
            rows={12}
            placeholder="Live run output appears here while agents are being created."
          />
        </section>

        {batchResult ? (
          <section className="result">
            <h2>Run Summary</h2>
            <p>
              total: {batchResult.summary.total}, success: {batchResult.summary.success}, failed:{" "}
              {batchResult.summary.failed}
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
