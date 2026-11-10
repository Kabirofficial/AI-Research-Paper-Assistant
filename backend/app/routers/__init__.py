"""API routers."""

from app.routers.chat import router as chat_router
from app.routers.documents import router as documents_router
from app.routers.papers import router as papers_router
from app.routers.search import router as search_router
from app.routers.settings import router as settings_router

__all__ = [
    "documents_router",
    "search_router",
    "settings_router",
    "chat_router",
    "papers_router",
]
