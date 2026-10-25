import base64
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.integrations.gmail_service import (
    GmailConfig,
    GmailError,
    GmailService,
    get_user_profile,
    list_messages,
    get_message_detail,
    download_email_attachments,
)


class FakeExecute:
    def __init__(self, result):
        self._result = result

    def execute(self):
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


class FakeAttachmentsResource:
    def __init__(self, data_by_id):
        self.data_by_id = data_by_id

    def get(self, userId, messageId, id):
        content = self.data_by_id.get(id, b"")
        encoded = base64.urlsafe_b64encode(content).decode("utf-8")
        return FakeExecute({"data": encoded})


class FakeMessagesResource:
    def __init__(self, messages=None, details=None, attachments=None):
        self.messages_list = messages or []
        self.details = details or {}
        self._attachments = FakeAttachmentsResource(attachments or {})

    def list(self, userId, q, maxResults):
        return FakeExecute({"messages": self.messages_list[:maxResults]})

    def get(self, userId, id, format):
        return FakeExecute(self.details.get(id, {}))

    def attachments(self):
        return self._attachments


class FakeUsersResource:
    def __init__(self, profile=None, messages=None, details=None, attachments=None):
        self._profile = profile or {
            "emailAddress": "project.engineer@example.com",
            "messagesTotal": 42,
            "threadsTotal": 20,
            "historyId": "9999",
        }
        self._messages = FakeMessagesResource(messages, details, attachments)

    def getProfile(self, userId):
        return FakeExecute(self._profile)

    def messages(self):
        return self._messages


class FakeGmailService:
    def __init__(self, profile=None, messages=None, details=None, attachments=None):
        self._users = FakeUsersResource(profile, messages, details, attachments)

    def users(self):
        return self._users


class GmailServiceTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.temp_dir = Path(self.temp.name)
        self.config = GmailConfig(
            credentials_path=self.temp_dir / "credentials.json",
            token_path=self.temp_dir / "token.json",
            download_dir=self.temp_dir / "downloads",
        )

    def tearDown(self):
        self.temp.cleanup()

    def test_config_paths(self):
        self.assertEqual(self.config.download_dir, self.temp_dir / "downloads")
        self.assertFalse(self.config.credentials_path.exists())

    def test_get_user_profile(self):
        fake_api = FakeGmailService()
        svc = GmailService(config=self.config, service=fake_api)
        profile = svc.get_user_profile()
        self.assertEqual(profile["email_address"], "project.engineer@example.com")
        self.assertEqual(profile["messages_total"], 42)

    def test_list_messages(self):
        sample_messages = [{"id": f"msg-{i}", "threadId": f"thread-{i}"} for i in range(10)]
        fake_api = FakeGmailService(messages=sample_messages)
        svc = GmailService(config=self.config, service=fake_api)
        results = svc.list_messages(query="is:unread", max_results=5)
        self.assertEqual(len(results), 5)
        self.assertEqual(results[0]["id"], "msg-0")

    def test_list_messages_invalid_max_results(self):
        svc = GmailService(config=self.config, service=FakeGmailService())
        with self.assertRaises(GmailError):
            svc.list_messages(max_results=0)
        with self.assertRaises(GmailError):
            svc.list_messages(max_results=999)

    def test_iter_message_refs_reads_later_pages(self):
        class PagedMessages:
            def list(self, **kwargs):
                if kwargs.get("pageToken") == "next":
                    return FakeExecute({"messages": [{"id": "older"}]})
                return FakeExecute({"messages": [{"id": "newer"}], "nextPageToken": "next"})

        class PagedUsers:
            def messages(self):
                return PagedMessages()

        class PagedApi:
            def users(self):
                return PagedUsers()

        svc = GmailService(config=self.config, service=PagedApi())
        self.assertEqual([item["id"] for item in svc.iter_message_refs("label:INBOX")], ["newer", "older"])

    def test_get_message_detail_with_body_and_attachments(self):
        body_data = base64.urlsafe_b64encode(b"Please review the attached CW-014 pipe specification.").decode("utf-8")
        msg_payload = {
            "id": "msg-101",
            "threadId": "thread-101",
            "snippet": "Please review...",
            "payload": {
                "headers": [
                    {"name": "Subject", "value": "Technical Query TQ-2026-0913"},
                    {"name": "From", "value": "lead.engineer@contractor.com"},
                    {"name": "To", "value": "project.engineer@example.com"},
                    {"name": "Date", "value": "Wed, 17 Sep 2026 10:30:00 +0800"},
                ],
                "parts": [
                    {
                        "mimeType": "text/plain",
                        "body": {"data": body_data},
                    },
                    {
                        "filename": "pipe_spec_cw014.pdf",
                        "mimeType": "application/pdf",
                        "body": {"attachmentId": "att-991", "size": 102400},
                    },
                ],
            },
        }

        fake_api = FakeGmailService(details={"msg-101": msg_payload})
        svc = GmailService(config=self.config, service=fake_api)
        detail = svc.get_message_detail("msg-101")

        self.assertEqual(detail["id"], "msg-101")
        self.assertEqual(detail["subject"], "Technical Query TQ-2026-0913")
        self.assertEqual(detail["from"], "lead.engineer@contractor.com")
        self.assertIn("pipe specification", detail["body"])
        self.assertEqual(len(detail["attachments"]), 1)
        self.assertEqual(detail["attachments"][0]["filename"], "pipe_spec_cw014.pdf")
        self.assertEqual(detail["attachments"][0]["attachment_id"], "att-991")

    def test_download_attachment_by_id(self):
        file_bytes = b"%PDF-1.4 sample pdf content for pipe specs"
        fake_api = FakeGmailService(attachments={"att-991": file_bytes})
        svc = GmailService(config=self.config, service=fake_api)

        downloads = svc.download_attachments(
            message_id="msg-101",
            attachment_id="att-991",
            filename="pipe_spec.pdf",
        )

        self.assertEqual(len(downloads), 1)
        saved_file = Path(downloads[0]["saved_path"])
        self.assertTrue(saved_file.exists())
        self.assertEqual(saved_file.read_bytes(), file_bytes)
        self.assertEqual(downloads[0]["filename"], "pipe_spec.pdf")

    def test_get_attachment_bytes_returns_content_without_saving(self):
        file_bytes = b"%PDF-1.4 inspection report"
        svc = GmailService(config=self.config, service=FakeGmailService(attachments={"att-1": file_bytes}))
        self.assertEqual(svc.get_attachment_bytes("msg-1", "att-1"), file_bytes)
        self.assertFalse(self.config.download_dir.exists())
        with self.assertRaises(GmailError):
            svc.get_attachment_bytes("msg-1", "")

    def test_backward_compatibility_functions(self):
        fake_api = FakeGmailService()
        profile = get_user_profile(service=fake_api)
        self.assertEqual(profile["email_address"], "project.engineer@example.com")


if __name__ == "__main__":
    unittest.main()
