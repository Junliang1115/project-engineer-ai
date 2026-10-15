import sys
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.email_reconciliation import EmailFacts, create_email_model, decide_email


class EmailReconciliationTest(unittest.TestCase):
    @patch.dict("os.environ", {"DEEPSEEK_API_KEY": "test-key", "DEEPSEEK_MODEL": "deepseek-v4-flash"})
    @patch("langchain_deepseek.ChatDeepSeek")
    def test_v4_flash_structured_email_model_disables_thinking(self, chat_model):
        create_email_model()

        chat_model.assert_called_once_with(
            model="deepseek-v4-flash",
            temperature=0,
            extra_body={"thinking": {"type": "disabled"}},
        )

    def test_task_update_requires_matching_project_and_forward_status(self):
        facts = EmailFacts(
            categories=["daily_update"], project_id="PRJ-2401", task_id="TSK-102",
            reported_date=date(2026, 9, 21), reported_status="complete",
            destination="project_task", action="update", evidence="TSK-102 is complete",
        )
        context = {"project": {"id": "PRJ-2401"}, "task": {"task_id": "TSK-102", "project_id": "PRJ-2401", "status": "in_progress"}}
        result = decide_email(facts, context, {"id": "gmail-1", "subject": "PRJ-2401 Daily update", "date": "Mon, 21 Sep 2026 10:00:00 +0800", "body": "TSK-102 is complete"})
        self.assertEqual(result["state"], "applied")
        self.assertEqual(result["actions"], [{"kind": "update_task", "task_id": "TSK-102", "status": "complete", "reported_date": "2026-09-21"}])

    def test_multiple_project_ids_need_review(self):
        facts = EmailFacts(categories=["daily_update"], project_id="PRJ-2401", task_id="TSK-102", reported_date=date(2026, 9, 21), reported_status="complete", destination="project_task", action="update", evidence="TSK-102 is complete")
        result = decide_email(facts, {"project": {"id": "PRJ-2401"}}, {"id": "gmail-2", "subject": "PRJ-2401", "body": "Also PRJ-2402"})
        self.assertEqual(result["state"], "needs_review")

    def test_change_order_creates_request(self):
        facts = EmailFacts(categories=["change_order"], project_id="PRJ-2401", request_id="CO-2026-001", destination="request", action="create", evidence="CO-2026-001")
        result = decide_email(facts, {"project": {"id": "PRJ-2401"}, "request": None}, {"id": "gmail-3", "subject": "PRJ-2401 CO-2026-001", "body": "CO-2026-001 new pipeline scope"})
        self.assertEqual(result["state"], "applied")
        self.assertEqual(result["actions"], [{"kind": "create_request", "request_id": "CO-2026-001", "request_type": "change_order", "title": "PRJ-2401 CO-2026-001", "description": "CO-2026-001 new pipeline scope"}])

    def test_change_order_already_exists_no_change(self):
        facts = EmailFacts(categories=["change_order"], project_id="PRJ-2401", request_id="CO-2026-001", destination="request", action="create", evidence="CO-2026-001")
        existing_co = {"request_id": "CO-2026-001", "project_id": "PRJ-2401", "request_type": "change_order", "status": "open"}
        result = decide_email(facts, {"project": {"id": "PRJ-2401"}, "request": existing_co}, {"id": "gmail-3", "subject": "PRJ-2401 CO-2026-001", "body": "CO-2026-001 new pipeline scope"})
        self.assertEqual(result["state"], "no_change")
        self.assertEqual(result["actions"], [])

    def test_older_task_report_needs_review(self):
        facts = EmailFacts(categories=["daily_update"], project_id="PRJ-2401", task_id="TSK-102", reported_date=date(2026, 9, 20), reported_status="complete", destination="project_task", action="update", evidence="TSK-102 is complete")
        context = {"project": {"id": "PRJ-2401"}, "task": {"task_id": "TSK-102", "project_id": "PRJ-2401", "status": "in_progress"}, "last_applied_source_date": "2026-09-21"}
        result = decide_email(facts, context, {"id": "gmail-4", "subject": "PRJ-2401", "body": "TSK-102 is complete"})
        self.assertEqual(result["state"], "needs_review")

    def test_explicit_technical_query_creates_request(self):
        facts = EmailFacts(categories=["technical_query"], project_id="PRJ-2401", request_id="TQ-2026-0913", destination="request", action="create", evidence="TQ-2026-0913")
        context = {"project": {"id": "PRJ-2401"}, "request": None}
        email = {"id": "gmail-5", "subject": "PRJ-2401 TQ-2026-0913", "body": "TQ-2026-0913 asks about pipe thickness."}
        result = decide_email(facts, context, email)
        self.assertEqual(result["state"], "applied")
        self.assertEqual(result["actions"][0]["kind"], "create_request")

    def test_invalid_task_status_transition_needs_review(self):
        facts = EmailFacts(categories=["daily_update"], project_id="PRJ-2401", task_id="TSK-102", reported_date=date(2026, 9, 21), reported_status="in_progress", destination="project_task", action="update", evidence="TSK-102 is underway")
        # Already complete, cannot revert to in_progress
        context = {"project": {"id": "PRJ-2401"}, "task": {"task_id": "TSK-102", "project_id": "PRJ-2401", "status": "complete"}}
        email = {"id": "gmail-6", "subject": "PRJ-2401", "date": "Mon, 21 Sep 2026 10:00:00 +0800", "body": "TSK-102 is underway"}
        self.assertEqual(decide_email(facts, context, email)["state"], "needs_review")

    def test_task_update_requires_reported_date_evidence(self):
        facts = EmailFacts(categories=["daily_update"], project_id="PRJ-2401", task_id="TSK-102", reported_date=date(2026, 9, 22), reported_status="completed", destination="project_task", action="update", evidence="TSK-102 is complete")
        context = {"project": {"id": "PRJ-2401"}, "task": {"task_id": "TSK-102", "project_id": "PRJ-2401", "status": "in_progress"}}
        email = {"id": "gmail-7", "subject": "PRJ-2401", "date": "Mon, 21 Sep 2026 10:00:00 +0800", "body": "TSK-102 is complete"}
        self.assertEqual(decide_email(facts, context, email)["state"], "needs_review")

    def test_task_update_accepts_natural_language_reported_date_evidence(self):
        facts = EmailFacts(
            categories=["daily_update"], project_id="PRJ-2401", task_id="TSK-103",
            reported_date=date(2026, 9, 30), reported_status="completed",
            destination="project_task", action="update",
            evidence="TSK-103 completed as of 30 September 2026",
        )
        context = {"project": {"id": "PRJ-2401"}, "task": {"task_id": "TSK-103", "project_id": "PRJ-2401", "status": "in_progress"}}
        email = {"id": "gmail-8", "subject": "PRJ-2401", "body": "TSK-103 was completed as of 30 September 2026."}

        self.assertEqual(decide_email(facts, context, email)["state"], "applied")


if __name__ == "__main__":
    unittest.main()
