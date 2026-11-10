import hashlib
import json
import logging
import re
from pathlib import Path
from typing import Any

import pymupdf
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

PDF_MAGIC_BYTES = b"%PDF-"


class PDFProcessingResult:
    """Encapsulates the result of processing a PDF file."""

    def __init__(
        self,
        sha256_hash: str,
        file_size: int,
        page_count: int,
        title: str | None,
        authors: str | None,
        publication_year: int | None,
        abstract: str | None,
        pages: list[dict[str, Any]],
        extraction_status: str,
    ) -> None:
        self.sha256_hash = sha256_hash
        self.file_size = file_size
        self.page_count = page_count
        self.title = title
        self.authors = authors
        self.publication_year = publication_year
        self.abstract = abstract
        self.pages = pages
        self.extraction_status = extraction_status


class PDFService:
    """Service handling PDF validation, storage, text extraction, and metadata parsing."""

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        """Compute SHA-256 hash of raw file bytes."""
        hasher = hashlib.sha256()
        hasher.update(content)
        return hasher.hexdigest()

    @staticmethod
    def validate_pdf_content(content: bytes, filename: str) -> None:
        """Validate PDF magic bytes, non-emptiness, and file size."""
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file '{filename}' is empty.",
            )

        if len(content) > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"File size ({len(content) / (1024 * 1024):.2f} MB) exceeds "
                    f"the maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB."
                ),
            )

        if not content.startswith(PDF_MAGIC_BYTES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' does not have a valid PDF signature.",
            )

    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize extracted PDF text."""
        if not text:
            return ""

        # Normalize carriage returns
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # Re-join hyphenated words broken across linebreaks (e.g. "trans-\nformer" -> "transformer")
        text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)

        # Replace excessive whitespace within lines while preserving paragraph breaks
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
        text = "\n".join(lines)
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    @classmethod
    def extract_metadata_heuristics(
        cls,
        doc: pymupdf.Document,
        first_page_text: str,
    ) -> tuple[str | None, str | None, int | None, str | None]:
        """Extract title, authors, publication year, and abstract using embedded metadata and layout heuristics."""
        embedded = doc.metadata or {}
        title = embedded.get("title")
        authors = embedded.get("author")
        pub_year: int | None = None
        abstract: str | None = None

        # Clean embedded title if it looks generic
        if title:
            cleaned_title = title.strip()
            if cleaned_title.lower() in {"untitled", "blank", "default", "pdf"}:
                title = None
            else:
                title = cleaned_title

        # Heuristic title from first page if embedded title is missing or suspicious
        if not title and first_page_text:
            lines = [line.strip() for line in first_page_text.split("\n") if line.strip()]
            if lines:
                # Often the first 1-3 lines before authors or abstract form the title
                candidate_title = lines[0]
                if len(candidate_title) < 200:
                    title = candidate_title

        # Heuristic year extraction (from creation date or text)
        creation_date = embedded.get("creationDate")
        if creation_date and len(creation_date) >= 6:
            # Format usually D:YYYYMMDD...
            match = re.search(r"(\d{4})", creation_date)
            if match:
                year_val = int(match.group(1))
                if 1950 <= year_val <= 2030:
                    pub_year = year_val

        if pub_year is None and first_page_text:
            year_matches = re.findall(r"\b(19\d{2}|20\d{2})\b", first_page_text[:1500])
            if year_matches:
                # Prefer the most recent realistic year found
                valid_years = [int(y) for y in year_matches if 1970 <= int(y) <= 2030]
                if valid_years:
                    pub_year = max(valid_years)

        # Heuristic abstract extraction from first page (or first few pages)
        if first_page_text:
            abstract_pattern = re.compile(
                r"(?i)\babstract\b[\s\.:\-\—]+([\s\S]*?)(?=(?:\n\s*(?:1[\.\s]|I[\.\s]|introduction|keywords|index terms|\Z)))",
                re.IGNORECASE,
            )
            match = abstract_pattern.search(first_page_text)
            if match:
                abstract = cls.clean_text(match.group(1).strip())
                if len(abstract) > 1500:
                    abstract = abstract[:1500] + "..."

        return title, authors, pub_year, abstract

    @classmethod
    def process_pdf(cls, content: bytes, filename: str) -> PDFProcessingResult:
        """Process PDF bytes: validate, extract page-level text, and parse metadata."""
        cls.validate_pdf_content(content, filename)
        sha256_hash = cls.compute_sha256(content)

        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse PDF '{filename}': {str(e)}",
            )

        page_count = doc.page_count
        pages: list[dict[str, Any]] = []
        total_chars = 0
        first_page_text = ""

        try:
            for page_idx in range(page_count):
                page = doc.load_page(page_idx)
                raw_text = page.get_text("text") or ""
                cleaned = cls.clean_text(raw_text)

                if page_idx == 0:
                    first_page_text = cleaned

                char_count = len(cleaned)
                total_chars += char_count

                pages.append({
                    "page_number": page_idx + 1,
                    "text": cleaned,
                    "char_count": char_count,
                })

            # Check if document appears to be scanned
            extraction_status = "completed"
            if total_chars < 50 and page_count > 0:
                extraction_status = "ocr_needed"

            title, authors, pub_year, abstract = cls.extract_metadata_heuristics(
                doc,
                first_page_text,
            )

        finally:
            doc.close()

        return PDFProcessingResult(
            sha256_hash=sha256_hash,
            file_size=len(content),
            page_count=page_count,
            title=title or filename,
            authors=authors,
            publication_year=pub_year,
            abstract=abstract,
            pages=pages,
            extraction_status=extraction_status,
        )

    @staticmethod
    def save_pdf_file(internal_filename: str, content: bytes) -> Path:
        """Save original PDF to local storage."""
        dest_path = settings.documents_dir / internal_filename
        dest_path.write_bytes(content)
        return dest_path

    @staticmethod
    def save_extracted_text(doc_id: str, pages: list[dict[str, Any]]) -> Path:
        """Persist extracted page-by-page text as JSON."""
        dest_path = settings.extracted_text_dir / f"{doc_id}.json"
        dest_path.write_text(
            json.dumps({"document_id": doc_id, "pages": pages}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return dest_path

    @staticmethod
    def load_extracted_text(doc_id: str) -> list[dict[str, Any]]:
        """Load extracted page-by-page text from JSON storage."""
        file_path = settings.extracted_text_dir / f"{doc_id}.json"
        if not file_path.exists():
            return []
        data = json.loads(file_path.read_text(encoding="utf-8"))
        return data.get("pages", [])

    @staticmethod
    def delete_document_files(internal_filename: str, doc_id: str) -> None:
        """Delete local PDF file and extracted text file."""
        pdf_path = settings.documents_dir / internal_filename
        if pdf_path.exists():
            try:
                pdf_path.unlink()
            except OSError as e:
                logger.warning(f"Could not delete PDF file {pdf_path}: {e}")

        text_path = settings.extracted_text_dir / f"{doc_id}.json"
        if text_path.exists():
            try:
                text_path.unlink()
            except OSError as e:
                logger.warning(f"Could not delete extracted text file {text_path}: {e}")
