"""Optional CatBoost reranker with safe fallback behavior."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

try:  # pragma: no cover - optional dependency
    from catboost import CatBoostRanker as _CatBoostRanker
    from catboost import Pool
except Exception:  # pragma: no cover
    _CatBoostRanker = None
    Pool = None

from app.services.ranking.features import ordered_feature_values


class CatBoostRanker:
    """Loads and serves an optional CatBoost ranker artifact."""

    def __init__(self, model_path: Path | None = None, meta: dict[str, Any] | None = None) -> None:
        self.model_path = Path(model_path) if model_path else None
        self.meta = meta or {}
        self._model = None

    @property
    def is_available(self) -> bool:
        return self._model is not None and _CatBoostRanker is not None

    @property
    def version(self) -> str | None:
        return self.meta.get("version")

    def load(self) -> None:
        if _CatBoostRanker is None or self.model_path is None or not self.model_path.exists():
            self._model = None
            return
        try:
            model = _CatBoostRanker()
            model.load_model(str(self.model_path))
            self._model = model
        except Exception:
            self._model = None

    def score_many(
        self,
        payloads: list[dict[str, Any]],
        *,
        feed_mode: bool,
    ) -> list[float]:
        if not payloads:
            return []
        if not self.is_available or Pool is None:
            return [0.0 for _ in payloads]
        features = [ordered_feature_values(item.get("_rankingFeatures", {}), feed_mode=feed_mode) for item in payloads]
        try:
            return [float(value) for value in self._model.predict(features)]
        except Exception:
            return [0.0 for _ in payloads]

    @classmethod
    def from_artifact_row(cls, row: Any | None) -> "CatBoostRanker":
        if not row:
            return cls()
        meta = {}
        try:
            meta = json.loads(row["meta_json"])
        except Exception:
            meta = {}
        ranker = cls(Path(row["path"]), meta=meta)
        ranker.load()
        return ranker
