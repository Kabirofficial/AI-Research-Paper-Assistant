import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PaperSummary(Base):
    """SQLAlchemy model representing a saved structured analysis/summary of a research paper."""

    __tablename__ = "paper_summaries"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    summary_type: Mapped[str] = mapped_column(String(32), default="comprehensive", nullable=False)
    short_summary: Mapped[str] = mapped_column(Text, nullable=False)
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    research_objectives: Mapped[str] = mapped_column(Text, nullable=False)
    methodology: Mapped[str] = mapped_column(Text, nullable=False)
    architecture: Mapped[str | None] = mapped_column(Text, nullable=True)
    dataset: Mapped[str | None] = mapped_column(Text, nullable=True)
    results: Mapped[str] = mapped_column(Text, nullable=False)
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)
    future_directions: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    llm_model: Mapped[str] = mapped_column(String(64), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    document = relationship("Document", back_populates="summary")


class PaperComparison(Base):
    """SQLAlchemy model representing a saved multi-paper comparative analysis."""

    __tablename__ = "paper_comparisons"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    document_ids: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-serialized list of document IDs
    problem_comparison: Mapped[str] = mapped_column(Text, nullable=False)
    methodology_comparison: Mapped[str] = mapped_column(Text, nullable=False)
    architecture_comparison: Mapped[str] = mapped_column(Text, nullable=False)
    dataset_comparison: Mapped[str] = mapped_column(Text, nullable=False)
    results_comparison: Mapped[str] = mapped_column(Text, nullable=False)
    strengths_and_weaknesses: Mapped[str] = mapped_column(Text, nullable=False)
    research_gaps: Mapped[str] = mapped_column(Text, nullable=False)
    llm_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    llm_model: Mapped[str] = mapped_column(String(64), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

