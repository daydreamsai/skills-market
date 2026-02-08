#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd "$script_dir/.." && pwd)"
runtime_dir="$app_dir/.runtime"
port="${PORT:-8890}"
uid="$(id -u)"
label="build.agentfactory.web"
plist_file="$HOME/Library/LaunchAgents/$label.plist"

launchctl bootout "gui/$uid/$label" >/dev/null 2>&1 || true
launchctl bootout "gui/$uid" "$plist_file" >/dev/null 2>&1 || true

for pid in $(lsof -ti "tcp:$port" 2>/dev/null || true); do
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.25
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
done

rm -f "$runtime_dir/server.pid"
