import sys
import tempfile
import unittest
from io import BytesIO
from pathlib import Path

import httpx
from openpyxl import Workbook

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.integrations.sharepoint_service import (
    SharePointConfig,
    SharePointError,
    SharePointService,
)


class FakeResponse:
    def __init__(self, status_code=200, payload=None, content=b"", headers=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.content = content
        self.headers = headers or {}
        self.text = ""

    def json(self):
        return self._payload


class FakeHttpClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []

    def request(self, method, url, **kwargs):
        self.requests.append((method, url, kwargs))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class FakeAuthApp:
    def get_accounts(self):
        return [{"username": "engineer@contoso.com"}]

    def acquire_token_silent(self, scopes, account):
        return {"access_token": "test-token"}


class SharePointServiceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.temp_dir = Path(self.temp.name)
        self.config = SharePointConfig(
            client_id="client-id",
            tenant_id="tenant-id",
            site_url="https://contoso.sharepoint.com/sites/Engineering",
            download_dir=self.temp_dir,
            token_cache_path=self.temp_dir / "token-cache.json",
        )

    def tearDown(self):
        self.temp.cleanup()

    def make_service(self, responses=(), sleep=lambda _seconds: None):
        return SharePointService(
            config=self.config,
            http_client=FakeHttpClient(responses),
            auth_app=FakeAuthApp(),
            sleep=sleep,
        )

    @staticmethod
    def graph_ids():
        return [
            FakeResponse(payload={"id": "site-id"}),
            FakeResponse(payload={"id": "drive-id"}),
        ]

    def workbook_bytes(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Activities"
        sheet.append(["Activity ID", "Name"])
        sheet.append(["A1000", "Mobilization"])
        sheet.append(["A1010", "Survey"])
        output = BytesIO()
        workbook.save(output)
        workbook.close()
        return output.getvalue()

    def service_with_workbook(self):
        service = self.make_service()
        service.get_file_bytes = lambda _path, _limit: self.workbook_bytes()
        return service

    def test_config_parses_site_url(self):
        self.assertEqual(self.config.hostname, "contoso.sharepoint.com")
        self.assertEqual(self.config.site_path, "/sites/Engineering")

    def test_download_rejects_path_escape(self):
        service = self.make_service()

        with self.assertRaisesRegex(SharePointError, "inside the configured site"):
            service._download_target("../../outside.txt")

    def test_list_files_returns_normalized_items(self):
        children = FakeResponse(
            payload={
                "value": [
                    {
                        "id": "item-id",
                        "name": "Schedule.xlsx",
                        "size": 4096,
                        "lastModifiedDateTime": "2026-09-18T08:00:00Z",
                        "webUrl": "https://contoso.sharepoint.com/Schedule.xlsx",
                        "parentReference": {"path": "/drives/drive-id/root:/Planning"},
                        "file": {"mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
                    }
                ]
            }
        )
        service = self.make_service(self.graph_ids() + [children])

        result = service.list_files("Planning")

        self.assertEqual(result[0]["name"], "Schedule.xlsx")
        self.assertEqual(result[0]["type"], "file")
        self.assertEqual(result[0]["path"], "Planning/Schedule.xlsx")

    def test_search_limit_is_bounded_before_network_access(self):
        service = self.make_service()

        with self.assertRaisesRegex(SharePointError, "between 1 and 200"):
            service.search_files("schedule", limit=201)

    def test_read_text_rejects_binary_extension_before_network_access(self):
        service = self.make_service()

        with self.assertRaisesRegex(SharePointError, "Unsupported text"):
            service.read_text("Drawings/model.dwg")

    def test_download_writes_beneath_download_root(self):
        content = b"weekly status"
        service = self.make_service(
            self.graph_ids()
            + [FakeResponse(content=content, headers={"Content-Length": str(len(content))})]
        )

        result = service.download_file("Reports/status.txt")

        saved_path = Path(result["saved_path"])
        self.assertEqual(saved_path.read_bytes(), content)
        self.assertTrue(saved_path.is_relative_to(self.temp_dir))

    def test_graph_request_retries_throttling(self):
        sleeps = []
        service = self.make_service(
            [
                FakeResponse(
                    status_code=429,
                    payload={"error": {"message": "Slow down"}},
                    headers={"Retry-After": "2"},
                ),
                FakeResponse(payload={"value": []}),
            ],
            sleep=sleeps.append,
        )

        response = service._request("GET", "/test")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(sleeps, [2.0])

    def test_graph_request_retries_transient_transport_failure(self):
        sleeps = []
        request = httpx.Request("GET", "https://graph.microsoft.com/v1.0/test")
        service = self.make_service(
            [
                httpx.ReadTimeout("timed out", request=request),
                FakeResponse(payload={"value": []}),
            ],
            sleep=sleeps.append,
        )

        response = service._request("GET", "/test")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(sleeps, [1.0])

    def test_file_read_ignores_malformed_content_length_and_checks_bytes(self):
        content = b"status"
        service = self.make_service(
            self.graph_ids()
            + [
                FakeResponse(
                    content=content,
                    headers={"Content-Length": "unknown"},
                )
            ]
        )

        result = service.get_file_bytes("Reports/status.txt", max_bytes=20)

        self.assertEqual(result, content)

    def test_excel_without_sheet_returns_metadata(self):
        result = self.service_with_workbook().read_excel_range("Schedule.xlsx")

        self.assertEqual(
            result["worksheets"],
            [{"name": "Activities", "rows": 3, "columns": 2}],
        )

    def test_excel_range_returns_json_values(self):
        result = self.service_with_workbook().read_excel_range(
            "Schedule.xlsx", "Activities", "A1:B3"
        )

        self.assertEqual(result["range"], "A1:B3")
        self.assertEqual(result["values"][1], ["A1000", "Mobilization"])

    def test_excel_rejects_oversized_range_before_iteration(self):
        with self.assertRaisesRegex(SharePointError, "5,000-cell"):
            self.service_with_workbook().read_excel_range(
                "Schedule.xlsx", "Activities", "A1:Z1000"
            )

    def test_excel_rejects_incomplete_a1_range(self):
        with self.assertRaisesRegex(SharePointError, "Invalid Excel range"):
            self.service_with_workbook().read_excel_range(
                "Schedule.xlsx", "Activities", "A"
            )


if __name__ == "__main__":
    unittest.main()
