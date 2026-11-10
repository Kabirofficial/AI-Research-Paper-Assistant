from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient) -> None:
    """Test that root endpoint returns application metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "AI Research Paper Assistant"
    assert data["status"] == "online"
    assert "docs_url" in data


def test_health_endpoint(client: TestClient) -> None:
    """Test that health check verifies database and storage integrity."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "healthy"
    assert data["storage"] == "available"
    assert data["llm_provider"] == "ollama"
    assert "embedding_model" in data

