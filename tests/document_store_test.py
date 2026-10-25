"""Document store: save PDFs locally first, record them, then parse.

Unit tests use a temporary storage folder and a fake connection. The integration class runs the
real flow (store -> parse -> dedup -> failure) against TEST_DATABASE_URL, a throwaway database whose
name contains "test"; it is skipped otherwise.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.documents import document_store
from backend.documents.document_store import DocumentError, is_pdf, save_document
from pdf_fixtures import make_pdf

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "")
DB_DIR = Path(__file__).resolve().parents[1] / "backend" / "db"


class FakeConnection:
    """Records document / document_source inserts; one row per sha256, like the unique constraint."""

    def __init__(self):
        self.documents = {}
        self.sources = set()
        self.last = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def transaction(self):
        return self

    def execute(self, sql, params=()):
        self.last = None
        if sql.startswith("INSERT INTO document "):
            project_id, sha256, filename, size, path = params
            row = self.documents.setdefault(sha256, {
                "document_id": f"doc-{len(self.documents) + 1}", "project_id": project_id, "sha256": sha256,
                "filename": filename, "size_bytes": size, "storage_path": path, "status": "stored",
            })
            self.last = row
        elif sql.startswith("INSERT INTO document_source"):
            self.sources.add(tuple(params))
        return self

    def fetchone(self):
        return self.last


class DocumentStoreTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"DOCUMENT_STORAGE_DIR": self.folder.name})
        self.env.start()
        self.conn = FakeConnection()
        self.get_conn = patch.object(document_store, "_get_conn", return_value=self.conn)
        self.get_conn.start()

    def tearDown(self):
        self.get_conn.stop()
        self.env.stop()
        self.folder.cleanup()

    def test_default_storage_is_public_request(self):
        with patch.dict(os.environ, {"DOCUMENT_STORAGE_DIR": ""}):
            self.assertEqual(document_store.storage_dir(), Path(document_store.REPO_ROOT) / "public" / "request")

    def test_saved_locally_by_content_and_deduplicated(self):
        data = make_pdf(["TQ-2026-0913 pipe wall thickness"])
        first = save_document(data, filename="TQ-0913.pdf", source_type="gmail", source_ref="msg-1")
        second = save_document(data, filename="copy.pdf", source_type="sharepoint", source_ref="Projects/TQ.pdf")

        self.assertEqual(first["document_id"], second["document_id"])  # One document...
        self.assertEqual(len(self.conn.sources), 2)  # ...arriving from two places.
        stored = list(Path(self.folder.name).rglob("*.pdf"))
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0].read_bytes(), data)
        self.assertEqual(stored[0].name, f"{first['sha256']}.pdf")
        self.assertEqual(first["storage_path"], f"{first['sha256'][:2]}/{first['sha256']}.pdf")
        self.assertEqual(list(Path(self.folder.name).rglob("*.part")), [])  # No leftover temp files.

    def test_filename_never_affects_the_storage_path(self):
        row = save_document(make_pdf(["x"]), filename="../../evil\\..\\name.pdf", source_type="gmail", source_ref="m")
        self.assertEqual(row["filename"], "name.pdf")
        self.assertNotIn("..", row["storage_path"])
        self.assertTrue(all(Path(self.folder.name) in path.parents for path in Path(self.folder.name).rglob("*.pdf")))

    def test_rejects_non_pdfs_oversize_and_unknown_sources(self):
        cases = [
            (b"PK\x03\x04 zip file", "gmail", "Not a PDF"),
            (b"", "gmail", "empty"),
            (make_pdf(["x"]), "dropbox", "Unknown document source"),
        ]
        for data, source, message in cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(DocumentError, message):
                    save_document(data, filename="a.pdf", source_type=source, source_ref="r")
        with patch.object(document_store, "MAX_DOCUMENT_BYTES", 10):
            with self.assertRaisesRegex(DocumentError, "larger than"):
                save_document(make_pdf(["x"]), filename="a.pdf", source_type="gmail", source_ref="r")
        self.assertEqual(list(Path(self.folder.name).rglob("*")), [])  # Nothing written for rejected files.

    def test_is_pdf(self):
        self.assertTrue(is_pdf("Report.PDF"))
        self.assertTrue(is_pdf("scan", "application/pdf"))
        self.assertFalse(is_pdf("sheet.xlsx", "application/vnd.ms-excel"))


@unittest.skipUnless(TEST_DATABASE_URL, "TEST_DATABASE_URL is not set")
class DocumentStoreDbTest(unittest.TestCase):
    def setUp(self):
        import psycopg

        self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=True)
        if "test" not in self.conn.execute("select current_database()").fetchone()[0]:
            self.conn.close()
            self.fail("Refusing to reset a non-test database")
        self.conn.execute("drop schema if exists public cascade")
        self.conn.execute("create schema public")
        self.conn.execute((DB_DIR / "schema.sql").read_text(encoding="utf-8"))
        self.conn.execute("insert into project (id, name, current_phase, current_milestone) values ('PRJ-A', 'A', 'Design', 'M-001')")
        self.folder = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"DOCUMENT_STORAGE_DIR": self.folder.name})
        self.env.start()
        from backend.mcp_servers import mcp_db_server
        self.db_url = patch.object(mcp_db_server, "DATABASE_URL", TEST_DATABASE_URL)
        self.db_url.start()

    def tearDown(self):
        self.db_url.stop()
        self.env.stop()
        self.folder.cleanup()
        self.conn.close()

    def test_store_parse_dedup_and_failure(self):
        data = make_pdf(["TSK-H01 started on 2026-10-20", "Page two"], title="Site report")
        parsed = document_store.store_and_ingest(data, filename="report.pdf", source_type="gmail", source_ref="msg-1")
        self.assertEqual((parsed["status"], parsed["page_count"], parsed["metadata"]["title"]), ("parsed", 2, "Site report"))
        document = document_store.get_document(parsed["document_id"])
        self.assertIn("TSK-H01 started", document["pages"][0]["text"])

        again = document_store.store_and_ingest(data, filename="report.pdf", source_type="sharepoint", source_ref="P/report.pdf")
        self.assertEqual(again["document_id"], parsed["document_id"])
        self.assertEqual(len(document_store.documents_for_source("sharepoint", "P/report.pdf")), 1)
        document_store.assign_project([parsed["document_id"]], "PRJ-A")
        self.assertEqual([d["filename"] for d in document_store.list_project_documents("PRJ-A")], ["report.pdf"])

        broken = document_store.store_and_ingest(b"%PDF-1.4\nnot really a pdf", filename="broken.pdf",
                                                 source_type="gmail", source_ref="msg-2")
        self.assertEqual(broken["status"], "failed")
        self.assertTrue(document_store.document_path(broken).is_file())  # The file is kept for a person to open.


if __name__ == "__main__":
    unittest.main()
