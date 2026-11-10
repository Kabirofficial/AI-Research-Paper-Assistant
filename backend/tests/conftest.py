import hashlib
import tempfile
from collections.abc import Generator
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.services.embedding_service import EmbeddingService
from app.services.vector_store_service import VectorStoreService


class FastDeterministicEmbeddingModel:
    """Fast, deterministic pseudo-embedding model for automated testing.
    Uses token-hash projections so texts sharing words have high cosine similarity.
    """

    def __init__(self, model_name: str = "test-model") -> None:
        self.model_name = model_name

    def get_sentence_embedding_dimension(self) -> int:
        return 384

    def encode(
        self,
        sentences: list[str] | str,
        batch_size: int = 32,
        show_progress_bar: bool = False,
        normalize_embeddings: bool = True,
        convert_to_numpy: bool = True,
    ) -> np.ndarray:
        single = isinstance(sentences, str)
        text_list = [sentences] if single else sentences

        vectors = []
        for text in text_list:
            vec = np.zeros(384, dtype=np.float32)
            words = text.lower().split()
            if not words:
                vectors.append(vec)
                continue

            for word in words:
                # Deterministic dimension index from word hash
                idx = int(hashlib.md5(word.encode()).hexdigest(), 16) % 384
                vec[idx] += 1.0

            if normalize_embeddings:
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm

            vectors.append(vec)

        arr = np.array(vectors, dtype=np.float32)
        return arr[0] if single else arr


@pytest.fixture(autouse=True)
def setup_test_embeddings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure fast deterministic embeddings for all test runs."""
    model = FastDeterministicEmbeddingModel()
    monkeypatch.setattr(EmbeddingService, "_model", model)
    monkeypatch.setattr(EmbeddingService, "_current_model_name", "BAAI/bge-small-en-v1.5")


@pytest.fixture(scope="session")
def temp_dir() -> Generator[Path, None, None]:
    """Provide a temporary directory for tests and clean up afterwards."""
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp_path:
        path = Path(tmp_path)
        yield path


@pytest.fixture(scope="session")
def test_db_engine(temp_dir: Path):
    """Create a temporary SQLite engine for testing."""
    db_file = temp_dir / "test_research.db"
    test_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    yield test_engine
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture
def db_session(test_db_engine) -> Generator[Session, None, None]:
    """Provide a transactional database session for each test."""
    connection = test_db_engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection, autoflush=False, autocommit=False)
    session = session_factory()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session, temp_dir: Path) -> Generator[TestClient, None, None]:
    """Test client with overridden database dependency and isolated storage."""
    # Override get_db to return test session
    app.dependency_overrides[get_db] = lambda: db_session

    # Point storage to isolated temp directory
    original_storage = settings.STORAGE_DIR
    settings.STORAGE_DIR = temp_dir / "storage"
    settings.ensure_storage_directories()

    # Reset VectorStoreService to use the test storage directory
    VectorStoreService._index = None
    VectorStoreService._metadata = []
    VectorStoreService.initialize()

    with TestClient(app) as test_client:
        yield test_client

    # Clean up overrides
    app.dependency_overrides.clear()
    settings.STORAGE_DIR = original_storage
    VectorStoreService._index = None
    VectorStoreService._metadata = []
