"""Mock provider used in tests and local development."""

import logging
from typing import Optional

from app.domain import ParsedQuery
from app.services.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class MockLLMProvider(LLMProvider):
    """Mock provider that returns deterministic structured outputs."""

    provider_name = "mock"

    def __init__(self, responses: Optional[dict[str, ParsedQuery]] = None):
        self.available = True
        self.responses = responses or {}
        logger.info("MockLLMProvider initialized")

    def is_available(self) -> bool:
        return self.available

    def parse_query(
        self, query: str, catalog_context: Optional[dict] = None
    ) -> ParsedQuery:
        if query in self.responses:
            return self.responses[query]

        query_lower = query.lower().strip()
        if "superguider" in query_lower and "шина" in query_lower:
            return ParsedQuery(
                original_query=query,
                detected_category="шина",
                detected_brand="Superguider",
                detected_model=None,
                detected_attributes={"Тип": "Бескамерная"},
                numeric_constraints=(
                    {"Диаметр": "16.5"} if "16.5" in query_lower else {}
                ),
                free_text="бескамерная шина",
            )

        if "ozka" in query_lower:
            return ParsedQuery(
                original_query=query,
                detected_brand="Ozka",
                detected_model="IND80",
                detected_attributes={},
                numeric_constraints={},
                free_text="ozka",
            )

        return ParsedQuery(
            original_query=query,
            detected_attributes={},
            numeric_constraints={},
            free_text=query_lower,
        )

    def generate_explanation(
        self, original_query: str, product_title: str, match_type: str
    ) -> str:
        explanations = {
            "brand": "Совпадение по бренду",
            "model": "Совпадение по модели",
            "category": "Совпадение по категории",
            "attributes": "Совпадение по характеристике",
            "numeric": "Совпадение по числовому ограничению",
            "text": "Найдено по тексту запроса",
        }
        return explanations.get(match_type, "Найдено релевантное совпадение")
