from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PaperSummaryRequest(BaseModel):
    """Request schema for generating or retrieving paper summaries."""

    summary_type: str = Field(
        default="comprehensive",
        description="Type of summary: 'brief', 'detailed', or 'comprehensive'",
    )
    force_refresh: bool = Field(
        default=False,
        description="If True, re-run LLM generation even if a saved summary already exists",
    )


class PaperSummaryResponse(BaseModel):
    """Structured research breakdown of an academic paper."""
    model_config = ConfigDict(from_attributes=True)

    id: str | None = None
    document_id: str
    title: str
    summary_type: str = "comprehensive"
    short_summary: str = Field(..., description="High-level 1-2 paragraph summary")
    problem_statement: str = Field(..., description="Core problem or research question addressed")
    research_objectives: str = Field(..., description="Primary contributions and objectives")
    methodology: str = Field(..., description="Methodological framework and approach")
    architecture: str | None = Field(default=None, description="Model architecture or system design")
    dataset: str | None = Field(default=None, description="Datasets, benchmarks, or experimental corpora used")
    results: str = Field(..., description="Key quantitative and qualitative results")
    limitations: str | None = Field(default=None, description="Limitations acknowledged by the authors")
    future_directions: str | None = Field(default=None, description="Suggested future research avenues")
    llm_provider: str
    llm_model: str
    is_cached: bool = Field(default=False, description="True if retrieved from database cache")
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaperCompareRequest(BaseModel):
    """Request schema for comparing multiple research papers."""

    document_ids: list[str] = Field(
        ...,
        min_length=2,
        max_length=10,
        description="List of 2 to 10 document IDs to compare",
    )
    title: str | None = Field(
        default=None,
        description="Optional title for this comparison (e.g. 'Transformer vs ResNet')",
    )


class ComparedPaperItem(BaseModel):
    """Metadata summary of a paper included in comparison."""
    model_config = ConfigDict(from_attributes=True)

    document_id: str
    title: str
    authors: str | None = None
    publication_year: int | None = None


class PaperCompareResponse(BaseModel):
    """Structured comparison across multiple research papers."""
    model_config = ConfigDict(from_attributes=True)

    id: str | None = None
    title: str
    compared_papers: list[ComparedPaperItem]
    problem_comparison: str = Field(..., description="Comparison of problems addressed across papers")
    methodology_comparison: str = Field(..., description="Differences in methodologies, techniques, or algorithms")
    architecture_comparison: str = Field(..., description="Differences in architectures or system structures")
    dataset_comparison: str = Field(..., description="Evaluation benchmarks, metrics, and dataset differences")
    results_comparison: str = Field(..., description="Comparison of reported findings and performance")
    strengths_and_weaknesses: str = Field(..., description="Relative trade-offs, advantages, and shortcomings")
    research_gaps: str = Field(..., description="Collective research gaps and future opportunities identified")
    llm_provider: str
    llm_model: str
    created_at: datetime | None = None


class PaperComparisonListItem(BaseModel):
    """Summary item for listing saved comparisons."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    document_count: int
    llm_provider: str
    llm_model: str
    created_at: datetime


class PaperComparisonListResponse(BaseModel):
    """List response for saved comparisons."""

    total: int
    comparisons: list[PaperComparisonListItem]
