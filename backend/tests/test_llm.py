from unittest.mock import MagicMock, patch

import pytest

from app.services.llm_service import (
    LLMService,
    OllamaProvider,
    OpenAIProvider,
    mask_api_key,
)


def test_mask_api_key() -> None:
    """Test API key masking logic."""
    assert mask_api_key("") == ""
    assert mask_api_key(None) == ""
    assert mask_api_key("12345") == "********"
    assert mask_api_key("sk-abcdefghijkl1234") == "sk-...1234"


def test_llm_service_provider_selection() -> None:
    """Test that LLMService instantiates the correct provider class."""
    ollama = LLMService.get_provider("ollama")
    assert isinstance(ollama, OllamaProvider)

    openai = LLMService.get_provider("openai")
    assert isinstance(openai, OpenAIProvider)

    with pytest.raises(ValueError, match="Unsupported LLM provider"):
        LLMService.get_provider("anthropic_unknown")


def test_ollama_provider_connection_offline() -> None:
    """Test that Ollama provider cleanly reports offline status when service is down."""
    provider = OllamaProvider(base_url="http://localhost:99999", model="test-model")
    success, message, models = provider.test_connection()
    assert success is False
    assert "Cannot connect to Ollama" in message
    assert models == []


def test_ollama_provider_generate_mock() -> None:
    """Test Ollama text generation with mocked HTTP response."""
    provider = OllamaProvider(base_url="http://localhost:11434", model="llama3.2:latest")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"response": "This is an answer from Ollama."}

    with patch("httpx.Client.post", return_value=mock_response):
        answer = provider.generate(prompt="What is a Transformer?")
        assert answer == "This is an answer from Ollama."


def test_openai_provider_missing_key() -> None:
    """Test OpenAI provider behavior when API key is missing."""
    provider = OpenAIProvider(api_key="")
    success, message, _ = provider.test_connection()
    assert success is False
    assert "not configured" in message

    with pytest.raises(RuntimeError, match="API key is missing"):
        provider.generate(prompt="Hello")


def test_openai_provider_generate_mock() -> None:
    """Test OpenAI chat completion generation with mocked client."""
    provider = OpenAIProvider(api_key="sk-testkey123456789", model="gpt-4o-mini")

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "This is an answer from OpenAI."
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion

    with patch("openai.OpenAI", return_value=mock_client):
        answer = provider.generate(prompt="Explain attention mechanism.")
        assert answer == "This is an answer from OpenAI."

