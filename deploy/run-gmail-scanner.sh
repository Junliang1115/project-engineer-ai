#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "${BASH_SOURCE[0]%/*}/.." && pwd)"
env_file="$HOME/.config/project-engineer/gmail-scanner.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing scanner environment file: $env_file" >&2
  exit 1
fi

if [[ ! -f "$project_dir/backend/scan_gmail.py" ]]; then
  echo "Gmail scanner is not implemented at $project_dir/backend/scan_gmail.py" >&2
  exit 1
fi

# The private file may contain shell-style KEY=value lines.
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

python_bin="$project_dir/.venv/bin/python"
if [[ ! -x "$python_bin" ]]; then
  echo "Python executable not found: $python_bin" >&2
  exit 1
fi

cd "$project_dir"
exec "$python_bin" -m backend.scan_gmail \
  --query "${GMAIL_SCAN_QUERY:-label:INBOX newer_than:7d}" \
  --limit "${GMAIL_SCAN_LIMIT:-25}"
