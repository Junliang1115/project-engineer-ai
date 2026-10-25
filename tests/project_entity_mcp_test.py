import importlib
import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class FakeMCPServer:
    def __init__(self, *_args, **_kwargs):
        pass

    def tool(self):
        return lambda function: function

    def run(self, **_kwargs):
        pass


sys.modules.setdefault("mcp", types.ModuleType("mcp"))
sys.modules.setdefault("mcp.server", types.ModuleType("mcp.server"))
mcpserver = types.ModuleType("mcp.server.mcpserver")
mcpserver.MCPServer = FakeMCPServer
sys.modules["mcp.server.mcpserver"] = mcpserver
psycopg = types.ModuleType("psycopg")
psycopg.connect = lambda *_args, **_kwargs: None
sys.modules["psycopg"] = psycopg
rows = types.ModuleType("psycopg.rows")
rows.dict_row = object()
sys.modules["psycopg.rows"] = rows

MODULE = "backend.mcp_servers.mcp_db_server"
db = importlib.import_module(MODULE)


def action_model(payload):
    return db._project_action_model(payload["entity"], payload["operation"]).model_validate_json(json.dumps(payload))


class FakeSchemaCursor:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, _query, _params=()):
        pass

    def fetchall(self):
        return [
            {"table_name": "milestone", "column_name": "milestone_id", "data_type": "text", "is_nullable": "NO"},
            {"table_name": "milestone", "column_name": "status", "data_type": "text", "is_nullable": "NO"},
            {"table_name": "project_task", "column_name": "status", "data_type": "text", "is_nullable": "NO"},
            {"table_name": "session", "column_name": "title", "data_type": "text", "is_nullable": "NO"},
        ]


class FakeSchemaConnection:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return FakeSchemaCursor()


class FakeResult:
    def __init__(self, row=None):
        self.row = row

    def fetchone(self):
        return self.row


class FakeTransaction:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class RecordingConnection:
    def __init__(self, target=None):
        self.target = target
        self.queries = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def transaction(self):
        return FakeTransaction()

    def execute(self, query, params=()):
        compact = " ".join(query.split())
        self.queries.append((compact, params))
        lowered = compact.lower()
        if lowered.startswith("select id from project"):
            return FakeResult({"id": "PRJ-2401"})
        if lowered.startswith("select * from milestone"):
            return FakeResult(self.target)
        if lowered.startswith("update milestone"):
            return FakeResult({"milestone_id": "milestone-1"})
        if lowered.startswith("select next_project_entity_id"):
            return FakeResult({"id": "RSK-007"})
        if lowered.startswith("insert into risk_register"):
            return FakeResult({"risk_id": params[0]})
        if lowered.startswith("insert into project_task"):
            return FakeResult({"task_id": "TSK-NEW"})
        if lowered.startswith("insert into activity_log"):
            return FakeResult({"activity_id": "audit-1"})
        return FakeResult()


class ProjectEntityPolicyTest(unittest.TestCase):
    def test_tasks_and_milestones_share_the_same_status_transitions(self):
        from backend.core.project_rules import MILESTONE_STATUS_TRANSITIONS, TASK_STATUS_TRANSITIONS

        expected = {
            "planned": ["in_progress", "blocked"],
            "in_progress": ["completed", "blocked"],
            "blocked": ["in_progress"],
        }
        self.assertEqual(TASK_STATUS_TRANSITIONS, expected)
        self.assertEqual(MILESTONE_STATUS_TRANSITIONS, expected)

    def test_schema_exposes_only_approved_entities_and_operations(self):
        with patch.object(db, "_get_conn", return_value=FakeSchemaConnection()):
            result = json.loads(db.get_project_entity_schema())

        self.assertIn("milestone", result["entities"])
        self.assertNotIn("session", result["entities"])
        milestone = result["entities"]["milestone"]
        self.assertEqual(milestone["operations"], ["update"])
        self.assertFalse(milestone["fields"]["milestone_id"]["writable"])
        self.assertTrue(milestone["fields"]["milestone_id"]["server_managed"])
        self.assertTrue(milestone["fields"]["status"]["writable"])
        expected_statuses = ["planned", "in_progress", "completed", "blocked"]
        self.assertEqual(milestone["fields"]["status"]["allowed_values"], expected_statuses)
        self.assertEqual(result["entities"]["project_task"]["fields"]["status"]["allowed_values"], expected_statuses)
        self.assertNotIn("delete", milestone["operations"])

    def test_schema_rejects_unknown_entity(self):
        result = json.loads(db.get_project_entity_schema("session"))
        self.assertEqual(result["status"], "rejected")

    def test_activity_log_is_not_agent_writable(self):
        self.assertNotIn("activity_log", db.PROJECT_ENTITY_POLICIES)
        self.assertFalse(hasattr(db, "insert_activity_log"))
        with self.assertRaisesRegex(ValueError, "Unsupported entity"):
            db._validate_project_action({
                "operation": "create", "entity": "activity_log", "project_id": "PRJ-2401",
                "changes": {"title": "x"}, "confidence": "high", "evidence": {"title": "x"},
            })

    def test_validator_rejects_unsafe_or_ambiguous_changes(self):
        valid = {
            "operation": "update",
            "entity": "milestone",
            "project_id": "PRJ-2401",
            "record_id": "milestone-1",
            "changes": {"status": "in_progress"},
            "confidence": "high", "categories": ["daily_update"],
            "evidence": {"status": "M1 started"},
        }
        self.assertEqual(db._validate_project_action(valid)["entity"], "milestone")

        policy_cases = [
            ({**valid, "changes": {}}, "Changes"),
            ({**valid, "evidence": {}}, "Evidence"),
        ]
        for payload, message in policy_cases:
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValueError, message):
                    db._validate_project_action(payload)

        pydantic_cases = [
            {**valid, "changes": {"created_at": "2026-10-19"}, "evidence": {"created_at": "today"}},
            {
                **valid, "entity": "project_task", "record_id": "TSK-1",
                "changes": {"duration_days": True}, "evidence": {"duration_days": "true"},
            },
            {**valid, "changes": {"status": "unknown"}, "evidence": {"status": "unknown"}},
            {
                **valid, "entity": "project_task", "record_id": "TSK-1",
                "changes": {"task_id": "TSK-NEW"}, "evidence": {"task_id": "rename task"},
            },
            {
                **valid, "entity": "project_task", "record_id": "TSK-1",
                "changes": {"planned_end_date": "2026-99-99"},
                "evidence": {"planned_end_date": "invalid date"},
            },
            {**valid, "evidence": {"status": None}},
        ]
        for payload in pydantic_cases:
            with self.subTest(payload=payload):
                with self.assertRaises(Exception):
                    action_model(payload)

        # The validator only checks; the agent tool decides what low confidence means.
        self.assertEqual(db._validate_project_action({**valid, "confidence": "low"})["confidence"], "low")
        for payload, message in (
            ({**valid, "changes": {"status": "done"}, "evidence": {"status": "done"}}, "Invalid action"),
            ({**valid, "project_id": "PRJ-OTHER"}, "project does not match"),
        ):
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValueError, message):
                    db._validate_project_action(payload, "PRJ-2401")


class ProjectEntityActionTest(unittest.TestCase):
    def setUp(self):
        self.update = {
            "operation": "update",
            "entity": "milestone",
            "project_id": "PRJ-2401",
            "record_id": "milestone-1",
            "changes": {"status": "in_progress"},
            "confidence": "high", "categories": ["daily_update"],
            "evidence": {"status": "M1 started"},
        }

    def test_project_records_are_scoped_to_project(self):
        class RowsConnection(RecordingConnection):
            def execute(self, query, params=()):
                self.queries.append((" ".join(query.split()), params))
                return self

            def fetchall(self):
                return [{"milestone_id": "M-001"}, {"milestone_id": "M-002"}, {"milestone_id": "M-003"}]

        connection = RowsConnection()
        with patch.object(db, "_get_conn", return_value=connection):
            everything = json.loads(db.get_project_records("PRJ-2401"))
            one = json.loads(db.get_project_records("PRJ-2401", entity="milestone", record_id="M-001", limit=2))
            unknown = json.loads(db.get_project_records("PRJ-2401", entity="session"))

        self.assertEqual(set(everything["entities"]), set(db.PROJECT_ENTITY_POLICIES))
        self.assertEqual(everything["entities"]["milestone"]["id_column"], "milestone_id")
        self.assertTrue(all(params[0] == "PRJ-2401" for _, params in connection.queries))
        self.assertIn("SELECT * FROM project WHERE id = %s", [query.split(" ORDER")[0] for query, _ in connection.queries])

        query, params = connection.queries[-1]
        self.assertEqual(query, "SELECT * FROM milestone WHERE project_id = %s AND milestone_id = %s ORDER BY milestone_id LIMIT %s")
        self.assertEqual(params, ("PRJ-2401", "M-001", 3))  # One extra row tells whether the list was truncated.
        self.assertEqual((len(one["entities"]["milestone"]["records"]), one["entities"]["milestone"]["truncated"]), (2, True))
        self.assertEqual(unknown["status"], "rejected")

    def test_update_uses_policy_identifiers_and_parameterized_values(self):
        connection = RecordingConnection(target={"milestone_id": "milestone-1", "project_id": "PRJ-2401", "status": "planned"})
        with patch.object(db, "_get_conn", return_value=connection):
            result = json.loads(db.apply_project_entity_action(action_model(self.update)))
        self.assertEqual(result["status"], "applied")
        update_query, params = next(item for item in connection.queries if item[0].lower().startswith("update milestone"))
        self.assertNotIn("M1 started", update_query)
        self.assertEqual(params[-2:], ("PRJ-2401", "milestone-1"))
        self.assertTrue(any(query.lower().startswith("insert into activity_log") for query, _ in connection.queries))

    def test_create_returns_generated_identifier(self):
        payload = {
            "operation": "create", "entity": "risk_register", "project_id": "PRJ-2401",
            "changes": {"category": "Schedule", "title": "Late delivery", "owner": "Planner"},
            "confidence": "high", "categories": ["daily_update"],
            "evidence": {"category": "schedule risk", "title": "delivery is late", "owner": "Planner owns mitigation"},
        }
        connection = RecordingConnection()
        with patch.object(db, "_get_conn", return_value=connection):
            result = json.loads(db.apply_project_entity_action(action_model(payload)))
        self.assertEqual(result["record_id"], "RSK-007")
        allocation = next(item for item in connection.queries if item[0].lower().startswith("select next_project_entity_id"))
        self.assertEqual(allocation[1], ("PRJ-2401", "risk"))
        insert_query, insert_params = next(item for item in connection.queries if item[0].lower().startswith("insert into risk_register"))
        self.assertIn("(risk_id, project_id,", insert_query)
        self.assertEqual(insert_params[:2], ("RSK-007", "PRJ-2401"))

    def test_create_rejects_agent_supplied_identifier(self):
        payload = {
            "operation": "create", "entity": "risk_register", "project_id": "PRJ-2401",
            "changes": {"risk_id": "RSK-001", "category": "Schedule", "title": "Late delivery", "owner": "Planner"},
            "confidence": "high", "categories": ["daily_update"],
            "evidence": {"risk_id": "x", "category": "schedule risk", "title": "delivery is late", "owner": "Planner"},
        }
        with self.assertRaises(Exception):
            action_model(payload)
        with self.assertRaisesRegex(ValueError, "read-only"):
            db._validate_project_action(payload)

    def test_update_cannot_modify_server_managed_identifiers(self):
        for entity, id_column in (("project_phase", "phase_id"), ("milestone", "milestone_id"), ("expenditure", "expenditure_id"), ("risk_register", "risk_id")):
            with self.subTest(entity=entity):
                payload = {**self.update, "entity": entity, "changes": {id_column: "X-1"}, "evidence": {id_column: "rename"}}
                with self.assertRaisesRegex(ValueError, "read-only"):
                    db._validate_project_action(payload)

    def test_task_create_does_not_treat_its_identifier_as_a_parent(self):
        payload = {
            "operation": "create", "entity": "project_task", "project_id": "PRJ-2401",
            "changes": {
                "task_id": "TSK-NEW", "task_name": "New task", "discipline": "Civil",
                "owner": "Engineer", "planned_end_date": "2026-11-30",
            },
            "confidence": "high", "categories": ["daily_update"],
            "evidence": {name: "email evidence" for name in ("task_id", "task_name", "discipline", "owner", "planned_end_date")},
        }
        connection = RecordingConnection()
        with patch.object(db, "_get_conn", return_value=connection):
            result = json.loads(db.apply_project_entity_action(action_model(payload)))
        self.assertEqual(result["status"], "applied")
        self.assertFalse(any(query.lower().startswith("select task_id from project_task") for query, _ in connection.queries))

    def test_activity_log_uses_agent_categories(self):
        connection = RecordingConnection(target={"milestone_id": "milestone-1", "project_id": "PRJ-2401", "status": "planned"})
        payload = {**self.update, "categories": ["technical_query", "change_order"]}
        with patch.object(db, "_get_conn", return_value=connection):
            json.loads(db.apply_project_entity_action(action_model(payload)))
        _, params = next(item for item in connection.queries if item[0].lower().startswith("insert into activity_log"))
        self.assertEqual(params[2], "technical_query, change_order")
        with self.assertRaises(Exception):
            action_model({**self.update, "categories": []})

    def test_low_confidence_is_audited_without_entity_mutation(self):
        connection = RecordingConnection()
        with patch.object(db, "_get_conn", return_value=connection):
            result = json.loads(db.apply_project_entity_action(action_model({**self.update, "confidence": "low"})))
        self.assertEqual(result["status"], "needs_review")
        self.assertFalse(any(query.lower().startswith("update milestone") for query, _ in connection.queries))
        self.assertTrue(any(query.lower().startswith("insert into activity_log") for query, _ in connection.queries))

    def test_delete_and_wrong_project_are_rejected(self):
        with self.assertRaises(Exception):
            action_model({**self.update, "operation": "delete"})

        connection = RecordingConnection(target=None)
        with patch.object(db, "_get_conn", return_value=connection):
            result = json.loads(db.apply_project_entity_action(action_model(self.update)))
        self.assertEqual(result["status"], "rejected")


if __name__ == "__main__":
    unittest.main()
