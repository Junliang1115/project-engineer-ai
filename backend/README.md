# Project Engineer FastAPI Backend

This is the V1 backend for prompt routing and delegated project-engineering agents.

## Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## PostgreSQL mock database

```bash
createdb project_engineer
psql -d project_engineer -f backend/db/schema.sql
psql -d project_engineer -f backend/db/seed.sql
```

## Run with Docker

### Standalone Backend:
```bash
docker build -t project-engineer-backend ./backend
docker run -p 8000:8000 -e DATABASE_URL="postgresql://postgres:postgrespassword@host.docker.internal:5433/project_engineer" project-engineer-backend
```

### Full Stack (PostgreSQL + Backend + Frontend):
From the project root:
```bash
docker compose up --build
```
This automatically boots PostgreSQL 16 (with schema and seed loaded), the FastAPI backend on port `8000`, and the frontend on port `3000`.


## Endpoints

- `GET /health`
- `GET /projects`
- `POST /agent-runs`
- `GET /agent-runs/{run_id}`

## Example

```json
{
  "project_id": "PRJ-2401",
  "message": "Pipe thickness is not enough and may delay installation"
}
```

## SharePoint MCP

The SharePoint MCP server provides read-only access to one configured
SharePoint site's default document library. It can list and search files,
read UTF-8 text files, download files, and return bounded ranges from `.xlsx`
workbooks.

### Microsoft Entra setup

1. Register a Microsoft Entra application as a public client.
2. Add `http://localhost` as a Mobile and desktop application redirect URI.
3. Enable public client flows.
4. Add delegated Microsoft Graph permissions `Files.Read.All` and
   `Sites.Read.All`, then grant any tenant consent required by your
   organization.

The server does not use or require a client secret. It exposes no SharePoint
write operation.

### Configure and run

```powershell
$env:SHAREPOINT_CLIENT_ID="00000000-0000-0000-0000-000000000000"
$env:SHAREPOINT_TENANT_ID="contoso.onmicrosoft.com"
$env:SHAREPOINT_SITE_URL="https://contoso.sharepoint.com/sites/Engineering"
python backend/mcp_sharepoint_server.py
```

`SHAREPOINT_DOWNLOAD_DIR` is optional and defaults to
`backend/downloads/sharepoint`. On the first tool call, Microsoft sign-in
opens in the default browser. If interactive browser authentication is not
available, the server writes device-code instructions to stderr. Later calls
reuse the local token cache at `backend/.sharepoint_token_cache.json`.

Available tools:

- `list_sharepoint_files`
- `search_sharepoint_files`
- `read_sharepoint_file`
- `download_sharepoint_file`
- `read_excel_range`

## AWS Linux Gmail scanner schedule

The scheduled Gmail reconciliation scanner is planned in
`docs/superpowers/plans/2026-09-21-gmail-reconciliation-agent.md`. The cron
installer checks that `backend/scan_gmail.py` exists, so it cannot enable the
job before the scanner is implemented.

Once the scanner is available, set up a host Python virtual environment and a
private environment file for the Linux user that owns the cron job:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
mkdir -p "$HOME/.config/project-engineer"
chmod 700 "$HOME/.config/project-engineer"
cat > "$HOME/.config/project-engineer/gmail-scanner.env" <<'EOF'
DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/project_engineer'
DEEPSEEK_API_KEY='YOUR_KEY'
GMAIL_CREDENTIALS_PATH='/absolute/path/to/credentials.json'
GMAIL_TOKEN_PATH='/absolute/path/to/token.json'
GMAIL_SCAN_QUERY='label:INBOX newer_than:7d'
GMAIL_SCAN_LIMIT=25
EOF
chmod 600 "$HOME/.config/project-engineer/gmail-scanner.env"
```

Complete Gmail OAuth interactively once under the same Linux user to create
`token.json`. Then run `bash deploy/run-gmail-scanner.sh` manually and inspect
its result before installing the schedule with `bash deploy/install-gmail-cron.sh`.
The installer adds one cron entry every 15 minutes and uses `flock` to prevent
overlapping runs. Logs go to `~/.local/state/project-engineer/gmail-scanner.log`.
Check it with `crontab -l` and `tail -f ~/.local/state/project-engineer/gmail-scanner.log`.
