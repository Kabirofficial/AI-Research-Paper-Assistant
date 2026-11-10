from unittest.mock import patch

from fastapi.testclient import TestClient

from tests.test_documents import create_sample_pdf


def test_create_and_list_conversations(client: TestClient) -> None:
    """Test creating library-wide and paper-scoped conversations."""
    # 1. Unscoped conversation
    res1 = client.post("/chat/conversations", json={"title": "General AI Discussion"})
    assert res1.status_code == 201
    conv1 = res1.json()
    assert conv1["title"] == "General AI Discussion"
    assert conv1["document_id"] is None
    assert conv1["message_count"] == 0

    # 2. Paper-scoped conversation
    pdf = create_sample_pdf(title="Paper for Chat Testing")
    upload_res = client.post("/documents/upload", files={"file": ("chat_doc.pdf", pdf, "application/pdf")})
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    res2 = client.post("/chat/conversations", json={"document_id": doc_id})
    assert res2.status_code == 201
    conv2 = res2.json()
    assert conv2["document_id"] == doc_id

    # 3. List conversations
    list_res = client.get("/chat/conversations")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 2
    conv_ids = [c["id"] for c in data["conversations"]]
    assert conv1["id"] in conv_ids
    assert conv2["id"] in conv_ids


def test_create_conversation_invalid_document_id(client: TestClient) -> None:
    """Test error when scoping conversation to a non-existent document."""
    res = client.post("/chat/conversations", json={"document_id": "nonexistent-doc-id"})
    assert res.status_code == 404


def test_send_message_and_receive_grounded_response(client: TestClient) -> None:
    """Test sending a message, running RAG, and receiving an answer with source citations."""
    pdf = create_sample_pdf(
        title="Attention Mechanism Foundations",
        pages=[
            (
                "Attention Mechanism Foundations\n"
                "Authors: Research Team\n"
                "1 Introduction\n"
                "The core mechanism uses scaled dot-product attention computed as softmax(QK^T / sqrt(d_k))V."
            ),
        ],
    )
    upload_res = client.post("/documents/upload", files={"file": ("attention_core.pdf", pdf, "application/pdf")})
    doc_id = upload_res.json()["id"]

    # Create conversation scoped to this paper
    conv_res = client.post("/chat/conversations", json={"document_id": doc_id})
    conv_id = conv_res.json()["id"]

    mock_answer = "According to [Source 1, Page 1], the formula is softmax(QK^T / sqrt(d_k))V."

    with patch("app.services.llm_service.LLMService.generate", return_value=mock_answer):
        msg_res = client.post(
            f"/chat/conversations/{conv_id}/messages",
            json={"content": "What is the attention equation?"},
        )
        assert msg_res.status_code == 201
        data = msg_res.json()
        assert data["role"] == "assistant"
        assert "softmax" in data["content"]
        assert len(data["sources"]) >= 1
        assert data["sources"][0]["document_id"] == doc_id
        assert data["sources"][0]["page_number"] == 1

    # Fetch conversation history
    history_res = client.get(f"/chat/conversations/{conv_id}")
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history["messages"]) == 2  # user message + assistant message
    assert history["messages"][0]["role"] == "user"
    assert history["messages"][0]["content"] == "What is the attention equation?"
    assert history["messages"][1]["role"] == "assistant"
    assert len(history["messages"][1]["sources"]) >= 1


def test_delete_conversation(client: TestClient) -> None:
    """Test deleting a conversation and its messages."""
    conv_res = client.post("/chat/conversations", json={"title": "Conversation to Delete"})
    conv_id = conv_res.json()["id"]

    del_res = client.delete(f"/chat/conversations/{conv_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify not found
    get_res = client.get(f"/chat/conversations/{conv_id}")
    assert get_res.status_code == 404

