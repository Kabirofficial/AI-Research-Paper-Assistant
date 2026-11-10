from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConversationCreateRequest(BaseModel):
    """Schema for initializing a new chat conversation."""

    title: str | None = Field(default=None, description="Optional conversation title (auto-generated if omitted)")
    document_id: str | None = Field(default=None, description="Optional document ID to scope chat to a specific paper")


class MessageCreateRequest(BaseModel):
    """Schema for posting a message in a conversation."""

    content: str = Field(..., min_length=1, description="Message text / user query")


class MessageSourceResponse(BaseModel):
    """Schema representing a citation source attached to an assistant message."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    document_title: str | None = None
    original_filename: str | None = None
    chunk_id: str
    page_number: int
    relevance_score: float


class MessageResponse(BaseModel):
    """Schema for a single chat message."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    sources: list[MessageSourceResponse] = Field(default_factory=list)
    created_at: datetime


class ConversationResponse(BaseModel):
    """Schema representing conversation metadata in listings."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    document_id: str | None = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(BaseModel):
    """Schema representing complete conversation history with all messages and citations."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    document_id: str | None = None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]


class ConversationListResponse(BaseModel):
    """Response containing list of all conversations."""

    total: int
    conversations: list[ConversationResponse]

