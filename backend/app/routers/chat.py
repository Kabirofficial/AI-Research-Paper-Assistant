import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models.chat import Conversation, Message, MessageSource
from app.models.document import Document
from app.schemas.chat import (
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationResponse,
    MessageCreateRequest,
    MessageResponse,
    MessageSourceResponse,
)
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat conversation",
)
def create_conversation(
    request: ConversationCreateRequest,
    db: Session = Depends(get_db),
) -> ConversationResponse:
    """Create a new conversation, either scoped to a specific research paper or across the library."""
    if request.document_id:
        doc = db.get(Document, request.document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{request.document_id}' not found.",
            )

    conv_id = str(uuid.uuid4())
    default_title = request.title or "New Research Conversation"

    conv = Conversation(
        id=conv_id,
        title=default_title,
        document_id=request.document_id,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        document_id=conv.document_id,
        message_count=0,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List all conversations",
)
def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ConversationListResponse:
    """List all conversations ordered by most recently updated."""
    query = (
        select(Conversation)
        .order_by(Conversation.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    convs = db.execute(query).scalars().all()

    # Get total count
    total = db.scalar(select(func.count(Conversation.id))) or 0

    items: list[ConversationResponse] = []
    for c in convs:
        msg_count = db.scalar(
            select(func.count(Message.id)).where(Message.conversation_id == c.id)
        ) or 0
        items.append(
            ConversationResponse(
                id=c.id,
                title=c.title,
                document_id=c.document_id,
                message_count=msg_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    return ConversationListResponse(total=total, conversations=items)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get conversation history",
)
def get_conversation_history(
    conversation_id: str,
    db: Session = Depends(get_db),
) -> ConversationDetailResponse:
    """Retrieve complete message history with attached citations for a conversation."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )

    # Fetch messages with their source citations
    messages_query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .options(selectinload(Message.sources))
    )
    messages = db.execute(messages_query).scalars().all()

    message_responses: list[MessageResponse] = []
    for msg in messages:
        sources_list: list[MessageSourceResponse] = []
        for s in msg.sources:
            doc = db.get(Document, s.document_id)
            doc_title = (doc.title or doc.original_filename) if doc else None
            sources_list.append(
                MessageSourceResponse(
                    id=s.id,
                    document_id=s.document_id,
                    document_title=doc_title,
                    original_filename=doc.original_filename if doc else None,
                    chunk_id=s.chunk_id,
                    page_number=s.page_number,
                    relevance_score=s.relevance_score,
                )
            )

        message_responses.append(
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role,
                content=msg.content,
                sources=sources_list,
                created_at=msg.created_at,
            )
        )

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        document_id=conv.document_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=message_responses,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message and receive a grounded AI response",
)
def send_message(
    conversation_id: str,
    request: MessageCreateRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Post a user message, run grounded RAG with conversation memory, and return response with source citations."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )

    user_text = request.content.strip()
    if not user_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty.",
        )

    # Auto-generate title from first message if using default
    if conv.title == "New Research Conversation":
        auto_title = user_text[:50].strip()
        if len(user_text) > 50:
            auto_title += "..."
        conv.title = auto_title

    # Save user message
    user_msg_id = str(uuid.uuid4())
    user_msg = Message(
        id=user_msg_id,
        conversation_id=conv.id,
        role="user",
        content=user_text,
    )
    db.add(user_msg)
    db.commit()

    # Retrieve recent messages for context memory (up to last 6 messages)
    recent_msgs = (
        db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(6)
        )
        .scalars()
        .all()
    )
    recent_msgs.reverse()

    # Execute RAG retrieval
    rag_result = RAGService.answer_question(
        db=db,
        question=user_text,
        document_id=conv.document_id,
    )

    # Save assistant message
    asst_msg_id = str(uuid.uuid4())
    asst_msg = Message(
        id=asst_msg_id,
        conversation_id=conv.id,
        role="assistant",
        content=rag_result.answer,
    )
    db.add(asst_msg)

    # Save source citations to message_sources table
    sources_to_return: list[MessageSourceResponse] = []
    for cit in rag_result.citations:
        source_id = str(uuid.uuid4())
        src = MessageSource(
            id=source_id,
            message_id=asst_msg_id,
            document_id=cit.document_id,
            chunk_id=cit.chunk_id,
            page_number=cit.page_number,
            relevance_score=cit.relevance_score,
        )
        db.add(src)
        sources_to_return.append(
            MessageSourceResponse(
                id=source_id,
                document_id=cit.document_id,
                document_title=cit.document_title,
                original_filename=cit.original_filename,
                chunk_id=cit.chunk_id,
                page_number=cit.page_number,
                relevance_score=cit.relevance_score,
            )
        )

    conv.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(asst_msg)

    return MessageResponse(
        id=asst_msg.id,
        conversation_id=conv.id,
        role=asst_msg.role,
        content=asst_msg.content,
        sources=sources_to_return,
        created_at=asst_msg.created_at,
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a conversation",
)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Delete conversation and all its messages and source associations."""
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )

    db.delete(conv)
    db.commit()

    return {
        "status": "success",
        "message": f"Conversation '{conv.title}' deleted successfully.",
        "deleted_id": conversation_id,
    }
