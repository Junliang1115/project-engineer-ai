import json
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend import mcp_sharepoint_server as server_module
from backend.sharepoint_service import SharePointError


class SharePointMcpServerTest(unittest.TestCase):
    def test_list_tool_serializes_service_result(self):
        fake = Mock()
        fake.list_files.return_value = [
            {"name": "Schedule.xlsx", "type": "file"}
        ]

        with patch.object(server_module, "get_service", return_value=fake):
            result = json.loads(server_module.list_sharepoint_files("Planning"))

        self.assertEqual(result[0]["name"], "Schedule.xlsx")
        fake.list_files.assert_called_once_with("Planning")

    def test_search_tool_passes_bounded_result_count(self):
        fake = Mock()
        fake.search_files.return_value = []

        with patch.object(server_module, "get_service", return_value=fake):
            result = json.loads(server_module.search_sharepoint_files("pump", 12))

        self.assertEqual(result, [])
        fake.search_files.assert_called_once_with("pump", 12)

    def test_text_tool_serializes_file_content(self):
        fake = Mock()
        fake.read_text.return_value = {
            "file": "Reports/status.txt",
            "content": "On schedule",
            "bytes": 11,
        }

        with patch.object(server_module, "get_service", return_value=fake):
            result = json.loads(
                server_module.read_sharepoint_file("Reports/status.txt")
            )

        self.assertEqual(result["content"], "On schedule")

    def test_download_tool_serializes_saved_path(self):
        fake = Mock()
        fake.download_file.return_value = {
            "file": "Reports/status.pdf",
            "saved_path": "C:/downloads/Reports/status.pdf",
            "bytes": 100,
        }

        with patch.object(server_module, "get_service", return_value=fake):
            result = json.loads(
                server_module.download_sharepoint_file("Reports/status.pdf")
            )

        self.assertEqual(result["bytes"], 100)

    def test_excel_tool_returns_actionable_error(self):
        fake = Mock()
        fake.read_excel_range.side_effect = SharePointError(
            "Worksheet not found: Cost"
        )

        with patch.object(server_module, "get_service", return_value=fake):
            result = json.loads(
                server_module.read_excel_range("Book.xlsx", "Cost", "A1:B2")
            )

        self.assertEqual(
            result,
            {"status": "error", "message": "Worksheet not found: Cost"},
        )


if __name__ == "__main__":
    unittest.main()
