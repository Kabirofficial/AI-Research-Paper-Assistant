import numpy as np
import pytest

from app.services.embedding_service import EmbeddingService


class DummySentenceTransformer:
    """Mock SentenceTransformer for fast, offline unit testing."""

    def __init__(self, model_name: str = "dummy-model"):
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
        if isinstance(sentences, str):
            sentences = [sentences]

        count = len(sentences)
        # Create deterministic pseudo-embeddings based on text length
        vectors = []
        for s in sentences:
            val = len(s) % 10 + 1.0
            vec = np.full((384,), fill_value=val, dtype=np.float32)
            if normalize_embeddings:
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
            vectors.append(vec)

        res = np.array(vectors, dtype=np.float32)
        if count == 1 and not isinstance(sentences, list):
            return res[0]
        return res


@pytest.fixture(autouse=True)
def mock_embedding_model(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock the SentenceTransformer instance for fast, network-free tests."""
    dummy = DummySentenceTransformer()
    monkeypatch.setattr(EmbeddingService, "_model", dummy)
    monkeypatch.setattr(EmbeddingService, "_current_model_name", "BAAI/bge-small-en-v1.5")


def test_embedding_dimension() -> None:
    """Test getting embedding dimension."""
    dim = EmbeddingService.get_dimension()
    assert dim == 384


def test_embed_texts_batch() -> None:
    """Test batch embedding generation and L2 normalization."""
    texts = [
        "First research paper snippet about attention mechanisms.",
        "Second snippet discussing convolution neural networks.",
        "Third snippet evaluating BLEU scores on WMT14.",
    ]
    embeddings = EmbeddingService.embed_texts(texts, batch_size=2, normalize=True)

    assert isinstance(embeddings, np.ndarray)
    assert embeddings.shape == (3, 384)

    # Verify L2 normalization: Euclidean norm of each vector should be approximately 1.0
    for vec in embeddings:
        norm = np.linalg.norm(vec)
        assert np.isclose(norm, 1.0, atol=1e-5)


def test_embed_query() -> None:
    """Test single query embedding generation."""
    query = "What is the key contribution of the Transformer?"
    vec = EmbeddingService.embed_query(query, normalize=True)

    assert isinstance(vec, np.ndarray)
    assert vec.shape == (384,)
    assert np.isclose(np.linalg.norm(vec), 1.0, atol=1e-5)


def test_embed_empty_texts() -> None:
    """Test handling of empty text lists and empty query strings."""
    empty_batch = EmbeddingService.embed_texts([])
    assert empty_batch.shape == (0, 384)

    empty_query_vec = EmbeddingService.embed_query("")
    assert empty_query_vec.shape == (384,)
    assert np.all(empty_query_vec == 0.0)

