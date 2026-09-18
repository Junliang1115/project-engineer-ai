# SharePoint MCP Design

## Goal

Add a read-only SharePoint MCP server to the Project Engineer Platform. The server will authenticate an individual Microsoft 365 user, access one configured SharePoint site, and expose files and Excel workbook data to MCP clients.

## Scope

The first version will support:

- Browser-based delegated Microsoft sign-in, with a device-code fallback when an interactive browser is unavailable.
- One SharePoint site configured through `SHAREPOINT_SITE_URL`.
- Listing files and folders beneath a selected folder.
- Searching for files within the configured site.
- Reading supported text files.
- Downloading files to a controlled local download directory.
- Reading `.xlsx` workbook metadata and a bounded cell range as JSON.

The first version will not create, update, move, or delete SharePoint content. It will not search across multiple sites, modify Excel workbooks, or interpret legacy `.xls` files.

## Configuration

The server will read these environment variables:

- `SHAREPOINT_CLIENT_ID`: Microsoft Entra public-client application ID.
- `SHAREPOINT_TENANT_ID`: Tenant ID or tenant domain.
- `SHAREPOINT_SITE_URL`: Site URL; documentation will use `https://contoso.sharepoint.com/sites/Engineering` as the sample.
- `SHAREPOINT_DOWNLOAD_DIR`: Optional download directory, defaulting to `backend/downloads/sharepoint`.

No client secret is required for delegated user authentication. The Entra application must permit public-client flows and have delegated Microsoft Graph permissions sufficient to read the configured site's files. Tokens will be cached in a local file excluded from version control.

## Architecture

`backend/sharepoint_service.py` will own authentication, Microsoft Graph requests, site and drive resolution, path validation, downloads, and Excel parsing. `backend/mcp_sharepoint_server.py` will contain thin MCP tool wrappers that validate tool arguments, call the service, and serialize results.

Direct Graph REST calls through the project's existing `httpx` dependency will keep the implementation small. `msal` will handle delegated authentication and token caching. `openpyxl` will parse downloaded `.xlsx` content in memory.

## MCP Tools

### `list_sharepoint_files`

Accepts an optional site-relative folder path. Returns each child item's name, type, size, modification time, web URL, and site-relative path.

### `search_sharepoint_files`

Accepts a search query and bounded result count. Returns matching files from the configured site's default document library.

### `read_sharepoint_file`

Accepts a site-relative file path. Returns UTF-8 text for a small allowlist of text formats. Binary or unsupported files return metadata and direct the caller to the download or Excel tool.

### `download_sharepoint_file`

Accepts a site-relative file path. Downloads the file beneath the configured local download directory and returns the saved path and metadata. Path validation prevents writing outside that directory.

### `read_excel_range`

Accepts a site-relative `.xlsx` path, an optional worksheet name, and an optional A1 range. If the worksheet is omitted, it returns workbook and worksheet metadata. With a worksheet, it returns bounded rows of cached cell values as JSON. Formula cells return their cached result when available. The tool will reject unsupported extensions, invalid ranges, encrypted workbooks, and responses above configured row or cell limits.

## Data Flow

On the first tool call, the service loads the token cache and attempts silent authentication. If no valid token exists, it starts an interactive browser login and falls back to device-code login when needed. It then resolves the configured site URL to a Graph site ID and obtains the site's default drive ID.

Each tool converts the requested relative path into a Microsoft Graph drive request. File content is streamed or bounded before parsing. Results are returned as JSON-compatible data and the MCP wrapper serializes them for the client.

## Security and Limits

- Use delegated read-only Graph scopes; never request write permissions.
- Restrict all operations to the configured site and its default document library.
- Never log access tokens or authorization headers.
- Validate local download destinations against the configured download root.
- Bound search results, text size, download size, Excel rows, and Excel cells.
- Return concise authentication and Graph errors without exposing secrets.

## Error Handling

The service will distinguish configuration errors, authentication failures, missing files, unsupported formats, Graph permission errors, throttling, and malformed Excel ranges. MCP tools will return actionable messages while preserving enough status information for diagnosis. Graph requests will use timeouts and a small retry policy for throttling and transient server failures.

## Testing

Tests will mock authentication and Graph responses; they will not require a live tenant. Coverage will include site resolution, folder listing, search, text-size limits, safe download paths, Excel worksheet metadata, range parsing, cached values, and representative error responses. A temporary workbook will verify Excel parsing without external services.

## Acceptance Criteria

- The server starts over MCP stdio using the project's existing MCP pattern.
- A signed-in user can list and search the sample-configured site after replacing sample configuration with valid tenant values.
- The server can read supported text files and download permitted files safely.
- The server can list workbook sheets and return a requested bounded `.xlsx` range as JSON.
- No exposed MCP tool can modify SharePoint content.
- Automated tests pass without SharePoint credentials.
