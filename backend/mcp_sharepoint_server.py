"""Read-only SharePoint MCP server for the Project Engineer Platform."""

import json

from mcp.server import MCPServer

try:
    from .sharepoint_service import SharePointError, SharePointService
except ImportError:
    from sharepoint_service import SharePointError, SharePointService


server = MCPServer("project-engineer-sharepoint")
_service: SharePointService | None = None


def get_service() -> SharePointService:
    global _service
    if _service is None:
        _service = SharePointService()
    return _service


def _result(operation) -> str:
    try:
        return json.dumps(operation(), indent=2)
    except SharePointError as exc:
        return json.dumps({"status": "error", "message": str(exc)}, indent=2)


@server.tool()
def list_sharepoint_files(folder_path: str = "") -> str:
    """List files and folders below a folder in the configured SharePoint site."""
    return _result(lambda: get_service().list_files(folder_path))


@server.tool()
def search_sharepoint_files(query: str, limit: int = 20) -> str:
    """Search files in the configured SharePoint site's document library."""
    return _result(lambda: get_service().search_files(query, limit))


@server.tool()
def read_sharepoint_file(file_path: str) -> str:
    """Read a supported UTF-8 text file from SharePoint."""
    return _result(lambda: get_service().read_text(file_path))


@server.tool()
def download_sharepoint_file(file_path: str) -> str:
    """Download a SharePoint file beneath the configured local download folder."""
    return _result(lambda: get_service().download_file(file_path))


@server.tool()
def read_excel_range(
    file_path: str,
    sheet_name: str = "",
    cell_range: str = "",
) -> str:
    """List workbook sheets or read a bounded A1 range from a SharePoint .xlsx file."""
    return _result(
        lambda: get_service().read_excel_range(
            file_path,
            sheet_name,
            cell_range,
        )
    )


if __name__ == "__main__":
    server.run(transport="stdio")
