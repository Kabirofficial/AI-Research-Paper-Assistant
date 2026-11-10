import json
from unittest.mock import patch
from fastapi.testclient import TestClient

from tests.test_documents import create_sample_pdf


def test_summarize_paper_lifecycle(client: TestClient) -> None:
    """Test generating, retrieving, caching, and force-refreshing a structured academic summary."""
    pdf = create_sample_pdf(
        title="Attention Is All You Need",
        pages=[
            (
                "Attention Is All You Need\n"
                "Ashish Vaswani, Noam Shazeer\n"
                "Abstract: Recurrent models are sequential. We introduce Transformer based entirely on attention.\n"
                "1 Introduction\n"
                "To reduce sequential computation, we propose the Transformer."
            ),
        ],
    )
    upload_res = client.post("/documents/upload", files={"file": ("attention_summary.pdf", pdf, "application/pdf")})
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # 1. Summary does not exist initially -> 404
    get_initial = client.get(f"/papers/{doc_id}/summary")
    assert get_initial.status_code == 404

    mock_summary_v1 = {
        "short_summary": "Presents Transformer model based entirely on self-attention.",
        "problem_statement": "Recurrent networks are sequential and difficult to parallelize.",
        "research_objectives": "Eliminate recurrence and achieve SOTA machine translation.",
        "methodology": "Encoder-decoder multi-head attention architecture.",
        "architecture": "6-layer encoder and 6-layer decoder with 8 attention heads.",
        "dataset": "WMT 2014 English-German and English-French.",
        "results": "28.4 BLEU on En-De, improving over previous ensembles.",
        "limitations": "Quadratic memory complexity with sequence length.",
        "future_directions": "Apply attention to image and audio domains.",
    }

    # 2. First POST -> Generates and persists summary (is_cached=False)
    with patch("app.services.llm_service.LLMService.generate", return_value=json.dumps(mock_summary_v1)) as mock_gen:
        res = client.post(f"/papers/{doc_id}/summary")
        assert res.status_code == 200
        data = res.json()
        assert data["document_id"] == doc_id
        assert data["title"] == "Attention Is All You Need"
        assert "Transformer" in data["short_summary"]
        assert "Recurrent networks" in data["problem_statement"]
        assert "28.4 BLEU" in data["results"]
        assert data["is_cached"] is False
        assert mock_gen.call_count == 1

    # 3. GET /papers/{id}/summary -> Returns cached summary (is_cached=True)
    get_res = client.get(f"/papers/{doc_id}/summary")
    assert get_res.status_code == 200
    cached_data = get_res.json()
    assert cached_data["document_id"] == doc_id
    assert cached_data["is_cached"] is True
    assert cached_data["short_summary"] == mock_summary_v1["short_summary"]

    # 4. Second POST with force_refresh=False -> Returns cached without calling LLM
    with patch("app.services.llm_service.LLMService.generate") as mock_gen:
        res_cached = client.post(f"/papers/{doc_id}/summary", json={"force_refresh": False})
        assert res_cached.status_code == 200
        assert res_cached.json()["is_cached"] is True
        assert mock_gen.call_count == 0

    # 5. Third POST with force_refresh=True -> Invokes LLM again and updates database
    mock_summary_v2 = dict(mock_summary_v1)
    mock_summary_v2["short_summary"] = "Updated comprehensive summary for Transformer."

    with patch("app.services.llm_service.LLMService.generate", return_value=json.dumps(mock_summary_v2)) as mock_gen:
        res_refresh = client.post(f"/papers/{doc_id}/summary", json={"force_refresh": True})
        assert res_refresh.status_code == 200
        refreshed_data = res_refresh.json()
        assert refreshed_data["is_cached"] is False
        assert "Updated comprehensive summary" in refreshed_data["short_summary"]
        assert mock_gen.call_count == 1

    # Verify subsequent GET reflects updated content
    get_updated = client.get(f"/papers/{doc_id}/summary")
    assert get_updated.status_code == 200
    assert "Updated comprehensive summary" in get_updated.json()["short_summary"]


def test_summarize_paper_not_found(client: TestClient) -> None:
    """Test error when attempting to summarize or fetch summary for a non-existent document."""
    res_post = client.post("/papers/nonexistent-id/summary")
    assert res_post.status_code == 404

    res_get = client.get("/papers/nonexistent-id/summary")
    assert res_get.status_code == 404


def test_compare_papers_lifecycle(client: TestClient) -> None:
    """Test creating, listing, retrieving, and deleting multi-paper comparisons."""
    # Paper 1
    pdf1 = create_sample_pdf(
        title="Attention Is All You Need",
        pages=[("Attention Is All You Need\nTransformer language translation.")],
    )
    res1 = client.post("/documents/upload", files={"file": ("transformer_comp.pdf", pdf1, "application/pdf")})
    doc1_id = res1.json()["id"]

    # Paper 2
    pdf2 = create_sample_pdf(
        title="Deep Residual Learning",
        pages=[("Deep Residual Learning\nResNet architecture for image recognition.")],
    )
    res2 = client.post("/documents/upload", files={"file": ("resnet_comp.pdf", pdf2, "application/pdf")})
    doc2_id = res2.json()["id"]

    mock_comparison = {
        "problem_comparison": "Paper 1 addresses sequential translation bottlenecks; Paper 2 addresses gradient degradation in deep CNNs.",
        "methodology_comparison": "Paper 1 relies on multi-head self-attention; Paper 2 introduces residual shortcut connections.",
        "architecture_comparison": "Attention-only encoder-decoder vs 152-layer residual CNN blocks.",
        "dataset_comparison": "WMT14 translation benchmark vs ImageNet classification benchmark.",
        "results_comparison": "Both achieved breakthrough state-of-the-art performance in their respective fields.",
        "strengths_and_weaknesses": "Transformers scale well in NLP; ResNets provide stable optimization for deep vision backbones.",
        "research_gaps": "Unifying spatial convolutions with global attention mechanisms (Vision Transformers).",
    }

    # 1. Create comparison
    with patch("app.services.llm_service.LLMService.generate", return_value=json.dumps(mock_comparison)):
        payload = {
            "document_ids": [doc1_id, doc2_id],
            "title": "Transformer vs ResNet Architecture Comparison",
        }
        res = client.post("/papers/compare", json=payload)
        assert res.status_code == 201
        data = res.json()

        comp_id = data["id"]
        assert comp_id is not None
        assert data["title"] == "Transformer vs ResNet Architecture Comparison"
        assert len(data["compared_papers"]) == 2
        assert "sequential translation" in data["problem_comparison"]
        assert "multi-head self-attention" in data["methodology_comparison"]
        assert "Vision Transformers" in data["research_gaps"]
        assert "WMT14" in data["dataset_comparison"]

    # 2. List comparisons
    list_res = client.get("/papers/comparisons")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    found = [c for c in list_data["comparisons"] if c["id"] == comp_id]
    assert len(found) == 1
    assert found[0]["title"] == "Transformer vs ResNet Architecture Comparison"
    assert found[0]["document_count"] == 2

    # 3. Retrieve comparison by ID
    get_res = client.get(f"/papers/comparisons/{comp_id}")
    assert get_res.status_code == 200
    detail_data = get_res.json()
    assert detail_data["id"] == comp_id
    assert detail_data["title"] == "Transformer vs ResNet Architecture Comparison"
    assert len(detail_data["compared_papers"]) == 2
    assert "Vision Transformers" in detail_data["research_gaps"]

    # 4. Delete comparison
    del_res = client.delete(f"/papers/comparisons/{comp_id}")
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["detail"]

    # Verify comparison is gone
    get_deleted = client.get(f"/papers/comparisons/{comp_id}")
    assert get_deleted.status_code == 404

    del_deleted = client.delete(f"/papers/comparisons/{comp_id}")
    assert del_deleted.status_code == 404


def test_compare_papers_validation(client: TestClient) -> None:
    """Test validation errors for invalid paper comparison requests."""
    # Fewer than 2 papers
    res1 = client.post("/papers/compare", json={"document_ids": ["single-doc-id"]})
    assert res1.status_code in [400, 422]

    # Non-existent papers
    res2 = client.post("/papers/compare", json={"document_ids": ["fake-id-1", "fake-id-2"]})
    assert res2.status_code == 404

    # Non-existent comparison ID
    res3 = client.get("/papers/comparisons/nonexistent-comp-id")
    assert res3.status_code == 404


def test_summary_cascade_deletion_on_document_delete(client: TestClient) -> None:
    """Verify that deleting a document cascades to delete its persisted paper summary."""
    pdf = create_sample_pdf(
        title="Cascade Test Paper",
        pages=[("Title: Cascade Test Paper\nSome text content.")],
    )
    upload_res = client.post("/documents/upload", files={"file": ("cascade_test.pdf", pdf, "application/pdf")})
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    mock_summary = {
        "short_summary": "Cascade test summary.",
        "problem_statement": "Problem test.",
        "research_objectives": "Objectives test.",
        "methodology": "Methodology test.",
        "architecture": None,
        "dataset": None,
        "results": "Results test.",
        "limitations": None,
        "future_directions": None,
    }

    with patch("app.services.llm_service.LLMService.generate", return_value=json.dumps(mock_summary)):
        res = client.post(f"/papers/{doc_id}/summary")
        assert res.status_code == 200

    # Summary exists
    get_res = client.get(f"/papers/{doc_id}/summary")
    assert get_res.status_code == 200

    # Delete document
    del_res = client.delete(f"/documents/{doc_id}")
    assert del_res.status_code == 200

    # Summary should be gone (document not found)
    get_after_del = client.get(f"/papers/{doc_id}/summary")
    assert get_after_del.status_code == 404


def test_extract_json_object_robustness() -> None:
    """Test JSON extraction across diverse LLM formatting quirks."""
    from app.core.json_utils import extract_json_object

    # 1. Pure JSON
    pure = '{"key": "value"}'
    assert extract_json_object(pure) == {"key": "value"}

    # 2. Markdown fence with 'json' identifier
    fenced = '```json\n{"problem_comparison": "test", "results_comparison": "done"}\n```'
    assert extract_json_object(fenced) == {"problem_comparison": "test", "results_comparison": "done"}

    # 3. Conversational preamble and postamble with markdown fence
    conversational = (
        "Here is the requested comparison in JSON:\n\n"
        "```json\n"
        '{"short_summary": "Presents Transformer", "results": "28.4 BLEU"}\n'
        "```\n\n"
        "I hope this helps your research!"
    )
    assert extract_json_object(conversational) == {
        "short_summary": "Presents Transformer",
        "results": "28.4 BLEU",
    }

    # 4. Outermost brace fallback with trailing comma
    broken_trailing_comma = 'Sure, here is the object: {"a": 1, "b": 2,} Enjoy!'
    assert extract_json_object(broken_trailing_comma) == {"a": 1, "b": 2}

    # 5. Truncated JSON without closing brace or quote (recovers via expected_keys)
    truncated_llm_output = (
        '{\n'
        '  "problem_comparison": "Both papers address knowledge distillation in deep learning.",\n'
        '  "methodology_comparison": "Paper 1 uses contrastive expansion, while Paper 2 uses distillation.',
    )
    recovered = extract_json_object(
        truncated_llm_output[0],
        expected_keys=["problem_comparison", "methodology_comparison", "results_comparison"],
    )
    assert recovered is not None
    assert "knowledge distillation" in recovered["problem_comparison"]
    assert "contrastive expansion" in recovered["methodology_comparison"]

    # 6. Unescaped quotes inside string values (recovers via expected_keys)
    unescaped_quotes = (
        '{\n'
        '  "problem_comparison": "The author tested the "ResNet-50" model on ImageNet.",\n'
        '  "methodology_comparison": "The authors used "Vision Transformer" architecture."\n'
        '}'
    )
    recovered_quotes = extract_json_object(
        unescaped_quotes,
        expected_keys=["problem_comparison", "methodology_comparison"],
    )
    assert recovered_quotes is not None
    assert "ResNet-50" in recovered_quotes["problem_comparison"]
    assert "Vision Transformer" in recovered_quotes["methodology_comparison"]

    # 7. Empty or invalid text
    assert extract_json_object("") is None
    assert extract_json_object("No json here") is None


