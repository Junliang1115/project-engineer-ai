"""Save PDFs locally first, record them, then extract their text and tables.

The original file is always stored before parsing, so a document that fails to parse is never
lost (status `failed`, file kept). Files are content-addressed: DOCUMENT_STORAGE_DIR/<sha[:2]>/<sha>.pdf.
The same bytes are stored once, however many emails or SharePoint paths they arrive from (one
`document` row, several `document_source` rows). The path never comes from the incoming filename,
which is kept only as metadata.

This is backend code, not an agent tool: agents read documents through the database MCP
(`list_project_documents`, `get_document_text`) and never write them.
"""

import hashlib
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from psycopg.types.json import Jsonb

try:
    from ..mcp_servers.mcp_db_server import _get_conn
    from .pdf_extractor import PdfExtractionError, extract_pdf
except ImportError:  # Supports `uvicorn --app-dir backend`.
    from mcp_servers.mcp_db_server import _get_conn
    from documents.pdf_extractor import PdfExtractionError, extract_pdf

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_STORAGE_DIR = REPO_ROOT / "public" / "request"
MAX_DOCUMENT_BYTES = 25 * 1024 * 1024
MAX_FILENAME_CHARS = 200
SOURCE_TYPES = {"gmail", "sharepoint"}


class DocumentError(ValueError):
    """The file cannot be stored (not a PDF, too large, bad source)."""


def storage_dir() -> Path:
    """Where PDFs are kept: DOCUMENT_STORAGE_DIR, else public/request in the repo."""
    custom = os.getenv("DOCUMENT_STORAGE_DIR", "").strip()
    return Path(custom) if custom else DEFAULT_STORAGE_DIR


def is_pdf(filename: str = "", mime_type: str = "") -> bool:
    return mime_type.lower() == "application/pdf" or str(filename).lower().endswith(".pdf")


def _clean_filename(filename: str) -> str:
    name = Path(str(filename or "").replace("\\", "/")).name.strip() or "document.pdf"
    return name[:MAX_FILENAME_CHARS]


def _write_once(data: bytes, sha256: str) -> str:
    """Write the bytes to their content address if not already there; return the relative path."""
    relative = Path(sha256[:2]) / f"{sha256}.pdf"
    target = storage_dir() / relative
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        # Atomic: a crash never leaves a half-written PDF at the final path.
        fd, temp_path = tempfile.mkstemp(dir=target.parent, suffix=".part")
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(data)
            os.replace(temp_path, target)
        except BaseException:
            Path(temp_path).unlink(missing_ok=True)
            raise
    return relative.as_posix()


def document_path(row: dict) -> Path:
    """Absolute path of a stored document row."""
    return storage_dir() / row["storage_path"]


def save_document(data: bytes, *, filename: str, source_type: str, source_ref: str,
                  attachment_name: str = "", project_id: str | None = None) -> dict:
    """Store a PDF locally and record it (status `stored`). Returns the document row.

    Re-saving the same bytes returns the existing row and only adds the new source.
    """
    if source_type not in SOURCE_TYPES:
        raise DocumentError(f"Unknown document source: {source_type}")
    if not data:
        raise DocumentError("Document is empty")
    if len(data) > MAX_DOCUMENT_BYTES:
        raise DocumentError(f"Document is larger than {MAX_DOCUMENT_BYTES // (1024 * 1024)} MB")
    if not data.lstrip()[:5] == b"%PDF-":
        raise DocumentError("Not a PDF file")

    sha256 = hashlib.sha256(data).hexdigest()
    relative = _write_once(data, sha256)  # Save locally first.
    with _get_conn() as conn:
        with conn.transaction():
            row = conn.execute(
                """INSERT INTO document (project_id, sha256, filename, size_bytes, storage_path)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (sha256) DO UPDATE SET project_id = coalesce(document.project_id, excluded.project_id)
                RETURNING *""",
                (project_id, sha256, _clean_filename(filename), len(data), relative),
            ).fetchone()
            conn.execute(
                """INSERT INTO document_source (document_id, source_type, source_ref, attachment_name)
                VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                (row["document_id"], source_type, str(source_ref), _clean_filename(attachment_name or filename)),
            )
    return row


def ingest_document(document_id) -> dict:
    """Extract a stored document's pages and record the result (status `parsed` or `failed`).

    Parsing failures are recorded on the row; the stored file is always kept.
    """
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM document WHERE document_id = %s", (document_id,)).fetchone()
    if not row:
        raise LookupError("Document not found")
    if row["status"] == "parsed":
        return row
    now = datetime.now(timezone.utc)
    try:
        extracted = extract_pdf(document_path(row))
    except PdfExtractionError as exc:
        with _get_conn() as conn:
            return conn.execute(
                "UPDATE document SET status = 'failed', error = %s, parsed_at = %s WHERE document_id = %s RETURNING *",
                (str(exc)[:1000], now, document_id),
            ).fetchone()
    metadata = {**extracted["metadata"], **({"pages_truncated": True} if extracted["truncated"] else {})}
    with _get_conn() as conn:
        with conn.transaction():
            conn.execute("DELETE FROM document_page WHERE document_id = %s", (document_id,))
            for page in extracted["pages"]:
                conn.execute(
                    "INSERT INTO document_page (document_id, page_number, text, tables, has_text) VALUES (%s, %s, %s, %s, %s)",
                    (document_id, page["page"], page["text"].replace("\x00", ""), Jsonb(page["tables"]), page["has_text"]),
                )
            return conn.execute(
                """UPDATE document SET status = 'parsed', error = NULL, page_count = %s, metadata = %s, parsed_at = %s
                WHERE document_id = %s RETURNING *""",
                (extracted["page_count"], Jsonb(metadata), now, document_id),
            ).fetchone()


def assign_project(document_ids: list, project_id: str) -> None:
    """Link documents to a project once it is known (e.g. after the email is classified).

    A document already linked to a project keeps it.
    """
    with _get_conn() as conn:
        conn.execute(
            "UPDATE document SET project_id = %s WHERE document_id::text = ANY(%s) AND project_id IS NULL",
            (project_id, [str(document_id) for document_id in document_ids]),
        )


def store_and_ingest(data: bytes, **source) -> dict:
    """Save locally first, then parse. Returns the final document row."""
    row = save_document(data, **source)
    return ingest_document(row["document_id"])


def ingest_sharepoint_pdf(path: str, project_id: str | None = None, sharepoint=None) -> dict:
    """Fetch a PDF from SharePoint / OneDrive, store it, and parse it."""
    if not is_pdf(path):
        raise DocumentError("Only PDF files can be ingested")
    if sharepoint is None:
        try:
            from ..integrations.sharepoint_service import SharePointService
        except ImportError:
            from integrations.sharepoint_service import SharePointService
        sharepoint = SharePointService()
    data = sharepoint.get_file_bytes(path, MAX_DOCUMENT_BYTES)
    return store_and_ingest(data, filename=Path(path).name, source_type="sharepoint", source_ref=path, project_id=project_id)


# ── Reads ─────────────────────────────────────────────────────────────────────

DOCUMENT_COLUMNS = "d.document_id, d.project_id, d.filename, d.size_bytes, d.page_count, d.metadata, d.status, d.error, d.created_at, d.parsed_at"


def documents_for_source(source_type: str, source_ref: str) -> list[dict]:
    """Documents that arrived from one email (source_ref = Gmail message id) or SharePoint path."""
    with _get_conn() as conn:
        return conn.execute(
            f"""SELECT {DOCUMENT_COLUMNS}, s.attachment_name FROM document_source s
            JOIN document d ON d.document_id = s.document_id
            WHERE s.source_type = %s AND s.source_ref = %s ORDER BY s.attachment_name""",
            (source_type, source_ref),
        ).fetchall()


def list_project_documents(project_id: str) -> list[dict]:
    with _get_conn() as conn:
        return conn.execute(
            f"SELECT {DOCUMENT_COLUMNS} FROM document d WHERE d.project_id = %s ORDER BY d.created_at DESC",
            (project_id,),
        ).fetchall()


def get_document(document_id, *, with_pages: bool = True) -> dict:
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM document WHERE document_id::text = %s", (str(document_id),)).fetchone()
        if not row:
            raise LookupError("Document not found")
        if with_pages:
            row["pages"] = conn.execute(
                "SELECT page_number, text, tables, has_text FROM document_page WHERE document_id = %s ORDER BY page_number",
                (row["document_id"],),
            ).fetchall()
    return row
