"""Low-level query normalization helpers."""

from __future__ import annotations

from dataclasses import dataclass

from app.services.text_utils import (
    keyboard_layout_variants,
    normalize_text,
    parse_numeric_value,
    tokenize,
)


@dataclass(frozen=True)
class NormalizedQuery:
    original_query: str
    normalized_query: str
    tokens: list[str]
    numeric_tokens: list[float]


class QueryNormalizer:
    """Provides deterministic query normalization and token extraction."""

    def normalize(self, query: str) -> NormalizedQuery:
        normalized_query = normalize_text(query)
        tokens = tokenize(normalized_query)
        numeric_tokens: list[float] = []
        for token in tokens:
            numeric_value, _ = parse_numeric_value(token)
            if numeric_value is not None:
                numeric_tokens.append(numeric_value)
        return NormalizedQuery(
            original_query=query,
            normalized_query=normalized_query,
            tokens=tokens,
            numeric_tokens=numeric_tokens,
        )

    def keyboard_variants(self, token: str) -> tuple[str, ...]:
        return keyboard_layout_variants(token)
