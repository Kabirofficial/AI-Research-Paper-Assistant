from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.rag_service import RAGService
from tests.test_documents import create_sample_pdf


def test_rag_empty_database_returns_insufficient_evidence(db_session: Session) -> None:
    """Test that querying an empty database immediately returns insufficient evidence without error."""
    res = RAGService.answer_question(
        db=db_session,
        question="What are the key findings of the transformer architecture?",
    )
    assert res.insufficient_evidence is True
    assert "not contain sufficient evidence" in res.answer
    assert len(res.citations) == 0


def test_rag_pipeline_with_document(client: TestClient, db_session: Session) -> None:
    """Test end-to-end RAG retrieval, context construction, and citations."""
    pdf_bytes = create_sample_pdf(
        title="Attention Is All You Need",
        pages=[
            (
                "Attention Is All You Need\n"
                "Ashish Vaswani, Noam Shazeer\n"
                "Abstract: The dominant sequence transduction models are based on attention.\n"
                "1 Introduction\n"
                "We propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism."
            ),
        ],
    )
    upload_res = client.post("/documents/upload", files={"file": ("transformer.pdf", pdf_bytes, "application/pdf")})
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    mock_llm_answer = (
        "Based on [Source 1, Page 1], the authors propose the Transformer, a model "
        "architecture that eschews recurrence and relies entirely on self-attention mechanisms."
    )

    with patch("app.services.llm_service.LLMService.generate", return_value=mock_llm_answer) as mock_gen:
        res = RAGService.answer_question(
            db=db_session,
            question="What model architecture is proposed in this paper?",
            document_id=doc_id,
        )

        assert mock_gen.called
        # Check that context sent to the LLM contains our paper excerpt
        call_prompt = mock_gen.call_args[1]["prompt"]
        assert "Transformer" in call_prompt
        assert "Ashish Vaswani" in call_prompt

        # Validate structured response
        assert res.insufficient_evidence is False
        assert "Transformer" in res.answer
        assert len(res.citations) >= 1

        citation = res.citations[0]
        assert citation.source_index == 1
        assert citation.document_id == doc_id
        assert citation.page_number == 1
        assert "attention" in citation.excerpt.lower()
        assert citation.relevance_score > 0.0


def test_rag_document_scoping(client: TestClient, db_session: Session) -> None:
    """Test that RAG respects document_id filtering across multiple uploaded papers."""
    pdf1 = create_sample_pdf(
        title="Paper A Attention",
        pages=[("Paper A Title\nAttention mechanisms in NLP models.")],
    )
    res1 = client.post("/documents/upload", files={"file": ("papera.pdf", pdf1, "application/pdf")})
    assert res1.status_code == 201
    assert res1.json()["id"] is not None

    pdf2 = create_sample_pdf(
        title="Paper B Convolutions",
        pages=[("Paper B Title\nResidual convolutional networks for vision.")],
    )
    res2 = client.post("/documents/upload", files={"file": ("paperb.pdf", pdf2, "application/pdf")})
    doc_b_id = res2.json()["id"]

    mock_answer = "According to [Source 1, Page 1], residual convolutional networks improve vision tasks."

    with patch("app.services.llm_service.LLMService.generate", return_value=mock_answer):
        res = RAGService.answer_question(
            db=db_session,
            question="What vision models are discussed?",
            document_id=doc_b_id,
        )
        assert res.insufficient_evidence is False
        assert len(res.citations) >= 1
        for cit in res.citations:
            assert cit.document_id == doc_b_id


def test_rag_insufficient_evidence_detection(client: TestClient, db_session: Session) -> None:
    """Test that if the LLM states insufficient evidence, the boolean flag is set to True."""
    pdf = create_sample_pdf(
        title="Unrelated Paper",
        pages=[("This paper discusses protein folding dynamics.")],
    )
    client.post("/documents/upload", files={"file": ("proteins.pdf", pdf, "application/pdf")})

    mock_answer = "The provided research paper excerpts do not contain sufficient evidence to answer this question."

    with patch("app.services.llm_service.LLMService.generate", return_value=mock_answer):
        res = RAGService.answer_question(
            db=db_session,
            question="What is the learning rate used for the ResNet optimizer?",
        )
        assert res.insufficient_evidence is True
        assert "not contain sufficient evidence" in res.answer

