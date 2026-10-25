"""Build small, valid PDFs in tests without a PDF-writing library.

`make_pdf(["page one text", "page two text"], title="...")` returns bytes with one text line per
page, a Helvetica font, an Info dictionary and a correct xref table, readable by pdfplumber.
"""


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(pages: list[str], title: str = "Test document") -> bytes:
    objects = []  # object bodies, 1-based ids in order

    def add(body: str) -> int:
        objects.append(body)
        return len(objects)

    catalog = add("")  # filled in once the page tree id is known
    pages_id = add("")
    font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    page_ids = []
    for text in pages:
        stream = f"BT /F1 12 Tf 72 720 Td ({_escape(text)}) Tj ET"
        content = add(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
        page_ids.append(add(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {font} 0 R >> >> /Contents {content} 0 R >>"
        ))
    info = add(f"<< /Title ({_escape(title)}) /Author (Project Engineer tests) >>")
    objects[catalog - 1] = f"<< /Type /Catalog /Pages {pages_id} 0 R >>"
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{' '.join(f'{p} 0 R' for p in page_ids)}] /Count {len(page_ids)} >>"

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n{body}\nendobj\n".encode("latin-1")
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin-1")
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode("latin-1")
    out += f"trailer\n<< /Size {len(objects) + 1} /Root {catalog} 0 R /Info {info} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("latin-1")
    return bytes(out)
