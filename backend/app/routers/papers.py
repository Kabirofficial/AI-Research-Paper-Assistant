import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import Document
from app.schemas.papers import (
    PaperCompareRequest,
    PaperCompareResponse,
    PaperComparisonListResponse,
    PaperSummaryRequest,
    PaperSummaryResponse,
)
from app.services.comparison_service import ComparisonService
from app.services.summary_service import SummaryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/papers", tags=["Research Papers"])


# --- Multi-Paper Comparison Endpoints ---


@router.post(
    "/compare",
    response_model=PaperCompareResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Compare multiple research papers and persist comparative analysis",
)
def compare_papers(
    request: PaperCompareRequest,
    db: Session = Depends(get_db),
) -> PaperCompareResponse:
    """Perform multi-document comparison highlighting methodological differences, benchmark trade-offs, and research gaps.

    Saves the comparative analysis in SQLite for persistent tracking across research sessions.
    """
    if len(request.document_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 documents are required for comparative analysis.",
        )

    try:
        return ComparisonService.compare_papers(
            db=db,
            document_ids=request.document_ids,
            title=request.title,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )
    except Exception as e:
        logger.error(f"Error comparing papers: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare papers: {str(e)}",
        )


@router.get(
    "/comparisons",
    response_model=PaperComparisonListResponse,
    summary="List saved paper comparisons",
)
def list_comparisons(
    skip: int = Query(0, ge=0, description="Number of comparisons to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max number of comparisons to return"),
    db: Session = Depends(get_db),
) -> PaperComparisonListResponse:
    """Retrieve all previously saved multi-paper comparative analyses with pagination."""
    return ComparisonService.list_comparisons(db=db, skip=skip, limit=limit)


@router.get(
    "/comparisons/{comparison_id}",
    response_model=PaperCompareResponse,
    summary="Get a saved paper comparison by ID",
)
def get_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
) -> PaperCompareResponse:
    """Retrieve a previously generated comparative analysis by ID."""
    comparison = ComparisonService.get_comparison(db=db, comparison_id=comparison_id)
    if not comparison:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comparison with ID '{comparison_id}' not found.",
        )
    return comparison


@router.delete(
    "/comparisons/{comparison_id}",
    summary="Delete a saved paper comparison",
)
def delete_comparison(
    comparison_id: str,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Delete a saved multi-paper comparative analysis."""
    deleted = ComparisonService.delete_comparison(db=db, comparison_id=comparison_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comparison with ID '{comparison_id}' not found.",
        )
    return {"detail": f"Comparison '{comparison_id}' deleted successfully."}


# --- Single Paper Summary Endpoints ---


@router.get(
    "/{document_id}/summary",
    response_model=PaperSummaryResponse,
    summary="Get saved academic summary for a paper",
)
def get_paper_summary(
    document_id: str,
    db: Session = Depends(get_db),
) -> PaperSummaryResponse:
    """Retrieve existing saved summary for a paper. Returns 404 if not yet generated."""
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    summary = SummaryService.get_summary(db=db, document_id=document_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Summary for document '{document_id}' has not been generated yet. Use POST /papers/{document_id}/summary to generate it.",
        )
    return summary


@router.post(
    "/{document_id}/summary",
    response_model=PaperSummaryResponse,
    summary="Generate or retrieve an academic summary and research breakdown of a paper",
)
def summarize_paper(
    document_id: str,
    request: PaperSummaryRequest | None = None,
    db: Session = Depends(get_db),
) -> PaperSummaryResponse:
    """Generate structured summary identifying objectives, methodology, architecture, datasets, results, and limitations.

    If a summary already exists and force_refresh is False (default), the cached summary is returned without re-invoking the LLM.
    If force_refresh is True, the LLM generates a new summary and updates the database.
    """
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found.",
        )

    summary_type = request.summary_type if request else "comprehensive"
    force_refresh = request.force_refresh if request else False

    try:
        return SummaryService.generate_summary(
            db=db,
            document_id=document_id,
            summary_type=summary_type,
            force_refresh=force_refresh,
        )
    except Exception as e:
        logger.error(f"Error generating paper summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}",
        )
