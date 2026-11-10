import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.chunk import ChunkListResponse, ChunkResponse
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentTextResponse,
    PageText,
)
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.pdf_service import PDFService
from app.services.vector_store_service import VectorStoreService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and process a research paper PDF",
)
async def upload_document(
    file: UploadFile,
    db: Session = Depends(get_db),
) -> DocumentResponse:
    """Upload a PDF, validate it, compute SHA-256 for duplicate detection,
    extract page-level text, generate chunks, and store locally.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    # Read file content into memory
    content = await file.read()

    # Validate PDF content & calculate hash
    PDFService.validate_pdf_content(content, file.filename)
    sha256_hash = PDFService.compute_sha256(content)

    # Check for duplicate document
    existing_doc = db.execute(
        select(Document).where(Document.sha256_hash == sha256_hash)
    ).scalar_one_or_none()

    if existing_doc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Document already exists (SHA-256 match).",
                "existing_document_id": existing_doc.id,
                "original_filename": existing_doc.original_filename,
            },
        )

    doc_id = str(uuid.uuid4())
    internal_filename = f"{doc_id}.pdf"

    # Save PDF file to storage/documents
    PDFService.save_pdf_file(internal_filename, content)
    file_path = str(settings.documents_dir / internal_filename)

    # Process PDF and extract text/metadata
    try:
        result = PDFService.process_pdf(content, file.filename)
        # Save extracted page text to storage/extracted_text/{doc_id}.json
        PDFService.save_extracted_text(doc_id, result.pages)

        # Generate intelligent text chunks
        chunk_data_list = ChunkingService.chunk_document(doc_id, result.pages)
        db_chunks = [
            Chunk(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                chunk_index=c.chunk_index,
                text=c.text,
                page_number=c.page_number,
                section_heading=c.section_heading,
                char_count=c.char_count,
                token_count=c.token_count,
                embedding_model=c.embedding_model,
            )
            for c in chunk_data_list
        ]

        # Create database record
        doc = Document(
            id=doc_id,
            original_filename=file.filename,
            internal_filename=internal_filename,
            file_path=file_path,
            file_size=result.file_size,
            sha256_hash=sha256_hash,
            title=result.title,
            authors=result.authors,
            publication_year=result.publication_year,
            abstract=result.abstract,
            page_count=result.page_count,
            processing_status="completed",
            extraction_status=result.extraction_status,
            error_message=None,
            chunks=db_chunks,
        )
    except Exception as e:
        logger.error(f"Error processing PDF {file.filename}: {e}", exc_info=True)
        doc = Document(
            id=doc_id,
            original_filename=file.filename,
            internal_filename=internal_filename,
            file_path=file_path,
            file_size=len(content),
            sha256_hash=sha256_hash,
            title=file.filename,
            processing_status="failed",
            extraction_status="failed",
            error_message=str(e),
        )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Generate embeddings and add to local FAISS vector store
    if doc.processing_status == "completed" and doc.chunks:
        try:
            embeddings = EmbeddingService.embed_texts([c.text for c in doc.chunks])
            VectorStoreService.add_chunks(doc.chunks, embeddings)
        except Exception as embed_err:
            logger.error(f"Failed to generate embeddings for document {doc_id}: {embed_err}")

    return DocumentResponse.model_validate(doc)


@router.get(
    "/",
    response_model=DocumentListResponse,
    summary="List all uploaded research papers",
)
def list_documents(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Limit for pagination"),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    """Retrieve all uploaded documents with pagination."""
    query = select(Document).order_by(Document.created_at.desc())
    all_docs = db.execute(query).scalars().all()
    total = len(all_docs)
    paginated_docs = all_docs[skip : skip + limit]

    return DocumentListResponse(
        total=total,
        documents=[DocumentResponse.model_validate(doc) for doc in paginated_docs],
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get details of a specific document",
)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentResponse:
    """Retrieve metadata and processing status of a single document."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )
    return DocumentResponse.model_validate(doc)


@router.get(
    "/{document_id}/text",
    response_model=DocumentTextResponse,
    summary="Get extracted page-level text of a document",
)
def get_document_text(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentTextResponse:
    """Retrieve full extracted text and page-by-page breakdown."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    pages_data = PDFService.load_extracted_text(document_id)
    pages = [PageText(**p) for p in pages_data]
    full_text = "\n\n".join(p.text for p in pages if p.text)

    return DocumentTextResponse(
        document_id=doc.id,
        original_filename=doc.original_filename,
        page_count=doc.page_count,
        pages=pages,
        full_text=full_text,
    )


@router.get(
    "/{document_id}/chunks",
    response_model=ChunkListResponse,
    summary="Get all chunks for a document",
)
def get_document_chunks(
    document_id: str,
    db: Session = Depends(get_db),
) -> ChunkListResponse:
    """Retrieve all chunk records associated with a document."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    chunks = (
        db.execute(
            select(Chunk)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.chunk_index.asc())
        )
        .scalars()
        .all()
    )

    return ChunkListResponse(
        total=len(chunks),
        chunks=[ChunkResponse.model_validate(c) for c in chunks],
    )


@router.get(
    "/{document_id}/download",
    summary="Download original uploaded PDF file",
)
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> FileResponse:
    """Download the original PDF file."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    pdf_path = settings.documents_dir / doc.internal_filename
    if not pdf_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Underlying PDF file is missing from local storage.",
        )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=doc.original_filename,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a document and its stored files",
)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Delete document database record and all associated files."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    # Delete local files
    PDFService.delete_document_files(doc.internal_filename, doc.id)

    # Delete database record (cascades to chunks)
    db.delete(doc)
    db.commit()

    # Synchronize vector store
    VectorStoreService.remove_document(document_id, db)

    return {
        "status": "success",
        "message": f"Document '{doc.original_filename}' deleted successfully.",
        "deleted_id": document_id,
    }


@router.post(
    "/{document_id}/reprocess",
    response_model=DocumentResponse,
    summary="Reprocess an existing PDF document",
)
def reprocess_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentResponse:
    """Re-extract metadata, page-level text, and chunks from the stored PDF."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    pdf_path = settings.documents_dir / doc.internal_filename
    if not pdf_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored PDF file not found on disk.",
        )

    content = pdf_path.read_bytes()

    try:
        result = PDFService.process_pdf(content, doc.original_filename)
        PDFService.save_extracted_text(doc.id, result.pages)

        # Delete old chunks
        for old_chunk in list(doc.chunks):
            db.delete(old_chunk)

        # Re-generate chunks
        chunk_data_list = ChunkingService.chunk_document(doc.id, result.pages)
        new_chunks = [
            Chunk(
                id=str(uuid.uuid4()),
                document_id=doc.id,
                chunk_index=c.chunk_index,
                text=c.text,
                page_number=c.page_number,
                section_heading=c.section_heading,
                char_count=c.char_count,
                token_count=c.token_count,
                embedding_model=c.embedding_model,
            )
            for c in chunk_data_list
        ]

        doc.title = result.title
        doc.authors = result.authors
        doc.publication_year = result.publication_year
        doc.abstract = result.abstract
        doc.page_count = result.page_count
        doc.processing_status = "completed"
        doc.extraction_status = result.extraction_status
        doc.error_message = None
        doc.chunks = new_chunks
    except Exception as e:
        logger.error(f"Error reprocessing document {document_id}: {e}", exc_info=True)
        doc.processing_status = "failed"
        doc.error_message = str(e)

    db.commit()
    db.refresh(doc)

    # Rebuild vector store with refreshed chunks
    if doc.processing_status == "completed":
        VectorStoreService.rebuild_index(db)

    return DocumentResponse.model_validate(doc)
