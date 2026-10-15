from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import list_projects_from_db, get_project_from_db, list_project_phases, update_project_phase, get_last_updated_at
from agents import run_agent_workflow
from risk_agent import run_risk_investigation, run_schema_discovery
from models import AgentRunRequest, AgentRunResponse, PhaseUpdateRequest, PhaseResponse
from scan_updates import run_scan, database_tools
from gmail_service import GmailService


# Project Engineer FastAPI Backend
app = FastAPI(title="Project Engineer Agent Backend")
agent_runs: dict[str, dict] = {}
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/projects")
def list_projects():
    return list_projects_from_db()


_last_scan_triggered_at: str | None = None


@app.get("/projects-meta")
def get_projects_meta():
    global _last_scan_triggered_at
    # If a scan was triggered in this server lifetime, use it; otherwise fallback to DB last scan
    timestamp = _last_scan_triggered_at or get_last_updated_at()
    return {"last_updated": timestamp}


@app.get("/risk-agent/schema/{project_id}")
async def discover_risk_schema(project_id: str):
    return await run_schema_discovery(project_id)


@app.post("/risk-agent/investigate")
async def investigate_risk(request: AgentRunRequest):
    return await run_risk_investigation(request.project_id, request.message)


@app.post("/scan-gmail")
async def trigger_scan_updates(query: str = "label:INBOX newer_than:7d PRJ-", limit: int = 25, dry_run: bool = False):
    global _last_scan_triggered_at
    now_iso = datetime.now(timezone.utc).isoformat()
    _last_scan_triggered_at = now_iso
    try:
        async with database_tools() as db_tools:
            result = await run_scan(GmailService(), db_tools, None, query, limit, dry_run)
        return {
            "status": "success",
            "result": result,
            "last_updated": now_iso,
        }
    except Exception as exc:
        error_msg = str(exc)
        if hasattr(exc, "exceptions") and exc.exceptions:
            error_msg = "; ".join(str(e) for e in exc.exceptions)
        print(f"[ERROR] /scan-gmail failed: {error_msg}", file=sys.stderr, flush=True)
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/projects/{project_id}/phases")
def get_project_phases(project_id: str):
    return list_project_phases(project_id)


@app.patch("/projects/{project_id}/phases/{phase_id}", response_model=PhaseResponse)
def update_phase(project_id: str, phase_id: str, request: PhaseUpdateRequest):
    updated = update_project_phase(
        project_id=project_id,
        phase_id=phase_id,
        new_status=request.status,
        progress_percent=request.progress_percent,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Phase or Project not found")
    return updated


@app.post("/agent-runs", response_model=AgentRunResponse)
def create_agent_run(request: AgentRunRequest):
    project = get_project_from_db(request.project_id)
    projects_list = [project] if project else []
    result = run_agent_workflow(request.project_id, request.message, projects_list)
    agent_runs[result["id"]] = result
    return result


@app.get("/agent-runs/{run_id}", response_model=AgentRunResponse)
def get_agent_run(run_id: str):
    try:
        return agent_runs[run_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Agent run not found") from exc

