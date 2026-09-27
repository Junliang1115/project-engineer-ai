import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.scan_updates import run_scan


class FakeGmail:
    def list_messages(self, query, max_results):
        return [{"id": "g1"}, {"id": "g2"}]

    def get_message_detail(self, message_id):
        return {"id": message_id, "subject": "PRJ-2401 Daily update", "date": "Mon, 21 Sep 2026 10:00:00 +0800", "body": "PRJ-2401 daily update: TSK-102 is complete"}


class FakeStructured:
    def invoke(self, prompt):
        return {"categories": ["daily_update"], "project_id": "PRJ-2401", "task_id": "TSK-102", "reported_date": "2026-09-21", "reported_status": "complete", "destination": "project_task", "action": "update", "evidence": "TSK-102 is complete"}


class FakeModel:
    def with_structured_output(self, schema):
        return FakeStructured()


class FakeDb:
    def __init__(self):
        self.writes = []

    async def call(self, name, args):
        if name == "get_email_processing":
            return {"processing_state": "applied" if args["message_id"] == "g1" else "unseen"}
        if name == "lookup_email_context":
            return {"project": {"id": "PRJ-2401"}, "task": {"task_id": "TSK-102", "project_id": "PRJ-2401", "status": "in_progress"}}
        if name == "apply_email_decision":
            self.writes.append(args)
            return {"state": "applied"}
        raise AssertionError(name)


class FailingDb(FakeDb):
    async def call(self, name, args):
        if name == "apply_email_decision" and '"message_id": "g1"' in args["payload_json"]:
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
        self.assertEqual(result["updated"], 1)

    async def test_duplicate_skipped_and_unique_email_applied(self):
        db = FakeDb()
        result = await run_scan(FakeGmail(), db, FakeModel(), "label:INBOX", 2, False)
        self.assertEqual(result["skipped"], 1)
        self.assertEqual(result["updated"], 1)
        self.assertEqual(len(db.writes), 1)

    async def test_dry_run_never_writes(self):
        db = FakeDb()
        result = await run_scan(FakeGmail(), db, FakeModel(), "label:INBOX", 2, True)
        self.assertEqual(result["updated"], 0)
        self.assertEqual(db.writes, [])

    async def test_one_failed_email_does_not_stop_batch(self):
        class UnseenDb(FailingDb):
            async def call(self, name, args):
                if name == "get_email_processing":
                    return {"processing_state": "unseen"}
                return await super().call(name, args)

        db = UnseenDb()
        result = await run_scan(FakeGmail(), db, FakeModel(), "label:INBOX", 2, False)
        self.assertEqual(result["failed"], 1)
        self.assertEqual(result["updated"], 1)


if __name__ == "__main__":
    unittest.main()
