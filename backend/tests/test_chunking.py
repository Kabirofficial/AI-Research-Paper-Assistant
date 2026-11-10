from fastapi.testclient import TestClient

from app.services.chunking_service import ChunkingService
from tests.test_documents import create_sample_pdf


def test_token_count_estimation() -> None:
    """Test token estimation heuristic."""
    assert ChunkingService.estimate_token_count("") == 0
    assert ChunkingService.estimate_token_count("word") == 1
    assert ChunkingService.estimate_token_count("a" * 400) == 100


def test_section_heading_detection() -> None:
    """Test identification of standard research paper section headings."""
    assert ChunkingService.is_section_heading("1. Introduction")
    assert ChunkingService.is_section_heading("2 Methodology")
    assert ChunkingService.is_section_heading("IV. EXPERIMENTAL SETUP")
    assert ChunkingService.is_section_heading("Abstract")
    assert ChunkingService.is_section_heading("Conclusion and Future Work")
    assert ChunkingService.is_section_heading("References")

    # Regular text should not be treated as a heading
    assert not ChunkingService.is_section_heading(
        "In this paper, we propose a new neural architecture that improves accuracy."
    )


def test_chunk_document_splitting() -> None:
    """Test chunk generation with paragraph boundaries, section tracking, and overlap."""
    pages = [
        {
            "page_number": 1,
            "text": (
                "1. Introduction\n\n"
                "Deep learning models have achieved remarkable success across diverse domains.\n\n"
                "However, attention mechanisms remain computationally demanding."
            ),
        },
        {
            "page_number": 2,
            "text": (
                "2. Methodology\n\n"
                "We introduce a sparse attention layer that reduces complexity to linear time."
            ),
        },
    ]

    # Use small chunk size (e.g. 20 tokens ~ 80 chars) to trigger multiple chunks
    chunks = ChunkingService.chunk_document(
        document_id="doc-123",
        pages=pages,
        chunk_size_tokens=30,
        chunk_overlap_tokens=5,
    )

    assert len(chunks) >= 2
    assert chunks[0].document_id == "doc-123"
    assert chunks[0].chunk_index == 0
    assert chunks[0].page_number == 1
    assert chunks[0].section_heading == "1. Introduction"

    # Verify that the second page's chunk reflects page 2 and updated section
    p2_chunks = [c for c in chunks if c.page_number == 2]
    assert len(p2_chunks) > 0
    assert p2_chunks[0].section_heading == "2. Methodology"


def test_document_chunks_api_endpoint(client: TestClient) -> None:
    """Test that uploading a PDF automatically generates chunks accessible via API."""
    pdf_bytes = create_sample_pdf(title="Chunking Integration Test Paper")
    files = {"file": ("chunk_test.pdf", pdf_bytes, "application/pdf")}

    upload_res = client.post("/documents/upload", files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # Fetch chunks
    chunks_res = client.get(f"/documents/{doc_id}/chunks")
    assert chunks_res.status_code == 200
    data = chunks_res.json()
    assert data["total"] >= 1
    assert len(data["chunks"]) == data["total"]

    first_chunk = data["chunks"][0]
    assert first_chunk["document_id"] == doc_id
    assert first_chunk["chunk_index"] == 0
    assert first_chunk["page_number"] in [1, 2]
    assert len(first_chunk["text"]) > 0
    assert first_chunk["embedding_model"] is not None

