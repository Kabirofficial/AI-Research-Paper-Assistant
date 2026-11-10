import io
from pathlib import Path
import pymupdf
import pytest
from fastapi.testclient import TestClient


def create_sample_pdf(
    title: str = "Attention Is All You Need",
    pages: list[str] | None = None,
) -> bytes:
    """Generate a valid PDF in memory for testing."""
    if pages is None:
        pages = [
            (
                f"{title}\n"
                "Ashish Vaswani, Noam Shazeer, Niki Parmar\n"
                "Abstract: The dominant sequence transduction models are based on complex recurrent or "
                "convolutional neural networks. We propose the Transformer, a model architecture eschewing "
                "recurrence and relying entirely on an attention mechanism.\n"
                "1 Introduction\n"
                "Recurrent neural networks have been firmly established as state of the art..."
            ),
            (
                "2 Model Architecture\n"
                "Most competitive neural sequence transduction models have an encoder-decoder structure.\n"
                "Here, the encoder maps an input sequence of symbol representations."
            ),
        ]

    doc = pymupdf.open()
    for text_content in pages:
        page = doc.new_page(width=595, height=842)
        # Insert text inside page rectangle so full text wraps properly
        page.insert_textbox(pymupdf.Rect(50, 50, 545, 800), text_content, fontsize=11)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_upload_valid_pdf(client: TestClient) -> None:
    """Test successful upload and extraction of a valid research paper PDF."""
    pdf_bytes = create_sample_pdf(title="Attention Is All You Need")
    files = {"file": ("attention_is_all_you_need.pdf", pdf_bytes, "application/pdf")}

    response = client.post("/documents/upload", files=files)
    assert response.status_code == 201

    data = response.json()
    assert data["original_filename"] == "attention_is_all_you_need.pdf"
    assert data["processing_status"] == "completed"
    assert data["extraction_status"] == "completed"
    assert data["page_count"] == 2
    assert "attention" in data["title"].lower()
    assert data["abstract"] is not None
    assert "Transformer" in data["abstract"]
    assert len(data["sha256_hash"]) == 64
    assert data["id"] is not None


def test_upload_duplicate_pdf(client: TestClient) -> None:
    """Test that uploading the exact same PDF twice returns 409 Conflict."""
    pdf_bytes = create_sample_pdf(title="Duplicate Detection Test Paper")
    files = {"file": ("paper.pdf", pdf_bytes, "application/pdf")}

    # First upload succeeds
    res1 = client.post("/documents/upload", files=files)
    assert res1.status_code == 201

    # Second upload with same content fails with 409
    files_dup = {"file": ("paper_copy.pdf", pdf_bytes, "application/pdf")}
    res2 = client.post("/documents/upload", files=files_dup)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]["message"]


def test_upload_invalid_pdf_signature(client: TestClient) -> None:
    """Test that uploading a file without PDF signature fails with 400 Bad Request."""
    invalid_content = b"This is plain text disguised as a PDF."
    files = {"file": ("fake.pdf", invalid_content, "application/pdf")}

    response = client.post("/documents/upload", files=files)
    assert response.status_code == 400
    assert "valid PDF signature" in response.json()["detail"]


def test_upload_empty_file(client: TestClient) -> None:
    """Test that uploading an empty 0-byte file fails with 400 Bad Request."""
    files = {"file": ("empty.pdf", b"", "application/pdf")}

    response = client.post("/documents/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]


def test_list_and_get_document(client: TestClient) -> None:
    """Test listing documents and fetching a single document's metadata."""
    pdf_bytes = create_sample_pdf(title="Deep Residual Learning")
    files = {"file": ("resnet.pdf", pdf_bytes, "application/pdf")}
    upload_res = client.post("/documents/upload", files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # List documents
    list_res = client.get("/documents/")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(d["id"] == doc_id for d in list_data["documents"])

    # Get single document
    get_res = client.get(f"/documents/{doc_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == doc_id
    assert get_res.json()["original_filename"] == "resnet.pdf"


def test_get_document_text(client: TestClient) -> None:
    """Test retrieving page-by-page extracted text for a document."""
    pdf_bytes = create_sample_pdf(title="BERT Pre-training")
    files = {"file": ("bert.pdf", pdf_bytes, "application/pdf")}
    upload_res = client.post("/documents/upload", files=files)
    doc_id = upload_res.json()["id"]

    text_res = client.get(f"/documents/{doc_id}/text")
    assert text_res.status_code == 200
    data = text_res.json()
    assert data["document_id"] == doc_id
    assert data["page_count"] == 2
    assert len(data["pages"]) == 2
    assert data["pages"][0]["page_number"] == 1
    assert "BERT" in data["pages"][0]["text"]
    assert "full_text" in data
    assert len(data["full_text"]) > 0


def test_download_document(client: TestClient) -> None:
    """Test downloading the original PDF file."""
    pdf_bytes = create_sample_pdf(title="Download Test Paper")
    files = {"file": ("download_paper.pdf", pdf_bytes, "application/pdf")}
    upload_res = client.post("/documents/upload", files=files)
    doc_id = upload_res.json()["id"]

    download_res = client.get(f"/documents/{doc_id}/download")
    assert download_res.status_code == 200
    assert download_res.headers["content-type"] == "application/pdf"
    assert download_res.content == pdf_bytes


def test_delete_document(client: TestClient) -> None:
    """Test deleting a document and verifying disk cleanup."""
    pdf_bytes = create_sample_pdf(title="Paper To Delete")
    files = {"file": ("to_delete.pdf", pdf_bytes, "application/pdf")}
    upload_res = client.post("/documents/upload", files=files)
    doc_id = upload_res.json()["id"]

    # Delete
    del_res = client.delete(f"/documents/{doc_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify not found in DB
    get_res = client.get(f"/documents/{doc_id}")
    assert get_res.status_code == 404

    # Verify text endpoint also returns 404
    text_res = client.get(f"/documents/{doc_id}/text")
    assert text_res.status_code == 404


def test_reprocess_document(client: TestClient) -> None:
    """Test reprocessing an existing document."""
    pdf_bytes = create_sample_pdf(title="Reprocess Test Paper")
    files = {"file": ("reprocess_paper.pdf", pdf_bytes, "application/pdf")}
    upload_res = client.post("/documents/upload", files=files)
    doc_id = upload_res.json()["id"]

    reprocess_res = client.post(f"/documents/{doc_id}/reprocess")
    assert reprocess_res.status_code == 200
    data = reprocess_res.json()
    assert data["id"] == doc_id
    assert data["processing_status"] == "completed"
    assert data["page_count"] == 2
