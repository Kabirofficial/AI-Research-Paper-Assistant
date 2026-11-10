from pydantic import BaseModel, Field


class RAGQueryRequest(BaseModel):
    """Request schema for asking a research question with RAG retrieval."""

    question: str = Field(..., min_length=1, description="Question about one or more research papers")
    document_id: str | None = Field(default=None, description="Optional document ID to scope question to a single paper")
    document_ids: list[str] | None = Field(default=None, description="Optional list of document IDs to scope question to specific papers")
    top_k: int | None = Field(default=None, ge=1, le=50, description="Number of context chunks to retrieve (defaults to settings.TOP_K_RETRIEVAL)")
    min_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum similarity score threshold")


class Citation(BaseModel):
    """Source citation supporting an AI-generated answer."""

    source_index: int = Field(..., description="1-based source number matching prompt [Source N]")
    document_id: str
    chunk_id: str
    document_title: str
    original_filename: str
    page_number: int
    section_heading: str | None = None
    excerpt: str = Field(..., description="Text snippet from the cited paper chunk")
    relevance_score: float = Field(..., description="Cosine similarity score")


class RAGResponse(BaseModel):
    """Answer response grounded in retrieved research paper excerpts."""

    question: str
    answer: str
    citations: list[Citation]
    insufficient_evidence: bool = Field(
        default=False,
        description="True if uploaded papers did not contain enough evidence to answer",
    )
    llm_provider: str
    llm_model: str
    latency_ms: float | None = None

