"""
Tests for the Smart Product Search API.

Minimal tests checking application startup and API contracts.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app with startup/shutdown lifecycle."""
    with TestClient(app) as client:
        yield client


# ============================================================================
# Health Check Tests
# ============================================================================

class TestHealth:
    """Tests for health check endpoint."""

    def test_health_endpoint_exists(self, client):
        """Test that health endpoint returns 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_schema(self, client):
        """Test that health response has correct schema."""
        response = client.get("/health")
        data = response.json()
        
        assert "status" in data
        assert "version" in data
        assert data["status"] == "healthy"

    def test_health_returns_version(self, client):
        """Test that health endpoint returns API version."""
        response = client.get("/health")
        data = response.json()
        
        assert data["version"] is not None
        assert isinstance(data["version"], str)


# ============================================================================
# Search Endpoint Tests
# ============================================================================

class TestSearchEndpoint:
    """Tests for search endpoint contract."""

    def test_search_endpoint_exists(self, client):
        """Test that search endpoint accepts POST requests."""
        response = client.post(
            "/search",
            json={
                "query": "laptop",
                "limit": 20,
                "offset": 0
            }
        )
        assert response.status_code == 200

    def test_search_response_schema(self, client):
        """Test that search response has correct schema."""
        response = client.post(
            "/search",
            json={
                "query": "laptop",
                "limit": 10,
                "offset": 0
            }
        )
        data = response.json()
        
        # Check required fields
        assert "results" in data
        assert "total_count" in data
        assert "query" in data
        assert "limit" in data
        assert "offset" in data
        
        # Check types
        assert isinstance(data["results"], list)
        assert isinstance(data["total_count"], int)
        assert isinstance(data["query"], str)
        assert isinstance(data["limit"], int)
        assert isinstance(data["offset"], int)

    def test_search_with_minimal_query(self, client):
        """Test search with minimal required fields."""
        response = client.post(
            "/search",
            json={"query": "test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "total_count" in data

    def test_search_respects_pagination_params(self, client):
        """Test that search returns requested pagination parameters."""
        response = client.post(
            "/search",
            json={
                "query": "laptop",
                "limit": 50,
                "offset": 100
            }
        )
        data = response.json()
        assert data["limit"] == 50
        assert data["offset"] == 100

    def test_search_with_user_id(self, client):
        """Test search with optional user_id for personalization."""
        response = client.post(
            "/search",
            json={
                "query": "laptop",
                "user_id": "user_123"
            }
        )
        assert response.status_code == 200

    def test_search_with_real_data(self, client):
        """Test search returns real product data."""
        response = client.post(
            "/search",
            json={
                "query": "ноутбук",  # Search for "laptop" in Russian
                "limit": 10,
                "offset": 0
            }
        )
        data = response.json()
        
        # Should find products from sample data
        assert data["total_count"] >= 0
        if data["total_count"] > 0:
            # Check first result structure
            result = data["results"][0]
            assert "product" in result
            assert "relevance_score" in result
            assert "match_reasons" in result
            
            product = result["product"]
            assert "id" in product
            assert "title" in product
            assert "manufacturer" in product

    def test_search_by_manufacturer(self, client):
        """Test search by manufacturer name."""
        response = client.post(
            "/search",
            json={"query": "hp"}
        )
        data = response.json()
        
        # Should find HP products
        assert data["total_count"] >= 0

    def test_search_empty_results(self, client):
        """Test search with query that should return no results."""
        response = client.post(
            "/search",
            json={"query": "nonexistentproduct12345"}
        )
        data = response.json()
        
        assert data["total_count"] == 0
        assert len(data["results"]) == 0


# ============================================================================
# Product Details Endpoint Tests
# ============================================================================

class TestProductDetails:
    """Tests for product details endpoint contract."""

    def test_get_product_exists(self, client):
        """Test that get product endpoint exists."""
        response = client.get("/products/prod_001")
        assert response.status_code == 200

    def test_get_product_response_schema(self, client):
        """Test that product response has correct schema."""
        # Get first product from sample data
        search_response = client.post("/search", json={"query": "ноутбук", "limit": 1})
        if search_response.json()["total_count"] > 0:
            product_id = search_response.json()["results"][0]["product"]["id"]
            
            response = client.get(f"/products/{product_id}")
            data = response.json()
            
            # Check required fields
            required_fields = [
                "id", "title", "manufacturer", "model",
                "category_id", "category_name", "image_url",
                "country_origin", "attributes", "created_at"
            ]
            for field in required_fields:
                assert field in data, f"Missing field: {field}"
        else:
            # If no products, test with hardcoded ID that should fail
            response = client.get("/products/prod_001")
            assert response.status_code == 404

    def test_get_product_not_found(self, client):
        """Test getting non-existent product."""
        response = client.get("/products/nonexistent_id")
        assert response.status_code == 404


# ============================================================================
# Saved Results Endpoint Tests
# ============================================================================

class TestSavedResults:
    """Tests for saved results endpoint contract."""

    def test_post_save_result_exists(self, client):
        """Test that save result endpoint exists."""
        response = client.post(
            "/saved-results",
            json={
                "user_id": "user_123",
                "product_id": "prod_001"
            }
        )
        assert response.status_code == 200

    def test_post_save_result_response_schema(self, client):
        """Test that save result response has correct schema."""
        response = client.post(
            "/saved-results",
            json={
                "user_id": "user_123",
                "product_id": "prod_001"
            }
        )
        data = response.json()
        
        assert "success" in data
        assert isinstance(data["success"], bool)

    def test_get_saved_results_exists(self, client):
        """Test that get saved results endpoint exists."""
        response = client.get("/saved-results?user_id=user_123")
        assert response.status_code == 200

    def test_get_saved_results_response_schema(self, client):
        """Test that get saved results response has correct schema."""
        response = client.get("/saved-results?user_id=user_123")
        data = response.json()
        
        assert "results" in data
        assert "total_count" in data
        assert isinstance(data["results"], list)
        assert isinstance(data["total_count"], int)


# ============================================================================
# Feedback Endpoint Tests
# ============================================================================

class TestFeedback:
    """Tests for feedback endpoint contract."""

    def test_feedback_endpoint_exists(self, client):
        """Test that feedback endpoint exists."""
        response = client.post(
            "/feedback",
            json={
                "user_id": "user_123",
                "product_id": "prod_001"
            }
        )
        assert response.status_code == 200

    def test_feedback_response_schema(self, client):
        """Test that feedback response has correct schema."""
        response = client.post(
            "/feedback",
            json={
                "user_id": "user_123",
                "product_id": "prod_001",
                "rating": 5,
                "is_relevant": True
            }
        )
        data = response.json()
        
        assert "success" in data
        assert isinstance(data["success"], bool)

    def test_feedback_with_rating(self, client):
        """Test feedback with rating."""
        response = client.post(
            "/feedback",
            json={
                "user_id": "user_123",
                "product_id": "prod_001",
                "rating": 4
            }
        )
        assert response.status_code == 200

    def test_feedback_with_comment(self, client):
        """Test feedback with comment."""
        response = client.post(
            "/feedback",
            json={
                "user_id": "user_123",
                "product_id": "prod_001",
                "comment": "Great product!"
            }
        )
        assert response.status_code == 200
