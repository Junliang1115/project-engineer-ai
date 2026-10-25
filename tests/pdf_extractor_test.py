import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.documents import pdf_extractor
from backend.documents.pdf_extractor import PdfExtractionError, extract_pdf, render_pages
from pdf_fixtures import make_pdf


class FakePage:
    def __init__(self, number, text="", tables=()):
        self.page_number = number
        self._text = text
        self._tables = list(tables)

    def extract_text(self):
        return self._text

    def extract_tables(self):
        return self._tables


class FakePdf:
    def __init__(self, pages, metadata=None):
        self.pages = pages
        self.metadata = metadata or {}

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class PdfExtractorTest(unittest.TestCase):
    def test_real_pdf_text_and_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "report.pdf"
            path.write_bytes(make_pdf(["TSK-H01 operator training started on 2026-10-20", "Second page"], title="Site report"))
            result = extract_pdf(path)
        self.assertEqual(result["page_count"], 2)
        self.assertEqual(result["metadata"]["title"], "Site report")
        self.assertIn("TSK-H01 operator training started on 2026-10-20", result["pages"][0]["text"])
        self.assertEqual([page["page"] for page in result["pages"]], [1, 2])
        self.assertTrue(all(page["has_text"] for page in result["pages"]))
        self.assertFalse(result["truncated"])

    def test_tables_are_cleaned_and_empty_rows_dropped(self):
        table = [["Task", " Status\n"], [None, None], ["TSK-H01", "in progress"]]
        pdf = FakePdf([FakePage(1, "Checklist", [table])])
        page = extract_pdf("x.pdf", opener=lambda _: pdf)["pages"][0]
        self.assertEqual(page["tables"], [[["Task", "Status"], ["TSK-H01", "in progress"]]])

    def test_scanned_pages_are_flagged_and_page_count_is_capped(self):
        pdf = FakePdf([FakePage(n) for n in range(1, 6)])
        with patch.object(pdf_extractor, "MAX_PAGES", 3):
            result = extract_pdf("x.pdf", opener=lambda _: pdf)
        self.assertEqual((result["page_count"], len(result["pages"]), result["truncated"]), (5, 3, True))
        self.assertFalse(result["pages"][0]["has_text"])

    def test_unreadable_pdf_raises_extraction_error(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "broken.pdf"
            path.write_bytes(b"%PDF-1.4\nthis is not really a pdf")
            with self.assertRaises(PdfExtractionError):
                extract_pdf(path)

    def test_render_pages_for_prompts(self):
        pages = [
            {"page": 1, "text": "Inspection passed", "tables": [[["Item", "Result"], ["Weld", "OK"]]], "has_text": True},
            {"page": 2, "text": "", "tables": [], "has_text": False},
        ]
        text, truncated = render_pages(pages, 10_000)
        self.assertIn("[page 1]\nInspection passed\nItem | Result\nWeld | OK", text)
        self.assertIn("possibly a scanned page", text)
        self.assertFalse(truncated)
        self.assertEqual(render_pages(pages, 10), (text[:10], True))


if __name__ == "__main__":
    unittest.main()
