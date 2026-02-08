#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize)]
struct Requirements {
    claude_installed: bool,
    codex_installed: bool,
    railway_installed: bool,
    git_installed: bool,
    bun_installed: bool,
    railway_auth: bool,
    railway_auth_source: String,
    provider: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BatchRequest {
    count: u16,
    command_template: String,
    railway_token: Option<String>,
    work_root: Option<String>,
}

#[derive(Debug, Serialize)]
struct BatchSummary {
    total: u16,
    success: u16,
    failed: u16,
}

#[derive(Debug, Serialize)]
struct BatchResult {
    ok: bool,
    exit_code: i32,
    stdout: String,
    stderr: String,
    summary: BatchSummary,
    work_root: String,
}

fn parse_bool(value: Option<&str>) -> bool {
    matches!(value, Some("true"))
}

fn parse_u16(value: Option<&str>) -> u16 {
    value.and_then(|v| v.parse::<u16>().ok()).unwrap_or(0)
}

fn default_script_root() -> Result<PathBuf, String> {
    if let Ok(explicit) = env::var("AF_SCRIPT_ROOT") {
        return Ok(PathBuf::from(explicit));
    }

    let cwd = env::current_dir().map_err(|e| format!("current_dir failed: {e}"))?;
    Ok(cwd.join("plugins/agent-factory-mac-app/skills/scripts"))
}

fn parse_requirements(output: &str) -> Requirements {
    let mut map = std::collections::HashMap::new();

    for line in output.lines() {
        if let Some((key, value)) = line.split_once('=') {
            map.insert(key.trim().to_string(), value.trim().to_string());
        }
    }

    Requirements {
        claude_installed: parse_bool(map.get("CLAUDE_INSTALLED").map(String::as_str)),
        codex_installed: parse_bool(map.get("CODEX_INSTALLED").map(String::as_str)),
        railway_installed: parse_bool(map.get("RAILWAY_INSTALLED").map(String::as_str)),
        git_installed: parse_bool(map.get("GIT_INSTALLED").map(String::as_str)),
        bun_installed: parse_bool(map.get("BUN_INSTALLED").map(String::as_str)),
        railway_auth: parse_bool(map.get("RAILWAY_AUTH").map(String::as_str)),
        railway_auth_source: map
            .get("RAILWAY_AUTH_SOURCE")
            .cloned()
            .unwrap_or_else(|| "none".to_string()),
        provider: map
            .get("PROVIDER")
            .cloned()
            .unwrap_or_else(|| "none".to_string()),
    }
}

fn parse_summary(stdout: &str) -> BatchSummary {
    for line in stdout.lines().rev() {
        if !line.starts_with("SUMMARY ") {
            continue;
        }

        let mut map = std::collections::HashMap::new();
        for token in line.split_whitespace().skip(1) {
            if let Some((k, v)) = token.split_once('=') {
                map.insert(k, v);
            }
        }

        return BatchSummary {
            total: parse_u16(map.get("TOTAL").copied()),
            success: parse_u16(map.get("SUCCESS").copied()),
            failed: parse_u16(map.get("FAILED").copied()),
        };
    }

    BatchSummary {
        total: 0,
        success: 0,
        failed: 0,
    }
}

#[tauri::command]
fn detect_requirements() -> Result<Requirements, String> {
    let script_root = default_script_root()?;
    let script = script_root.join("detect-requirements.sh");

    let output = Command::new("/bin/bash")
        .arg(script)
        .output()
        .map_err(|e| format!("failed to execute detection script: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(parse_requirements(&String::from_utf8_lossy(&output.stdout)))
}

#[tauri::command]
fn store_railway_token(token: String) -> Result<(), String> {
    let status = Command::new("security")
        .args([
            "add-generic-password",
            "-a",
            "agent-factory-launcher",
            "-s",
            "railway-token",
            "-w",
            token.as_str(),
            "-U",
        ])
        .status()
        .map_err(|e| format!("failed to call security tool: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("failed to save Railway token in Keychain".to_string())
    }
}

#[tauri::command]
fn run_batch(request: BatchRequest) -> Result<BatchResult, String> {
    if request.count < 1 || request.count > 100 {
        return Err("count must be between 1 and 100".to_string());
    }

    let script_root = default_script_root()?;
    let script = script_root.join("run-agent-factory-batch.sh");

    let work_root = request.work_root.unwrap_or_else(|| {
        let mut p = env::temp_dir();
        p.push("agent-factory-launcher-runs");
        p.to_string_lossy().to_string()
    });

    let mut cmd = Command::new("/bin/bash");
    cmd.arg(script)
        .arg(request.count.to_string())
        .arg(&work_root)
        .env("AGENT_FACTORY_COMMAND", request.command_template);

    if let Some(token) = request.railway_token {
        if !token.trim().is_empty() {
            cmd.env("RAILWAY_TOKEN", token);
        }
    }

    let output = cmd
        .output()
        .map_err(|e| format!("failed to execute batch script: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let summary = parse_summary(&stdout);
    let code = output.status.code().unwrap_or(1);

    Ok(BatchResult {
        ok: output.status.success(),
        exit_code: code,
        stdout,
        stderr,
        summary,
        work_root,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_requirements,
            store_railway_token,
            run_batch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
