from fastapi.testclient import TestClient

from tests.test_documents import create_sample_pdf


def test_search_status_endpoint(client: TestClient) -> None:
    """Test retrieving vector index status."""
    response = client.get("/search/status")
    assert response.status_code == 200
    data = response.json()
    assert "total_vectors" in data
    assert data["dimension"] == 384
    assert "is_healthy" in data


def test_search_empty_index(client: TestClient) -> None:
    """Test searching when no papers have been indexed returns empty list without error."""
    payload = {"query": "deep learning architectures", "top_k": 5}
    response = client.post("/search/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_results"] == 0
    assert data["results"] == []


def test_search_across_papers_and_document_filter(client: TestClient) -> None:
    """Test semantic search across entire library and with document_id filtering."""
    # Upload paper 1: Transformers
    pdf1 = create_sample_pdf(
        title="Attention Is All You Need",
        pages=[
            (
                "Attention Is All You Need\n"
                "Ashish Vaswani, Noam Shazeer\n"
                "Abstract: The dominant sequence transduction models are based on attention.\n"
                "1 Introduction\n"
                "Multi-head self-attention allows the model to jointly attend to information from different representation subspaces."
            ),
        ],
    )
    res1 = client.post("/documents/upload", files={"file": ("transformers.pdf", pdf1, "application/pdf")})
    assert res1.status_code == 201
    doc1_id = res1.json()["id"]

    # Upload paper 2: ResNet
    pdf2 = create_sample_pdf(
        title="Deep Residual Learning for Image Recognition",
        pages=[
            (
                "Deep Residual Learning for Image Recognition\n"
                "Kaiming He, Xiangyu Zhang\n"
                "Abstract: Deeper neural networks are more difficult to train.\n"
                "1 Introduction\n"
                "We present a residual learning framework to ease the training of substantially deeper convolutional networks."
            ),
        ],
    )
    res2 = client.post("/documents/upload", files={"file": ("resnet.pdf", pdf2, "application/pdf")})
    assert res2.status_code == 201
    doc2_id = res2.json()["id"]

    # Search for attention (should rank Paper 1 first)
    query_payload = {
        "query": "multi-head self-attention sequence transduction",
        "top_k": 5,
    }
    search_res = client.post("/search/", json=query_payload)
    assert search_res.status_code == 200
    results = search_res.json()["results"]
    assert len(results) >= 1
    assert results[0]["document_id"] == doc1_id
    assert results[0]["score"] > 0.0
    assert "attention" in results[0]["text"].lower()

    # Search with document filter for ResNet (doc2) only
    filter_payload = {
        "query": "neural networks training",
        "document_id": doc2_id,
        "top_k": 5,
    }
    filtered_res = client.post("/search/", json=filter_payload)
    assert filtered_res.status_code == 200
    filtered_results = filtered_res.json()["results"]
    assert len(filtered_results) >= 1
    for r in filtered_results:
        assert r["document_id"] == doc2_id


def test_search_empty_query_validation(client: TestClient) -> None:
    """Test that searching with whitespace or empty string returns 422 or 400."""
    response = client.post("/search/", json={"query": ""})
    assert response.status_code in [400, 422]


def test_search_rebuild_index(client: TestClient) -> None:
    """Test the vector index rebuild endpoint."""
    pdf = create_sample_pdf(title="Index Rebuild Test Paper")
    upload_res = client.post("/documents/upload", files={"file": ("rebuild.pdf", pdf, "application/pdf")})
    assert upload_res.status_code == 201

    rebuild_res = client.post("/search/rebuild")
    assert rebuild_res.status_code == 200
    data = rebuild_res.json()
    assert data["status"] == "success"
    assert data["indexed_vectors"] >= 1


def test_document_deletion_updates_search(client: TestClient) -> None:
    """Test that deleting a paper removes its vectors from subsequent search results."""
    pdf = create_sample_pdf(
        title="Temporary Paper To Delete",
        pages=[("Temporary Title\nUniqueEphemeralKeywordForSearchTest occurs here.")],
    )
    upload_res = client.post("/documents/upload", files={"file": ("temp.pdf", pdf, "application/pdf")})
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # Verify searchable
    search1 = client.post("/search/", json={"query": "UniqueEphemeralKeywordForSearchTest", "top_k": 5})
    assert search1.status_code == 200
    assert any(r["document_id"] == doc_id for r in search1.json()["results"])

    # Delete paper
    del_res = client.delete(f"/documents/{doc_id}")
    assert del_res.status_code == 200

    # Verify not searchable
    search2 = client.post("/search/", json={"query": "UniqueEphemeralKeywordForSearchTest", "top_k": 5})
    assert search2.status_code == 200
    assert not any(r["document_id"] == doc_id for r in search2.json()["results"])

