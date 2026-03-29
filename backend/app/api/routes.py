"""
API routes and endpoints.

Contains all endpoint implementations.
"""

from fastapi import APIRouter, Query, Path, Body, HTTPException
from typing import Optional, List

from app.schemas import (
    HealthResponse,
    SearchRequestSchema,
    SearchResponseSchema,
    ProductSchema,
    SavedResultRequestSchema,
    SavedResultResponseSchema,
    SavedResultsListResponseSchema,
    FeedbackRequestSchema,
    FeedbackResponseSchema,
)
from app.config import settings
from app.storage.repository import product_repository

router = APIRouter()


# ============================================================================
# Health Check Endpoint
# ============================================================================

@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check",
    description="Check if the API is running and healthy"
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Returns the service status and version.
    """
    return HealthResponse(
        status="healthy",
        version=settings.API_VERSION
    )


# ============================================================================
# Search Endpoints
# ============================================================================

@router.post(
    "/search",
    response_model=SearchResponseSchema,
    tags=["Search"],
    summary="Search products",
    description="Perform a baseline product search based on user query"
)
async def search(
    request: SearchRequestSchema = Body(...),
) -> SearchResponseSchema:
    """
    Search for products using baseline search.
    
    Searches in product title, manufacturer, model, category, and attributes.
    Returns paginated results with relevance information.
    
    Args:
        request: Search request containing query, filters, and pagination parameters
        
    Returns:
        Search response with matched products and metadata
    """
    from app.schemas import SearchResultSchema
    
    # Perform search
    search_result = product_repository.search_products(
        query=request.query,
        limit=request.limit,
        offset=request.offset
    )
    
    # Convert domain objects to schema objects
    results = []
    for product in search_result["results"]:
        # Create match reasons (simplified for baseline)
        match_reasons = []
        if request.query.lower() in product.title.lower():
            match_reasons.append("Совпадение в названии")
        if request.query.lower() in product.manufacturer.lower():
            match_reasons.append("Совпадение в производителе")
        if request.query.lower() in product.model.lower():
            match_reasons.append("Совпадение в модели")
        if request.query.lower() in product.category_name.lower():
            match_reasons.append("Совпадение в категории")
        if not match_reasons:
            match_reasons.append("Совпадение в характеристиках")
        
        result_item = SearchResultSchema(
            product=ProductSchema(
                id=product.id,
                title=product.title,
                manufacturer=product.manufacturer,
                model=product.model,
                category_id=product.category_id,
                category_name=product.category_name,
                image_url=product.image_url,
                country_origin=product.country_origin,
                attributes=[
                    {"name": attr.name, "value": attr.value}
                    for attr in product.attributes
                ],
                created_at=product.created_at
            ),
            relevance_score=1.0,  # Baseline search - all matches have same relevance
            match_reasons=match_reasons
        )
        results.append(result_item)
    
    return SearchResponseSchema(
        results=results,
        total_count=search_result["total_count"],
        query=request.query,
        limit=request.limit,
        offset=request.offset
    )


@router.get(
    "/products/{product_id}",
    response_model=ProductSchema,
    tags=["Products"],
    summary="Get product details",
    description="Retrieve detailed information about a specific product"
)
async def get_product(
    product_id: str = Path(..., description="Product ID"),
) -> ProductSchema:
    """
    Get product by ID.
    
    Retrieves product details from the catalog repository.
    
    Args:
        product_id: The ID of the product to retrieve
        
    Returns:
        Product details
        
    Raises:
        HTTPException: If product not found
    """
    product = product_repository.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductSchema(
        id=product.id,
        title=product.title,
        manufacturer=product.manufacturer,
        model=product.model,
        category_id=product.category_id,
        category_name=product.category_name,
        image_url=product.image_url,
        country_origin=product.country_origin,
        attributes=[
            {"name": attr.name, "value": attr.value}
            for attr in product.attributes
        ],
        created_at=product.created_at
    )


# ============================================================================
# Saved Results Endpoints
# ============================================================================

@router.post(
    "/saved-results",
    response_model=SavedResultResponseSchema,
    tags=["Saved Results"],
    summary="Save a product",
    description="Save a product to user's saved results"
)
async def save_result(
    request: SavedResultRequestSchema = Body(...),
) -> SavedResultResponseSchema:
    """
    Save a product to user's saved results.
    
    On this MVP stage, returns a success stub without actual persistence.
    
    Args:
        request: Request with user_id, product_id, and optional note
        
    Returns:
        Success response
    """
    # Stub implementation - returns success without persistence for MVP stage
    return SavedResultResponseSchema(
        success=True,
        saved_result=None
    )


@router.get(
    "/saved-results",
    response_model=SavedResultsListResponseSchema,
    tags=["Saved Results"],
    summary="Get user's saved results",
    description="Retrieve all products saved by a user"
)
async def get_saved_results(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> SavedResultsListResponseSchema:
    """
    Get user's saved results.
    
    On this MVP stage, returns empty list.
    
    Args:
        user_id: The ID of the user
        limit: Maximum number of results to return
        offset: Pagination offset
        
    Returns:
        List of saved results
    """
    # Stub implementation - returns empty list for MVP stage
    return SavedResultsListResponseSchema(
        results=[],
        total_count=0
    )


# ============================================================================
# Feedback Endpoint
# ============================================================================

@router.post(
    "/feedback",
    response_model=FeedbackResponseSchema,
    tags=["Feedback"],
    summary="Submit feedback",
    description="Submit feedback on search results or products for improvement"
)
async def submit_feedback(
    request: FeedbackRequestSchema = Body(...),
) -> FeedbackResponseSchema:
    """
    Submit feedback on search results or products.
    
    On this MVP stage, returns success stub without actual persistence.
    Feedback collection will be implemented in the next stage.
    
    Args:
        request: Feedback request with rating, relevance, and comments
        
    Returns:
        Success response with feedback ID
    """
    # Stub implementation - returns success without persistence for MVP stage
    return FeedbackResponseSchema(
        success=True,
        feedback_id=None
    )
