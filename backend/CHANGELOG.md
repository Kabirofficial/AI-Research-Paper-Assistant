# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-10

### Added
- **Core Architecture**:
  - FastAPI application with lifespan management and CORS middleware.
  - SQLAlchemy 2.0 ORM with SQLite backend (`storage/research.db`).
  - Pydantic Settings configuration reading from `.env`.
- **Document Management**:
  - PDF file upload with magic byte signature verification (`%PDF-`) and size limits.
  - SHA-256 duplicate detection preventing redundant uploads.
  - Page-by-page text extraction with hyphenation healing and Unicode normalization via PyMuPDF.
  - Scanned PDF detection flagging documents requiring OCR (`ocr_needed`).
  - Layout heuristics extracting titles, authors, publication years, and abstracts.
  - Document listing, details, text retrieval, original PDF download, and deletion.
- **Chunking & Embeddings**:
  - Semantic chunking respecting section headings and paragraph boundaries.
  - Sentence Transformers integration with local `BAAI/bge-small-en-v1.5` embeddings (384-d).
  - L2 vector normalization for cosine similarity search.
- **FAISS Vector Database**:
  - Persistent FAISS `IndexFlatIP` index stored locally in `storage/vector_store/index.faiss`.
  - SQLite-to-FAISS vector mapping and index synchronization on upload, reprocess, and delete.
  - Index rebuild endpoint (`POST /search/rebuild`).
- **LLM Provider Layer**:
  - Local inference via Ollama (`http://localhost:11434`).
  - Cloud inference via OpenAI API using user-provided API keys.
  - Runtime provider switching without server restarts.
  - Sensitive API key masking across all endpoints and logs.
- **Retrieval-Augmented Generation (RAG)**:
  - Grounded context synthesis with source numbering and page citations (`[Source N, Page X]`).
  - Strict academic prompt preventing hallucinations.
  - Explicit declaration when paper evidence is insufficient.
- **Interactive Chat**:
  - Persistent multi-turn conversations scoped to individual papers or the whole library.
  - Source citation tracking stored per assistant response in `message_sources`.
  - Chronological message history retrieval and conversation deletion.
- **Research Tools & Analysis Persistence**:
  - Structured paper summarization extracting objectives, methodology, architecture, datasets, results, and limitations.
  - SQLite persistence for paper summaries in `paper_summaries` table with caching and `force_refresh` capability.
  - Multi-paper comparative analysis and cross-paper research gap identification.
  - SQLite persistence for comparative analyses in `paper_comparisons` table with listing, retrieval, and deletion CRUD endpoints.
- **Reliability & Testing**:
  - Custom domain error hierarchy (`AppError`) with standardized JSON responses.
  - Structured application logging.
  - 56 automated pytest tests verifying health, document management, search, embeddings, LLM, RAG, chat, research tools, and persistence.

