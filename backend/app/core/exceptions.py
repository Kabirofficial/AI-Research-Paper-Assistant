from typing import Any


class AppError(Exception):
    """Base exception for application errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class DocumentNotFoundError(AppError):
    """Raised when a requested document ID does not exist."""

    def __init__(self, document_id: str) -> None:
        super().__init__(
            message=f"Document with ID '{document_id}' was not found.",
            code="DOCUMENT_NOT_FOUND",
            status_code=404,
            details={"document_id": document_id},
        )


class ConversationNotFoundError(AppError):
    """Raised when a requested conversation ID does not exist."""

    def __init__(self, conversation_id: str) -> None:
        super().__init__(
            message=f"Conversation with ID '{conversation_id}' was not found.",
            code="CONVERSATION_NOT_FOUND",
            status_code=404,
            details={"conversation_id": conversation_id},
        )


class DuplicateDocumentError(AppError):
    """Raised when a document with identical SHA-256 hash already exists."""

    def __init__(self, existing_document_id: str, original_filename: str) -> None:
        super().__init__(
            message=f"A document identical to '{original_filename}' already exists.",
            code="DUPLICATE_DOCUMENT",
            status_code=409,
            details={
                "existing_document_id": existing_document_id,
                "original_filename": original_filename,
            },
        )


class InvalidPDFError(AppError):
    """Raised when an uploaded file is not a valid PDF."""

    def __init__(self, filename: str, reason: str = "Invalid PDF signature.") -> None:
        super().__init__(
            message=f"File '{filename}' is not a valid PDF: {reason}",
            code="INVALID_PDF",
            status_code=400,
            details={"filename": filename, "reason": reason},
        )


class OversizedFileError(AppError):
    """Raised when an uploaded file exceeds the configured maximum size."""

    def __init__(self, filename: str, file_size_mb: float, max_mb: int) -> None:
        super().__init__(
            message=(
                f"File '{filename}' ({file_size_mb:.2f} MB) exceeds maximum "
                f"allowed size of {max_mb} MB."
            ),
            code="FILE_TOO_LARGE",
            status_code=413,
            details={"filename": filename, "file_size_mb": file_size_mb, "max_mb": max_mb},
        )


class ProviderUnavailableError(AppError):
    """Raised when the requested LLM provider or model is not reachable."""

    def __init__(self, provider: str, reason: str) -> None:
        super().__init__(
            message=f"LLM provider '{provider}' is currently unavailable: {reason}",
            code="PROVIDER_UNAVAILABLE",
            status_code=503,
            details={"provider": provider, "reason": reason},
        )

