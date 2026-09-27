import sys
import unittest
import json
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.mcp_servers.mcp_db_server import _validate_email_actions, apply_email_decision


class FakeConnection:
    def __init__(self, duplicate=False, fail_update=False):
        self.duplicate = duplicate
        self.fail_update = fail_update
        self.last_sql = ""
        self.rolled_back = False
        self.statements = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_):
        self.rolled_back |= exc_type is not None

    def transaction(self):
        return self

    def cursor(self):
        return self

    def execute(self, sql, params=None):
        self.last_sql = sql
        self.statements.append((sql, params))
        if self.fail_update and "UPDATE project_task" in sql:
            raise RuntimeError("write failed")

    def fetchone(self):
        if "SELECT id FROM project" in self.last_sql:
            return {"id": "PRJ-2401"}
        if "INSERT INTO activity_log" in self.last_sql:
            return None if self.duplicate else {"activity_id": "log-1"}
        if "SELECT status FROM project_task" in self.last_sql:
            return {"status": "in_progress"}
        if "source_date" in self.last_sql:
            return {"source_date": None}
        return None


class GmailDatabaseDecisionTest(unittest.TestCase):
    def test_rejects_arbitrary_table_or_status(self):
        with self.assertRaises(ValueError):
            _validate_email_actions([{"kind": "update_project", "status": "complete"}])
        with self.assertRaises(ValueError):
            _validate_email_actions([{"kind": "update_task", "task_id": "TSK-1", "status": "approved", "reported_date": "2026-09-21"}])

    def test_accepts_fixed_task_action(self):
        actions = [{"kind": "update_task", "task_id": "TSK-1", "status": "complete", "reported_date": "2026-09-21"}]
        self.assertEqual(_validate_email_actions(actions), actions)

    def test_duplicate_email_skips_all_updates(self):
        conn = FakeConnection(duplicate=True)
        payload = {"message_id": "g1", "project_id": "PRJ-2401", "decision": {"state": "applied", "actions": [{"kind": "update_task", "task_id": "TSK-1", "status": "complete", "reported_date": "2026-09-21"}]}}
        with patch("backend.mcp_servers.mcp_db_server._get_conn", return_value=conn):
            result = json.loads(apply_email_decision(json.dumps(payload)))
        self.assertEqual(result["state"], "already_processed")
        self.assertFalse(any("UPDATE project_task" in sql for sql, _ in conn.statements))

    def test_write_failure_marks_transaction_for_rollback(self):
        conn = FakeConnection(fail_update=True)
        payload = {"message_id": "g1", "project_id": "PRJ-2401", "decision": {"state": "applied", "actions": [{"kind": "update_task", "task_id": "TSK-1", "status": "complete", "reported_date": "2026-09-21"}]}}
        with patch("backend.mcp_servers.mcp_db_server._get_conn", return_value=conn):
            result = json.loads(apply_email_decision(json.dumps(payload)))
        self.assertIn("error", result)
        self.assertTrue(conn.rolled_back)

    def test_change_order_cannot_apply_actions(self):
        payload = {"message_id": "g1", "project_id": "PRJ-2401", "categories": ["change_order"], "decision": {"state": "applied", "actions": [{"kind": "update_task", "task_id": "TSK-1", "status": "complete", "reported_date": "2026-09-21"}]}}
        with patch("backend.mcp_servers.mcp_db_server._get_conn", side_effect=AssertionError("must not connect")):
            result = json.loads(apply_email_decision(json.dumps(payload)))
        self.assertIn("Change orders", result.get("error", ""))


if __name__ == "__main__":
    unittest.main()
