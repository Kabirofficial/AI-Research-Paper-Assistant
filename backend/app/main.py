import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.routers.chat import router as chat_router
from app.routers.documents import router as documents_router
from app.routers.papers import router as papers_router
from app.routers.search import router as search_router
from app.routers.settings import router as settings_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle events."""
    # Initialize structured logging
    setup_logging()

    # Ensure local storage directories exist
    settings.ensure_storage_directories()

    # Create tables if they do not exist
    Base.metadata.create_all(bind=engine)

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Local-first AI Assistant for Academic Research Papers",
    version="0.1.0",
    lifespan=lifespan,
    debug=settings.DEBUG,
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(documents_router)
app.include_router(search_router)
app.include_router(settings_router)
app.include_router(chat_router)
app.include_router(papers_router)


# Global Exception Handlers
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Format domain-specific application errors into clean structured JSON responses."""
    logger.warning(f"Domain error [{exc.code}] on {request.method} {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.get("/", tags=["General"])
def root() -> dict[str, Any]:
    """Root endpoint returning basic service information."""
    return {
        "name": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "online",
        "docs_url": "/docs",
    }


@app.get("/health", tags=["General"], status_code=status.HTTP_200_OK)
def health(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Health check verifying database connection and storage availability."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    storage_status = "available" if settings.STORAGE_DIR.exists() else "missing"

    return {
        "status": "ok" if db_status == "healthy" and storage_status == "available" else "degraded",
        "database": db_status,
        "storage": storage_status,
        "environment": settings.ENVIRONMENT,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL,
    }

