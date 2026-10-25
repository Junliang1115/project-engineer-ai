import sys
import unittest
import json
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.mcp_servers.mcp_db_server import _validate_project_action, record_email_decision


class FakeConnection:
    """Records SQL; nested transaction() calls model savepoints and remember whether they roll back."""

    def __init__(self, duplicate=False, task_status="in_progress"):
        self.duplicate = duplicate
        self.task_status = task_status
        self.last_sql = ""
        self.statements = []
        self.rollbacks = []  # force_rollback flag of every transaction/savepoint opened

    def __enter__(self):
        return self

    def __exit__(self, *_):
        pass

    def transaction(self, force_rollback=False):
        self.rollbacks.append(force_rollback)
        return self

    def execute(self, sql, params=None):
        self.last_sql = sql
        self.statements.append((sql, params))
        return self

    def fetchone(self):
        if "SELECT id FROM project" in self.last_sql:
            return {"id": "PRJ-2401"}
        if "INSERT INTO activity_log" in self.last_sql:
            return None if self.duplicate else {"activity_id": "log-1"}
        if "FROM project_task" in self.last_sql and "FOR UPDATE" in self.last_sql:
            return {"task_id": "TSK-1", "project_id": "PRJ-2401", "status": self.task_status}
        if "UPDATE project_task" in self.last_sql:
            return {"task_id": "TSK-1"}
        if "INSERT INTO request" in self.last_sql:
            return {"request_id": self.statements[-1][1][1]}
        return None

    def logged(self):
        """(task_id, processing_state, processing_details) of each activity_log insert."""
        return [(params[1], params[7], json.loads(params[8])) for sql, params in self.statements if "INSERT INTO activity_log" in sql]


def project_action(operation, entity, changes, record_id=None, project_id="PRJ-2401", confidence="high"):
    action = {
        "operation": operation, "entity": entity, "project_id": project_id, "changes": changes,
        "confidence": confidence, "categories": ["daily_update"], "evidence": {name: "email evidence" for name in changes},
    }
    if record_id:
        action["record_id"] = record_id
    return action


TASK_UPDATE = project_action("update", "project_task", {"status": "completed", "remark": "Facade done"}, record_id="TSK-1")


def review(*actions, warnings=()):
    return {"state": "needs_review", "warnings": list(warnings), "date_status": "ok", "reported_date": "2026-09-21",
            "proposed_actions": list(actions)}


def record(payload, conn, dry_run=False):
    with patch("backend.mcp_servers.mcp_db_server._get_conn", return_value=conn):
        return json.loads(record_email_decision(json.dumps({"message_id": "g1", "project_id": "PRJ-2401", **payload}), dry_run))


class EmailActionValidationTest(unittest.TestCase):
    def test_rejects_actions_agents_could_not_make_either(self):
        cases = [
            ({"kind": "update_task", "task_id": "TSK-1", "status": "completed"}, "Unsupported entity"),
            (project_action("delete", "project_task", {"status": "completed"}, record_id="TSK-1"), "Unsupported operation"),
            (project_action("update", "milestone", {"created_at": "2026-09-21"}, record_id="M-001"), "Unknown or read-only field 'created_at'"),
            (project_action("update", "project_task", {"status": "completed"}, record_id="TSK-1", project_id="PRJ-OTHER"), "project does not match"),
            ({key: value for key, value in TASK_UPDATE.items() if key != "categories"}, "Invalid action"),
            ({**TASK_UPDATE, "changes": {"status": 5}}, "Invalid action"),
            ({**TASK_UPDATE, "evidence": {"status": "", "remark": ""}}, "Evidence is required"),
        ]
        for action, message in cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValueError, message):
                    _validate_project_action(action, "PRJ-2401")

    def test_accepts_every_change_agents_may_make_and_keeps_confidence(self):
        actions = [
            project_action("update", "milestone", {"status": "completed"}, record_id="M-001"),
            project_action("update", "project_task", {"status": "blocked"}, record_id="TSK-1", confidence="medium"),
            project_action("create", "risk_register", {"category": "Schedule", "title": "Late gauges", "owner": "QA"}),
        ]
        validated = [_validate_project_action(action, "PRJ-2401") for action in actions]
        self.assertEqual([(a["entity"], a["operation"]) for a in validated],
                         [("milestone", "update"), ("project_task", "update"), ("risk_register", "create")])
        self.assertEqual(validated[1]["confidence"], "medium")
        self.assertNotIn("outcome", validated[1])


class RecordEmailDecisionTest(unittest.TestCase):
    def test_proposed_actions_are_logged_for_review_and_never_applied(self):
        conn = FakeConnection()
        changes = {"request_id": "CO-2026-001", "title": "t", "request_type": "change_order", "description": "d"}
        result = record({"decision": review(TASK_UPDATE, project_action("create", "request", changes))}, conn)
        self.assertEqual(result["state"], "needs_review")
        self.assertEqual([a["check"] for a in result["proposed_actions"]], ["ok", "ok"])
        # Each check runs in its own savepoint that is always rolled back; the log row itself is kept.
        self.assertEqual(conn.rollbacks, [False, True, True])
        [(task_id, state, details)] = conn.logged()
        self.assertEqual((task_id, state, details["reported_date"]), ("TSK-1", "needs_review", "2026-09-21"))
        self.assertEqual([a["entity"] for a in details["proposed_actions"]], ["project_task", "request"])

    def test_proposals_force_review_and_applied_is_not_accepted(self):
        result = record({"decision": {"state": "no_change", "proposed_actions": [TASK_UPDATE]}}, FakeConnection())
        self.assertEqual(result["state"], "needs_review")
        self.assertIn("error", record({"decision": {"state": "applied", "actions": [TASK_UPDATE]}}, FakeConnection()))

    def test_rule_violations_are_shown_to_the_reviewer(self):
        class ExistingRequest(FakeConnection):
            def fetchone(self):
                if "SELECT 1 FROM request" in self.last_sql:
                    return {"?column?": 1}
                return super().fetchone()

        changes = {"request_id": "TQ-2026-0913", "title": "t", "request_type": "technical_query", "description": "d"}
        cases = [
            ("invalid transition", FakeConnection(task_status="planned"), TASK_UPDATE, "Invalid status transition from planned to completed"),
            ("already exists", ExistingRequest(), project_action("create", "request", changes), "request TQ-2026-0913 already exists"),
            ("other project", FakeConnection(), {**TASK_UPDATE, "project_id": "PRJ-OTHER"}, "Action project does not match the email"),
        ]
        for name, conn, action, check in cases:
            with self.subTest(name):
                result = record({"decision": review(action)}, conn)
                self.assertEqual(result["proposed_actions"][0]["check"], check)
                [(task_id, state, details)] = conn.logged()
                self.assertEqual((task_id, state, details["proposed_actions"][0]["check"]), (None, "needs_review", check))

    def test_daily_update_without_actions_is_logged_as_no_change(self):
        conn = FakeConnection()
        result = record({"decision": {"state": "no_change", "proposed_actions": []}}, conn)
        self.assertEqual(result["state"], "no_change")
        self.assertEqual(conn.logged()[0][1], "no_change")

    def test_warnings_date_status_and_note_are_logged(self):
        conn = FakeConnection()
        result = record({"decision": {**review(TASK_UPDATE, warnings=["Project not found in database"]), "note": "No gauge date"}}, conn)
        self.assertEqual(result["warnings"], ["Project not found in database"])
        [(_, _, details)] = conn.logged()
        self.assertEqual((details["warnings"], details["date_status"], details["note"]),
                         (["Project not found in database"], "ok", "No gauge date"))
        self.assertNotIn("reason", details)

    def test_change_warnings_are_kept_and_ignored_by_validation(self):
        conn = FakeConnection()
        flagged = {**TASK_UPDATE, "warnings": ["TSK-1 matched by name, not written in the email"]}
        result = record({"decision": review(flagged)}, conn)
        [proposal] = result["proposed_actions"]
        self.assertEqual((proposal["check"], proposal["warnings"]), ("ok", ["TSK-1 matched by name, not written in the email"]))

    def test_duplicate_email_is_already_processed(self):
        self.assertEqual(record({"decision": review(TASK_UPDATE)}, FakeConnection(duplicate=True)), {"state": "already_processed"})

    def test_dry_run_rolls_back_everything(self):
        conn = FakeConnection()
        result = record({"decision": review(TASK_UPDATE)}, conn, dry_run=True)
        self.assertEqual((result["state"], result["dry_run"]), ("needs_review", True))
        self.assertTrue(conn.rollbacks[0])


if __name__ == "__main__":
    unittest.main()
