import sys
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from projects.database import list_projects_from_db, list_project_phases, update_project_phase, get_last_updated_at
from models import (
    PhaseUpdateRequest, PhaseResponse, ReviewCloseRequest, ReviewDecisionRequest,
    SharePointDocumentRequest,
)
from reconciliation.scan_updates import run_scan, database_tools
from integrations.gmail_service import GmailError, GmailService
from reconciliation.activity_review import ReviewError, close_review, decide_action, get_activity_review
from documents.document_store import DocumentError, document_path, get_document, ingest_sharepoint_pdf, list_project_documents
from integrations.sharepoint_service import SharePointError


# Project Engineer FastAPI Backend
app = FastAPI(title="Project Engineer Agent Backend")
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


def _review_call(function, *args, **kwargs):
    """Run an activity review function, mapping its errors to HTTP responses."""
    try:
        return function(*args, **kwargs)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ReviewError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/activities/{activity_id}/review")
def read_activity_review(activity_id: str):
    return _review_call(get_activity_review, activity_id)


@app.get("/activities/{activity_id}/email")
def get_activity_email(activity_id: str):
    """The original email, read from Gmail when the review page opens (nothing extra is stored)."""
    message_id = _review_call(get_activity_review, activity_id)["messageId"]
    try:
        email = GmailService(interactive=False).get_message_detail(message_id)
    except GmailError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {key: email.get(key) for key in ("subject", "from", "to", "date", "body", "attachments")}


# ── Documents: PDFs saved locally first, then parsed (backend/document_store.py) ──

def _document_call(function, *args, **kwargs):
    try:
        return function(*args, **kwargs)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (DocumentError, SharePointError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/documents/sharepoint")
def ingest_sharepoint_document(request: SharePointDocumentRequest):
    """Fetch a PDF from SharePoint / OneDrive, store it locally, and parse it."""
    row = _document_call(ingest_sharepoint_pdf, request.path, request.project_id)
    return _document_call(get_document, row["document_id"], with_pages=False)


@app.get("/projects/{project_id}/documents")
def get_project_documents(project_id: str):
    return list_project_documents(project_id)


@app.get("/documents/{document_id}")
def get_stored_document(document_id: str):
    """Document metadata and its extracted pages (text and tables)."""
    return _document_call(get_document, document_id)


@app.get("/documents/{document_id}/file")
def get_stored_document_file(document_id: str):
    """The stored PDF itself, shown inline (e.g. in the request page iframe)."""
    row = _document_call(get_document, document_id, with_pages=False)
    path = document_path(row)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path, media_type="application/pdf", filename=row["filename"], content_disposition_type="inline")


@app.post("/activities/{activity_id}/actions/{index}")
def decide_activity_action(activity_id: str, index: int, request: ReviewDecisionRequest):
    return _review_call(
        decide_action, activity_id, index, request.decision,
        changes=request.changes, record_id=request.record_id, note=request.note,
    )


@app.post("/activities/{activity_id}/close")
def close_activity_review(activity_id: str, request: ReviewCloseRequest):
    return _review_call(close_review, activity_id, request.note)


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

