import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.reconciliation import activity_review
from backend.reconciliation.activity_review import ReviewError, close_review, decide_action, get_activity_review


def proposal(changes, record_id="TSK-102", entity="project_task", operation="update", **extra):
    action = {
        "operation": operation, "entity": entity, "project_id": "PRJ-2401", "changes": changes,
        "confidence": "high", "categories": ["daily_update"], "evidence": {field: "TSK-102 is complete" for field in changes},
        "check": "ok", **extra,
    }
    if record_id:
        action["record_id"] = record_id
    return action


class FakeConnection:
    """Answers the queries activity_review and _apply_project_action make; records every statement."""

    def __init__(self, proposals, state="needs_review", task_status="in_progress"):
        self.activity = {
            "activity_id": "a-1", "project_id": "PRJ-2401", "task_id": "TSK-102", "activity_type": "daily_update",
            "title": "PRJ-2401 update", "summary": "TSK-102 done", "source_path": "gmail-1", "processing_state": state,
            "processing_details": {"sender": "site@x.com", "warnings": ["Project not found in database"], "date_status": "missing",
                                   "dates": [{"date": "2026-10-30", "kind": "planned", "evidence": "finish by 30/10/2026"}],
                                   "project_evidence": "Harbor Link Station",
                                   "proposed_actions": proposals},
            "created_at": None,
        }
        self.task_status = task_status
        self.statements = []
        self.last_sql = ""

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def transaction(self):
        return self

    def execute(self, sql, params=None):
        self.last_sql = sql
        self.statements.append((sql, params))
        if sql.startswith("UPDATE activity_log"):
            self.activity["processing_details"] = params[0].obj
            self.activity["processing_state"] = params[1]
        return self

    def fetchall(self):
        if "FROM document_source" in self.last_sql:
            return [{"documentId": "doc-1", "filename": "report.pdf", "pageCount": 2, "status": "parsed", "error": None}]
        return []

    def fetchone(self):
        sql = self.last_sql
        if "FROM activity_log" in sql:
            return dict(self.activity)
        if "SELECT id FROM project" in sql:
            return {"id": "PRJ-2401"}
        if "FROM project_task" in sql:
            return {"task_id": "TSK-102", "project_id": "PRJ-2401", "status": self.task_status, "remark": "old"}
        if sql.startswith("UPDATE project_task"):
            return {"task_id": "TSK-102"}
        return None

    def writes(self, table):
        return [params for sql, params in self.statements if sql.startswith(f"UPDATE {table}")]


class ActivityReviewTest(unittest.TestCase):
    def run_with(self, conn, function, *args, **kwargs):
        with patch.object(activity_review, "_get_conn", return_value=conn):
            return function(*args, **kwargs)

    def test_review_shows_current_values_and_edit_fields(self):
        conn = FakeConnection([proposal({"status": "completed"})])
        review = self.run_with(conn, get_activity_review, "a-1")
        self.assertEqual((review["messageId"], review["warnings"], review["dateStatus"]),
                         ("gmail-1", ["Project not found in database"], "missing"))
        self.assertEqual(review["documents"][0]["documentId"], "doc-1")
        self.assertEqual((review["dates"][0]["kind"], review["projectEvidence"]), ("planned", "Harbor Link Station"))  # Stored PDF attachments of this email.
        [shown] = review["proposals"]
        self.assertEqual(shown["current"], {"status": "in_progress"})
        self.assertEqual(shown["fields"]["status"]["allowed_values"], ["planned", "in_progress", "completed", "blocked"])
        self.assertNotIn("pydantic_type", shown["fields"]["status"])

    def test_legacy_rows_turn_their_reason_into_warnings(self):
        details = {"reason": "Proposed changes need user review"}
        self.assertEqual((activity_review._email_warnings(details), activity_review._date_status(details)), ([], None))
        details = {"reason": "update project_task: TSK-1 matched by name, not written in the email; Reported date is missing"}
        self.assertEqual(activity_review._email_warnings(details), ["update project_task: TSK-1 matched by name, not written in the email"])
        self.assertEqual(activity_review._date_status(details), "missing")
        self.assertEqual(activity_review._date_status({"reason": "Proposed changes need user review", "reported_date": "2026-09-21"}), "ok")

    def test_approve_applies_the_change_and_closes_the_email(self):
        conn = FakeConnection([proposal({"status": "completed"})])
        result = self.run_with(conn, decide_action, "a-1", 0, "approve")
        self.assertEqual((result["state"], result["review"]["decision"], result["review"]["record_id"]),
                         ("applied", "approved", "TSK-102"))
        [update] = conn.writes("project_task")
        self.assertEqual(update[0], "completed")
        self.assertEqual(conn.activity["processing_details"]["proposed_actions"][0]["review"]["decision"], "approved")

    def test_edited_values_are_applied_and_attributed_to_the_reviewer(self):
        conn = FakeConnection([proposal({"status": "completed"})])
        result = self.run_with(conn, decide_action, "a-1", 0, "approve", changes={"status": "blocked", "remark": "On hold"})
        self.assertEqual(result["review"]["applied_changes"], {"status": "blocked", "remark": "On hold"})
        self.assertEqual(conn.writes("project_task")[0][:2], ("blocked", "On hold"))

        action, edited = activity_review._reviewed_action(proposal({"status": "completed"}), "PRJ-2401",
                                                       {"status": "completed", "remark": "x"}, "TSK-103")
        self.assertTrue(edited)
        self.assertEqual(action["record_id"], "TSK-103")
        self.assertEqual(action["evidence"], {"status": "TSK-102 is complete", "remark": activity_review.REVIEWER_EVIDENCE})
        self.assertNotIn("check", action)

    def test_rule_violation_changes_nothing(self):
        conn = FakeConnection([proposal({"status": "completed"})], task_status="planned")
        with self.assertRaisesRegex(ReviewError, "Invalid status transition from planned to completed"):
            self.run_with(conn, decide_action, "a-1", 0, "approve")
        self.assertEqual(conn.writes("activity_log"), [])
        self.assertEqual(conn.activity["processing_state"], "needs_review")

    def test_reject_needs_a_note_and_email_stays_open_until_all_are_decided(self):
        conn = FakeConnection([proposal({"status": "completed"}), proposal({"remark": "x"})])
        with self.assertRaisesRegex(ReviewError, "note is required"):
            self.run_with(conn, decide_action, "a-1", 0, "reject")
        result = self.run_with(conn, decide_action, "a-1", 0, "reject", note="Wrong task")
        self.assertEqual((result["state"], result["review"]["note"]), ("needs_review", "Wrong task"))
        with self.assertRaisesRegex(ReviewError, "already been decided"):
            self.run_with(conn, decide_action, "a-1", 0, "approve")
        self.assertEqual(self.run_with(conn, decide_action, "a-1", 1, "reject", note="No")["state"], "rejected")
        with self.assertRaisesRegex(ReviewError, "already been reviewed"):
            self.run_with(conn, decide_action, "a-1", 1, "approve")

    def test_close_rejects_undecided_changes(self):
        conn = FakeConnection([proposal({"status": "completed"}), proposal({"remark": "x"})])
        self.run_with(conn, decide_action, "a-1", 0, "approve")
        with self.assertRaisesRegex(ReviewError, "note is required"):
            self.run_with(conn, close_review, "a-1")
        result = self.run_with(conn, close_review, "a-1", "Remark not needed")
        self.assertEqual((result["state"], result["rejected"]), ("applied", [1]))
        decisions = [p["review"]["decision"] for p in conn.activity["processing_details"]["proposed_actions"]]
        self.assertEqual(decisions, ["approved", "rejected"])

        no_proposals = FakeConnection([])
        self.assertEqual(self.run_with(no_proposals, close_review, "a-1")["state"], "no_change")

    def test_unknown_email_or_change(self):
        conn = FakeConnection([proposal({"status": "completed"})])
        with self.assertRaises(LookupError):
            self.run_with(conn, decide_action, "a-1", 5, "approve")
        with self.assertRaisesRegex(ReviewError, "approve or reject"):
            self.run_with(conn, decide_action, "a-1", 0, "maybe")


if __name__ == "__main__":
    unittest.main()
