"""Morphology layer with optional pymorphy3 support."""

from __future__ import annotations

import re
from functools import lru_cache

from app.services.text_utils import (
    CYRILLIC_RE,
    UNIT_TOKENS,
    is_alphanumeric_model,
    normalize_text,
    simple_russian_lemma,
)

try:  # pragma: no cover - optional dependency
    from pymorphy3 import MorphAnalyzer
except Exception:  # pragma: no cover
    MorphAnalyzer = None


CYRILLIC_ONLY_RE = re.compile(r"^[а-я]+$", re.IGNORECASE)


class MorphologyService:
    """Provides fast Russian lemmatization with a deterministic fallback."""

    def __init__(self) -> None:
        self._analyzer = MorphAnalyzer() if MorphAnalyzer is not None else None

    @lru_cache(maxsize=32768)
    def lemma(self, token: str, term_type: str | None = None) -> str:
        normalized = normalize_text(token)
        if not normalized:
            return normalized
        if term_type in {"brand", "model", "unit"}:
            return normalized
        if normalized in UNIT_TOKENS or is_alphanumeric_model(normalized):
            return normalized
        if not CYRILLIC_RE.search(normalized):
            return normalized
        if not CYRILLIC_ONLY_RE.match(normalized):
            return normalized
        if self._analyzer is not None:
            try:
                parsed = self._analyzer.parse(normalized)
                if parsed:
                    lemma = normalize_text(parsed[0].normal_form)
                    if lemma:
                        return lemma
            except Exception:
                pass
        return simple_russian_lemma(normalized)

    def is_russian_word(self, token: str) -> bool:
        normalized = normalize_text(token)
        return bool(normalized and CYRILLIC_ONLY_RE.match(normalized))
