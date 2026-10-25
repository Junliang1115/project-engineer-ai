"""
Gmail Model Context Protocol (MCP) Server for Project Engineer Platform.
Exposes tools for AI assistants to search, read, and inspect Gmail correspondence
and download email attachments.
"""

import json
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from mcp.server.mcpserver import MCPServer
from pydantic import Field

try:
    from backend.integrations.gmail_service import GmailError, GmailService
except ImportError:
    from integrations.gmail_service import GmailError, GmailService

server = MCPServer("project-engineer-gmail")
_service: GmailService | None = None


def get_service() -> GmailService:
    global _service
    if _service is None:
        _service = GmailService()
    return _service


@server.tool()
def list_recent_emails(
    max_results: int = Field(10, description="Number of emails to retrieve (default: 10)."),
    query: str = Field("label:INBOX", description="Gmail search query, e.g. 'label:INBOX', 'is:unread', 'subject:pipe'."),
) -> str:
    """
    List recent emails from Gmail matching a query or label.
    """
    try:
        svc = get_service()
        emails = svc.fetch_recent_emails(max_results=max_results, query=query)
        if not emails:
            return f"No emails found matching query '{query}'."

        output = [f"Found {len(emails)} email(s) for query: '{query}':\n"]
        for i, email in enumerate(emails, 1):
            output.append(
                f"[{i}] ID: {email['id']}\n"
                f"    Date   : {email['date']}\n"
                f"    From   : {email['from']}\n"
                f"    Subject: {email['subject']}\n"
                f"    Snippet: {email['snippet']}\n"
            )
        return "\n".join(output)
    except GmailError as exc:
        return f"Gmail error: {exc}"
    except Exception as exc:
        return f"Error listing emails: {exc}"


@server.tool()
def read_email_details(
    message_id: str = Field(..., description="The Gmail message ID (obtained from list_recent_emails or search_emails)."),
) -> str:
    """
    Fetch the complete details, body content, and attachment list of a specific Gmail message by its ID.
    """
    try:
        svc = get_service()
        email = svc.get_message_detail(message_id)
        return json.dumps(email, indent=2)
    except GmailError as exc:
        return f"Gmail error: {exc}"
    except Exception as exc:
        return f"Error reading email {message_id}: {exc}"


@server.tool()
def search_emails(
    query: str = Field(..., description="Gmail search query (e.g. 'from:contractor@example.com', 'has:attachment specification', 'is:unread')."),
    max_results: int = Field(10, description="Maximum results to return (default: 10)."),
) -> str:
    """
    Search Gmail using standard Gmail search syntax.
    """
    return list_recent_emails(max_results=max_results, query=query)


@server.tool()
def download_email_attachment(
    message_id: str = Field(..., description="The Gmail message ID containing the attachment."),
    attachment_id: str = Field(..., description="The specific attachment ID obtained from read_email_details."),
    filename: str = Field(..., description="The filename of the attachment with extension (e.g. 'specification.pdf') obtained from read_email_details."),
    output_dir: str = Field("", description="Optional custom folder path to save the file. If omitted, saves to 'backend/downloads/'."),
) -> str:
    """
    Download a specific email attachment to disk using its message_id, attachment_id, and filename.
    """
    try:
        svc = get_service()
        results = svc.download_attachments(
            message_id=message_id,
            attachment_id=attachment_id,
            filename=filename,
            output_dir=output_dir,
        )
        if not results:
            return f"No attachment found matching '{filename or attachment_id}' in message ID '{message_id}'."
        return json.dumps(
            {
                "status": "success",
                "downloaded_file": results[0],
            },
            indent=2,
        )
    except GmailError as exc:
        return f"Gmail error: {exc}"
    except Exception as exc:
        return f"Error downloading attachment for message {message_id}: {exc}"


if __name__ == "__main__":
    server.run(transport="stdio")
