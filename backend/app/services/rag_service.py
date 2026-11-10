import logging
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.rag import Citation, RAGResponse
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.services.vector_store_service import VectorStoreService

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert AI Research Assistant specializing in academic literature analysis.
Answer the user's research question strictly using the provided paper excerpts below.

Guidelines:
1. Base your answer solely on the provided context excerpts. Do NOT hallucinate or extrapolate facts not present in the excerpts.
2. When stating facts, cite the sources explicitly using their citation reference numbers (e.g., "[Source 1, Page 3]" or "[Source 2, Page 5]").
3. If the provided excerpts do not contain sufficient evidence to answer the question, state clearly: "The provided research paper excerpts do not contain sufficient evidence to answer this question."
4. Maintain an academic, precise, objective tone.
"""

INSUFFICIENT_EVIDENCE_PHRASE = "The provided research paper excerpts do not contain sufficient evidence to answer this question."


class RAGService:
    """Service orchestrating dense retrieval, context synthesis, and grounded LLM generation."""

    @classmethod
    def answer_question(
        cls,
        db: Session,
        question: str,
        document_id: str | None = None,
        document_ids: list[str] | None = None,
        top_k: int | None = None,
        min_score: float = 0.0,
    ) -> RAGResponse:
        """Execute the end-to-end RAG pipeline to answer a research question."""
        start_time = time.perf_counter()
        k = top_k or settings.TOP_K_RETRIEVAL

        active_provider = settings.LLM_PROVIDER
        active_model = (
            settings.OPENAI_MODEL if active_provider == "openai" else settings.OLLAMA_MODEL
        )

        # Generate query embedding
        query_vector = EmbeddingService.embed_query(question)

        # Retrieve relevant chunks from FAISS
        matches = VectorStoreService.search(
            query_vector=query_vector,
            top_k=k,
            document_id=document_id,
            document_ids=document_ids,
            min_score=min_score,
        )

        if not matches:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return RAGResponse(
                question=question,
                answer=INSUFFICIENT_EVIDENCE_PHRASE,
                citations=[],
                insufficient_evidence=True,
                llm_provider=active_provider,
                llm_model=active_model,
                latency_ms=latency_ms,
            )

        # Load chunks and documents from SQLite
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

        # Build context blocks and structured citations
        context_blocks: list[str] = []
        citations: list[Citation] = []

        source_idx = 1
        for match in matches:
            chunk = chunk_by_id.get(match["chunk_id"])
            if not chunk:
                continue
            doc = doc_by_id.get(chunk.document_id)
            if not doc:
                continue

            doc_title = doc.title or doc.original_filename
            section_label = chunk.section_heading or "General"

            context_blocks.append(
                f"--- [Source {source_idx}] Document: \"{doc_title}\" | Page: {chunk.page_number} | Section: {section_label} ---\n"
                f"{chunk.text}"
            )

            # Excerpt snippet (~200 chars)
            snippet = chunk.text[:220].replace("\n", " ").strip()
            if len(chunk.text) > 220:
                snippet += "..."

            citations.append(
                Citation(
                    source_index=source_idx,
                    document_id=doc.id,
                    chunk_id=chunk.id,
                    document_title=doc_title,
                    original_filename=doc.original_filename,
                    page_number=chunk.page_number,
                    section_heading=chunk.section_heading,
                    excerpt=snippet,
                    relevance_score=match["score"],
                )
            )
            source_idx += 1

        if not context_blocks:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return RAGResponse(
                question=question,
                answer=INSUFFICIENT_EVIDENCE_PHRASE,
                citations=[],
                insufficient_evidence=True,
                llm_provider=active_provider,
                llm_model=active_model,
                latency_ms=latency_ms,
            )

        context_text = "\n\n".join(context_blocks)
        user_prompt = (
            f"Context from research papers:\n\n{context_text}\n\n"
            f"Research Question: {question}\n\n"
            f"Answer:"
        )

        try:
            raw_answer = LLMService.generate(
                prompt=user_prompt,
                system_prompt=SYSTEM_PROMPT,
                temperature=0.1,
            )
            answer = raw_answer.strip()
        except Exception as e:
            logger.error(f"Error during LLM generation in RAG pipeline: {e}", exc_info=True)
            raise RuntimeError(f"Failed to generate answer from LLM provider '{active_provider}': {str(e)}")

        insufficient = (
            "not contain sufficient evidence" in answer.lower()
            or "insufficient evidence" in answer.lower()
            or "insufficient information" in answer.lower()
        )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return RAGResponse(
            question=question,
            answer=answer,
            citations=citations,
            insufficient_evidence=insufficient,
            llm_provider=active_provider,
            llm_model=active_model,
            latency_ms=latency_ms,
        )

