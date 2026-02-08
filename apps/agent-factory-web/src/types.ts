export type Provider = "claude" | "codex";

export type Requirements = {
  claude_installed: boolean;
  codex_installed: boolean;
  railway_installed: boolean;
  git_installed: boolean;
  bun_installed: boolean;
  railway_auth: boolean;
  railway_auth_source: "none" | "env" | "cli" | "keychain";
  provider: "none" | "claude" | "codex" | "both";
};

export type BatchSummary = {
  total: number;
  success: number;
  failed: number;
};

export type BatchResult = {
  ok: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
  summary: BatchSummary;
  work_root: string;
};
