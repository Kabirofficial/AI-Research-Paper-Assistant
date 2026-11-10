import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.schemas.settings import (
    ProviderListResponse,
    ProviderStatusItem,
    SettingsResponse,
    SettingsUpdateRequest,
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.services.llm_service import LLMService, mask_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


def _build_settings_response() -> SettingsResponse:
    """Helper to assemble the current settings representation with masked secrets."""
    return SettingsResponse(
        project_name=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
        llm_provider=settings.LLM_PROVIDER,
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_model=settings.OLLAMA_MODEL,
        openai_model=settings.OPENAI_MODEL,
        openai_api_key_configured=bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip()),
        openai_api_key_masked=mask_api_key(settings.OPENAI_API_KEY),
        embedding_model=settings.EMBEDDING_MODEL,
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        top_k_retrieval=settings.TOP_K_RETRIEVAL,
        max_upload_size_mb=settings.MAX_UPLOAD_SIZE_MB,
    )


@router.get(
    "/",
    response_model=SettingsResponse,
    summary="Get current application configuration",
)
def get_settings() -> SettingsResponse:
    """Retrieve runtime settings. Sensitive credentials such as API keys are masked."""
    return _build_settings_response()


@router.put(
    "/",
    response_model=SettingsResponse,
    summary="Update application configuration at runtime",
)
def update_settings(update_data: SettingsUpdateRequest) -> SettingsResponse:
    """Update runtime settings without modifying code or restarting the server."""
    if update_data.llm_provider is not None:
        target = update_data.llm_provider.lower().strip()
        if target not in ["ollama", "openai"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider '{target}'. Supported providers: 'ollama', 'openai'.",
            )
        settings.LLM_PROVIDER = target

    if update_data.ollama_base_url is not None:
        settings.OLLAMA_BASE_URL = update_data.ollama_base_url.strip()

    if update_data.ollama_model is not None:
        settings.OLLAMA_MODEL = update_data.ollama_model.strip()

    if update_data.openai_model is not None:
        settings.OPENAI_MODEL = update_data.openai_model.strip()

    if update_data.openai_api_key is not None:
        settings.OPENAI_API_KEY = update_data.openai_api_key.strip()

    if update_data.chunk_size is not None:
        settings.CHUNK_SIZE = update_data.chunk_size

    if update_data.chunk_overlap is not None:
        settings.CHUNK_OVERLAP = update_data.chunk_overlap

    if update_data.top_k_retrieval is not None:
        settings.TOP_K_RETRIEVAL = update_data.top_k_retrieval

    logger.info("Application settings updated successfully.")
    return _build_settings_response()


@router.get(
    "/providers",
    response_model=ProviderListResponse,
    summary="Get available LLM providers and connection status",
)
def get_providers() -> ProviderListResponse:
    """Check connectivity and available models for both Ollama and OpenAI."""
    statuses = LLMService.check_all_providers()
    return ProviderListResponse(
        current_provider=settings.LLM_PROVIDER,
        providers=[ProviderStatusItem(**s) for s in statuses],
    )


@router.post(
    "/test-connection",
    response_model=TestConnectionResponse,
    summary="Test connectivity to an LLM provider",
)
def test_connection(request: TestConnectionRequest) -> TestConnectionResponse:
    """Verify provider connectivity and active model availability."""
    target_provider = request.provider or settings.LLM_PROVIDER
    if target_provider.lower().strip() not in ["ollama", "openai"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider '{target_provider}'. Supported: 'ollama', 'openai'.",
        )

    res = LLMService.test_provider_connection(
        provider_name=request.provider,
        model=request.model,
        base_url=request.base_url,
        api_key=request.api_key,
    )

    return TestConnectionResponse(
        success=res["success"],
        provider=res["provider"],
        model=res["model"],
        message=res["message"],
        latency_ms=res.get("latency_ms"),
    )

