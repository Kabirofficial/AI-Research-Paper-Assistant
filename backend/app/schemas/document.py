from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PageText(BaseModel):
    """Extracted text representation for a single page."""
    page_number: int = Field(..., description="1-based page number")
    text: str = Field(..., description="Extracted plain text")
    char_count: int = Field(default=0, description="Number of characters in the page text")


class DocumentBase(BaseModel):
    """Base schema for document fields."""
    original_filename: str
    file_size: int
    title: str | None = None
    authors: str | None = None
    publication_year: int | None = None
    abstract: str | None = None
    page_count: int = 0
    processing_status: str
    extraction_status: str


class DocumentResponse(DocumentBase):
    """Schema returned for document detail and list items."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    internal_filename: str
    sha256_hash: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    """Response containing a list of documents and count."""
    total: int
    documents: list[DocumentResponse]


class DocumentTextResponse(BaseModel):
    """Schema containing page-by-page extracted text for a document."""
    document_id: str
    original_filename: str
    page_count: int
    pages: list[PageText]
    full_text: str

