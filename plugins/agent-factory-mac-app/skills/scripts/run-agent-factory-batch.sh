#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <count:1-100> <work-root>" >&2
  exit 2
fi

count="$1"
work_root="$2"

if ! [[ "$count" =~ ^[0-9]+$ ]]; then
  echo "count must be an integer" >&2
  exit 2
fi

if [ "$count" -lt 1 ] || [ "$count" -gt 100 ]; then
  echo "count must be between 1 and 100" >&2
  exit 2
fi

if [ -z "${AGENT_FACTORY_COMMAND:-}" ]; then
  echo "AGENT_FACTORY_COMMAND is required" >&2
  exit 2
fi

stop_on_failure="${STOP_ON_FAILURE:-false}"
run_timeout_seconds="${RUN_TIMEOUT_SECONDS:-1800}"
heartbeat_seconds="${RUN_HEARTBEAT_SECONDS:-15}"
command_cwd="${AGENT_FACTORY_CWD:-$PWD}"
base_stamp="$(date +%Y%m%d-%H%M%S)"
current_run_pid=""
current_tail_pid=""

terminate_pid() {
  local pid="$1"
  if [ -z "$pid" ]; then
    return
  fi
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
  fi
}

cleanup_current_run() {
  terminate_pid "$current_tail_pid"
  terminate_pid "$current_run_pid"
}

trap cleanup_current_run EXIT
trap 'cleanup_current_run; exit 130' INT
trap 'cleanup_current_run; exit 143' TERM

if ! [[ "$run_timeout_seconds" =~ ^[0-9]+$ ]]; then
  echo "RUN_TIMEOUT_SECONDS must be a non-negative integer" >&2
  exit 2
fi

if ! [[ "$heartbeat_seconds" =~ ^[0-9]+$ ]]; then
  echo "RUN_HEARTBEAT_SECONDS must be a non-negative integer" >&2
  exit 2
fi

if [ ! -d "$command_cwd" ]; then
  echo "AGENT_FACTORY_CWD does not exist: $command_cwd" >&2
  exit 2
fi

mkdir -p "$work_root"

success=0
failed=0

for i in $(seq 1 "$count"); do
  run_started_at="$(date +%s)"
  last_heartbeat_at="$run_started_at"
  timed_out="false"
  run_dir="$work_root/run-${base_stamp}-${i}"
  run_log="$run_dir/run.log"

  mkdir -p "$run_dir"
  : > "$run_log"

  echo "RUN_INDEX=$i STATUS=started LOG=$run_log CWD=$command_cwd" | tee -a "$run_log"

  (
    cd "$command_cwd"
    RUN_INDEX="$i" RUN_DIR="$run_dir" AGENT_FACTORY_COMMAND="$AGENT_FACTORY_COMMAND" \
      /bin/sh -lc 'eval "$AGENT_FACTORY_COMMAND"'
  ) >>"$run_log" 2>&1 &
  run_pid="$!"
  current_run_pid="$run_pid"

  tail -n 0 -f "$run_log" &
  tail_pid="$!"
  current_tail_pid="$tail_pid"

  while kill -0 "$run_pid" 2>/dev/null; do
    sleep 1

    now="$(date +%s)"
    elapsed="$((now - run_started_at))"

    if [ "$heartbeat_seconds" -gt 0 ] && [ $((now - last_heartbeat_at)) -ge "$heartbeat_seconds" ]; then
      echo "RUN_INDEX=$i STATUS=running ELAPSED_SECONDS=$elapsed" >>"$run_log"
      last_heartbeat_at="$now"
    fi

    if [ "$run_timeout_seconds" -gt 0 ] && [ "$elapsed" -ge "$run_timeout_seconds" ]; then
      echo "RUN_INDEX=$i STATUS=timeout TIMEOUT_SECONDS=$run_timeout_seconds" >>"$run_log"
      timed_out="true"
      kill "$run_pid" 2>/dev/null || true
      sleep 2
      if kill -0 "$run_pid" 2>/dev/null; then
        kill -9 "$run_pid" 2>/dev/null || true
      fi
      break
    fi
  done

  if wait "$run_pid"; then
    exit_code=0
  else
    exit_code=$?
  fi

  kill "$tail_pid" 2>/dev/null || true
  wait "$tail_pid" 2>/dev/null || true

  current_run_pid=""
  current_tail_pid=""

  run_finished_at="$(date +%s)"
  run_duration="$((run_finished_at - run_started_at))"

  if [ "$timed_out" = "true" ] && [ "$exit_code" -eq 0 ]; then
    exit_code=124
  fi

  if [ "$exit_code" -eq 0 ]; then
    success=$((success + 1))
    echo "RUN_INDEX=$i STATUS=success LOG=$run_log DURATION_SECONDS=$run_duration" | tee -a "$run_log"
  else
    failed=$((failed + 1))
    echo "RUN_INDEX=$i STATUS=failed LOG=$run_log EXIT_CODE=$exit_code DURATION_SECONDS=$run_duration" | tee -a "$run_log"

    if [ "$stop_on_failure" = "true" ]; then
      break
    fi
  fi
done

echo "SUMMARY TOTAL=$count SUCCESS=$success FAILED=$failed"

if [ "$failed" -gt 0 ]; then
  exit 1
fi
