"""Pydantic schemas for request/response validation."""

from app.schemas.chat import (
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationResponse,
    MessageCreateRequest,
    MessageResponse,
    MessageSourceResponse,
)
from app.schemas.chunk import ChunkListResponse, ChunkResponse
from app.schemas.document import (
    DocumentBase,
    DocumentListResponse,
    DocumentResponse,
    DocumentTextResponse,
    PageText,
)
from app.schemas.papers import (
    ComparedPaperItem,
    PaperCompareRequest,
    PaperCompareResponse,
    PaperComparisonListItem,
    PaperComparisonListResponse,
    PaperSummaryRequest,
    PaperSummaryResponse,
)
from app.schemas.rag import Citation, RAGQueryRequest, RAGResponse
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    SearchStatusResponse,
)
from app.schemas.settings import (
    ProviderListResponse,
    ProviderStatusItem,
    SettingsResponse,
    SettingsUpdateRequest,
    TestConnectionRequest,
    TestConnectionResponse,
)

__all__ = [
    "DocumentBase",
    "DocumentResponse",
    "DocumentListResponse",
    "DocumentTextResponse",
    "PageText",
    "ChunkResponse",
    "ChunkListResponse",
    "SearchRequest",
    "SearchResultItem",
    "SearchResponse",
    "SearchStatusResponse",
    "SettingsResponse",
    "SettingsUpdateRequest",
    "ProviderStatusItem",
    "ProviderListResponse",
    "TestConnectionRequest",
    "TestConnectionResponse",
    "RAGQueryRequest",
    "Citation",
    "RAGResponse",
    "ConversationCreateRequest",
    "MessageCreateRequest",
    "MessageSourceResponse",
    "MessageResponse",
    "ConversationResponse",
    "ConversationDetailResponse",
    "ConversationListResponse",
    "PaperSummaryRequest",
    "PaperSummaryResponse",
    "PaperCompareRequest",
    "ComparedPaperItem",
    "PaperCompareResponse",
    "PaperComparisonListItem",
    "PaperComparisonListResponse",
]
