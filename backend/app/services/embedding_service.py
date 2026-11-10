import logging
from typing import Any

import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Singleton-style service managing local embedding model inference using Sentence Transformers."""

    _model: Any = None
    _current_model_name: str | None = None

    @classmethod
    def get_model(cls) -> Any:
        """Lazily load and cache the SentenceTransformer model."""
        target_model = settings.EMBEDDING_MODEL

        if cls._model is None or cls._current_model_name != target_model:
            try:
                from sentence_transformers import SentenceTransformer

                logger.info(f"Loading SentenceTransformer embedding model: '{target_model}'...")
                cls._model = SentenceTransformer(target_model)
                cls._current_model_name = target_model
                logger.info(f"Model '{target_model}' successfully loaded.")
            except Exception as e:
                logger.error(f"Failed to load embedding model '{target_model}': {e}", exc_info=True)
                raise RuntimeError(
                    f"Failed to initialize embedding model '{target_model}'. "
                    f"Ensure model files or internet connection are available: {str(e)}"
                )

        return cls._model

    @classmethod
    def get_dimension(cls) -> int:
        """Return the vector dimension of the active embedding model."""
        model = cls.get_model()
        dim = model.get_sentence_embedding_dimension()
        return int(dim) if dim is not None else 384

    @classmethod
    def embed_texts(
        cls,
        texts: list[str],
        batch_size: int = 32,
        normalize: bool = True,
    ) -> np.ndarray:
        """Generate normalized dense embeddings for a batch of texts.
        Returns a 2D numpy array of shape (len(texts), embedding_dim).
        """
        if not texts:
            dim = cls.get_dimension()
            return np.empty((0, dim), dtype=np.float32)

        model = cls.get_model()
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=normalize,
            convert_to_numpy=True,
        )

        return np.asarray(embeddings, dtype=np.float32)

    @classmethod
    def embed_query(cls, query: str, normalize: bool = True) -> np.ndarray:
        """Generate normalized embedding for a single search or question string.
        Returns a 1D numpy array of shape (embedding_dim,).
        """
        if not query.strip():
            dim = cls.get_dimension()
            return np.zeros((dim,), dtype=np.float32)

        model = cls.get_model()
        embedding = model.encode(
            query,
            show_progress_bar=False,
            normalize_embeddings=normalize,
            convert_to_numpy=True,
        )

        return np.asarray(embedding, dtype=np.float32).flatten()

