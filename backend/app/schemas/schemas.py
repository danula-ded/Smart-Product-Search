"""
Pydantic schemas for API requests and responses.

These define the contract for API endpoints and data validation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


# ============================================================================
# Health Check
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status: 'healthy' or 'unhealthy'")
    version: str = Field(..., description="API version")


# ============================================================================
# Product Schemas
# ============================================================================

class ProductAttributeSchema(BaseModel):
    """Product attribute/characteristic."""
    name: str = Field(..., description="Attribute name (e.g., 'Color', 'Size')")
    value: str = Field(..., description="Attribute value")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"name": "Color", "value": "Black"}
        }
    )


class ProductSchema(BaseModel):
    """
    Product entity schema for API responses.
    
    Contains both searchable fields and metadata.
    """
    id: str = Field(..., description="Unique product identifier")
    title: str = Field(..., description="Product name/title (searchable)")
    manufacturer: str = Field(..., description="Manufacturer name (searchable)")
    model: str = Field(..., description="Product model (searchable)")
    category_id: str = Field(..., description="Category ID (metadata)")
    category_name: str = Field(..., description="Category name (searchable)")
    image_url: str = Field(..., description="Product image URL (metadata)")
    country_origin: str = Field(..., description="Country of origin (metadata)")
    attributes: List[ProductAttributeSchema] = Field(
        default_factory=list,
        description="Product characteristics/specs (searchable)"
    )
    created_at: datetime = Field(..., description="Product creation timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "prod_001",
                "title": "Laptop ProBook",
                "manufacturer": "HP",
                "model": "ProBook 450",
                "category_id": "cat_001",
                "category_name": "Electronics",
                "image_url": "https://example.com/image.jpg",
                "country_origin": "USA",
                "attributes": [
                    {"name": "RAM", "value": "16GB"},
                    {"name": "Storage", "value": "512GB SSD"}
                ],
                "created_at": "2024-01-01T00:00:00"
            }
        }
    )


# ============================================================================
# Search Schemas
# ============================================================================

class SearchRequestSchema(BaseModel):
    """
    Search request schema for POST /search endpoint.
    """
    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Free-form search query from user"
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum number of results to return"
    )
    offset: int = Field(
        default=0,
        ge=0,
        description="Pagination offset"
    )
    user_id: Optional[str] = Field(
        default=None,
        description="Optional user ID for personalization"
    )
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional filters (category, price range, etc.)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "black laptop with 16gb ram",
                "limit": 20,
                "offset": 0,
                "user_id": "user_123",
                "filters": {"category": "Electronics"}
            }
        }
    )


class SearchResultSchema(BaseModel):
    """Single search result item."""
    product: ProductSchema = Field(..., description="The product")
    relevance_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Relevance score (0.0 to 1.0)"
    )
    match_reasons: List[str] = Field(
        default_factory=list,
        description="Reasons why this product matched the query"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": {
                    "id": "prod_001",
                    "title": "Laptop ProBook",
                    "manufacturer": "HP",
                    "model": "ProBook 450",
                    "category_id": "cat_001",
                    "category_name": "Electronics",
                    "image_url": "https://example.com/image.jpg",
                    "country_origin": "USA",
                    "attributes": []
                },
                "relevance_score": 0.95,
                "match_reasons": ["Title matches 'laptop'", "Category matches query"]
            }
        }
    )


class SearchResponseSchema(BaseModel):
    """
    Search response schema for POST /search endpoint.
    """
    results: List[SearchResultSchema] = Field(
        ...,
        description="List of search results"
    )
    total_count: int = Field(
        ...,
        description="Total number of matching results (before pagination)"
    )
    query: str = Field(..., description="The original search query")
    limit: int = Field(..., description="Limit used in this request")
    offset: int = Field(..., description="Offset used in this request")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "results": [],
                "total_count": 0,
                "query": "black laptop",
                "limit": 20,
                "offset": 0
            }
        }
    )


# ============================================================================
# Saved Results Schemas
# ============================================================================

class SavedResultSchema(BaseModel):
    """Saved search result."""
    id: str = Field(..., description="Unique saved result ID")
    user_id: str = Field(..., description="User who saved this result")
    product_id: str = Field(..., description="Associated product ID")
    product: ProductSchema = Field(..., description="Product details")
    saved_at: datetime = Field(..., description="When this result was saved")
    note: Optional[str] = Field(
        default=None,
        description="Optional user note about this product"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "saved_001",
                "user_id": "user_123",
                "product_id": "prod_001",
                "product": {
                    "id": "prod_001",
                    "title": "Laptop ProBook",
                    "manufacturer": "HP",
                    "model": "ProBook 450",
                    "category_id": "cat_001",
                    "category_name": "Electronics",
                    "image_url": "https://example.com/image.jpg",
                    "country_origin": "USA",
                    "attributes": [],
                    "created_at": "2024-01-01T00:00:00"
                },
                "saved_at": "2024-01-01T12:00:00",
                "note": "Good price"
            }
        }
    )


class SavedResultRequestSchema(BaseModel):
    """Request to save a product."""
    user_id: str = Field(..., description="User ID")
    product_id: str = Field(..., description="Product ID to save")
    note: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional note about this product"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user_123",
                "product_id": "prod_001",
                "note": "Check this model later"
            }
        }
    )


class SavedResultResponseSchema(BaseModel):
    """Response after saving a result."""
    success: bool = Field(..., description="Whether the save was successful")
    saved_result: Optional[SavedResultSchema] = Field(
        default=None,
        description="The saved result (if successful)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "saved_result": None
            }
        }
    )


class SavedResultsListResponseSchema(BaseModel):
    """List of user's saved results."""
    results: List[SavedResultSchema] = Field(
        ...,
        description="List of saved results"
    )
    total_count: int = Field(..., description="Total number of saved results")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "results": [],
                "total_count": 0
            }
        }
    )


# ============================================================================
# Feedback Schemas
# ============================================================================

class FeedbackRequestSchema(BaseModel):
    """
    Request to submit feedback on search results or products.
    """
    user_id: str = Field(..., description="User providing feedback")
    product_id: str = Field(..., description="Product being rated")
    search_query: Optional[str] = Field(
        default=None,
        description="The original search query (if feedback is on search result)"
    )
    rating: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="Star rating (1-5)"
    )
    is_relevant: Optional[bool] = Field(
        default=None,
        description="Was this search result relevant?"
    )
    comment: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="User comment or feedback text"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "user_123",
                "product_id": "prod_001",
                "search_query": "black laptop",
                "rating": 5,
                "is_relevant": True,
                "comment": "Great product and matches my search"
            }
        }
    )


class FeedbackResponseSchema(BaseModel):
    """Response after submitting feedback."""
    success: bool = Field(..., description="Whether feedback was recorded")
    feedback_id: Optional[str] = Field(
        default=None,
        description="ID of the recorded feedback"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "feedback_id": "fbk_001"
            }
        }
    )


# ============================================================================
# Generic Response Schemas
# ============================================================================

class ErrorResponseSchema(BaseModel):
    """Error response format."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(default=None, description="Detailed error information")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": "Validation Error",
                "detail": "Query must not be empty"
            }
        }
    )
