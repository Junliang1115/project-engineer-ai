"""Extract text, tables and metadata from a stored PDF, page by page (pdfplumber, no OCR).

PDFs come from email attachments and SharePoint, so they are untrusted: page count, text and
table sizes are capped, and an encrypted or corrupt file raises PdfExtractionError instead of
crashing the caller. Pages with no extractable text (usually scans) are flagged with has_text=False.
"""

from pathlib import Path

MAX_PAGES = 300
MAX_PAGE_CHARS = 20_000
MAX_TABLES_PER_PAGE = 20
MAX_TABLE_ROWS = 200
METADATA_KEYS = {"Title": "title", "Author": "author", "Subject": "subject", "CreationDate": "created", "Producer": "producer"}


class PdfExtractionError(RuntimeError):
    """The PDF could not be read (encrypted, corrupt, or not a PDF)."""


def _clean_cell(cell) -> str:
    return " ".join(str(cell).split()) if cell is not None else ""


def _page_content(page) -> dict:
    text = (page.extract_text() or "").strip()
    tables = []
    for table in (page.extract_tables() or [])[:MAX_TABLES_PER_PAGE]:
        rows = [[_clean_cell(cell) for cell in row] for row in table[:MAX_TABLE_ROWS] if row]
        rows = [row for row in rows if any(row)]
        if rows:
            tables.append(rows)
    return {
        "page": page.page_number,
        "text": text[:MAX_PAGE_CHARS],
        "tables": tables,
        "has_text": bool(text),
    }


def _metadata(raw: dict) -> dict:
    return {
        name: _clean_cell(raw[key])
        for key, name in METADATA_KEYS.items()
        if raw.get(key) not in (None, "") and isinstance(raw.get(key), (str, int, float))
    }


def extract_pdf(path: str | Path, *, opener=None) -> dict:
    """Return {metadata, page_count, pages: [{page, text, tables, has_text}], truncated}.

    `opener` (defaults to pdfplumber.open) is injectable for tests.
    """
    if opener is None:
        import pdfplumber
        opener = pdfplumber.open
    try:
        with opener(str(path)) as pdf:
            page_count = len(pdf.pages)
            pages = [_page_content(page) for page in pdf.pages[:MAX_PAGES]]
            return {
                "metadata": _metadata(pdf.metadata or {}),
                "page_count": page_count,
                "pages": pages,
                "truncated": page_count > MAX_PAGES,
            }
    except PdfExtractionError:
        raise
    except Exception as exc:  # pdfminer raises many types for encrypted / malformed files
        raise PdfExtractionError(f"Could not read PDF: {type(exc).__name__}: {exc}") from exc


def render_pages(pages: list[dict], max_chars: int) -> tuple[str, bool]:
    """Plain-text rendering of extracted pages for a prompt: text, then tables as pipe rows.

    Returns (text, truncated).
    """
    parts = []
    for page in pages:
        lines = [f"[page {page['page']}]"]
        if page.get("text"):
            lines.append(page["text"])
        for table in page.get("tables") or []:
            lines.extend(" | ".join(row) for row in table)
        if not page.get("has_text") and not page.get("tables"):
            lines.append("(no extractable text; possibly a scanned page)")
        parts.append("\n".join(lines))
    text = "\n\n".join(parts)
    if len(text) <= max_chars:
        return text, False
    return text[:max_chars], True
