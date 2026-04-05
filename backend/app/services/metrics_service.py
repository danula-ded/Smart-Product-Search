"""Offline metrics over demo profiles and implicit relevance from contracts."""

from __future__ import annotations

import json
import math
from statistics import mean
from typing import Any

from app.config import settings
from app.services.search_service import SearchService
from app.services.text_utils import title_snippet_tokens
from app.storage.sqlite_db import SQLiteDatabase


class MetricsService:
    """Computes demo-ready metrics from available uploaded data."""

    def __init__(self, db: SQLiteDatabase, search_service: SearchService) -> None:
        self.db = db
        self.search_service = search_service
        self._cache_signature: tuple[int, int, int] | None = None
        self._cache_payload: dict[str, Any] | None = None

    def get_summary(self) -> dict[str, Any]:
        counts = self.db.query_one(
            """
            SELECT
                (SELECT COUNT(*) FROM products) AS products_count,
                (SELECT COUNT(*) FROM contracts) AS contracts_count,
                (SELECT COUNT(*) FROM customer_profiles) AS profiles_count,
                (SELECT COUNT(*) FROM events) AS events_count
            """
        )
        signature = (
            counts["products_count"] if counts else 0,
            counts["contracts_count"] if counts else 0,
            counts["profiles_count"] if counts else 0,
        )
        if self._cache_signature == signature and self._cache_payload is not None:
            return self._cache_payload
        persisted = self._load_persisted_cache(signature)
        if persisted is not None:
            normalized = self._with_compat_metric_keys(persisted)
            self._cache_signature = signature
            self._cache_payload = normalized
            return normalized

        demo_profiles = self.search_service.list_demo_profiles()
        rows = self.db.query_all(
            """
            SELECT c.customer_inn, c.ste_id, p.title_raw
            FROM contracts c
            JOIN products p ON p.ste_id = c.ste_id
            WHERE c.matched_product = 1
            ORDER BY c.contract_date DESC, c.updated_at DESC
            """
        )

        grouped: dict[str, list[tuple[str, str]]] = {}
        for row in rows:
            grouped.setdefault(row["customer_inn"], [])
            if len(grouped[row["customer_inn"]]) >= settings.METRICS_SAMPLE_SIZE:
                continue
            grouped[row["customer_inn"]].append((row["ste_id"], row["title_raw"]))

        personalized_scores = {"ndcg10": [], "mrr10": [], "recall20": [], "success5": []}
        baseline_scores = {"ndcg10": [], "mrr10": [], "recall20": [], "success5": []}

        query_count = 0
        for profile in demo_profiles:
            customer_id = profile["customerId"]
            for ste_id, title in grouped.get(customer_id, [])[: settings.METRICS_SAMPLE_SIZE]:
                query = title_snippet_tokens(title, limit=4)
                if not query:
                    continue
                query_count += 1

                personalized = self.search_service.search(
                    query=query,
                    customer_id=customer_id,
                    session_id=f"metrics-{customer_id}",
                    limit=20,
                    offset=0,
                    include_debug=False,
                    enable_personalization=True,
                    track_event=False,
                )
                baseline = self.search_service.search(
                    query=query,
                    customer_id=None,
                    session_id=None,
                    limit=20,
                    offset=0,
                    include_debug=False,
                    enable_personalization=False,
                    track_event=False,
                )

                self._collect_metrics(personalized_scores, personalized["results"], ste_id)
                self._collect_metrics(baseline_scores, baseline["results"], ste_id)

        payload = {
            "dataset": {
                "products": counts["products_count"] if counts else 0,
                "contracts": counts["contracts_count"] if counts else 0,
                "profiles": counts["profiles_count"] if counts else 0,
                "events": counts["events_count"] if counts else 0,
                "evaluationQueries": query_count,
                "isReliable": query_count >= 10,
                "sampleWarning": (
                    None
                    if query_count >= 10
                    else "Метрики рассчитаны по слишком маленькой выборке и подходят только для грубой проверки."
                ),
            },
            "baseline": self._finalize_metrics(baseline_scores),
            "personalized": self._finalize_metrics(personalized_scores),
        }
        payload = self._with_compat_metric_keys(payload)
        self._cache_signature = signature
        self._cache_payload = payload
        self._persist_cache(signature, payload)
        return payload

    def _load_persisted_cache(
        self, signature: tuple[int, int, int]
    ) -> dict[str, Any] | None:
        row = self.db.query_one(
            """
            SELECT signature_json, payload_json
            FROM runtime_cache
            WHERE cache_key = 'metrics_summary'
            """
        )
        if not row:
            return None
        try:
            stored_signature = tuple(json.loads(row["signature_json"]))
            if stored_signature != signature:
                return None
            return json.loads(row["payload_json"])
        except Exception:
            return None

    def _persist_cache(self, signature: tuple[int, int, int], payload: dict[str, Any]) -> None:
        self.db.execute(
            """
            INSERT INTO runtime_cache (cache_key, signature_json, payload_json, updated_at)
            VALUES ('metrics_summary', ?, ?, ?)
            ON CONFLICT(cache_key) DO UPDATE SET
                signature_json = excluded.signature_json,
                payload_json = excluded.payload_json,
                updated_at = excluded.updated_at
            """,
            [
                json.dumps(list(signature), ensure_ascii=False),
                json.dumps(payload, ensure_ascii=False),
                self._utcnow(),
            ],
        )

    def _utcnow(self) -> str:
        from app.storage.sqlite_db import utcnow_iso

        return utcnow_iso()

    def _collect_metrics(
        self,
        bucket: dict[str, list[float]],
        results: list[dict[str, Any]],
        expected_ste_id: str,
    ) -> None:
        rank = None
        for index, item in enumerate(results, start=1):
            if item["product"]["id"] == expected_ste_id:
                rank = index
                break

        bucket["recall20"].append(1.0 if rank and rank <= 20 else 0.0)
        bucket["success5"].append(1.0 if rank and rank <= 5 else 0.0)
        bucket["mrr10"].append((1.0 / rank) if rank and rank <= 10 else 0.0)
        bucket["ndcg10"].append(
            (1.0 / math.log2(rank + 1.0)) if rank and rank <= 10 else 0.0
        )

    def _finalize_metrics(self, bucket: dict[str, list[float]]) -> dict[str, float]:
        return {
            "ndcg10": round(mean(bucket["ndcg10"]) if bucket["ndcg10"] else 0.0, 4),
            "mrr10": round(mean(bucket["mrr10"]) if bucket["mrr10"] else 0.0, 4),
            "recall20": round(
                mean(bucket["recall20"]) if bucket["recall20"] else 0.0, 4
            ),
            "success5": round(
                mean(bucket["success5"]) if bucket["success5"] else 0.0, 4
            ),
        }

    def _with_compat_metric_keys(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Expose both compact and UI-friendly metric names."""
        normalized = dict(payload)
        for section_name in ("baseline", "personalized"):
            section = dict(normalized.get(section_name, {}))
            if not section:
                normalized[section_name] = section
                continue
            key_pairs = {
                "ndcg10": "ndcgAt10",
                "mrr10": "mrrAt10",
                "recall20": "recallAt20",
                "success5": "successAt5",
            }
            for compact_key, compat_key in key_pairs.items():
                if compact_key in section and compat_key not in section:
                    section[compat_key] = section[compact_key]
                elif compat_key in section and compact_key not in section:
                    section[compact_key] = section[compat_key]
            normalized[section_name] = section
        return normalized
