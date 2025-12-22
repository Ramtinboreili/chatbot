from io import BytesIO
from typing import List

from pypdf import PdfReader


def extract_text(filename: str, content: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return _extract_pdf(content)
    if name.endswith(".txt") or name.endswith(".md"):
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("latin-1")

    raise ValueError("Unsupported file type. Use txt, md, or pdf.")


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    chunks = []
    start = 0
    while start < len(cleaned):
        end = start + chunk_size
        chunks.append(cleaned[start:end])
        start = end - overlap
        if start < 0:
            start = 0
    return chunks


def _extract_pdf(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)
