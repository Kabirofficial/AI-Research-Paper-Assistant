"""Core application settings, database, exceptions, and logging."""

from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.core.exceptions import (
    AppError,
    ConversationNotFoundError,
    DocumentNotFoundError,
    DuplicateDocumentError,
    InvalidPDFError,
    OversizedFileError,
    ProviderUnavailableError,
)
from app.core.logging import setup_logging

__all__ = [
    "settings",
    "Base",
    "engine",
    "get_db",
    "setup_logging",
    "AppError",
    "DocumentNotFoundError",
    "ConversationNotFoundError",
    "DuplicateDocumentError",
    "InvalidPDFError",
    "OversizedFileError",
    "ProviderUnavailableError",
]
