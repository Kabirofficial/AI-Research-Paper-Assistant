from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ChunkResponse(BaseModel):
    """Schema representing an extracted chunk from a research paper."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    chunk_index: int
    text: str
    page_number: int
    section_heading: str | None = None
    char_count: int
    token_count: int | None = None
    embedding_model: str
    created_at: datetime


class ChunkListResponse(BaseModel):
    """Schema representing a list of chunks for a document."""
    total: int
    chunks: list[ChunkResponse]

