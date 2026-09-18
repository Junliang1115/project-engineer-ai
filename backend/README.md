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
