import express from "express";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const app = express();
const port = Number(process.env.PORT || 8890);

process.on("uncaughtException", (error) => {
  // Keep server alive and surface crash details in .runtime/server.log for debugging.
  // eslint-disable-next-line no-console
  console.error("[uncaughtException]", error);
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledRejection]", reason);
});

app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const distDir = path.join(appRoot, "dist");
const repoRoot = path.resolve(appRoot, "../..");

function scriptRoot() {
  if (process.env.AF_SCRIPT_ROOT) {
    return process.env.AF_SCRIPT_ROOT;
  }

  return path.resolve(__dirname, "../../../plugins/agent-factory-mac-app/skills/scripts");
}

function parseBool(value) {
  return value === "true";
}

function parseRequirements(stdout) {
  const map = new Map();

  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.split("=");
    if (parts.length < 2) {
      continue;
    }

    const [key, ...rest] = parts;
    map.set(key.trim(), rest.join("=").trim());
  }

  return {
    claude_installed: parseBool(map.get("CLAUDE_INSTALLED")),
    codex_installed: parseBool(map.get("CODEX_INSTALLED")),
    railway_installed: parseBool(map.get("RAILWAY_INSTALLED")),
    git_installed: parseBool(map.get("GIT_INSTALLED")),
    bun_installed: parseBool(map.get("BUN_INSTALLED")),
    railway_auth: parseBool(map.get("RAILWAY_AUTH")),
    railway_auth_source: map.get("RAILWAY_AUTH_SOURCE") || "none",
    provider: map.get("PROVIDER") || "none"
  };
}

function parseSummary(stdout) {
  const lines = stdout.split(/\r?\n/).reverse();
  for (const line of lines) {
    if (!line.startsWith("SUMMARY ")) {
      continue;
    }

    const chunks = line.replace("SUMMARY ", "").trim().split(/\s+/);
    const map = new Map();
    for (const chunk of chunks) {
      const [k, v] = chunk.split("=");
      map.set(k, Number(v));
    }

    return {
      total: Number(map.get("TOTAL") || 0),
      success: Number(map.get("SUCCESS") || 0),
      failed: Number(map.get("FAILED") || 0)
    };
  }

  return { total: 0, success: 0, failed: 0 };
}

function runProcess(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function terminateChildProcess(child) {
  if (!child) {
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // best effort
  }

  setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      // best effort
    }
  }, 1200).unref();
}

function writeNdjson(res, payload) {
  res.write(`${JSON.stringify(payload)}\n`);
}

async function readKeychainToken() {
  const result = await runProcess("security", [
    "find-generic-password",
    "-a",
    "agent-factory-launcher",
    "-s",
    "railway-token",
    "-w"
  ]);

  if (result.code !== 0) {
    return "";
  }

  return result.stdout.trim();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Chrome probes this endpoint; return a tiny JSON payload to avoid noisy 404 logs.
app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
  res.json({ ok: true });
});

// Browsers often request favicon by default; explicit 204 avoids console noise.
app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

app.get("/api/requirements", async (_req, res) => {
  try {
    const detectScript = path.join(scriptRoot(), "detect-requirements.sh");
    const result = await runProcess("/bin/bash", [detectScript]);

    if (result.code !== 0) {
      res.status(500).json({ error: result.stderr || "requirement detection failed" });
      return;
    }

    const payload = parseRequirements(result.stdout);
    if (!payload.railway_auth) {
      const keychainToken = await readKeychainToken();
      if (keychainToken) {
        payload.railway_auth = true;
        payload.railway_auth_source = "keychain";
      }
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/token", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    const result = await runProcess("security", [
      "add-generic-password",
      "-a",
      "agent-factory-launcher",
      "-s",
      "railway-token",
      "-w",
      token,
      "-U"
    ]);

    if (result.code !== 0) {
      res.status(500).json({ error: result.stderr || "failed to save token" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/run-batch", async (req, res) => {
  const count = Number(req.body?.count || 0);
  const commandTemplate = String(req.body?.commandTemplate || "").trim();
  const requestedToken = String(req.body?.railwayToken || "").trim();
  const workRoot = String(req.body?.workRoot || "").trim();
  const timeoutRaw = Number(req.body?.runTimeoutSeconds ?? 1800);
  const runTimeoutSeconds = Number.isInteger(timeoutRaw)
    ? Math.min(7200, Math.max(60, timeoutRaw))
    : 1800;

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    res.status(400).json({ error: "count must be an integer between 1 and 100" });
    return;
  }

  if (!commandTemplate) {
    res.status(400).json({ error: "commandTemplate is required" });
    return;
  }

  try {
    const batchScript = path.join(scriptRoot(), "run-agent-factory-batch.sh");
    const resolvedWorkRoot = workRoot || path.join(process.cwd(), ".context", "agent-factory-web-runs");

    const token = requestedToken || (await readKeychainToken());

    const env = {
      AGENT_FACTORY_COMMAND: commandTemplate,
      AGENT_FACTORY_CWD: repoRoot,
      RUN_TIMEOUT_SECONDS: String(runTimeoutSeconds),
      RUN_HEARTBEAT_SECONDS: "15",
      ...(token ? { RAILWAY_TOKEN: token } : {})
    };

    const result = await runProcess("/bin/bash", [batchScript, String(count), resolvedWorkRoot], env);

    res.json({
      ok: result.code === 0,
      exit_code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: parseSummary(result.stdout),
      work_root: resolvedWorkRoot
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/run-batch-stream", async (req, res) => {
  const count = Number(req.body?.count || 0);
  const commandTemplate = String(req.body?.commandTemplate || "").trim();
  const requestedToken = String(req.body?.railwayToken || "").trim();
  const workRoot = String(req.body?.workRoot || "").trim();
  const timeoutRaw = Number(req.body?.runTimeoutSeconds ?? 1800);
  const runTimeoutSeconds = Number.isInteger(timeoutRaw)
    ? Math.min(7200, Math.max(60, timeoutRaw))
    : 1800;

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    res.status(400).json({ error: "count must be an integer between 1 and 100" });
    return;
  }

  if (!commandTemplate) {
    res.status(400).json({ error: "commandTemplate is required" });
    return;
  }

  try {
    const batchScript = path.join(scriptRoot(), "run-agent-factory-batch.sh");
    const resolvedWorkRoot = workRoot || path.join(process.cwd(), ".context", "agent-factory-web-runs");
    const token = requestedToken || (await readKeychainToken());

    const env = {
      ...process.env,
      AGENT_FACTORY_COMMAND: commandTemplate,
      AGENT_FACTORY_CWD: repoRoot,
      RUN_TIMEOUT_SECONDS: String(runTimeoutSeconds),
      RUN_HEARTBEAT_SECONDS: "15",
      ...(token ? { RAILWAY_TOKEN: token } : {})
    };

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const child = spawn("/bin/bash", [batchScript, String(count), resolvedWorkRoot], {
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let clientClosed = false;
    let responseEnded = false;

    const safeWrite = (payload) => {
      if (clientClosed || responseEnded) {
        return;
      }
      try {
        writeNdjson(res, payload);
      } catch {
        clientClosed = true;
      }
    };

    const safeEnd = () => {
      if (responseEnded) {
        return;
      }
      responseEnded = true;
      try {
        res.end();
      } catch {
        // no-op
      }
    };

    req.on("aborted", () => {
      clientClosed = true;
      terminateChildProcess(child);
    });

    res.on("close", () => {
      if (responseEnded) {
        return;
      }
      clientClosed = true;
      terminateChildProcess(child);
    });

    res.on("error", () => {
      clientClosed = true;
      terminateChildProcess(child);
    });

    safeWrite({ type: "start", work_root: resolvedWorkRoot });

    child.stdout.on("data", (chunk) => {
      const data = chunk.toString();
      stdout += data;
      safeWrite({ type: "stdout", data });
    });

    child.stderr.on("data", (chunk) => {
      const data = chunk.toString();
      stderr += data;
      safeWrite({ type: "stderr", data });
    });

    child.on("error", (error) => {
      safeWrite({ type: "error", error: String(error) });
      safeEnd();
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      safeWrite({
        type: "end",
        ok: exitCode === 0,
        exit_code: exitCode,
        stdout,
        stderr,
        summary: parseSummary(stdout),
        work_root: resolvedWorkRoot
      });
      safeEnd();
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

if (existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.type("html").send(
      "<!doctype html><html><body><h2>Agent Factory Web</h2><p>UI build missing. Start with Agent Factory.app or Agent Factory Launcher.command to auto-build and launch.</p></body></html>"
    );
  });
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`agent-factory-web backend listening on http://localhost:${port}`);
});
