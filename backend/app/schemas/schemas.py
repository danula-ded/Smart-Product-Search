"""API schemas for upload-driven search MVP."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str
    version: str


class ProductAttributeSchema(BaseModel):
    name: str
    value: str
    numeric_value: float | None = Field(default=None, alias="numericValue")

    model_config = ConfigDict(populate_by_name=True)


class ProductSchema(BaseModel):
    id: str
    title: str
    category: str
    brand_guess: str | None = Field(default=None, alias="brandGuess")
    model_guess: str | None = Field(default=None, alias="modelGuess")
    attributes_raw: str = Field(alias="attributesRaw")
    attributes: list[ProductAttributeSchema] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class SearchRequestSchema(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    customer_id: str | None = Field(default=None, alias="customerId")
    session_id: str | None = Field(default=None, alias="sessionId")
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    include_debug: bool = Field(default=False, alias="includeDebug")
    filters: dict[str, list[str]] | None = None

    model_config = ConfigDict(populate_by_name=True)


class ScoreFactorSchema(BaseModel):
    type: str
    value: float
    reason: str


class SearchResultSchema(BaseModel):
    product: ProductSchema
    score: float
    explanation: str
    score_breakdown: list[ScoreFactorSchema] | None = Field(
        default=None, alias="scoreBreakdown"
    )
    corrections: list[dict[str, Any]] | None = None

    model_config = ConfigDict(populate_by_name=True)


class ProfileSummarySchema(BaseModel):
    customer_id: str = Field(alias="customerId")
    customer_name: str = Field(alias="customerName")
    purchase_count: int = Field(alias="purchaseCount")
    matched_purchase_count: int = Field(alias="matchedPurchaseCount")
    total_spend: float = Field(alias="totalSpend")
    last_purchase_at: str | None = Field(default=None, alias="lastPurchaseAt")
    top_categories: list[dict[str, Any]] = Field(alias="topCategories")
    top_products: list[dict[str, Any]] = Field(alias="topProducts")

    model_config = ConfigDict(populate_by_name=True)


class QueryInterpretationSchema(BaseModel):
    corrected_tokens: list[str] = Field(alias="correctedTokens")
    retrieval_tokens: list[str] = Field(alias="retrievalTokens")
    layout_corrections: list[dict[str, Any]] = Field(alias="layoutCorrections")
    typo_corrections: list[dict[str, Any]] = Field(alias="typoCorrections")
    synonym_mappings: list[dict[str, Any]] = Field(alias="synonymMappings")

    model_config = ConfigDict(populate_by_name=True)


class SearchResponseSchema(BaseModel):
    query: str
    normalized_query: str = Field(alias="normalizedQuery")
    corrected_query: str = Field(alias="correctedQuery")
    applied_synonyms: list[str] = Field(alias="appliedSynonyms")
    search_terms_used: list[str] = Field(alias="searchTermsUsed")
    query_interpretation: QueryInterpretationSchema = Field(alias="queryInterpretation")
    parser_source: str = Field(alias="parserSource")
    profile_summary: ProfileSummarySchema | None = Field(
        default=None, alias="profileSummary"
    )
    results: list[SearchResultSchema]
    facets: dict[str, Any] = Field(default_factory=dict)
    applied_filters: dict[str, list[str]] = Field(default_factory=dict, alias="appliedFilters")
    total_count: int = Field(alias="totalCount")
    limit: int
    offset: int
    timings_ms: dict[str, int] = Field(alias="timingsMs")

    model_config = ConfigDict(populate_by_name=True)


class SearchAnalysisResponseSchema(BaseModel):
    query: str
    normalized_query: str = Field(alias="normalizedQuery")
    corrected_query: str = Field(alias="correctedQuery")
    applied_synonyms: list[str] = Field(alias="appliedSynonyms")
    search_terms_used: list[str] = Field(alias="searchTermsUsed")
    query_interpretation: QueryInterpretationSchema = Field(alias="queryInterpretation")
    parser_source: str = Field(alias="parserSource")

    model_config = ConfigDict(populate_by_name=True)


class EventRequestSchema(BaseModel):
    session_id: str | None = Field(default=None, alias="sessionId")
    customer_id: str | None = Field(default=None, alias="customerId")
    event_type: str = Field(alias="eventType")
    product_id: str | None = Field(default=None, alias="productId")
    query: str | None = None
    position: int | None = None
    dwell_ms: int | None = Field(default=None, alias="dwellMs")
    note: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class EventResponseSchema(BaseModel):
    success: bool
    event_id: str = Field(alias="eventId")

    model_config = ConfigDict(populate_by_name=True)


class DatasetUploadResponseSchema(BaseModel):
    job_id: str = Field(alias="jobId")

    model_config = ConfigDict(populate_by_name=True)


class DatasetActionResponseSchema(BaseModel):
    success: bool
    message: str | None = None
    job_id: str | None = Field(default=None, alias="jobId")

    model_config = ConfigDict(populate_by_name=True)


class DatasetJobSchema(BaseModel):
    job_id: str = Field(alias="jobId")
    status: str
    mode: str
    created_at: str = Field(alias="createdAt")
    started_at: str | None = Field(default=None, alias="startedAt")
    finished_at: str | None = Field(default=None, alias="finishedAt")
    progress: float
    warnings: list[str]
    errors: list[str]
    stats: dict[str, Any]

    model_config = ConfigDict(populate_by_name=True)


class DatasetSummarySchema(BaseModel):
    counts: dict[str, int]
    active_index: dict[str, Any] = Field(alias="activeIndex")
    imports: list[DatasetJobSchema]

    model_config = ConfigDict(populate_by_name=True)


class DemoProfileSchema(BaseModel):
    customer_id: str = Field(alias="customerId")
    label: str
    summary: dict[str, Any]

    model_config = ConfigDict(populate_by_name=True)


class MetricsSummarySchema(BaseModel):
    dataset: dict[str, Any]
    baseline: dict[str, float]
    personalized: dict[str, float]


class SavedResultRequestSchema(BaseModel):
    user_id: str = Field(alias="userId")
    product_id: str = Field(alias="productId")
    note: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class SavedResultResponseSchema(BaseModel):
    success: bool
    saved_result: dict[str, Any] | None = Field(default=None, alias="savedResult")

    model_config = ConfigDict(populate_by_name=True)


class SavedResultsListResponseSchema(BaseModel):
    results: list[dict[str, Any]]
    total_count: int = Field(alias="totalCount")

    model_config = ConfigDict(populate_by_name=True)


class FeedbackRequestSchema(BaseModel):
    user_id: str = Field(alias="userId")
    product_id: str = Field(alias="productId")
    is_relevant: bool | None = Field(default=None, alias="isRelevant")
    comment: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class FeedbackResponseSchema(BaseModel):
    success: bool
    feedback_id: str | None = Field(default=None, alias="feedbackId")

    model_config = ConfigDict(populate_by_name=True)


class ErrorResponseSchema(BaseModel):
    detail: str
