# SharePoint MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only Python MCP server that signs a user into Microsoft 365, reads files from one configured SharePoint site, and returns bounded Excel ranges as JSON.

**Architecture:** A focused `SharePointService` will own MSAL authentication, Microsoft Graph calls, safe local downloads, and workbook parsing. A thin MCP module will expose synchronous tools over stdio and serialize service results. Tests will inject fake HTTP and authentication dependencies, so they run without a Microsoft tenant.

**Tech Stack:** Python 3.11, MCP Python SDK v2, MSAL, HTTPX, openpyxl, unittest

**Spec:** `docs/superpowers/specs/2026-09-18-sharepoint-mcp-design.md`

## Global Constraints

- All SharePoint operations are read-only and restricted to `SHAREPOINT_SITE_URL` and its default document library.
- Delegated login uses `SHAREPOINT_CLIENT_ID` and `SHAREPOINT_TENANT_ID`; no client secret is stored.
- The sample site is `https://contoso.sharepoint.com/sites/Engineering`.
- Token data and downloaded files must remain ignored by Git.
- Search, text, download, workbook row, and workbook cell counts are bounded.
- Tests must not require live Microsoft credentials or network access.

---

### Task 1: Authentication and SharePoint file access

**Files:**
- Create: `backend/sharepoint_service.py`
- Create: `tests/sharepoint_service_test.py`
- Modify: `backend/requirements.txt`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `SharePointConfig.from_env() -> SharePointConfig`
- Produces: `SharePointService.list_files(folder_path: str = "") -> list[dict]`
- Produces: `SharePointService.search_files(query: str, limit: int = 20) -> list[dict]`
- Produces: `SharePointService.read_text(file_path: str) -> dict`
- Produces: `SharePointService.download_file(file_path: str) -> dict`
- Produces: `SharePointService.get_file_bytes(file_path: str, max_bytes: int) -> bytes`

- [ ] **Step 1: Declare runtime dependencies and ignored token cache**

Add these lines to `backend/requirements.txt`:

```text
mcp>=2,<3
msal>=1.31,<2
openpyxl>=3.1,<4
```

Add this line to `.gitignore`:

```text
backend/.sharepoint_token_cache.json
```

- [ ] **Step 2: Write failing configuration and path-safety tests**

Create `tests/sharepoint_service_test.py` with `unittest` cases that patch environment variables, instantiate `SharePointConfig`, and verify:

```python
def test_config_parses_site_url(self):
    config = SharePointConfig(
        client_id="client-id",
        tenant_id="tenant-id",
        site_url="https://contoso.sharepoint.com/sites/Engineering",
        download_dir=self.temp_dir,
    )
    self.assertEqual(config.hostname, "contoso.sharepoint.com")
    self.assertEqual(config.site_path, "/sites/Engineering")

def test_download_rejects_path_escape(self):
    service = self.make_service()
    with self.assertRaises(SharePointError):
        service._download_target("../../outside.txt")
```

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `python -m unittest tests.sharepoint_service_test -v`

Expected: FAIL because `backend.sharepoint_service` does not exist.

- [ ] **Step 4: Implement configuration, authentication, and Graph request primitives**

In `backend/sharepoint_service.py`, add these configuration and authentication primitives (the file-operation constants are added in Step 6):

```python
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import httpx
import msal

BASE_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class SharePointConfig:
    client_id: str
    tenant_id: str
    site_url: str
    download_dir: Path
    token_cache_path: Path = BASE_DIR / ".sharepoint_token_cache.json"

    @classmethod
    def from_env(cls) -> "SharePointConfig":
        values = {
            "client_id": os.getenv("SHAREPOINT_CLIENT_ID", "").strip(),
            "tenant_id": os.getenv("SHAREPOINT_TENANT_ID", "").strip(),
            "site_url": os.getenv(
                "SHAREPOINT_SITE_URL",
                "https://contoso.sharepoint.com/sites/Engineering",
            ).strip(),
        }
        missing = [name for name in ("client_id", "tenant_id") if not values[name]]
        if missing:
            raise SharePointError(
                "Missing SharePoint configuration: " + ", ".join(missing)
            )
        download_dir = Path(
            os.getenv(
                "SHAREPOINT_DOWNLOAD_DIR", BASE_DIR / "downloads" / "sharepoint"
            )
        )
        return cls(download_dir=download_dir, **values)

    @property
    def hostname(self) -> str:
        parsed = urlparse(self.site_url)
        if parsed.scheme != "https" or not parsed.hostname:
            raise SharePointError("SHAREPOINT_SITE_URL must be an HTTPS URL")
        return parsed.hostname

    @property
    def site_path(self) -> str:
        path = urlparse(self.site_url).path.rstrip("/")
        if not path:
            raise SharePointError("SHAREPOINT_SITE_URL must include a site path")
        return path


class SharePointError(RuntimeError):
    pass


class SharePointService:
    SCOPES = ["Files.Read.All", "Sites.Read.All"]
    GRAPH_ROOT = "https://graph.microsoft.com/v1.0"

    def __init__(
        self,
        config: SharePointConfig | None = None,
        http_client: httpx.Client | None = None,
        auth_app=None,
        sleep=time.sleep,
    ):
        self.config = config or SharePointConfig.from_env()
        self.http = http_client or httpx.Client(timeout=30.0, follow_redirects=True)
        self.sleep = sleep
        self._token_cache = msal.SerializableTokenCache()
        if self.config.token_cache_path.exists():
            self._token_cache.deserialize(
                self.config.token_cache_path.read_text(encoding="utf-8")
            )
        self.auth_app = auth_app or msal.PublicClientApplication(
            self.config.client_id,
            authority=(
                "https://login.microsoftonline.com/" + self.config.tenant_id
            ),
            token_cache=self._token_cache,
        )
        self._ids = None

    def _get_access_token(self) -> str:
        accounts = self.auth_app.get_accounts()
        result = (
            self.auth_app.acquire_token_silent(self.SCOPES, account=accounts[0])
            if accounts
            else None
        )
        if not result:
            try:
                result = self.auth_app.acquire_token_interactive(scopes=self.SCOPES)
            except Exception:
                flow = self.auth_app.initiate_device_flow(scopes=self.SCOPES)
                if "user_code" not in flow:
                    raise SharePointError("Could not start Microsoft device login")
                print(flow["message"], file=sys.stderr, flush=True)
                result = self.auth_app.acquire_token_by_device_flow(flow)
        self._save_cache()
        if "access_token" not in result:
            raise SharePointError(
                result.get("error_description", "Microsoft sign-in failed")
            )
        return result["access_token"]

    def _save_cache(self) -> None:
        if self._token_cache.has_state_changed:
            self.config.token_cache_path.write_text(
                self._token_cache.serialize(), encoding="utf-8"
            )

    def _request(self, method: str, endpoint: str, **kwargs) -> httpx.Response:
        headers = dict(kwargs.pop("headers", {}))
        headers["Authorization"] = "Bearer " + self._get_access_token()
        for attempt in range(3):
            response = self.http.request(
                method, self.GRAPH_ROOT + endpoint, headers=headers, **kwargs
            )
            if response.status_code not in {429, 500, 502, 503, 504}:
                break
            if attempt < 2:
                self.sleep(min(float(response.headers.get("Retry-After", 1)), 5.0))
        if response.status_code >= 400:
            try:
                message = response.json()["error"]["message"]
            except (KeyError, TypeError, ValueError):
                message = response.text or "Microsoft Graph request failed"
            raise SharePointError(f"Microsoft Graph {response.status_code}: {message}")
        return response

    def _site_and_drive_ids(self) -> tuple[str, str]:
        if self._ids is None:
            site = self._request(
                "GET", f"/sites/{self.config.hostname}:{self.config.site_path}"
            ).json()
            drive = self._request("GET", f"/sites/{site['id']}/drive").json()
            self._ids = (site["id"], drive["id"])
        return self._ids
```

`_get_access_token` must try `acquire_token_silent` for the first cached account, then `acquire_token_interactive`; if interactive login raises, it must initiate device-code flow and write the login message to stderr. `_request` must add the bearer token, enforce a timeout, retry HTTP 429/5xx responses at most twice, and raise `SharePointError` with status and Graph error text. Site resolution must call `/sites/{hostname}:{site_path}` and then `/sites/{site_id}/drive` once and cache both IDs in memory.

- [ ] **Step 5: Add failing tests for list, search, text, and download behavior**

Use a small `FakeHttpClient` whose queued responses expose `status_code`, `json()`, `content`, and `headers`. Test exact outcomes:

```python
def test_list_files_returns_normalized_items(self):
    service = self.make_service(graph_responses=[site, drive, children])
    result = service.list_files()
    self.assertEqual(result[0]["name"], "Schedule.xlsx")
    self.assertEqual(result[0]["type"], "file")

def test_search_limit_is_bounded(self):
    with self.assertRaises(SharePointError):
        self.make_service().search_files("schedule", limit=201)

def test_read_text_rejects_binary_extension(self):
    with self.assertRaises(SharePointError):
        self.make_service().read_text("Drawings/model.dwg")

def test_download_writes_beneath_download_root(self):
    service = self.make_service(graph_responses=[site, drive, file_response])
    result = service.download_file("Reports/status.txt")
    self.assertTrue(Path(result["saved_path"]).is_file())
    self.assertTrue(Path(result["saved_path"]).is_relative_to(self.temp_dir))
```

- [ ] **Step 6: Implement the file operations minimally**

Add imports for `json`, `PurePosixPath`, and `quote`, then add these constants and methods:

```python
MAX_SEARCH_RESULTS = 200
MAX_TEXT_BYTES = 2 * 1024 * 1024
MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024
TEXT_EXTENSIONS = {".txt", ".csv", ".json", ".md", ".xml", ".log"}

def _clean_path(self, value: str) -> str:
    candidate = PurePosixPath(value.replace("\\", "/"))
    if candidate.is_absolute() or ".." in candidate.parts:
        raise SharePointError("SharePoint paths must stay inside the configured site")
    return str(candidate).strip("./")

def _item_endpoint(self, drive_id: str, path: str, suffix: str) -> str:
    cleaned = self._clean_path(path)
    if not cleaned:
        return f"/drives/{drive_id}/root/{suffix.lstrip('/')}"
    encoded = quote(cleaned, safe="/")
    return f"/drives/{drive_id}/root:/{encoded}:/{suffix.lstrip('/')}"

def _normalize_item(self, item: dict) -> dict:
    parent_path = item.get("parentReference", {}).get("path", "")
    relative_parent = parent_path.split("root:", 1)[-1].strip("/")
    relative_path = "/".join(part for part in (relative_parent, item["name"]) if part)
    return {
        "id": item["id"],
        "name": item["name"],
        "type": "folder" if "folder" in item else "file",
        "size": item.get("size", 0),
        "modified_at": item.get("lastModifiedDateTime"),
        "web_url": item.get("webUrl"),
        "path": relative_path,
    }

def list_files(self, folder_path: str = "") -> list[dict]:
    _, drive_id = self._site_and_drive_ids()
    endpoint = self._item_endpoint(drive_id, folder_path, "children")
    data = self._request("GET", endpoint).json()
    return [self._normalize_item(item) for item in data.get("value", [])]

def search_files(self, query: str, limit: int = 20) -> list[dict]:
    query = query.strip()
    if not query:
        raise SharePointError("Search query is required")
    if not 1 <= limit <= MAX_SEARCH_RESULTS:
        raise SharePointError("Search limit must be between 1 and 200")
    _, drive_id = self._site_and_drive_ids()
    encoded_query = quote(query.replace("'", "''"), safe="")
    endpoint = f"/drives/{drive_id}/root/search(q='{encoded_query}')"
    data = self._request("GET", endpoint, params={"$top": limit}).json()
    return [self._normalize_item(item) for item in data.get("value", [])[:limit]]

def get_file_bytes(self, file_path: str, max_bytes: int) -> bytes:
    _, drive_id = self._site_and_drive_ids()
    endpoint = self._item_endpoint(drive_id, file_path, "content")
    response = self._request("GET", endpoint)
    declared_size = int(response.headers.get("Content-Length", 0))
    if declared_size > max_bytes or len(response.content) > max_bytes:
        raise SharePointError(f"File exceeds the {max_bytes}-byte limit")
    return response.content

def read_text(self, file_path: str) -> dict:
    cleaned = self._clean_path(file_path)
    if Path(cleaned).suffix.lower() not in TEXT_EXTENSIONS:
        raise SharePointError("Unsupported text file type")
    content = self.get_file_bytes(cleaned, MAX_TEXT_BYTES)
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise SharePointError("Text file is not UTF-8 encoded") from exc
    return {"file": cleaned, "content": text, "bytes": len(content)}

def _download_target(self, file_path: str) -> Path:
    cleaned = self._clean_path(file_path)
    root = self.config.download_dir.resolve()
    target = (root / Path(*PurePosixPath(cleaned).parts)).resolve()
    if not target.is_relative_to(root):
        raise SharePointError("Download path escapes the configured directory")
    return target

def download_file(self, file_path: str) -> dict:
    content = self.get_file_bytes(file_path, MAX_DOWNLOAD_BYTES)
    target = self._download_target(file_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return {"file": self._clean_path(file_path), "saved_path": str(target), "bytes": len(content)}
```

Normalize every drive item to `id`, `name`, `type`, `size`, `modified_at`, `web_url`, and `path`. URL-encode Graph path segments, reject absolute paths and `..`, enforce `Content-Length` and actual-byte limits, decode text as UTF-8 with a clear encoding error, and resolve the local output path before writing.

- [ ] **Step 7: Run the service tests**

Run: `python -m unittest tests.sharepoint_service_test -v`

Expected: all Task 1 tests PASS.

- [ ] **Step 8: Commit Task 1**

```bash
git add .gitignore backend/requirements.txt backend/sharepoint_service.py tests/sharepoint_service_test.py
git commit -m "feat: add read-only SharePoint service"
```

---

### Task 2: Excel workbook reading

**Files:**
- Modify: `backend/sharepoint_service.py`
- Modify: `tests/sharepoint_service_test.py`

**Interfaces:**
- Consumes: `SharePointService.get_file_bytes(file_path: str, max_bytes: int) -> bytes`
- Produces: `SharePointService.read_excel_range(file_path: str, sheet_name: str = "", cell_range: str = "") -> dict`

- [ ] **Step 1: Write failing Excel metadata and range tests**

Generate a workbook in memory with `openpyxl.Workbook`, place headers in `A1:B1`, data in `A2:B3`, and save it to `BytesIO`. Patch `get_file_bytes` to return those bytes, then add:

```python
def test_excel_without_sheet_returns_metadata(self):
    result = self.service_with_workbook().read_excel_range("Schedule.xlsx")
    self.assertEqual(result["worksheets"][0]["name"], "Activities")

def test_excel_range_returns_json_values(self):
    result = self.service_with_workbook().read_excel_range(
        "Schedule.xlsx", "Activities", "A1:B3"
    )
    self.assertEqual(result["range"], "A1:B3")
    self.assertEqual(result["values"][1], ["A1000", "Mobilization"])

def test_excel_rejects_oversized_range(self):
    with self.assertRaises(SharePointError):
        self.service_with_workbook().read_excel_range(
            "Schedule.xlsx", "Activities", "A1:Z1000"
        )
```

- [ ] **Step 2: Run the focused Excel tests and confirm failure**

Run: `python -m unittest tests.sharepoint_service_test.SharePointServiceTest.test_excel_without_sheet_returns_metadata tests.sharepoint_service_test.SharePointServiceTest.test_excel_range_returns_json_values -v`

Expected: FAIL because `read_excel_range` is undefined.

- [ ] **Step 3: Implement bounded workbook parsing**

Add imports for `BytesIO`, `date`, `datetime`, `load_workbook`, and `range_boundaries`, then add:

```python
MAX_EXCEL_BYTES = 20 * 1024 * 1024
MAX_EXCEL_ROWS = 200
MAX_EXCEL_CELLS = 5000

def read_excel_range(
    self,
    file_path: str,
    sheet_name: str = "",
    cell_range: str = "",
) -> dict:
    cleaned = self._clean_path(file_path)
    if Path(cleaned).suffix.lower() != ".xlsx":
        raise SharePointError("Only .xlsx workbooks are supported")
    content = self.get_file_bytes(cleaned, MAX_EXCEL_BYTES)
    try:
        workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise SharePointError(f"Could not open Excel workbook: {exc}") from exc
    try:
        if not sheet_name:
            return {
                "file": cleaned,
                "worksheets": [
                    {"name": sheet.title, "rows": sheet.max_row, "columns": sheet.max_column}
                    for sheet in workbook.worksheets
                ],
            }
        if sheet_name not in workbook.sheetnames:
            raise SharePointError(f"Worksheet not found: {sheet_name}")
        sheet = workbook[sheet_name]
        selected_range = cell_range or f"A1:{sheet.cell(sheet.max_row, sheet.max_column).coordinate}"
        try:
            min_col, min_row, max_col, max_row = range_boundaries(selected_range)
        except ValueError as exc:
            raise SharePointError(f"Invalid Excel range: {selected_range}") from exc
        row_count = max_row - min_row + 1
        column_count = max_col - min_col + 1
        if row_count > MAX_EXCEL_ROWS or row_count * column_count > MAX_EXCEL_CELLS:
            raise SharePointError("Excel range exceeds the 200-row or 5,000-cell limit")
        values = []
        for row in sheet.iter_rows(
            min_row=min_row, max_row=max_row, min_col=min_col, max_col=max_col
        ):
            values.append([
                cell.value.isoformat()
                if isinstance(cell.value, (date, datetime))
                else cell.value
                for cell in row
            ])
        return {
            "file": cleaned,
            "worksheet": sheet_name,
            "range": selected_range,
            "rows": row_count,
            "columns": column_count,
            "values": values,
        }
    finally:
        workbook.close()
```

Reject extensions other than `.xlsx`. Load the workbook from `BytesIO` with `read_only=True` and `data_only=True`. Without `sheet_name`, return filename plus each worksheet's name, maximum row, and maximum column. With a sheet, validate the name and A1 range using `openpyxl.utils.cell.range_boundaries`; default to the sheet's used range capped by the same limits. Reject more than 200 rows or 5,000 cells before iteration. Convert dates and datetimes with `isoformat()` and return `file`, `worksheet`, `range`, `rows`, `columns`, and `values`.

- [ ] **Step 4: Run all SharePoint service tests**

Run: `python -m unittest tests.sharepoint_service_test -v`

Expected: all tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add backend/sharepoint_service.py tests/sharepoint_service_test.py
git commit -m "feat: read SharePoint Excel ranges"
```

---

### Task 3: MCP tools and operator documentation

**Files:**
- Create: `backend/mcp_sharepoint_server.py`
- Create: `tests/sharepoint_mcp_server_test.py`
- Modify: `backend/README.md`

**Interfaces:**
- Consumes: `SharePointService.list_files`, `search_files`, `read_text`, `download_file`, and `read_excel_range`
- Produces MCP tools: `list_sharepoint_files`, `search_sharepoint_files`, `read_sharepoint_file`, `download_sharepoint_file`, `read_excel_range`

- [ ] **Step 1: Write a failing MCP wrapper test**

Create `tests/sharepoint_mcp_server_test.py`, patch `mcp_sharepoint_server.get_service` with a fake service, and verify the wrapper emits JSON:

```python
def test_list_tool_serializes_service_result(self):
    fake = Mock()
    fake.list_files.return_value = [{"name": "Schedule.xlsx", "type": "file"}]
    with patch.object(server_module, "get_service", return_value=fake):
        result = json.loads(server_module.list_sharepoint_files("Planning"))
    self.assertEqual(result[0]["name"], "Schedule.xlsx")

def test_excel_tool_returns_actionable_error(self):
    fake = Mock()
    fake.read_excel_range.side_effect = SharePointError("Worksheet not found: Cost")
    with patch.object(server_module, "get_service", return_value=fake):
        result = json.loads(server_module.read_excel_range("Book.xlsx", "Cost", "A1:B2"))
    self.assertEqual(result["status"], "error")
```

- [ ] **Step 2: Run the MCP wrapper tests and confirm failure**

Run: `python -m unittest tests.sharepoint_mcp_server_test -v`

Expected: FAIL because `backend/mcp_sharepoint_server.py` does not exist.

- [ ] **Step 3: Implement the MCP server**

Create `backend/mcp_sharepoint_server.py` using the supported MCP v2 public import:

```python
from mcp.server import MCPServer

try:
    from .sharepoint_service import SharePointError, SharePointService
except ImportError:
    from sharepoint_service import SharePointError, SharePointService

server = MCPServer("project-engineer-sharepoint")
_service = None


def get_service() -> SharePointService:
    global _service
    if _service is None:
        _service = SharePointService()
    return _service
```

Decorate five thin, typed functions with `@server.tool()`. Each function must call exactly one service method and return `json.dumps(result, indent=2)`. Catch `SharePointError` and return `{"status": "error", "message": str(exc)}`. End with:

```python
if __name__ == "__main__":
    server.run(transport="stdio")
```

- [ ] **Step 4: Document Entra registration and launch configuration**

Add a `SharePoint MCP` section to `backend/README.md` containing:

```powershell
$env:SHAREPOINT_CLIENT_ID="00000000-0000-0000-0000-000000000000"
$env:SHAREPOINT_TENANT_ID="contoso.onmicrosoft.com"
$env:SHAREPOINT_SITE_URL="https://contoso.sharepoint.com/sites/Engineering"
python backend/mcp_sharepoint_server.py
```

Document the required delegated permissions `Files.Read.All` and `Sites.Read.All`, the `http://localhost` mobile/desktop redirect URI, public-client flow enablement, the first-run browser prompt, the device-code fallback, the five tools, and the fact that no write operation is exposed.

- [ ] **Step 5: Run all isolated SharePoint tests**

Run: `python -m unittest tests.sharepoint_service_test tests.sharepoint_mcp_server_test -v`

Expected: all tests PASS with no network access.

- [ ] **Step 6: Verify the server imports and advertises tools**

Run: `python -c "from backend.mcp_sharepoint_server import server; print(type(server).__name__)"`

Expected output: `MCPServer`

- [ ] **Step 7: Run the existing backend unit test that does not require PostgreSQL**

Run: `python -m unittest tests.backend_agent_routing_test -v`

Expected: all tests PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add backend/mcp_sharepoint_server.py backend/README.md tests/sharepoint_mcp_server_test.py
git commit -m "feat: expose SharePoint MCP tools"
```

---

### Task 4: Final verification

**Files:**
- Verify only; no planned file changes

**Interfaces:**
- Consumes: the complete SharePoint MCP server and tests from Tasks 1-3
- Produces: verification evidence for handoff

- [ ] **Step 1: Install the declared backend dependencies**

Run: `python -m pip install -r backend/requirements.txt`

Expected: installation completes successfully.

- [ ] **Step 2: Run the full network-independent verification set**

Run: `python -m unittest tests.sharepoint_service_test tests.sharepoint_mcp_server_test tests.backend_agent_routing_test -v`

Expected: all tests PASS.

- [ ] **Step 3: Confirm only intended implementation files are included**

Run: `git status --short` and `git diff --check HEAD~3..HEAD`

Expected: the SharePoint commits contain only the files named in this plan, and `git diff --check` reports no whitespace errors. Existing unrelated working-tree changes remain untouched.
