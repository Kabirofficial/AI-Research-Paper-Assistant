from fastapi.testclient import TestClient

from app.core.config import settings


def test_get_settings_masks_api_key(client: TestClient) -> None:
    """Test retrieving settings masks the OpenAI API key."""
    settings.OPENAI_API_KEY = "sk-supersecretkey12345678"
    response = client.get("/settings/")
    assert response.status_code == 200
    data = response.json()
    assert data["project_name"] == "AI Research Paper Assistant"
    assert data["openai_api_key_configured"] is True
    assert data["openai_api_key_masked"] == "sk-...5678"
    assert "sk-supersecretkey12345678" not in str(data)


def test_update_settings_and_validation(client: TestClient) -> None:
    """Test updating settings and verifying validation limits."""
    payload = {
        "llm_provider": "openai",
        "top_k_retrieval": 8,
        "chunk_size": 900,
        "openai_api_key": "sk-newkey987654321",
    }
    response = client.put("/settings/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["llm_provider"] == "openai"
    assert data["top_k_retrieval"] == 8
    assert data["chunk_size"] == 900
    assert data["openai_api_key_masked"] == "sk-...4321"

    # Reset back to ollama for subsequent tests
    client.put("/settings/", json={"llm_provider": "ollama", "openai_api_key": ""})

    # Test invalid provider
    invalid_res = client.put("/settings/", json={"llm_provider": "nonexistent_ai"})
    assert invalid_res.status_code == 400


def test_get_providers_endpoint(client: TestClient, monkeypatch) -> None:
    """Test the provider availability check endpoint."""
    from app.services.llm_service import OllamaProvider
    # Mock Ollama test connection to return fast offline result for testing
    monkeypatch.setattr(
        OllamaProvider,
        "test_connection",
        lambda self: (False, "Ollama is offline for test", []),
    )
    response = client.get("/settings/providers")
    assert response.status_code == 200
    data = response.json()
    assert "current_provider" in data
    assert len(data["providers"]) == 2
    provider_names = [p["provider"] for p in data["providers"]]
    assert "ollama" in provider_names
    assert "openai" in provider_names


def test_test_connection_endpoint(client: TestClient) -> None:
    """Test the connection verification endpoint."""
    # Test connection with explicit mock / missing key
    payload = {
        "provider": "openai",
        "api_key": "",
    }
    response = client.post("/settings/test-connection", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai"
    assert data["success"] is False
    assert "not configured" in data["message"]
