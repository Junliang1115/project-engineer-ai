"""PostgreSQL integration tests for readable project entity IDs.

Set TEST_DATABASE_URL to a throwaway database (its name must contain "test"); every test drops and
recreates its public schema. Skipped when TEST_DATABASE_URL is not set.
"""

import os
import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "")
DB_DIR = Path(__file__).resolve().parents[1] / "backend" / "db"

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None

@unittest.skipUnless(psycopg and TEST_DATABASE_URL, "TEST_DATABASE_URL is not set")
class ReadableEntityIdsDbTest(unittest.TestCase):
    def setUp(self):
        self.conn = psycopg.connect(TEST_DATABASE_URL, autocommit=True)
        database = self.conn.execute("select current_database()").fetchone()[0]
        if "test" not in database:
            self.conn.close()
            self.fail(f"Refusing to reset non-test database {database!r}")
        self.conn.execute("drop schema if exists public cascade")
        self.conn.execute("create schema public")

    def tearDown(self):
        self.conn.close()

    def apply_schema(self):
        self.conn.execute((DB_DIR / "schema.sql").read_text(encoding="utf-8"))

    def add_projects(self, *project_ids):
        for project_id in project_ids:
            self.conn.execute(
                "insert into project (id, name, current_phase, current_milestone) values (%s, %s, 'Design', 'M-1')",
                (project_id, project_id),
            )

    def scalar(self, query, params=()):
        return self.conn.execute(query, params).fetchone()[0]

    def test_seed_loads_with_readable_ids(self):
        self.apply_schema()
        self.conn.execute((DB_DIR / "seed.sql").read_text(encoding="utf-8"))
        self.assertEqual(self.scalar("select phase_id from project_phase where project_id = 'PRJ-2401' and name = 'Construction'"), "P-05")
        self.assertEqual(self.scalar("select count(*) from expenditure where expenditure_id ~ '^EXP-[0-9]{3}$'"), 53)
        self.assertEqual(self.scalar("select next_project_entity_id('PRJ-05', 'risk')"), "RSK-005")
        self.assertEqual(self.scalar("select next_project_entity_id('PRJ-2401', 'risk')"), "RSK-005")
        self.assertEqual(self.scalar("select next_project_entity_id('PRJ-2401', 'milestone')"), "M-010")

    def test_ids_restart_for_each_project(self):
        self.apply_schema()
        self.add_projects("PRJ-A", "PRJ-B")
        for project_id, name in (("PRJ-A", "One"), ("PRJ-A", "Two"), ("PRJ-B", "One")):
            self.conn.execute("insert into project_phase (project_id, name, phase_order) values (%s, %s, 1)", (project_id, name))
        rows = self.conn.execute("select project_id, name, phase_id from project_phase order by project_id, phase_id").fetchall()
        self.assertEqual(rows, [("PRJ-A", "One", "P-01"), ("PRJ-A", "Two", "P-02"), ("PRJ-B", "One", "P-01")])

    def test_explicit_id_advances_counter_and_bad_format_is_rejected(self):
        self.apply_schema()
        self.add_projects("PRJ-A")
        self.conn.execute("insert into risk_register (risk_id, project_id, category, title, owner) values ('RSK-005', 'PRJ-A', 'c', 't', 'o')")
        new_id = self.scalar("insert into risk_register (project_id, category, title, owner) values ('PRJ-A', 'c', 't', 'o') returning risk_id")
        self.assertEqual(new_id, "RSK-006")
        with self.assertRaises(psycopg.errors.RaiseException):
            self.conn.execute("insert into risk_register (risk_id, project_id, category, title, owner) values ('R-9', 'PRJ-A', 'c', 't', 'o')")

    def test_ids_are_zero_padded_and_unpadded_ids_are_rejected(self):
        self.apply_schema()
        self.add_projects("PRJ-A")
        formatted = [self.scalar("select format_project_entity_id(%s, %s)", args)
                     for args in (("phase", 1), ("milestone", 7), ("expenditure", 42), ("risk", 1), ("milestone", 1000))]
        self.assertEqual(formatted, ["P-01", "M-007", "EXP-042", "RSK-001", "M-1000"])
        for bad_id in ("RSK-5", "RSK-0005", "RSK-000"):
            with self.subTest(bad_id=bad_id):
                with self.assertRaises(psycopg.errors.RaiseException):
                    self.conn.execute(
                        "insert into risk_register (risk_id, project_id, category, title, owner) values (%s, 'PRJ-A', 'c', 't', 'o')", (bad_id,)
                    )
        self.conn.execute("insert into risk_register (project_id, category, title, owner) values ('PRJ-A', 'c', 't', 'o')")
        with self.assertRaises(psycopg.errors.CheckViolation):
            self.conn.execute("update risk_register set risk_id = 'RSK-1' where project_id = 'PRJ-A'")

    def test_concurrent_allocation_never_duplicates(self):
        self.apply_schema()
        self.add_projects("PRJ-A")

        def allocate(_):
            with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
                return [conn.execute("select next_project_entity_id('PRJ-A', 'expenditure')").fetchone()[0] for _ in range(25)]

        with ThreadPoolExecutor(max_workers=8) as pool:
            allocated = [value for batch in pool.map(allocate, range(8)) for value in batch]
        self.assertEqual(len(allocated), 200)
        self.assertEqual(set(allocated), {f"EXP-{n:03d}" for n in range(1, 201)})

    def test_composite_foreign_keys_reject_cross_project_references(self):
        self.apply_schema()
        self.add_projects("PRJ-A", "PRJ-B")
        self.conn.execute("insert into project_phase (project_id, name, phase_order) values ('PRJ-A', 'A1', 1), ('PRJ-A', 'A2', 2)")
        self.conn.execute("insert into project_phase (project_id, name, phase_order) values ('PRJ-B', 'B1', 1)")
        self.conn.execute("insert into milestone (project_id, phase_id, milestone_name) values ('PRJ-A', 'P-02', 'A milestone')")
        self.conn.execute("insert into milestone (project_id, phase_id, milestone_name) values ('PRJ-A', 'P-01', 'A milestone 2')")
        cross_project = [
            "insert into milestone (project_id, phase_id, milestone_name) values ('PRJ-B', 'P-02', 'x')",
            "insert into project_task (task_id, project_id, milestone_id, task_name, discipline, owner, planned_end_date) values ('T-X', 'PRJ-B', 'M-002', 'x', 'x', 'x', '2026-12-01')",
            "insert into expenditure (project_id, phase_id, title, category) values ('PRJ-B', 'P-02', 'x', 'x')",
            "insert into expenditure (project_id, phase_id, milestone_id, title, category) values ('PRJ-B', 'P-01', 'M-002', 'x', 'x')",
            "insert into lesson (lesson_id, project_id, phase_id, title, knowledge_area, root_cause) values ('LL-X', 'PRJ-B', 'P-02', 'x', 'x', 'x')",
        ]
        for statement in cross_project:
            with self.subTest(statement=statement[:40]):
                with self.assertRaises(psycopg.errors.ForeignKeyViolation):
                    self.conn.execute(statement)

        # Optional references clear only the entity ID and keep project_id.
        self.conn.execute("delete from project_phase where project_id = 'PRJ-A' and phase_id = 'P-02'")
        self.assertEqual(
            self.conn.execute("select project_id, phase_id from milestone where milestone_name = 'A milestone'").fetchone(),
            ("PRJ-A", None),
        )


if __name__ == "__main__":
    unittest.main()
