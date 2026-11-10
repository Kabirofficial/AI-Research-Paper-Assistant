import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.json_utils import extract_json_object
from app.models.analysis import PaperComparison
from app.models.document import Document
from app.schemas.papers import (
    ComparedPaperItem,
    PaperCompareResponse,
    PaperComparisonListItem,
    PaperComparisonListResponse,
)
from app.services.llm_service import LLMService
from app.services.pdf_service import PDFService

logger = logging.getLogger(__name__)

COMPARE_SYSTEM_PROMPT = """You are a senior academic researcher and comparative literature specialist.
Compare the provided research papers across their core dimensions.
You MUST output your response as valid, pure JSON without Markdown code fences, matching this exact schema:
{
  "problem_comparison": "Detailed comparison of the research problems each paper addresses",
  "methodology_comparison": "Contrasting the algorithms, techniques, and approaches across the papers",
  "architecture_comparison": "Differences in model structures, computational designs, or frameworks",
  "dataset_comparison": "Comparison of datasets, benchmarks, evaluation protocols, and metrics",
  "results_comparison": "Comparative analysis of reported findings, accuracy, and empirical outcomes",
  "strengths_and_weaknesses": "Relative pros, cons, and trade-offs of each approach",
  "research_gaps": "Open questions, unexplored intersections, and research opportunities across these papers"
}
"""


COMPARISON_KEYS = [
    "problem_comparison",
    "methodology_comparison",
    "architecture_comparison",
    "dataset_comparison",
    "results_comparison",
    "strengths_and_weaknesses",
    "research_gaps",
]


class ComparisonService:
    """Service performing multi-document academic comparison, research gap synthesis, and persistence."""

    @classmethod
    def compare_papers(
        cls,
        db: Session,
        document_ids: list[str],
        title: str | None = None,
    ) -> PaperCompareResponse:
        """Compare multiple research papers, save comparison analysis in SQLite, and return structured result."""
        if len(document_ids) < 2:
            raise ValueError("At least 2 documents are required for comparison.")

        # Load documents
        docs = db.execute(
            select(Document).where(Document.id.in_(document_ids))
        ).scalars().all()

        found_ids = {d.id for d in docs}
        missing_ids = set(document_ids) - found_ids
        if missing_ids:
            raise ValueError(f"Documents not found: {list(missing_ids)}")

        compared_items: list[ComparedPaperItem] = []
        paper_summaries_text: list[str] = []

        for idx, doc in enumerate(docs, 1):
            doc_title = doc.title or doc.original_filename
            compared_items.append(
                ComparedPaperItem(
                    document_id=doc.id,
                    title=doc_title,
                    authors=doc.authors,
                    publication_year=doc.publication_year,
                )
            )

            # Retrieve first 2 pages or abstract for context
            pages = PDFService.load_extracted_text(doc.id)
            if pages:
                content = "\n".join(p.get("text", "") for p in pages[:2])[:3500]
            else:
                content = doc.abstract or "No extracted text available."

            paper_summaries_text.append(
                f"=== Paper {idx}: {doc_title} ({doc.publication_year or 'Year Unknown'}) ===\n"
                f"Authors: {doc.authors or 'Unknown'}\n"
                f"Abstract / Key Sections:\n{content}\n"
            )

        active_provider = settings.LLM_PROVIDER
        active_model = (
            settings.OPENAI_MODEL if active_provider == "openai" else settings.OLLAMA_MODEL
        )

        all_papers_content = "\n\n".join(paper_summaries_text)
        user_prompt = (
            f"Here are {len(docs)} research papers to compare:\n\n"
            f"{all_papers_content}\n\n"
            f"Provide a rigorous comparative analysis in pure JSON format:"
        )

        try:
            raw_response = LLMService.generate(
                prompt=user_prompt,
                system_prompt=COMPARE_SYSTEM_PROMPT,
                temperature=0.1,
                max_tokens=4096,
                response_format="json",
            )
        except Exception as e:
            logger.error(f"Error calling LLM for paper comparison: {e}", exc_info=True)
            raise RuntimeError(f"Failed to generate comparison from provider '{active_provider}': {str(e)}")

        parsed = extract_json_object(raw_response, expected_keys=COMPARISON_KEYS)
        if not parsed:
            logger.warning("Could not parse LLM comparison as JSON; using heuristic fallback.")
            parsed = {
                "problem_comparison": raw_response[:400].strip(),
                "methodology_comparison": "Refer to individual paper methodologies.",
                "architecture_comparison": "Refer to individual model architectures.",
                "dataset_comparison": "Refer to experimental evaluations.",
                "results_comparison": "Refer to reported benchmark scores.",
                "strengths_and_weaknesses": "Trade-offs discussed in the respective papers.",
                "research_gaps": "Opportunities remain in unifying the comparative frameworks.",
            }

        # Auto-generate title if not provided
        comp_title = title
        if not comp_title:
            titles = [d.title or d.original_filename for d in docs]
            comp_title = f"Comparison: {' vs '.join(titles[:3])}"
            if len(titles) > 3:
                comp_title += f" (+{len(titles) - 3} more)"

        # Save to database
        saved_comp = PaperComparison(
            id=str(uuid.uuid4()),
            title=comp_title,
            document_ids=json.dumps(document_ids),
            problem_comparison=parsed.get("problem_comparison", "Comparison unavailable."),
            methodology_comparison=parsed.get("methodology_comparison", "Comparison unavailable."),
            architecture_comparison=parsed.get("architecture_comparison", "Comparison unavailable."),
            dataset_comparison=parsed.get("dataset_comparison", "Comparison unavailable."),
            results_comparison=parsed.get("results_comparison", "Comparison unavailable."),
            strengths_and_weaknesses=parsed.get("strengths_and_weaknesses", "Comparison unavailable."),
            research_gaps=parsed.get("research_gaps", "Comparison unavailable."),
            llm_provider=active_provider,
            llm_model=active_model,
        )
        db.add(saved_comp)
        db.commit()
        db.refresh(saved_comp)

        return PaperCompareResponse(
            id=saved_comp.id,
            title=saved_comp.title,
            compared_papers=compared_items,
            problem_comparison=saved_comp.problem_comparison,
            methodology_comparison=saved_comp.methodology_comparison,
            architecture_comparison=saved_comp.architecture_comparison,
            dataset_comparison=saved_comp.dataset_comparison,
            results_comparison=saved_comp.results_comparison,
            strengths_and_weaknesses=saved_comp.strengths_and_weaknesses,
            research_gaps=saved_comp.research_gaps,
            llm_provider=saved_comp.llm_provider,
            llm_model=saved_comp.llm_model,
            created_at=saved_comp.created_at,
        )

    @classmethod
    def list_comparisons(
        cls,
        db: Session,
        skip: int = 0,
        limit: int = 50,
    ) -> PaperComparisonListResponse:
        """List saved paper comparisons with pagination."""
        total = db.scalar(select(func.count(PaperComparison.id))) or 0
        query = (
            select(PaperComparison)
            .order_by(PaperComparison.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = db.execute(query).scalars().all()

        comparison_items: list[PaperComparisonListItem] = []
        for item in items:
            try:
                doc_ids = json.loads(item.document_ids)
                doc_count = len(doc_ids)
            except Exception:
                doc_count = 0
            comparison_items.append(
                PaperComparisonListItem(
                    id=item.id,
                    title=item.title,
                    document_count=doc_count,
                    llm_provider=item.llm_provider,
                    llm_model=item.llm_model,
                    created_at=item.created_at,
                )
            )

        return PaperComparisonListResponse(
            total=total,
            comparisons=comparison_items,
        )

    @classmethod
    def get_comparison(
        cls,
        db: Session,
        comparison_id: str,
    ) -> PaperCompareResponse | None:
        """Fetch a specific saved comparison by ID."""
        comp = db.get(PaperComparison, comparison_id)
        if not comp:
            return None

        # Reconstruct compared paper items
        try:
            doc_ids = json.loads(comp.document_ids)
        except Exception:
            doc_ids = []

        docs = db.execute(
            select(Document).where(Document.id.in_(doc_ids))
        ).scalars().all()
        doc_by_id = {d.id: d for d in docs}

        compared_items = [
            ComparedPaperItem(
                document_id=doc_id,
                title=doc_by_id[doc_id].title or doc_by_id[doc_id].original_filename if doc_id in doc_by_id else "Unknown Document",
                authors=doc_by_id[doc_id].authors if doc_id in doc_by_id else None,
                publication_year=doc_by_id[doc_id].publication_year if doc_id in doc_by_id else None,
            )
            for doc_id in doc_ids
        ]

        return PaperCompareResponse(
            id=comp.id,
            title=comp.title,
            compared_papers=compared_items,
            problem_comparison=comp.problem_comparison,
            methodology_comparison=comp.methodology_comparison,
            architecture_comparison=comp.architecture_comparison,
            dataset_comparison=comp.dataset_comparison,
            results_comparison=comp.results_comparison,
            strengths_and_weaknesses=comp.strengths_and_weaknesses,
            research_gaps=comp.research_gaps,
            llm_provider=comp.llm_provider,
            llm_model=comp.llm_model,
            created_at=comp.created_at,
        )

    @classmethod
    def delete_comparison(cls, db: Session, comparison_id: str) -> bool:
        """Delete a saved comparison."""
        comp = db.get(PaperComparison, comparison_id)
        if not comp:
            return False
        db.delete(comp)
        db.commit()
        return True
