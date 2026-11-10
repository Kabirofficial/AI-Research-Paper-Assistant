from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    """Schema representing application settings with masked sensitive fields."""

    project_name: str
    environment: str
    llm_provider: str = Field(..., description="'ollama' or 'openai'")
    ollama_base_url: str
    ollama_model: str
    openai_model: str
    openai_api_key_configured: bool
    openai_api_key_masked: str
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    top_k_retrieval: int
    max_upload_size_mb: int


class SettingsUpdateRequest(BaseModel):
    """Schema for updating application settings at runtime."""

    llm_provider: str | None = Field(default=None, description="Set active provider: 'ollama' or 'openai'")
    ollama_base_url: str | None = None
    ollama_model: str | None = None
    openai_model: str | None = None
    openai_api_key: str | None = Field(default=None, description="User's personal OpenAI API key")
    chunk_size: int | None = Field(default=None, ge=100, le=4000)
    chunk_overlap: int | None = Field(default=None, ge=0, le=1000)
    top_k_retrieval: int | None = Field(default=None, ge=1, le=50)


class ProviderStatusItem(BaseModel):
    """Status details for a single LLM provider."""

    provider: str
    is_available: bool
    active_model: str
    available_models: list[str] = Field(default_factory=list)
    message: str


class ProviderListResponse(BaseModel):
    """Response containing provider availability and active provider choice."""

    current_provider: str
    providers: list[ProviderStatusItem]


class TestConnectionRequest(BaseModel):
    """Request to test connection to an LLM provider."""

    provider: str | None = Field(default=None, description="Provider to test ('ollama' or 'openai'); defaults to current active provider")
    model: str | None = None
    base_url: str | None = None
    api_key: str | None = None


class TestConnectionResponse(BaseModel):
    """Result of connection verification."""

    success: bool
    provider: str
    model: str
    message: str
    latency_ms: float | None = None

