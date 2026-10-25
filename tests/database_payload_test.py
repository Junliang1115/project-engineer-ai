import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

from backend.projects.database import (
    _activity_payload,
    _expenditure_payload,
    _request_payload,
    _risk_payload,
)


class DatabasePayloadTest(unittest.TestCase):
    def test_activity_status(self):
        row = {
            "activity_id": "activity-1",
            "task_id": "task-1",
            "activity_type": "technical_query",
            "title": "Review pipe class",
            "source_type": "email",
            "summary": "A discrepancy was reported.",
            "processing_details": None,
            "logged_at": None,
        }
        self.assertEqual(_activity_payload({**row, "processing_state": "needs_review"}, "project-1", 0)["status"], "Needs review")
        self.assertEqual(_activity_payload({**row, "processing_state": "applied"}, "project-1", 0)["status"], "Done")

    def test_expenditure(self):
        row = {
            "expenditure_id": "exp-1",
            "phase": "Engineering",
            "title": "Process design review",
            "category": "Engineering Services",
            "vendor": "Acme Engineering",
            "estimated_amount": Decimal("1500000"),
            "actual_amount": Decimal("1200000"),
            "status": "invoiced",
            "expenditure_date": date(2026, 10, 16),
            "milestone_id": "milestone-1",
            "task_id": "task-1",
        }
        self.assertEqual(
            _expenditure_payload(row),
            {
                "id": "exp-1",
                "phase": "Engineering",
                "title": "Process design review",
                "category": "Engineering Services",
                "vendor": "Acme Engineering",
                "estimate": 1.5,
                "actual": 1.2,
                "variance": 0.3,
                "status": "Invoiced",
                "expenditureDate": "2026-10-16",
                "milestoneId": "milestone-1",
                "taskId": "task-1",
            },
        )

    def test_request_categories(self):
        for request_type, category in (("technical_query", "Technical Query"), ("change_order", "Change Order")):
            payload = _request_payload({
                "request_id": "REQ-1",
                "title": "Pipe thickness clarification",
                "request_type": request_type,
                "description": "Review the proposed pipe thickness.",
                "status": "open",
                "created_at": datetime(2026, 9, 13, 8, 30, tzinfo=timezone.utc),
            })
            self.assertEqual(payload["category"], category)
            self.assertEqual(payload["createdAt"], "2026-09-13T08:30:00+00:00")
            self.assertNotIn("documentId", payload)  # No stored PDF for this request.

    def test_request_with_its_stored_document(self):
        row = {"request_id": "TQ-2026-1020", "title": "Valve certification", "request_type": "technical_query",
               "description": "EN 10204 3.1 instead of 3.2", "status": "open", "created_at": None}
        document = {"document_id": "0b4c", "filename": "KNJTC4-TEQ-0001.pdf", "size_bytes": 254_000,
                    "page_count": 2, "status": "parsed", "sender": "Chew Jun Liang <jl@example.com>"}
        payload = _request_payload(row, document)
        self.assertEqual(
            {key: payload[key] for key in ("documentId", "attachmentName", "attachmentSize", "attachmentPages", "submittedBy")},
            {"documentId": "0b4c", "attachmentName": "KNJTC4-TEQ-0001.pdf", "attachmentSize": "248 KB",
             "attachmentPages": 2, "submittedBy": "Chew Jun Liang <jl@example.com>"},
        )

    def test_risk(self):
        payload = _risk_payload({
            "risk_id": "RSK-001",
            "title": "Late equipment release",
            "category": "Procurement",
            "likelihood": "Likely",
            "impact": "Three-day delay",
            "status": "open",
            "mitigation": "Expedite inspection",
            "owner": "Procurement lead",
            "due_date": None,
            "affected_milestone": "Equipment installation",
            "trigger_event": "Inspection moved",
            "reasoning": "Release is not confirmed.",
            "evidence_source": "Inspection tracker",
            "confidence": "Medium",
            "affected_areas": ["Schedule", "Cost"],
            "priority": "high",
        })
        self.assertEqual(payload["affectedAreas"], ["Schedule", "Cost"])
        self.assertEqual(payload["priority"], "High")


if __name__ == "__main__":
    unittest.main()
