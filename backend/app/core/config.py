from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    PROJECT_NAME: str = "AI Research Paper Assistant"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./storage/research.db"

    # Storage Paths
    STORAGE_DIR: Path = Path("./storage")
    MAX_UPLOAD_SIZE_MB: int = 50

    # Text Chunking
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 120

    # Embeddings
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"

    # Retrieval
    TOP_K_RETRIEVAL: int = 5

    # LLM Settings
    LLM_PROVIDER: str = "ollama"  # "ollama" or "openai"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:latest"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def documents_dir(self) -> Path:
        return self.STORAGE_DIR / "documents"

    @property
    def extracted_text_dir(self) -> Path:
        return self.STORAGE_DIR / "extracted_text"

    @property
    def vector_store_dir(self) -> Path:
        return self.STORAGE_DIR / "vector_store"

    @property
    def exports_dir(self) -> Path:
        return self.STORAGE_DIR / "exports"

    def ensure_storage_directories(self) -> None:
        """Create storage directories if they do not exist."""
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        self.extracted_text_dir.mkdir(parents=True, exist_ok=True)
        self.vector_store_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()

