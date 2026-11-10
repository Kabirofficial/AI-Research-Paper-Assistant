import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    SearchStatusResponse,
)
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])


@router.post(
    "/",
    response_model=SearchResponse,
    summary="Perform semantic vector search across research papers",
)
def search_documents(
    request: SearchRequest,
    db: Session = Depends(get_db),
) -> SearchResponse:
    """Perform semantic vector retrieval across uploaded research papers or within a specific paper."""
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty.",
        )

    # Validate document existence if document_id filter is specified
    if request.document_id:
        doc = db.get(Document, request.document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{request.document_id}' not found.",
            )

    # Generate dense query embedding
    try:
        query_vector = EmbeddingService.embed_query(request.query)
    except Exception as e:
        logger.error(f"Failed to embed search query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate query embedding: {str(e)}",
        )

    # Perform dense similarity search in FAISS
    matches = VectorStoreService.search(
        query_vector=query_vector,
        top_k=request.top_k,
        document_id=request.document_id,
        document_ids=request.document_ids,
        min_score=request.min_score,
    )

    if not matches:
        return SearchResponse(
            query=request.query,
            total_results=0,
            results=[],
        )

    # Load chunk and document metadata from SQLite (source of truth)
    chunk_ids = [m["chunk_id"] for m in matches]
    chunks = db.execute(
        select(Chunk).where(Chunk.id.in_(chunk_ids))
    ).scalars().all()
    chunk_by_id = {c.id: c for c in chunks}

    doc_ids = {c.document_id for c in chunks}
    documents = db.execute(
        select(Document).where(Document.id.in_(doc_ids))
    ).scalars().all()
    doc_by_id = {d.id: d for d in documents}

    results: list[SearchResultItem] = []
    for match in matches:
        chunk = chunk_by_id.get(match["chunk_id"])
        if not chunk:
            continue

        doc = doc_by_id.get(chunk.document_id)
        if not doc:
            continue

        results.append(
            SearchResultItem(
                chunk_id=chunk.id,
                document_id=doc.id,
                document_title=doc.title or doc.original_filename,
                original_filename=doc.original_filename,
                page_number=chunk.page_number,
                section_heading=chunk.section_heading,
                text=chunk.text,
                score=match["score"],
            )
        )

    return SearchResponse(
        query=request.query,
        total_results=len(results),
        results=results,
    )


@router.get(
    "/status",
    response_model=SearchStatusResponse,
    summary="Get vector index health and status",
)
def get_search_status() -> SearchStatusResponse:
    """Retrieve the current health, total vectors, and file metrics of the FAISS index."""
    status_data = VectorStoreService.get_status()
    return SearchStatusResponse(**status_data)


@router.post(
    "/rebuild",
    summary="Rebuild the vector index from all database chunks",
)
def rebuild_search_index(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Re-embed all chunks in the database and write a clean FAISS index to disk."""
    total_vectors = VectorStoreService.rebuild_index(db)
    return {
        "status": "success",
        "message": f"Successfully rebuilt vector store with {total_vectors} vectors.",
        "indexed_vectors": total_vectors,
    }

