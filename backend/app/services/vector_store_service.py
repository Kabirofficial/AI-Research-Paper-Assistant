import json
import logging
import threading
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service managing a persistent local FAISS vector index with metadata mapping."""

    _lock = threading.Lock()
    _index: faiss.Index | None = None
    _metadata: list[dict[str, str]] = []  # List of {"chunk_id": str, "document_id": str}
    _dimension: int = 384

    @classmethod
    def _index_path(cls) -> Path:
        return settings.vector_store_dir / "index.faiss"

    @classmethod
    def _metadata_path(cls) -> Path:
        return settings.vector_store_dir / "metadata.json"

    @classmethod
    def initialize(cls) -> None:
        """Load persistent index from disk if it exists, or create an empty index."""
        with cls._lock:
            cls._ensure_initialized()

    @classmethod
    def _ensure_initialized(cls) -> None:
        """Internal helper to initialize FAISS index without re-acquiring lock."""
        if cls._index is not None:
            return

        settings.ensure_storage_directories()
        index_file = cls._index_path()
        meta_file = cls._metadata_path()

        # Get embedding dimension from EmbeddingService
        try:
            cls._dimension = EmbeddingService.get_dimension()
        except Exception:
            cls._dimension = 384

        if index_file.exists() and meta_file.exists():
            try:
                logger.info(f"Loading existing FAISS index from '{index_file}'...")
                cls._index = faiss.read_index(str(index_file))
                cls._metadata = json.loads(meta_file.read_text(encoding="utf-8")).get("mapping", [])
                logger.info(
                    f"FAISS index loaded successfully with {cls._index.ntotal} vectors "
                    f"and {len(cls._metadata)} metadata entries."
                )
                return
            except Exception as e:
                logger.warning(f"Failed to load existing FAISS index: {e}. Creating new index.")

        # Create empty IndexFlatIP (Inner Product = Cosine Similarity with normalized vectors)
        cls._index = faiss.IndexFlatIP(cls._dimension)
        cls._metadata = []
        cls._save_unlocked()

    @classmethod
    def _save_unlocked(cls) -> None:
        """Persist index and metadata to disk (assumes lock is already held)."""
        if cls._index is None:
            return

        settings.ensure_storage_directories()
        faiss.write_index(cls._index, str(cls._index_path()))
        cls._metadata_path().write_text(
            json.dumps({"mapping": cls._metadata}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    @classmethod
    def add_chunks(
        cls,
        chunks: list[Chunk],
        embeddings: np.ndarray,
    ) -> None:
        """Add a batch of chunks and their corresponding embeddings to FAISS."""
        if not chunks or len(embeddings) == 0:
            return

        with cls._lock:
            cls._ensure_initialized()

            if cls._index is None:
                raise RuntimeError("FAISS index is not initialized.")

            vectors = np.asarray(embeddings, dtype=np.float32)
            if vectors.ndim == 1:
                vectors = vectors.reshape(1, -1)

            # Add to FAISS index
            cls._index.add(vectors)

            # Append to metadata mapping
            for chunk in chunks:
                cls._metadata.append({
                    "chunk_id": chunk.id,
                    "document_id": chunk.document_id,
                })

            cls._save_unlocked()

    @classmethod
    def search(
        cls,
        query_vector: np.ndarray,
        top_k: int = 5,
        document_id: str | None = None,
        document_ids: list[str] | None = None,
        min_score: float = 0.0,
    ) -> list[dict[str, Any]]:
        """Search the FAISS index for the most similar chunks.
        Returns a list of dicts: {"chunk_id": str, "score": float}
        """
        with cls._lock:
            cls._ensure_initialized()

            if cls._index is None or cls._index.ntotal == 0 or len(cls._metadata) == 0:
                return []

            vec = np.asarray(query_vector, dtype=np.float32)
            if vec.ndim == 1:
                vec = vec.reshape(1, -1)

            # Normalize query vector if not already normalized
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm

            # Fetch extra candidates if document filtering is active
            filter_active = bool(document_id or document_ids)
            allowed_doc_ids: set[str] | None = None
            if document_id:
                allowed_doc_ids = {document_id}
            elif document_ids:
                allowed_doc_ids = set(document_ids)

            fetch_k = min(cls._index.ntotal, top_k * 5 if filter_active else top_k)

            distances, indices = cls._index.search(vec, fetch_k)

            results: list[dict[str, Any]] = []
            flat_indices = indices[0]
            flat_scores = distances[0]

            for idx, score in zip(flat_indices, flat_scores):
                if idx < 0 or idx >= len(cls._metadata):
                    continue

                sim_score = float(score)
                if sim_score < min_score:
                    continue

                meta = cls._metadata[idx]
                doc_id = meta["document_id"]

                if allowed_doc_ids is not None and doc_id not in allowed_doc_ids:
                    continue

                results.append({
                    "chunk_id": meta["chunk_id"],
                    "document_id": doc_id,
                    "score": sim_score,
                })

                if len(results) >= top_k:
                    break

            return results

    @classmethod
    def remove_document(cls, document_id: str, db: Session) -> None:
        """Remove a document from the vector index by rebuilding remaining chunks."""
        with cls._lock:
            cls._rebuild_unlocked(db)

    @classmethod
    def rebuild_index(cls, db: Session) -> int:
        """Rebuild the entire FAISS index from active SQLite chunks."""
        with cls._lock:
            return cls._rebuild_unlocked(db)

    @classmethod
    def _rebuild_unlocked(cls, db: Session) -> int:
        """Internal helper to rebuild the FAISS index from SQLite (lock already held)."""
        logger.info("Rebuilding FAISS index from database chunks...")
        cls._dimension = EmbeddingService.get_dimension()
        cls._index = faiss.IndexFlatIP(cls._dimension)
        cls._metadata = []

        # Retrieve all chunks ordered by document and index
        chunks = db.execute(
            select(Chunk).order_by(Chunk.document_id, Chunk.chunk_index)
        ).scalars().all()

        if not chunks:
            cls._save_unlocked()
            logger.info("No chunks in database. Created empty FAISS index.")
            return 0

        # Batch embed all chunk texts
        chunk_texts = [c.text for c in chunks]
        embeddings = EmbeddingService.embed_texts(chunk_texts, batch_size=32, normalize=True)

        cls._index.add(embeddings)
        for chunk in chunks:
            cls._metadata.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
            })

        cls._save_unlocked()
        logger.info(f"Rebuilt FAISS index with {cls._index.ntotal} vectors.")
        return cls._index.ntotal

    @classmethod
    def get_status(cls) -> dict[str, Any]:
        """Return status and health metrics of the vector index."""
        with cls._lock:
            cls._ensure_initialized()
            index_path = cls._index_path()
            exists = index_path.exists()
            size = index_path.stat().st_size if exists else 0
            ntotal = cls._index.ntotal if cls._index is not None else 0
            dim = cls._dimension

            is_healthy = exists and (ntotal == len(cls._metadata))

            return {
                "total_vectors": ntotal,
                "dimension": dim,
                "index_file_exists": exists,
                "index_file_size_bytes": size,
                "is_healthy": is_healthy,
            }

