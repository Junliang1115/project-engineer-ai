"""Read-only Gmail correspondence and attachment access through Google API."""

import base64
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DEFAULT_DOWNLOADS_DIR = BASE_DIR / "downloads"
MAX_SEARCH_RESULTS = 100
MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024  # 25 MB
MAX_BODY_CHARS = 50_000


class GmailError(RuntimeError):
    """A safe, user-facing Gmail operation error."""


def _resolve_file_path(filename: str) -> Path:
    backend_path = BASE_DIR / filename
    root_path = ROOT_DIR / filename
    if backend_path.exists():
        return backend_path
    if root_path.exists():
        return root_path
    return backend_path


@dataclass(frozen=True)
class GmailConfig:
    credentials_path: Path
    token_path: Path
    download_dir: Path = DEFAULT_DOWNLOADS_DIR

    @classmethod
    def from_env(cls) -> "GmailConfig":
        custom_creds = os.getenv("GMAIL_CREDENTIALS_PATH", "").strip()
        credentials_path = Path(custom_creds) if custom_creds else _resolve_file_path("credentials.json")

        custom_token = os.getenv("GMAIL_TOKEN_PATH", "").strip()
        token_path = Path(custom_token) if custom_token else _resolve_file_path("token.json")

        custom_dl = os.getenv("GMAIL_DOWNLOAD_DIR", "").strip()
        download_dir = Path(custom_dl) if custom_dl else DEFAULT_DOWNLOADS_DIR

        return cls(
            credentials_path=credentials_path,
            token_path=token_path,
            download_dir=download_dir,
        )


class GmailService:
    SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

    def __init__(
        self,
        config: GmailConfig | None = None,
        service=None,
    ):
        self.config = config or GmailConfig.from_env()
        self._service = service

    def _get_service(self):
        """Authenticates and returns authorized Google API Gmail service instance."""
        if self._service is not None:
            return self._service

        creds = None
        if self.config.token_path.exists():
            try:
                creds = Credentials.from_authorized_user_file(
                    str(self.config.token_path), self.SCOPES
                )
            except Exception as exc:
                print(f"Warning: Could not read token file: {exc}", file=sys.stderr)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception as exc:
                    print(f"Warning: Failed to refresh expired Gmail token: {exc}. Re-authenticating...", file=sys.stderr)
                    creds = None

            if not creds or not creds.valid:
                if not self.config.credentials_path.exists():
                    raise GmailError(
                        f"OAuth token expired and credentials file not found at '{self.config.credentials_path}'. "
                        "Please provide credentials.json or re-authenticate."
                    )
                try:
                    flow = InstalledAppFlow.from_client_secrets_file(
                        str(self.config.credentials_path), self.SCOPES
                    )
                    creds = flow.run_local_server(port=0)
                except Exception as exc:
                    raise GmailError(f"OAuth authentication flow failed: {exc}") from exc

            # Save credentials for subsequent runs
            self.config.token_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config.token_path, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())

        self._service = build("gmail", "v1", credentials=creds)
        return self._service

    def get_user_profile(self) -> dict:
        """Fetches user profile details (email address, total messages)."""
        service = self._get_service()
        try:
            profile = service.users().getProfile(userId="me").execute()
            return {
                "email_address": profile.get("emailAddress"),
                "messages_total": profile.get("messagesTotal"),
                "threads_total": profile.get("threadsTotal"),
                "history_id": profile.get("historyId"),
            }
        except HttpError as exc:
            raise GmailError(f"Failed to retrieve user profile: {exc}") from exc

    def list_messages(self, query: str = "label:INBOX", max_results: int = 10) -> list[dict]:
        """Returns a list of message summary references matching the query."""
        if not 1 <= max_results <= MAX_SEARCH_RESULTS:
            raise GmailError(f"max_results must be between 1 and {MAX_SEARCH_RESULTS}")

        service = self._get_service()
        try:
            results = (
                service.users()
                .messages()
                .list(userId="me", q=query, maxResults=max_results)
                .execute()
            )
            return results.get("messages", [])
        except HttpError as exc:
            raise GmailError(f"Failed to list messages: {exc}") from exc

    def iter_message_refs(self, query: str = "label:INBOX"):
        """Yield all matching message references, including later Gmail pages."""
        service = self._get_service()
        page_token = None
        while True:
            options = {"userId": "me", "q": query, "maxResults": MAX_SEARCH_RESULTS}
            if page_token:
                options["pageToken"] = page_token
            try:
                page = service.users().messages().list(**options).execute()
            except HttpError as exc:
                raise GmailError(f"Failed to page through Gmail messages: {exc}") from exc
            yield from page.get("messages", [])
            page_token = page.get("nextPageToken")
            if not page_token:
                return

    @staticmethod
    def _extract_body(payload: dict) -> str:
        """Recursively extracts plain text body from a MIME payload."""
        parts = payload.get("parts", [])
        if not parts:
            data = payload.get("body", {}).get("data")
            if data:
                try:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                except Exception:
                    return ""
            return ""

        for part in parts:
            mime_type = part.get("mimeType", "")
            if mime_type == "text/plain":
                data = part.get("body", {}).get("data")
                if data:
                    try:
                        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                    except Exception:
                        pass
            elif "parts" in part:
                nested = GmailService._extract_body(part)
                if nested:
                    return nested

        return ""

    @staticmethod
    def _extract_attachments(payload: dict) -> list[dict]:
        """Recursively traverses MIME parts to extract attachment metadata."""
        attachments = []
        parts = payload.get("parts", [])

        for part in parts:
            filename = part.get("filename", "")
            body = part.get("body", {})
            attachment_id = body.get("attachmentId")
            size = body.get("size", 0)

            if filename and (attachment_id or body.get("data")):
                attachments.append({
                    "filename": filename,
                    "attachment_id": attachment_id or "",
                    "mime_type": part.get("mimeType", "application/octet-stream"),
                    "size_bytes": size,
                })

            if "parts" in part:
                attachments.extend(GmailService._extract_attachments(part))

        return attachments

    def get_message_detail(self, message_id: str) -> dict:
        """Fetches and parses a single email's headers, body content, and attachment list."""
        if not message_id or not message_id.strip():
            raise GmailError("message_id is required")

        service = self._get_service()
        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=message_id.strip(), format="full")
                .execute()
            )
        except HttpError as exc:
            raise GmailError(f"Failed to fetch message {message_id}: {exc}") from exc

        payload = msg.get("payload", {})
        headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
        body_text = self._extract_body(payload)
        if len(body_text) > MAX_BODY_CHARS:
            body_text = body_text[:MAX_BODY_CHARS] + "\n... [Body truncated to 50,000 characters]"

        return {
            "id": msg.get("id"),
            "thread_id": msg.get("threadId"),
            "subject": headers.get("subject", "(No Subject)"),
            "from": headers.get("from", "(Unknown Sender)"),
            "to": headers.get("to", ""),
            "date": headers.get("date", ""),
            "snippet": msg.get("snippet", ""),
            "body": body_text,
            "attachments": self._extract_attachments(payload),
        }

    def fetch_recent_emails(self, max_results: int = 5, query: str = "label:INBOX") -> list[dict]:
        """Fetches parsed details for the most recent emails."""
        messages = self.list_messages(query=query, max_results=max_results)
        parsed_emails = []
        for msg_ref in messages:
            try:
                detail = self.get_message_detail(msg_ref["id"])
                parsed_emails.append(detail)
            except GmailError as err:
                print(f"Failed to fetch message {msg_ref.get('id')}: {err}", file=sys.stderr)
        return parsed_emails

    def download_attachments(
        self,
        message_id: str,
        attachment_id: str = "",
        filename: str = "",
        output_dir: str = "",
    ) -> list[dict]:
        """
        Downloads email attachments.
        - If attachment_id is provided: downloads that specific attachment directly.
        - If filename is provided: downloads the attachment matching that filename.
        - If neither is provided: downloads all attachments in the message.
        """
        if not message_id or not message_id.strip():
            raise GmailError("message_id is required")

        dest_dir = Path(output_dir) if output_dir else self.config.download_dir
        dest_dir.mkdir(parents=True, exist_ok=True)
        service = self._get_service()

        # Case 1: Specific attachment_id
        if attachment_id.strip():
            att_id = attachment_id.strip()
            try:
                attachment = (
                    service.users()
                    .messages()
                    .attachments()
                    .get(userId="me", messageId=message_id, id=att_id)
                    .execute()
                )
            except HttpError as exc:
                raise GmailError(f"Failed to retrieve attachment {att_id}: {exc}") from exc

            raw_data = attachment.get("data", "")
            file_bytes = base64.urlsafe_b64decode(raw_data.encode("utf-8"))
            if len(file_bytes) > MAX_DOWNLOAD_BYTES:
                raise GmailError(f"Attachment exceeds maximum limit of {MAX_DOWNLOAD_BYTES} bytes")

            safe_name = Path(filename.strip() or f"attachment_{message_id}.bin").name
            save_path = dest_dir / safe_name
            save_path.write_bytes(file_bytes)

            return [{
                "filename": safe_name,
                "saved_path": str(save_path.resolve()),
                "size_bytes": len(file_bytes),
            }]

        # Case 2: Inspect message payload to download all or filter by filename
        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=message_id, format="full")
                .execute()
            )
        except HttpError as exc:
            raise GmailError(f"Failed to retrieve message {message_id}: {exc}") from exc

        payload = msg.get("payload", {})
        available_attachments = self._extract_attachments(payload)

        if filename.strip():
            available_attachments = [
                att for att in available_attachments
                if att["filename"].lower() == filename.strip().lower()
            ]

        if not available_attachments:
            return []

        downloaded = []
        for att in available_attachments:
            safe_filename = Path(att["filename"]).name
            save_path = dest_dir / safe_filename

            try:
                attachment = (
                    service.users()
                    .messages()
                    .attachments()
                    .get(userId="me", messageId=message_id, id=att["attachment_id"])
                    .execute()
                )
            except HttpError as exc:
                raise GmailError(f"Failed to download attachment {att['filename']}: {exc}") from exc

            raw_data = attachment.get("data", "")
            file_bytes = base64.urlsafe_b64decode(raw_data.encode("utf-8"))
            if len(file_bytes) > MAX_DOWNLOAD_BYTES:
                raise GmailError(f"Attachment {safe_filename} exceeds {MAX_DOWNLOAD_BYTES} bytes limit")

            save_path.write_bytes(file_bytes)
            downloaded.append({
                "filename": safe_filename,
                "saved_path": str(save_path.resolve()),
                "size_bytes": len(file_bytes),
            })

        return downloaded


# ---------------------------------------------------------------------------
# Module-level convenience functions for backward compatibility
# ---------------------------------------------------------------------------
_default_service: GmailService | None = None


def get_default_service() -> GmailService:
    global _default_service
    if _default_service is None:
        _default_service = GmailService()
    return _default_service


def get_gmail_service():
    """Backward-compatible helper returning the raw Google API service."""
    return get_default_service()._get_service()


def get_user_profile(service=None) -> dict:
    if service:
        return GmailService(service=service).get_user_profile()
    return get_default_service().get_user_profile()


def list_messages(query: str = "label:INBOX", max_results: int = 10, service=None) -> list[dict]:
    if service:
        return GmailService(service=service).list_messages(query=query, max_results=max_results)
    return get_default_service().list_messages(query=query, max_results=max_results)


def get_message_detail(message_id: str, service=None) -> dict:
    if service:
        return GmailService(service=service).get_message_detail(message_id)
    return get_default_service().get_message_detail(message_id)


def fetch_recent_emails(max_results: int = 5, query: str = "label:INBOX", service=None) -> list[dict]:
    if service:
        return GmailService(service=service).fetch_recent_emails(max_results=max_results, query=query)
    return get_default_service().fetch_recent_emails(max_results=max_results, query=query)


def download_email_attachments(
    message_id: str,
    attachment_id: str = "",
    filename: str = "",
    output_dir: str = "",
    service=None,
) -> list[dict]:
    if service:
        svc = GmailService(service=service)
    else:
        svc = get_default_service()
    return svc.download_attachments(
        message_id=message_id,
        attachment_id=attachment_id,
        filename=filename,
        output_dir=output_dir,
    )


if __name__ == "__main__":
    print("=" * 60)
    print("Project Engineer - Gmail OOP Service Connection Test")
    print("=" * 60)

    config = GmailConfig.from_env()
    if not config.credentials_path.exists():
        print(f"\n[!] 'credentials.json' was not found at {config.credentials_path}.")
    else:
        try:
            svc = GmailService(config=config)
            profile = svc.get_user_profile()
            print(f"\n[+] Successfully connected to Gmail!")
            print(f"    Account Email : {profile.get('email_address')}")
            print(f"    Total Messages: {profile.get('messages_total')}")

            print("\nFetching latest 3 emails from INBOX...")
            emails = svc.fetch_recent_emails(max_results=3)
            if not emails:
                print("    (Inbox is empty or no messages match)")
            for i, email in enumerate(emails, 1):
                print(f"\n--- Email #{i} ---")
                print(f"From   : {email['from']}")
                print(f"Date   : {email['date']}")
                print(f"Subject: {email['subject']}")
                print(f"Snippet: {email['snippet'][:120]}...")
        except Exception as exc:
            print(f"\n[-] Error connecting to Gmail: {exc}")
