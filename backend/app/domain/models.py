"""
Domain models for Smart Product Search MVP.

These are core business entities that represent the domain logic.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime


@dataclass
class ProductAttribute:
    """A single product attribute (characteristic)."""

    name: str
    value: str


@dataclass
class Product:
    """
    Core product entity representing an item from the catalog.

    Searchable fields:
    - title: Product name/title
    - manufacturer: Producer/manufacturer name
    - model: Product model identifier
    - category_name: Name of the product category
    - attributes: Product characteristics/specifications

    Metadata fields:
    - id: Product identifier
    - category_id: Category identifier
    - image_url: Link to product image
    - country_origin: Country of origin
    """

    id: str
    title: str
    manufacturer: str
    model: str
    category_id: str
    category_name: str
    image_url: str
    country_origin: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    attributes: List[ProductAttribute] = field(default_factory=list)
    # Raw data from catalog
    attributes_raw: Optional[str] = None  # Raw characteristics string
    # Normalized searchable text (for baseline search)
    searchable_text: str = field(init=False)

    def __post_init__(self):
        """Normalize searchable text after initialization."""
        self.searchable_text = self._build_searchable_text()

    def _build_searchable_text(self) -> str:
        """Build normalized searchable text from all relevant fields."""
        parts = [
            self.title,
            self.manufacturer,
            self.model,
            self.category_name,
        ]
        # Add attribute values
        for attr in self.attributes:
            parts.append(attr.name)
            parts.append(attr.value)
        # Join and normalize
        return " ".join(filter(None, parts)).lower()


@dataclass
class ParsedAttribute:
    """Represents a parsed/extracted attribute from user query."""

    attribute_name: str
    attribute_value: str
    confidence: float = 1.0  # 0.0 to 1.0


@dataclass
class ParsedQuery:
    """
    Result of parsed user search query.

    Populated by LLM-based query parser (Stage 3).
    Contains structured information extracted from user query.
    """

    original_query: str
    detected_category: Optional[str] = None
    detected_brand: Optional[str] = None
    detected_model: Optional[str] = None
    detected_attributes: Dict[str, str] = field(default_factory=dict)
    numeric_constraints: Dict[str, str] = field(default_factory=dict)
    free_text: Optional[str] = None
    # Legacy compatibility
    parsed_attributes: List[ParsedAttribute] = field(default_factory=list)
    search_categories: List[str] = field(default_factory=list)
    filters: Dict[str, Any] = field(default_factory=dict)

    def has_structured_data(self) -> bool:
        """Return True when the query includes structured parsed fields."""
        return any(
            [
                self.detected_category,
                self.detected_brand,
                self.detected_model,
                self.detected_attributes,
                self.numeric_constraints,
            ]
        )


@dataclass
class SearchResultItem:
    """
    Single search result item.
    Combines product data with relevance information.
    """

    product: Product
    relevance_score: float  # 0.0 to 1.0
    match_reasons: List[str] = field(default_factory=list)
    explanation: str = ""


@dataclass
class SavedResult:
    """
    Represents a user's saved search result.
    """

    id: str
    user_id: str
    product_id: str
    product: Product
    saved_at: datetime = field(default_factory=datetime.utcnow)
    note: Optional[str] = None


@dataclass
class Feedback:
    """
    User feedback on search results or products.
    Used for improving search quality.
    """

    id: str
    user_id: str
    product_id: str
    search_query: Optional[str] = None
    rating: Optional[int] = None  # 1-5 star rating
    is_relevant: Optional[bool] = None  # Was this result relevant?
    comment: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class UserEvent:
    """
    Track user interactions with the system.
    Used for analytics and personalization.
    """

    id: str
    user_id: str
    event_type: str  # 'search', 'view_product', 'save', 'feedback', etc.
    event_data: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
