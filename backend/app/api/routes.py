"""FastAPI routes for upload-driven smart product search."""

from __future__ import annotations

from fastapi import APIRouter, Body, File, Form, HTTPException, Request, UploadFile

from app.config import settings
from app.schemas import (
    DatasetActionResponseSchema,
    DatasetJobSchema,
    DatasetSummarySchema,
    DatasetUploadResponseSchema,
    DemoProfileSchema,
    EventRequestSchema,
    EventResponseSchema,
    FeedbackRequestSchema,
    FeedbackResponseSchema,
    HealthResponse,
    MetricsSummarySchema,
    ProductSchema,
    SavedResultRequestSchema,
    SavedResultResponseSchema,
    SavedResultsListResponseSchema,
    SearchAnalysisResponseSchema,
    SearchRequestSchema,
    SearchResponseSchema,
)

router = APIRouter()


def get_runtime(request: Request):
    return request.app.state.runtime


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    return HealthResponse(status="healthy", version=settings.API_VERSION)


@router.post(
    "/datasets/upload",
    response_model=DatasetUploadResponseSchema,
    tags=["Datasets"],
)
async def upload_datasets(
    request: Request,
    mode: str = Form(...),
    ste_file: UploadFile | None = File(default=None),
    contracts_file: UploadFile | None = File(default=None),
) -> DatasetUploadResponseSchema:
    runtime = get_runtime(request)
    job_id = runtime.datasets.submit_upload(mode, ste_file, contracts_file)
    return DatasetUploadResponseSchema(jobId=job_id)


@router.post(
    "/datasets/bootstrap-default",
    response_model=DatasetActionResponseSchema,
    tags=["Datasets"],
)
async def bootstrap_default_dataset(request: Request) -> DatasetActionResponseSchema:
    runtime = get_runtime(request)
    job_id = runtime.datasets.submit_default_import()
    return DatasetActionResponseSchema(
        success=True,
        message="Default dataset import started.",
        jobId=job_id,
    )


@router.post(
    "/datasets/clear",
    response_model=DatasetActionResponseSchema,
    tags=["Datasets"],
)
async def clear_dataset(request: Request) -> DatasetActionResponseSchema:
    runtime = get_runtime(request)
    result = runtime.datasets.clear_database()
    return DatasetActionResponseSchema(
        success=result["success"],
        message="Current database cleared.",
    )


@router.get(
    "/datasets/jobs/{job_id}",
    response_model=DatasetJobSchema,
    tags=["Datasets"],
)
async def get_dataset_job(request: Request, job_id: str) -> DatasetJobSchema:
    runtime = get_runtime(request)
    job = runtime.datasets.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Dataset job not found.")
    return DatasetJobSchema(**job)


@router.get(
    "/datasets/summary",
    response_model=DatasetSummarySchema,
    tags=["Datasets"],
)
async def get_dataset_summary(request: Request) -> DatasetSummarySchema:
    runtime = get_runtime(request)
    return DatasetSummarySchema(**runtime.datasets.get_summary())


@router.post("/search", response_model=SearchResponseSchema, tags=["Search"])
async def search_products(
    request: Request, payload: SearchRequestSchema = Body(...)
) -> SearchResponseSchema:
    runtime = get_runtime(request)
    response = runtime.search.search(
        query=payload.query,
        customer_id=payload.customer_id,
        session_id=payload.session_id,
        limit=payload.limit,
        offset=payload.offset,
        include_debug=payload.include_debug,
        filters=payload.filters or {},
    )
    return SearchResponseSchema(**response)


@router.post(
    "/search/analyze",
    response_model=SearchAnalysisResponseSchema,
    tags=["Search"],
)
async def analyze_search_query(
    request: Request, payload: SearchRequestSchema = Body(...)
) -> SearchAnalysisResponseSchema:
    runtime = get_runtime(request)
    response = runtime.search.analyze_query(payload.query)
    return SearchAnalysisResponseSchema(**response)


@router.post("/events", response_model=EventResponseSchema, tags=["Search"])
async def post_event(
    request: Request, payload: EventRequestSchema = Body(...)
) -> EventResponseSchema:
    runtime = get_runtime(request)
    try:
        result = runtime.search.record_event(
            event_type=payload.event_type,
            session_id=payload.session_id,
            customer_id=payload.customer_id,
            product_id=payload.product_id,
            query=payload.query,
            position=payload.position,
            dwell_ms=payload.dwell_ms,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EventResponseSchema(**result)


@router.get(
    "/profiles/demo",
    response_model=list[DemoProfileSchema],
    tags=["Profiles"],
)
async def get_demo_profiles(request: Request) -> list[DemoProfileSchema]:
    runtime = get_runtime(request)
    return [DemoProfileSchema(**item) for item in runtime.search.list_demo_profiles()]


@router.get(
    "/metrics/summary",
    response_model=MetricsSummarySchema,
    tags=["Metrics"],
)
async def get_metrics_summary(request: Request) -> MetricsSummarySchema:
    runtime = get_runtime(request)
    return MetricsSummarySchema(**runtime.metrics.get_summary())


@router.get(
    "/products/{product_id}",
    response_model=ProductSchema,
    tags=["Products"],
)
async def get_product(request: Request, product_id: str) -> ProductSchema:
    runtime = get_runtime(request)
    product = runtime.search.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return ProductSchema(**product)


@router.post(
    "/saved-results",
    response_model=SavedResultResponseSchema,
    tags=["Search"],
)
async def save_result(
    request: Request, payload: SavedResultRequestSchema = Body(...)
) -> SavedResultResponseSchema:
    runtime = get_runtime(request)
    event = runtime.search.record_event(
        event_type="result_saved",
        session_id=None,
        customer_id=payload.user_id,
        product_id=payload.product_id,
        query=None,
        position=None,
        dwell_ms=None,
        note=payload.note,
    )
    return SavedResultResponseSchema(success=True, savedResult=event)


@router.get(
    "/saved-results",
    response_model=SavedResultsListResponseSchema,
    tags=["Search"],
)
async def list_saved_results(request: Request, user_id: str) -> SavedResultsListResponseSchema:
    runtime = get_runtime(request)
    rows = runtime.db.query_all(
        """
        SELECT sr.id, sr.created_at, p.ste_id, p.title_raw, p.category_raw
        FROM saved_results sr
        LEFT JOIN products p ON p.ste_id = sr.ste_id
        WHERE sr.customer_inn = ?
        ORDER BY sr.created_at DESC
        LIMIT 100
        """,
        [user_id],
    )
    results = [
        {
            "id": row["id"],
            "createdAt": row["created_at"],
            "productId": row["ste_id"],
            "title": row["title_raw"],
            "category": row["category_raw"],
        }
        for row in rows
    ]
    return SavedResultsListResponseSchema(results=results, totalCount=len(results))


@router.post("/feedback", response_model=FeedbackResponseSchema, tags=["Search"])
async def submit_feedback(
    request: Request, payload: FeedbackRequestSchema = Body(...)
) -> FeedbackResponseSchema:
    runtime = get_runtime(request)
    event_type = "marked_relevant" if payload.is_relevant else "marked_irrelevant"
    event = runtime.search.record_event(
        event_type=event_type,
        session_id=None,
        customer_id=payload.user_id,
        product_id=payload.product_id,
        query=None,
        position=None,
        dwell_ms=None,
        note=payload.comment,
    )
    return FeedbackResponseSchema(success=True, feedbackId=event["eventId"])
