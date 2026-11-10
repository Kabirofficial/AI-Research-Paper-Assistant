import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.json_utils import extract_json_object
from app.models.analysis import PaperSummary
from app.models.document import Document
from app.schemas.papers import PaperSummaryResponse
from app.services.llm_service import LLMService
from app.services.pdf_service import PDFService

logger = logging.getLogger(__name__)

SUMMARY_SYSTEM_PROMPT = """You are an expert AI academic researcher and literature analyst.
Analyze the provided research paper text and produce a structured, rigorous academic summary.
You MUST output your response as valid, pure JSON without Markdown code fences, matching this exact schema:
{
  "short_summary": "1-2 paragraphs summarizing the core paper",
  "problem_statement": "The specific research challenge or problem addressed",
  "research_objectives": "The primary objectives, goals, and novel contributions",
  "methodology": "The technical framework, algorithms, and empirical methodology",
  "architecture": "The model architecture or computational design (or null if not applicable)",
  "dataset": "Datasets, benchmarks, or experimental corpora used (or null if theoretical)",
  "results": "Reported quantitative metrics, findings, and baseline comparisons",
  "limitations": "Limitations, constraints, or assumptions mentioned by authors",
  "future_directions": "Suggested future work and unexplored directions"
}
"""


SUMMARY_KEYS = [
    "short_summary",
    "problem_statement",
    "research_objectives",
    "methodology",
    "architecture",
    "dataset",
    "results",
    "limitations",
    "future_directions",
]


class SummaryService:
    """Service managing generation, caching, and persistence of structured paper analyses."""

    @classmethod
    def get_summary(cls, db: Session, document_id: str) -> PaperSummaryResponse | None:
        """Fetch previously saved summary from the database if available."""
        doc = db.get(Document, document_id)
        if not doc:
            raise ValueError(f"Document with ID '{document_id}' not found.")

        saved = db.execute(
            select(PaperSummary).where(PaperSummary.document_id == document_id)
        ).scalar_one_or_none()

        if not saved:
            return None

        return PaperSummaryResponse(
            id=saved.id,
            document_id=saved.document_id,
            title=doc.title or doc.original_filename,
            summary_type=saved.summary_type,
            short_summary=saved.short_summary,
            problem_statement=saved.problem_statement,
            research_objectives=saved.research_objectives,
            methodology=saved.methodology,
            architecture=saved.architecture,
            dataset=saved.dataset,
            results=saved.results,
            limitations=saved.limitations,
            future_directions=saved.future_directions,
            llm_provider=saved.llm_provider,
            llm_model=saved.llm_model,
            is_cached=True,
            created_at=saved.created_at,
            updated_at=saved.updated_at,
        )

    @classmethod
    def generate_summary(
        cls,
        db: Session,
        document_id: str,
        summary_type: str = "comprehensive",
        force_refresh: bool = False,
    ) -> PaperSummaryResponse:
        """Generate and save a structured academic summary, returning cached analysis if present."""
        doc = db.get(Document, document_id)
        if not doc:
            raise ValueError(f"Document with ID '{document_id}' not found.")

        # Check for existing cached summary
        if not force_refresh:
            existing = cls.get_summary(db, document_id)
            if existing:
                logger.info(f"Returning cached summary for document {document_id}.")
                return existing

        # Load extracted pages
        pages = PDFService.load_extracted_text(document_id)
        if not pages:
            full_text = f"Title: {doc.title}\nAbstract: {doc.abstract or 'No abstract available.'}"
        else:
            page_texts = [p.get("text", "") for p in pages if p.get("text")]
            if len(page_texts) <= 4:
                full_text = "\n\n".join(page_texts)
            else:
                first_part = "\n\n".join(page_texts[:3])
                last_part = page_texts[-1]
                full_text = f"{first_part}\n\n[...]\n\n{last_part}"

        if len(full_text) > 12000:
            full_text = full_text[:12000] + "\n[Text truncated for length...]"

        active_provider = settings.LLM_PROVIDER
        active_model = (
            settings.OPENAI_MODEL if active_provider == "openai" else settings.OLLAMA_MODEL
        )

        user_prompt = (
            f"Paper Title: {doc.title or doc.original_filename}\n"
            f"Publication Year: {doc.publication_year or 'Unknown'}\n\n"
            f"Paper Content:\n{full_text}\n\n"
            f"Generate the structured JSON summary:"
        )

        try:
            raw_response = LLMService.generate(
                prompt=user_prompt,
                system_prompt=SUMMARY_SYSTEM_PROMPT,
                temperature=0.1,
                max_tokens=4096,
                response_format="json",
            )
        except Exception as e:
            logger.error(f"Error calling LLM for paper summary: {e}", exc_info=True)
            raise RuntimeError(f"Failed to generate summary from provider '{active_provider}': {str(e)}")

        parsed = extract_json_object(raw_response, expected_keys=SUMMARY_KEYS)
        if not parsed:
            logger.warning("Could not parse LLM summary as JSON; using heuristic section extraction.")
            parsed = {
                "short_summary": raw_response[:300].strip(),
                "problem_statement": "Refer to paper introduction for problem statement.",
                "research_objectives": "Refer to paper contributions.",
                "methodology": "Refer to paper methodology section.",
                "architecture": None,
                "dataset": None,
                "results": raw_response[-300:].strip(),
                "limitations": None,
                "future_directions": None,
            }

        # Save or update in database
        saved_summary = db.execute(
            select(PaperSummary).where(PaperSummary.document_id == document_id)
        ).scalar_one_or_none()

        if saved_summary:
            saved_summary.summary_type = summary_type
            saved_summary.short_summary = parsed.get("short_summary", "Summary unavailable.")
            saved_summary.problem_statement = parsed.get("problem_statement", "Not specified.")
            saved_summary.research_objectives = parsed.get("research_objectives", "Not specified.")
            saved_summary.methodology = parsed.get("methodology", "Not specified.")
            saved_summary.architecture = parsed.get("architecture")
            saved_summary.dataset = parsed.get("dataset")
            saved_summary.results = parsed.get("results", "Not specified.")
            saved_summary.limitations = parsed.get("limitations")
            saved_summary.future_directions = parsed.get("future_directions")
            saved_summary.llm_provider = active_provider
            saved_summary.llm_model = active_model
            saved_summary.updated_at = datetime.now(UTC)
        else:
            saved_summary = PaperSummary(
                id=str(uuid.uuid4()),
                document_id=document_id,
                summary_type=summary_type,
                short_summary=parsed.get("short_summary", "Summary unavailable."),
                problem_statement=parsed.get("problem_statement", "Not specified."),
                research_objectives=parsed.get("research_objectives", "Not specified."),
                methodology=parsed.get("methodology", "Not specified."),
                architecture=parsed.get("architecture"),
                dataset=parsed.get("dataset"),
                results=parsed.get("results", "Not specified."),
                limitations=parsed.get("limitations"),
                future_directions=parsed.get("future_directions"),
                llm_provider=active_provider,
                llm_model=active_model,
            )
            db.add(saved_summary)

        db.commit()
        db.refresh(saved_summary)

        return PaperSummaryResponse(
            id=saved_summary.id,
            document_id=doc.id,
            title=doc.title or doc.original_filename,
            summary_type=saved_summary.summary_type,
            short_summary=saved_summary.short_summary,
            problem_statement=saved_summary.problem_statement,
            research_objectives=saved_summary.research_objectives,
            methodology=saved_summary.methodology,
            architecture=saved_summary.architecture,
            dataset=saved_summary.dataset,
            results=saved_summary.results,
            limitations=saved_summary.limitations,
            future_directions=saved_summary.future_directions,
            llm_provider=saved_summary.llm_provider,
            llm_model=saved_summary.llm_model,
            is_cached=False,
            created_at=saved_summary.created_at,
            updated_at=saved_summary.updated_at,
        )
