import logging
import time
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def mask_api_key(key: str | None) -> str:
    """Mask sensitive API keys for safe presentation in logs and API responses."""
    if not key or not key.strip():
        return ""
    clean = key.strip()
    if len(clean) <= 8:
        return "********"
    return f"{clean[:3]}...{clean[-4:]}"


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        response_format: str | None = None,
    ) -> str:
        """Generate a completion for the provided prompt."""
        pass

    @abstractmethod
    def test_connection(self) -> tuple[bool, str, list[str]]:
        """Test connection to the provider and return (success, message, available_models)."""
        pass


class OllamaProvider(BaseLLMProvider):
    """Local inference provider via Ollama."""

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    def test_connection(self) -> tuple[bool, str, list[str]]:
        """Verify Ollama is reachable and query installed models."""
        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(f"{self.base_url}/api/tags")

            if res.status_code != 200:
                return (
                    False,
                    f"Ollama returned HTTP status {res.status_code}: {res.text}",
                    [],
                )

            data = res.json()
            models = [m.get("name", "") for m in data.get("models", [])]

            # Check if active model exists
            model_found = any(
                m == self.model or m.startswith(f"{self.model}:") or self.model.startswith(f"{m}:")
                for m in models
            )

            if not model_found and models:
                return (
                    True,
                    f"Connected to Ollama, but configured model '{self.model}' was not found. "
                    f"Available models: {', '.join(models)}. Run 'ollama pull {self.model}' to download it.",
                    models,
                )

            if not models:
                return (
                    True,
                    "Connected to Ollama, but no models are currently installed. "
                    f"Run 'ollama pull {self.model}' in your terminal.",
                    [],
                )

            return (
                True,
                f"Successfully connected to Ollama. Model '{self.model}' is ready.",
                models,
            )

        except (httpx.ConnectError, httpx.TimeoutException) as e:
            return (
                False,
                f"Cannot connect to Ollama at {self.base_url}. Ensure the Ollama service is running.",
                [],
            )
        except Exception as e:
            return False, f"Ollama connection error: {str(e)}", []

    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        response_format: str | None = None,
    ) -> str:
        """Call Ollama /api/generate endpoint."""
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if response_format == "json":
            payload["format"] = "json"
        if system_prompt:
            payload["system"] = system_prompt

        try:
            with httpx.Client(timeout=120.0) as client:
                res = client.post(f"{self.base_url}/api/generate", json=payload)

            if res.status_code != 200:
                raise RuntimeError(
                    f"Ollama inference failed with status {res.status_code}: {res.text}"
                )

            data = res.json()
            return data.get("response", "").strip()

        except httpx.ConnectError:
            raise RuntimeError(
                f"Cannot connect to Ollama at {self.base_url}. Ensure the Ollama application is running."
            )
        except httpx.TimeoutException:
            raise RuntimeError(
                f"Ollama request timed out after 120 seconds while generating response."
            )
        except Exception as e:
            raise RuntimeError(f"Ollama inference error: {str(e)}")


class OpenAIProvider(BaseLLMProvider):
    """Cloud inference provider via OpenAI API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL

    def test_connection(self) -> tuple[bool, str, list[str]]:
        """Verify OpenAI credentials and list available models."""
        if not self.api_key or not self.api_key.strip():
            return (
                False,
                "OpenAI API key is not configured. Please supply an API key in settings.",
                [],
            )

        try:
            from openai import OpenAI, AuthenticationError, APIConnectionError

            client = OpenAI(api_key=self.api_key.strip(), timeout=10.0)
            models_page = client.models.list()
            model_ids = [m.id for m in models_page.data if "gpt" in m.id]

            return (
                True,
                f"Successfully connected to OpenAI. Model '{self.model}' is configured.",
                model_ids[:15],
            )
        except Exception as e:
            logger.warning(f"OpenAI connection test failed: {e}")
            return False, f"OpenAI connection error: {str(e)}", []

    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        response_format: str | None = None,
    ) -> str:
        """Call OpenAI chat completions API."""
        if not self.api_key or not self.api_key.strip():
            raise RuntimeError(
                "OpenAI API key is missing. Please configure OPENAI_API_KEY in settings."
            )

        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key.strip(), timeout=90.0)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            kwargs: dict[str, Any] = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if response_format == "json":
                kwargs["response_format"] = {"type": "json_object"}

            completion = client.chat.completions.create(**kwargs)

            choice = completion.choices[0]
            return choice.message.content or ""

        except Exception as e:
            raise RuntimeError(f"OpenAI generation error: {str(e)}")


class LLMService:
    """Service managing active LLM provider selection and completions."""

    @classmethod
    def get_provider(
        cls,
        provider_name: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
    ) -> BaseLLMProvider:
        """Instantiate the requested or active provider."""
        target_provider = (provider_name or settings.LLM_PROVIDER).lower().strip()

        if target_provider == "openai":
            return OpenAIProvider(api_key=api_key, model=model)
        elif target_provider == "ollama":
            return OllamaProvider(base_url=base_url, model=model)
        else:
            raise ValueError(
                f"Unsupported LLM provider: '{target_provider}'. Supported options: 'ollama', 'openai'."
            )

    @classmethod
    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
        response_format: str | None = None,
    ) -> str:
        """Generate completion using the currently active provider."""
        provider = self.get_provider()
        return provider.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )

    @classmethod
    def test_provider_connection(
        cls,
        provider_name: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
    ) -> dict[str, Any]:
        """Test connection to the specified or active provider and measure round-trip latency."""
        target_provider = (provider_name or settings.LLM_PROVIDER).lower().strip()
        provider = cls.get_provider(
            provider_name=target_provider,
            model=model,
            base_url=base_url,
            api_key=api_key,
        )

        target_model = model or (
            settings.OPENAI_MODEL if target_provider == "openai" else settings.OLLAMA_MODEL
        )

        start_time = time.perf_counter()
        success, message, models = provider.test_connection()
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "success": success,
            "provider": target_provider,
            "model": target_model,
            "message": message,
            "latency_ms": latency_ms,
            "available_models": models,
        }

    @classmethod
    def check_all_providers(cls) -> list[dict[str, Any]]:
        """Check status of both Ollama and OpenAI providers."""
        results = []

        # Ollama check
        ollama_provider = OllamaProvider()
        ol_success, ol_msg, ol_models = ollama_provider.test_connection()
        results.append({
            "provider": "ollama",
            "is_available": ol_success,
            "active_model": settings.OLLAMA_MODEL,
            "available_models": ol_models,
            "message": ol_msg,
        })

        # OpenAI check
        openai_provider = OpenAIProvider()
        oa_success, oa_msg, oa_models = openai_provider.test_connection()
        results.append({
            "provider": "openai",
            "is_available": oa_success,
            "active_model": settings.OPENAI_MODEL,
            "available_models": oa_models,
            "message": oa_msg,
        })

        return results

