#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "${BASH_SOURCE[0]%/*}/.." && pwd)"
runner="$project_dir/deploy/run-gmail-scanner.sh"
log_dir="$HOME/.local/state/project-engineer"
env_file="$HOME/.config/project-engineer/gmail-scanner.env"
marker='# project-engineer-gmail-scanner'

if [[ ! -f "$project_dir/backend/scan_gmail.py" ]]; then
  echo "Gmail scanner is not implemented yet; cron installation was skipped." >&2
  exit 1
fi
if [[ ! -f "$env_file" ]]; then
  echo "Create the private environment file first: $env_file" >&2
  exit 1
fi
if [[ ! -x "$project_dir/.venv/bin/python" ]]; then
  echo "Create the Python virtual environment and install backend requirements first." >&2
  exit 1
fi
for path in "$runner" "$log_dir" "$env_file"; do
  if [[ "$path" =~ [[:space:]%] ]]; then
    echo "Cron paths cannot contain spaces or percent signs: $path" >&2
    exit 1
  fi
done

mkdir -p "$log_dir"
existing="$(crontab -l 2>/dev/null || true)"
job="*/15 * * * * /usr/bin/flock -n $log_dir/gmail-scanner.lock /usr/bin/bash $runner >> $log_dir/gmail-scanner.log 2>&1 $marker"
{
  printf '%s\n' "$existing" | sed "/$marker/d"
  printf '%s\n' "$job"
} | sed '/^$/d' | crontab -
echo "Installed: $job"
