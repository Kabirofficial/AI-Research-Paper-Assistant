from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.exceptions import (
    AppError,
    DocumentNotFoundError,
    DuplicateDocumentError,
    InvalidPDFError,
    OversizedFileError,
    ProviderUnavailableError,
)
from app.core.logging import setup_logging
from app.main import app

# Add a test-only router to verify domain exception translation
error_test_router = APIRouter(prefix="/test-errors", tags=["Testing"])


@error_test_router.get("/not-found")
def raise_not_found():
    raise DocumentNotFoundError("doc-abc-123")


@error_test_router.get("/duplicate")
def raise_duplicate():
    raise DuplicateDocumentError("doc-xyz-789", "existing_paper.pdf")


@error_test_router.get("/invalid-pdf")
def raise_invalid_pdf():
    raise InvalidPDFError("bad.pdf", "Corrupted xref table.")


@error_test_router.get("/oversized")
def raise_oversized():
    raise OversizedFileError("huge.pdf", 65.5, 50)


@error_test_router.get("/provider-unavailable")
def raise_provider_unavailable():
    raise ProviderUnavailableError("ollama", "Connection refused on port 11434")


app.include_router(error_test_router)


def test_document_not_found_exception_handling(client: TestClient) -> None:
    """Test translation of DocumentNotFoundError into 404 JSON response."""
    res = client.get("/test-errors/not-found")
    assert res.status_code == 404
    data = res.json()["error"]
    assert data["code"] == "DOCUMENT_NOT_FOUND"
    assert "doc-abc-123" in data["message"]
    assert data["details"]["document_id"] == "doc-abc-123"


def test_duplicate_document_exception_handling(client: TestClient) -> None:
    """Test translation of DuplicateDocumentError into 409 JSON response."""
    res = client.get("/test-errors/duplicate")
    assert res.status_code == 409
    data = res.json()["error"]
    assert data["code"] == "DUPLICATE_DOCUMENT"
    assert "existing_paper.pdf" in data["message"]
    assert data["details"]["existing_document_id"] == "doc-xyz-789"


def test_invalid_pdf_exception_handling(client: TestClient) -> None:
    """Test translation of InvalidPDFError into 400 JSON response."""
    res = client.get("/test-errors/invalid-pdf")
    assert res.status_code == 400
    data = res.json()["error"]
    assert data["code"] == "INVALID_PDF"
    assert "Corrupted xref table" in data["message"]


def test_oversized_file_exception_handling(client: TestClient) -> None:
    """Test translation of OversizedFileError into 413 JSON response."""
    res = client.get("/test-errors/oversized")
    assert res.status_code == 413
    data = res.json()["error"]
    assert data["code"] == "FILE_TOO_LARGE"
    assert "65.50 MB" in data["message"]


def test_provider_unavailable_exception_handling(client: TestClient) -> None:
    """Test translation of ProviderUnavailableError into 503 JSON response."""
    res = client.get("/test-errors/provider-unavailable")
    assert res.status_code == 503
    data = res.json()["error"]
    assert data["code"] == "PROVIDER_UNAVAILABLE"
    assert "ollama" in data["message"]


def test_secret_sanitization_in_responses(client: TestClient) -> None:
    """Verify that sensitive API keys are never included in application responses."""
    settings.OPENAI_API_KEY = "sk-sensitive-api-token-value-9999"
    res = client.get("/settings/")
    assert res.status_code == 200
    assert "sk-sensitive-api-token-value-9999" not in res.text
    assert "sk-...9999" in res.text


def test_logging_configuration() -> None:
    """Verify setup_logging configures root logger without error."""
    setup_logging()
