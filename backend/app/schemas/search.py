from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Schema for semantic search requests."""

    query: str = Field(..., min_length=1, description="Search query or research question")
    document_id: str | None = Field(default=None, description="Optional filter for a specific document ID")
    document_ids: list[str] | None = Field(default=None, description="Optional filter for a list of document IDs")
    top_k: int = Field(default=5, ge=1, le=50, description="Maximum number of relevant chunks to retrieve")
    min_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum similarity threshold (0.0 to 1.0)")


class SearchResultItem(BaseModel):
    """Schema representing an individual retrieved chunk with similarity score and metadata."""

    chunk_id: str
    document_id: str
    document_title: str
    original_filename: str
    page_number: int
    section_heading: str | None = None
    text: str
    score: float = Field(..., description="Cosine similarity score (0.0 to 1.0)")


class SearchResponse(BaseModel):
    """Schema for search results."""

    query: str
    total_results: int
    results: list[SearchResultItem]


class SearchStatusResponse(BaseModel):
    """Schema reporting current vector store health and indexing stats."""

    total_vectors: int
    dimension: int
    index_file_exists: bool
    index_file_size_bytes: int
    is_healthy: bool

