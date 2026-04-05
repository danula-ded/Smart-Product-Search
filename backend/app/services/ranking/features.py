"""Feature extraction helpers for optional learned reranking."""

from __future__ import annotations

from typing import Any


TEXT_FEATURE_ORDER = [
    "heuristic_score",
    "bm25_score",
    "exact_phrase",
    "token_overlap",
    "lemma_overlap",
    "synonym_hits",
    "category_match",
    "attribute_hits",
    "numeric_hits",
    "history_product",
    "history_category",
    "history_tokens",
    "session_product",
    "session_category",
    "global_popularity",
]

FEED_FEATURE_ORDER = [
    "heuristic_score",
    "history_product",
    "history_category",
    "history_tokens",
    "session_product",
    "session_category",
    "global_popularity",
    "exploration_bonus",
]


def ordered_feature_values(features: dict[str, float], *, feed_mode: bool) -> list[float]:
    order = FEED_FEATURE_ORDER if feed_mode else TEXT_FEATURE_ORDER
    return [float(features.get(name, 0.0)) for name in order]


def empty_feature_vector(*, feed_mode: bool) -> dict[str, float]:
    order = FEED_FEATURE_ORDER if feed_mode else TEXT_FEATURE_ORDER
    return {name: 0.0 for name in order}


def merge_feature_value(
    payload: dict[str, Any],
    name: str,
    value: float,
) -> None:
    features = payload.setdefault("_rankingFeatures", {})
    features[name] = float(value)
