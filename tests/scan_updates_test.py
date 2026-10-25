import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.reconciliation.scan_updates import _attachment_documents, run_scan

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_fixtures import make_pdf


PROJECT_RECORDS = {"status": "ok", "project_id": "PRJ-2401", "entities": {
    "project": {"id_column": "id", "records": [{"id": "PRJ-2401", "name": "Harbor Link Station"}], "truncated": False},
    "project_task": {"id_column": "task_id", "records": [{"task_id": "TSK-102", "task_name": "Facade", "status": "in_progress"}], "truncated": False},
}}


class FakeGmail:
    def list_messages(self, query, max_results):
        return [{"id": "g1"}, {"id": "g2"}]

    def get_message_detail(self, message_id):
        return {"id": message_id, "subject": "PRJ-2401 Daily update", "date": "Mon, 21 Sep 2026 10:00:00 +0800", "body": "PRJ-2401 daily update: TSK-102 is complete"}


class FakeStructured:
    def invoke(self, prompt):
        return {"categories": ["daily_update"], "project_id": "PRJ-2401", "reported_date": "2026-09-21", "summary": "TSK-102 done", "actions": [{"operation": "update", "entity": "project_task", "record_id": "TSK-102", "changes": [{"field": "status", "value": "completed"}], "evidence": "TSK-102 is complete", "confidence": "high"}]}


class FakeModel:
    def with_structured_output(self, schema):
        return FakeStructured()


class FakeDb:
    def __init__(self):
        self.writes = []

    async def call(self, name, args):
        if name == "get_email_processing":
            return {"processing_state": "applied" if args["message_id"] == "g1" else "unseen"}
        if name == "get_project_entity_schema":
            return {"status": "ok", "entities": {}}
        if name == "list_projects":
            return {"status": "ok", "projects": [{"id": "PRJ-2401", "name": "Harbor Link Station", "status": "active"}]}
        if name == "get_project_records":
            return PROJECT_RECORDS
        if name == "record_email_decision":
            self.writes.append(args)
            return {"state": "needs_review", "proposed_actions": []}
        raise AssertionError(name)


class FailingDb(FakeDb):
    async def call(self, name, args):
        if name == "record_email_decision" and '"message_id": "g1"' in args["payload_json"]:
            raise RuntimeError("database unavailable")
        return await super().call(name, args)


class ScannerTest(unittest.IsolatedAsyncioTestCase):
    async def test_pages_past_processed_messages_to_find_new_mail(self):
        class PagedGmail(FakeGmail):
            def iter_message_refs(self, query):
                yield from [{"id": "g1"}, {"id": "g2"}, {"id": "g3"}]

            def list_messages(self, query, max_results):
                raise AssertionError("Expected paginated Gmail listing")

        class MostlyProcessedDb(FakeDb):
            async def call(self, name, args):
                if name == "get_email_processing":
                    return {"processing_state": "applied" if args["message_id"] in {"g1", "g2"} else "unseen"}
                return await super().call(name, args)

        result = await run_scan(PagedGmail(), MostlyProcessedDb(), FakeModel(), "label:INBOX", 1, False)
        self.assertEqual(result["skipped"], 2)
        self.assertEqual(result["review"], 1)

    async def test_duplicate_skipped_and_unique_email_recorded_for_review(self):
        db = FakeDb()
        result = await run_scan(FakeGmail(), db, FakeModel(), "label:INBOX", 2, False)
        self.assertEqual(result["skipped"], 1)
        self.assertEqual(result["review"], 1)
        self.assertEqual(len(db.writes), 1)

    async def test_dry_run_never_writes(self):
        db = FakeDb()
        result = await run_scan(FakeGmail(), db, FakeModel(), "label:INBOX", 2, True)
        self.assertEqual(result["review"], 1)  # Previewed outcome for the one unprocessed email.
        self.assertTrue(db.writes)
        self.assertTrue(all(write["dry_run"] is True for write in db.writes))

    async def test_one_failed_email_does_not_stop_batch(self):
        class UnseenDb(FailingDb):
            async def call(self, name, args):
                if name == "get_email_processing":
                    return {"processing_state": "unseen"}
                return await super().call(name, args)

        db = UnseenDb()
        result = await run_scan(FakeGmail(), db, FakeModel(), "label:INBOX", 2, False)
        self.assertEqual(result["failed"], 1)
        self.assertEqual(result["review"], 1)


class AttachmentDocumentsTest(unittest.TestCase):
    def test_dry_run_parses_pdf_attachments_without_storing_them(self):
        class AttachmentGmail:
            def get_attachment_bytes(self, message_id, attachment_id):
                if attachment_id == "bad":
                    raise RuntimeError("download failed")
                return make_pdf(["TSK-H01 started on 2026-10-20"])

        email = {"id": "g9", "attachments": [
            {"filename": "report.pdf", "mime_type": "application/pdf", "attachment_id": "a1"},
            {"filename": "photo.jpg", "mime_type": "image/jpeg", "attachment_id": "a2"},
            {"filename": "broken.pdf", "mime_type": "application/pdf", "attachment_id": "bad"},
        ]}
        documents = _attachment_documents(email, AttachmentGmail(), dry_run=True)
        self.assertEqual([(d["filename"], d["status"]) for d in documents], [("report.pdf", "preview"), ("broken.pdf", "failed")])
        self.assertIn("TSK-H01 started", documents[0]["pages"][0]["text"])
        self.assertNotIn("document_id", documents[0])  # Nothing stored in a dry run.


if __name__ == "__main__":
    unittest.main()
