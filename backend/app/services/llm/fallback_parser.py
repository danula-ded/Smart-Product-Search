"""Rule-based fallback parser used when the local LLM is unavailable."""

import logging
import re
from typing import Dict, Optional, Tuple

from app.domain import ParsedQuery
from app.services.llm.base import LLMProvider

logger = logging.getLogger(__name__)


def _normalize_text(value: str) -> str:
    """Normalize text for lightweight matching."""
    return re.sub(r"\s+", " ", (value or "").strip().lower().replace("ё", "е"))


def _tokenize(value: str) -> list[str]:
    """Split free-form text into normalized search tokens."""
    return re.findall(r"[a-zA-Zа-яА-Я0-9]+(?:[.,][0-9]+)?", _normalize_text(value))


class FallbackParser(LLMProvider):
    """Rule-based parser that keeps the backend functional without an LLM."""

    provider_name = "fallback"

    CATEGORY_KEYWORDS = {
        "шина": ["шина", "шины", "tire", "tyre"],
        "ноутбук": ["ноутбук", "ноутбуки", "laptop", "notebook"],
        "смартфон": ["смартфон", "смартфоны", "phone", "iphone"],
        "монитор": ["монитор", "мониторы", "monitor", "display"],
        "клавиатура": ["клавиатура", "клавиатуры", "keyboard"],
        "мышь": ["мышь", "мышка", "мыши", "mouse"],
        "наушники": ["наушники", "headphones", "headset"],
        "планшет": ["планшет", "планшеты", "tablet"],
        "принтер": ["принтер", "принтеры", "printer"],
    }

    ATTRIBUTE_PATTERNS = {
        "Тип": {
            "Бескамерная": ["бескамерная", "tubeless"],
            "Беспроводная": ["беспроводная", "wireless"],
            "Механическая": ["механическая", "mechanical"],
            "Лазерный": ["лазерный", "laser"],
        },
        "Цвет": {
            "Черный": ["черный", "черная", "black"],
            "Белый": ["белый", "белая", "white"],
            "Красный": ["красный", "красная", "red"],
        },
    }

    def is_available(self) -> bool:
        """Fallback parser is always available."""
        return True

    def parse_query(
        self, query: str, catalog_context: Optional[dict] = None
    ) -> ParsedQuery:
        """Parse a query with regexes and catalog-aware heuristics."""
        if not query or not query.strip():
            return ParsedQuery(
                original_query=query,
                detected_attributes={},
                numeric_constraints={},
                free_text=None,
            )

        normalized_query = _normalize_text(query)
        detected_category = self._extract_category(normalized_query, catalog_context)
        detected_brand, detected_model = self._extract_brand_and_model(
            normalized_query, catalog_context
        )
        detected_attributes = self._extract_attributes(normalized_query)
        numeric_constraints = self._extract_numeric_constraints(
            normalized_query, detected_category
        )
        free_text = self._build_free_text(
            normalized_query,
            detected_brand,
            detected_model,
            detected_attributes,
            numeric_constraints,
        )

        return ParsedQuery(
            original_query=query,
            detected_category=detected_category,
            detected_brand=detected_brand,
            detected_model=detected_model,
            detected_attributes=detected_attributes,
            numeric_constraints=numeric_constraints,
            free_text=free_text,
        )

    def _extract_category(
        self, query: str, catalog_context: Optional[dict]
    ) -> Optional[str]:
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            if any(keyword in query for keyword in keywords):
                return category

        for category in (
            catalog_context.get("categories", []) if catalog_context else []
        ):
            normalized_category = _normalize_text(category)
            if normalized_category and normalized_category in query:
                return category

        return None

    def _extract_brand_and_model(
        self,
        query: str,
        catalog_context: Optional[dict],
    ) -> Tuple[Optional[str], Optional[str]]:
        brand = self._find_longest_catalog_match(
            query, catalog_context.get("brands", []) if catalog_context else []
        )
        model = self._find_longest_catalog_match(
            query, catalog_context.get("models", []) if catalog_context else []
        )

        if not model:
            regex_match = re.search(
                r"\b([a-z][a-z0-9-]*\d+[a-z0-9-]*)\b", query, re.IGNORECASE
            )
            if regex_match:
                model = regex_match.group(1).upper()

        if not brand:
            tokens = _tokenize(query)
            if (
                len(tokens) >= 2
                and tokens[0].isalpha()
                and any(char.isdigit() for char in tokens[1])
            ):
                brand = tokens[0].capitalize()

        return brand, model

    def _find_longest_catalog_match(
        self, query: str, values: list[str]
    ) -> Optional[str]:
        normalized_values = sorted(values, key=len, reverse=True)
        for value in normalized_values:
            if _normalize_text(value) in query:
                return value
        return None

    def _extract_attributes(self, query: str) -> Dict[str, str]:
        attributes: Dict[str, str] = {}
        for attr_name, value_map in self.ATTRIBUTE_PATTERNS.items():
            for normalized_value, keywords in value_map.items():
                if any(keyword in query for keyword in keywords):
                    attributes[attr_name] = normalized_value
                    break
        return attributes

    def _extract_numeric_constraints(
        self, query: str, detected_category: Optional[str]
    ) -> Dict[str, str]:
        constraints: Dict[str, str] = {}

        gb_match = re.search(r"\b(\d+(?:[.,]\d+)?)\s*(?:гб|gb)\b", query, re.IGNORECASE)
        if gb_match:
            constraints["Память"] = gb_match.group(1).replace(",", ".")

        inch_match = re.search(
            r"\b(\d+(?:[.,]\d+)?)\s*(?:дюйм(?:а|ов)?|inch(?:es)?)\b",
            query,
            re.IGNORECASE,
        )
        if inch_match:
            constraints["Диаметр"] = inch_match.group(1).replace(",", ".")

        if "Диаметр" not in constraints and detected_category == "шина":
            loose_number_match = re.search(r"\b(\d+(?:[.,]\d+)?)\b", query)
            if loose_number_match:
                constraints["Диаметр"] = loose_number_match.group(1).replace(",", ".")

        if "оператив" in query or "ram" in query:
            memory_match = re.search(r"\b(\d+(?:[.,]\d+)?)\b", query)
            if memory_match and "Память" not in constraints:
                constraints["Память"] = memory_match.group(1).replace(",", ".")

        return constraints

    def _build_free_text(
        self,
        query: str,
        detected_brand: Optional[str],
        detected_model: Optional[str],
        detected_attributes: Dict[str, str],
        numeric_constraints: Dict[str, str],
    ) -> Optional[str]:
        remainder = query
        for value in [
            detected_brand,
            detected_model,
            *detected_attributes.values(),
            *numeric_constraints.values(),
        ]:
            if value:
                remainder = remainder.replace(_normalize_text(value), " ")

        free_text_tokens = [token for token in _tokenize(remainder) if len(token) > 1]
        if not free_text_tokens:
            free_text_tokens = [token for token in _tokenize(query) if len(token) > 1]

        return " ".join(free_text_tokens) if free_text_tokens else None

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
