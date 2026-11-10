import re
from typing import Any

from app.core.config import settings

# Regex to identify typical research paper section headings
SECTION_HEADING_PATTERN = re.compile(
    r"^(?:"
    r"(?:\d+|[IVXLCDM]+)[\.\s]+[A-Z][A-Za-z0-9\s,\-&]{2,60}|"
    r"abstract|introduction|related work|background|methodology|method|model|approach|"
    r"architecture|experiments?|experimental (?:setup|results)|results|discussion|limitations|"
    r"conclusions?(?:\s+(?:and|&)\s+future work)?|future work|acknowledgments?|references"
    r")$",
    re.IGNORECASE,
)

# Sentence boundary regex
SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")


class ChunkData:
    """Represents an in-memory chunk ready for database insertion."""

    def __init__(
        self,
        document_id: str,
        chunk_index: int,
        text: str,
        page_number: int,
        section_heading: str | None,
        char_count: int,
        token_count: int,
        embedding_model: str,
    ) -> None:
        self.document_id = document_id
        self.chunk_index = chunk_index
        self.text = text
        self.page_number = page_number
        self.section_heading = section_heading
        self.char_count = char_count
        self.token_count = token_count
        self.embedding_model = embedding_model


class ChunkingService:
    """Service to intelligently split research paper page texts into semantic chunks."""

    @staticmethod
    def estimate_token_count(text: str) -> int:
        """Estimate token count: roughly 4 characters per token for English text."""
        if not text:
            return 0
        return max(1, len(text) // 4)

    @classmethod
    def is_section_heading(cls, line: str) -> bool:
        """Check if a line matches typical academic section heading conventions."""
        cleaned = line.strip()
        if len(cleaned) > 80:
            return False
        return bool(SECTION_HEADING_PATTERN.match(cleaned))

    @classmethod
    def chunk_document(
        cls,
        document_id: str,
        pages: list[dict[str, Any]],
        chunk_size_tokens: int | None = None,
        chunk_overlap_tokens: int | None = None,
        embedding_model: str | None = None,
    ) -> list[ChunkData]:
        """Split page-level text into overlapping chunks preserving section context and page numbers."""
        size_tokens = chunk_size_tokens or settings.CHUNK_SIZE
        overlap_tokens = chunk_overlap_tokens or settings.CHUNK_OVERLAP
        model_name = embedding_model or settings.EMBEDDING_MODEL

        # Convert token limits to approximate character counts (~4 chars per token)
        max_chars = size_tokens * 4
        overlap_chars = overlap_tokens * 4

        chunks: list[ChunkData] = []
        chunk_index = 0
        current_section: str | None = None

        for page in pages:
            page_num = page.get("page_number", 1)
            raw_text = page.get("text", "")
            if not raw_text.strip():
                continue

            # Split text into paragraphs
            paragraphs = raw_text.split("\n\n")

            current_chunk_text = ""
            current_chunk_page = page_num

            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue

                # Check if paragraph is or starts with a section heading
                lines = para.split("\n")
                if len(lines) > 0 and cls.is_section_heading(lines[0]):
                    current_section = lines[0].strip()

                # If paragraph fits within the remaining space in current chunk
                if len(current_chunk_text) + len(para) + 2 <= max_chars:
                    if current_chunk_text:
                        current_chunk_text += "\n\n" + para
                    else:
                        current_chunk_text = para
                else:
                    # Paragraph causes overflow:
                    # If paragraph itself is larger than max_chars, split it by sentences
                    if len(para) > max_chars:
                        sentences = SENTENCE_SPLIT_PATTERN.split(para)
                        for sentence in sentences:
                            sentence = sentence.strip()
                            if not sentence:
                                continue

                            if len(current_chunk_text) + len(sentence) + 1 <= max_chars:
                                if current_chunk_text:
                                    current_chunk_text += " " + sentence
                                else:
                                    current_chunk_text = sentence
                            else:
                                if current_chunk_text:
                                    chunks.append(
                                        ChunkData(
                                            document_id=document_id,
                                            chunk_index=chunk_index,
                                            text=current_chunk_text.strip(),
                                            page_number=current_chunk_page,
                                            section_heading=current_section,
                                            char_count=len(current_chunk_text.strip()),
                                            token_count=cls.estimate_token_count(current_chunk_text),
                                            embedding_model=model_name,
                                        )
                                    )
                                    chunk_index += 1

                                    # Carry over overlap
                                    if len(current_chunk_text) > overlap_chars:
                                        overlap = current_chunk_text[-overlap_chars:].strip()
                                        current_chunk_text = overlap + " " + sentence
                                    else:
                                        current_chunk_text = sentence
                                else:
                                    current_chunk_text = sentence
                    else:
                        # Flush existing chunk
                        if current_chunk_text:
                            chunks.append(
                                ChunkData(
                                    document_id=document_id,
                                    chunk_index=chunk_index,
                                    text=current_chunk_text.strip(),
                                    page_number=current_chunk_page,
                                    section_heading=current_section,
                                    char_count=len(current_chunk_text.strip()),
                                    token_count=cls.estimate_token_count(current_chunk_text),
                                    embedding_model=model_name,
                                )
                            )
                            chunk_index += 1

                            # Build overlap prefix from end of previous chunk
                            if len(current_chunk_text) > overlap_chars:
                                overlap = current_chunk_text[-overlap_chars:].strip()
                                current_chunk_text = overlap + "\n\n" + para
                            else:
                                current_chunk_text = para
                        else:
                            current_chunk_text = para

            # Flush leftover text for this page if any
            if current_chunk_text.strip():
                chunks.append(
                    ChunkData(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        text=current_chunk_text.strip(),
                        page_number=current_chunk_page,
                        section_heading=current_section,
                        char_count=len(current_chunk_text.strip()),
                        token_count=cls.estimate_token_count(current_chunk_text),
                        embedding_model=model_name,
                    )
                )
                chunk_index += 1

        return chunks
