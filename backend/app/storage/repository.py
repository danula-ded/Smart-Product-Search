"""
In-memory repository for product catalog.

Provides data access layer for products with search capabilities.
"""

from typing import List, Optional, Dict, Any
from abc import ABC, abstractmethod
import logging

from app.domain import Product

logger = logging.getLogger(__name__)


class ProductRepository(ABC):
    """Abstract base class for product repositories."""
    
    @abstractmethod
    def get_all_products(self) -> List[Product]:
        """Get all products."""
        pass
    
    @abstractmethod
    def get_product_by_id(self, product_id: str) -> Optional[Product]:
        """Get product by ID."""
        pass
    
    @abstractmethod
    def search_products(self, query: str, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        Search products by query.
        
        Returns:
            {
                "results": List[Product],
                "total_count": int,
                "query": str,
                "limit": int,
                "offset": int
            }
        """
        pass


class InMemoryProductRepository(ProductRepository):
    """In-memory implementation of product repository."""
    
    def __init__(self):
        self._products: Dict[str, Product] = {}
        self._search_index: List[Product] = []
    
    def load_products(self, products: List[Product]):
        """Load products into memory."""
        self._products = {p.id: p for p in products}
        self._search_index = products
        logger.info(f"Loaded {len(products)} products into repository")
    
    def get_all_products(self) -> List[Product]:
        """Get all products."""
        return list(self._products.values())
    
    def get_product_by_id(self, product_id: str) -> Optional[Product]:
        """Get product by ID."""
        return self._products.get(product_id)
    
    def search_products(self, query: str, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        Perform baseline search on products.
        
        Searches in:
        - title
        - manufacturer
        - model
        - category_name
        - attributes_raw
        - parsed attribute values
        """
        if not query or not query.strip():
            return {
                "results": [],
                "total_count": 0,
                "query": query,
                "limit": limit,
                "offset": offset
            }
        
        query_lower = query.lower().strip()
        
        # Filter products that match the query
        matching_products = []
        for product in self._search_index:
            if self._matches_query(product, query_lower):
                matching_products.append(product)
        
        # Apply pagination
        total_count = len(matching_products)
        start_idx = min(offset, total_count)
        end_idx = min(start_idx + limit, total_count)
        paginated_results = matching_products[start_idx:end_idx]
        
        return {
            "results": paginated_results,
            "total_count": total_count,
            "query": query,
            "limit": limit,
            "offset": offset
        }
    
    def _matches_query(self, product: Product, query_lower: str) -> bool:
        """Check if product matches the search query."""
        # Search in searchable_text (includes all relevant fields)
        if query_lower in product.searchable_text:
            return True
        
        # Also search in raw attributes if available
        if product.attributes_raw and query_lower in product.attributes_raw.lower():
            return True
        
        return False


# Global repository instance
product_repository = InMemoryProductRepository()
