"""SQLite-backed search service with dynamic personalization."""

from __future__ import annotations

import json
import hashlib
import math
import re
import uuid
from dataclasses import dataclass
from difflib import SequenceMatcher
from time import perf_counter
from typing import Any

try:  # pragma: no cover - optional dependency path
    from rapidfuzz import fuzz, process
except Exception:  # pragma: no cover
    fuzz = None
    process = None

from app.config import settings
from app.services.text_utils import (
    SYNONYM_MAP,
    bm25_to_score,
    expand_synonyms,
    keyboard_layout_variants,
    normalize_text,
    parse_numeric_value,
    tokenize,
)
from app.storage.sqlite_db import SQLiteDatabase, utcnow_iso


EVENT_WEIGHTS = {
    "result_opened": 0.45,
    "result_saved": 1.1,
    "marked_relevant": 1.8,
    "marked_irrelevant": -4.5,
    "result_bounced": -2.8,
}

FACTOR_TITLES = {
    "lexical": "Совпадение в поисковом индексе",
    "title_phrase": "Точная фраза в названии",
    "token_overlap": "Совпавшие слова в названии",
    "category": "Совпадение по категории",
    "attributes": "Совпадение по характеристикам",
    "numeric": "Совпадение по числовым значениям",
    "history_product": "История закупок по этому СТЕ",
    "history_category": "История закупок по категории",
    "history_tokens": "Совпадение с профилем заказчика",
    "session_product": "Влияние действий в текущей сессии",
    "session_category": "Влияние действий в текущей сессии по категории",
}

FTS_TERM_RE = re.compile(r"[a-z\u0400-\u04ff0-9]+", re.IGNORECASE)


@dataclass
class QueryContext:
    original_query: str
    normalized_query: str
    corrected_query: str
    corrected_tokens: list[str]
    retrieval_tokens: list[str]
    numeric_tokens: list[float]
    corrections: list[dict[str, Any]]
    applied_synonyms: list[str]
    layout_corrections: list[dict[str, Any]]
    typo_corrections: list[dict[str, Any]]
    synonym_mappings: list[dict[str, Any]]


class SearchService:
    """Handles query normalization, retrieval, reranking, and event logging."""

    def __init__(self, db: SQLiteDatabase) -> None:
        self.db = db

    def search(
        self,
        *,
        query: str,
        customer_id: str | None,
        session_id: str | None,
        limit: int,
        offset: int,
        include_debug: bool,
        filters: dict[str, list[str]] | None = None,
        enable_personalization: bool = True,
        track_event: bool = True,
    ) -> dict[str, Any]:
        started_at = perf_counter()
        context = self._normalize_query(query)
        normalization_ms = int((perf_counter() - started_at) * 1000)

        if not context.retrieval_tokens:
            return {
                "query": query,
                "normalizedQuery": context.normalized_query,
                "correctedQuery": context.corrected_query,
                "appliedSynonyms": context.applied_synonyms,
                "searchTermsUsed": context.retrieval_tokens,
                "queryInterpretation": self._query_interpretation_payload(context),
                "parserSource": "rule_based",
                "profileSummary": self.get_profile_summary(customer_id),
                "results": [],
                "facets": {},
                "appliedFilters": {},
                "totalCount": 0,
                "limit": limit,
                "offset": offset,
                "timingsMs": {
                    "normalize": normalization_ms,
                    "retrieve": 0,
                    "rerank": 0,
                    "total": normalization_ms,
                },
            }

        retrieval_started_at = perf_counter()
        candidate_pool = max(
            settings.SEARCH_CANDIDATES,
            offset + limit + 200,
            (offset + limit) * 6,
        )
        estimated_total = self._count_candidates(context.retrieval_tokens)
        candidates = self._retrieve_candidates(context.retrieval_tokens, candidate_pool)
        retrieval_ms = int((perf_counter() - retrieval_started_at) * 1000)

        overlay = (
            self._load_personalization_overlay(customer_id, session_id)
            if enable_personalization
            else None
        )

        rerank_started_at = perf_counter()
        ranked = [
            self._score_candidate(
                candidate,
                context,
                overlay=overlay,
                include_debug=include_debug,
            )
            for candidate in candidates
        ]
        ranked = [item for item in ranked if item["score"] > 0]
        ranked.sort(key=lambda item: (-item["score"], item["product"]["title"], item["product"]["id"]))
        active_filters = self._normalize_filters(filters or {})
        if active_filters:
            ranked = self._apply_filters(ranked, active_filters)
        facets = self._build_facets(ranked)
        total_count = len(ranked) if active_filters else max(len(ranked), estimated_total)
        rerank_ms = int((perf_counter() - rerank_started_at) * 1000)

        if track_event and session_id:
            self.record_event(
                event_type="search_submitted",
                session_id=session_id,
                customer_id=customer_id,
                product_id=None,
                query=query,
                position=None,
                dwell_ms=None,
            )

        return {
            "query": query,
            "normalizedQuery": context.normalized_query,
            "correctedQuery": context.corrected_query,
            "appliedSynonyms": context.applied_synonyms,
            "searchTermsUsed": context.retrieval_tokens,
            "queryInterpretation": self._query_interpretation_payload(context),
            "parserSource": "rule_based",
            "profileSummary": self.get_profile_summary(customer_id),
            "results": ranked[offset : offset + limit],
            "facets": facets,
            "appliedFilters": active_filters,
            "totalCount": total_count,
            "limit": limit,
            "offset": offset,
            "timingsMs": {
                "normalize": normalization_ms,
                "retrieve": retrieval_ms,
                "rerank": rerank_ms,
                "total": int((perf_counter() - started_at) * 1000),
            },
        }

    def analyze_query(self, query: str) -> dict[str, Any]:
        context = self._normalize_query(query)
        return {
            "query": query,
            "normalizedQuery": context.normalized_query,
            "correctedQuery": context.corrected_query,
            "appliedSynonyms": context.applied_synonyms,
            "searchTermsUsed": context.retrieval_tokens,
            "queryInterpretation": self._query_interpretation_payload(context),
            "parserSource": "rule_based",
        }

    def recommendations(
        self,
        *,
        customer_id: str | None,
        session_id: str | None,
        limit: int,
        offset: int,
        include_debug: bool,
        track_event: bool = True,
    ) -> dict[str, Any]:
        started_at = perf_counter()

        retrieval_started_at = perf_counter()
        candidate_pool = max(
            180,
            offset + limit + 60,
            (offset + limit) * 4,
        )
        candidates = self._retrieve_recommendation_candidates(customer_id, candidate_pool)
        retrieval_ms = int((perf_counter() - retrieval_started_at) * 1000)

        overlay = self._load_personalization_overlay(customer_id, session_id)

        rerank_started_at = perf_counter()
        ranked = [
            self._score_recommendation_candidate(
                candidate,
                overlay=overlay,
                include_debug=include_debug,
            )
            for candidate in candidates
        ]
        ranked = [item for item in ranked if item["score"] > 0]
        ranked.sort(key=lambda item: (-item["score"], item["product"]["title"], item["product"]["id"]))
        ranked = self._blend_recommendation_feed(ranked, customer_id)
        rerank_ms = int((perf_counter() - rerank_started_at) * 1000)

        if track_event and session_id:
            self.record_event(
                event_type="search_submitted",
                session_id=session_id,
                customer_id=customer_id,
                product_id=None,
                query=None,
                position=None,
                dwell_ms=None,
            )

        parser_source = "personalized_feed" if customer_id else "popular_feed"

        return {
            "query": "",
            "normalizedQuery": "",
            "correctedQuery": "",
            "appliedSynonyms": [],
            "searchTermsUsed": [],
            "queryInterpretation": self._empty_query_interpretation(),
            "parserSource": parser_source,
            "profileSummary": self.get_profile_summary(customer_id),
            "results": ranked[offset : offset + limit],
            "facets": {},
            "appliedFilters": {},
            "totalCount": len(ranked),
            "limit": limit,
            "offset": offset,
            "timingsMs": {
                "normalize": 0,
                "retrieve": retrieval_ms,
                "rerank": rerank_ms,
                "total": int((perf_counter() - started_at) * 1000),
            },
        }

    def get_product(self, product_id: str) -> dict[str, Any] | None:
        product = self.db.query_one(
            """
            SELECT * FROM products WHERE ste_id = ?
            """,
            [product_id],
        )
        if not product:
            return None
        attributes = self.db.query_all(
            """
            SELECT attr_name_raw, attr_value_raw, numeric_value, unit
            FROM product_attributes
            WHERE ste_id = ?
            ORDER BY id
            """,
            [product_id],
        )
        return self._product_payload(product, attributes)

    def record_event(
        self,
        *,
        event_type: str,
        session_id: str | None,
        customer_id: str | None,
        product_id: str | None,
        query: str | None,
        position: int | None,
        dwell_ms: int | None,
        note: str | None = None,
    ) -> dict[str, Any]:
        supported_events = {
            "search_submitted",
            "result_opened",
            "result_bounced",
            "result_saved",
            "marked_relevant",
            "marked_irrelevant",
        }
        if event_type not in supported_events:
            raise ValueError("Unsupported event type.")

        category_norm = None
        if product_id:
            row = self.db.query_one(
                "SELECT category_norm FROM products WHERE ste_id = ?",
                [product_id],
            )
            category_norm = row["category_norm"] if row else None

        event_id = str(uuid.uuid4())
        self.db.execute(
            """
            INSERT INTO events (
                id, session_id, customer_inn, event_type, ste_id, category_norm,
                query, position, dwell_ms, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                event_id,
                session_id,
                customer_id,
                event_type,
                product_id,
                category_norm,
                query,
                position,
                dwell_ms,
                utcnow_iso(),
            ],
        )

        if event_type == "result_saved" and product_id:
            self.db.execute(
                """
                INSERT INTO saved_results (id, session_id, customer_inn, ste_id, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    str(uuid.uuid4()),
                    session_id,
                    customer_id,
                    product_id,
                    note,
                    utcnow_iso(),
                ],
            )

        return {"success": True, "eventId": event_id}

    def list_demo_profiles(self) -> list[dict[str, Any]]:
        rows = self.db.query_all("SELECT * FROM demo_profiles ORDER BY sort_order ASC")
        return [
            {
                "customerId": row["customer_inn"],
                "label": row["label"],
                "summary": json.loads(row["summary_json"]),
            }
            for row in rows
        ]

    def get_profile_summary(self, customer_id: str | None) -> dict[str, Any] | None:
        if not customer_id:
            return None

        row = self.db.query_one(
            "SELECT * FROM customer_profiles WHERE customer_inn = ?",
            [customer_id],
        )
        if not row:
            return None

        return {
            "customerId": row["customer_inn"],
            "customerName": row["customer_name"],
            "purchaseCount": row["purchase_count"],
            "matchedPurchaseCount": row["matched_purchase_count"],
            "totalSpend": row["total_spend"],
            "lastPurchaseAt": row["last_purchase_at"],
            "topCategories": json.loads(row["top_categories_json"]),
            "topProducts": json.loads(row["top_ste_ids_json"]),
        }

    def _normalize_query(self, query: str) -> QueryContext:
        normalized_query = normalize_text(query)
        tokens = tokenize(normalized_query)
        lexicon_rows = self.db.query_all(
            "SELECT term, doc_freq FROM lexicon ORDER BY doc_freq DESC LIMIT ?",
            [settings.LEXICON_LIMIT],
        )
        lexicon = {row["term"]: int(row["doc_freq"]) for row in lexicon_rows}
        lexicon_terms = list(lexicon.keys())
        prefix_candidate_cache: dict[str, list[str]] = {}

        corrections: list[dict[str, Any]] = []
        corrected_tokens: list[str] = []
        synonym_rewrites: list[str] = []
        layout_corrections: list[dict[str, Any]] = []
        typo_corrections: list[dict[str, Any]] = []
        synonym_mappings: list[dict[str, Any]] = []

        for token in tokens:
            resolved = self._resolve_query_token(
                token,
                lexicon=lexicon,
                lexicon_terms=lexicon_terms,
                prefix_candidate_cache=prefix_candidate_cache,
            )
            corrected_tokens.append(resolved["displayToken"])
            corrections.extend(resolved["corrections"])
            layout_corrections.extend(resolved["layoutCorrections"])
            typo_corrections.extend(resolved["typoCorrections"])
            synonym_mappings.extend(resolved["synonymMappings"])
            synonym_rewrites.extend(resolved["synonymRewrites"])

        retrieval_tokens, applied_synonyms = expand_synonyms(corrected_tokens)
        applied_synonyms = list(dict.fromkeys([*synonym_rewrites, *applied_synonyms]))

        numeric_tokens: list[float] = []
        for token in corrected_tokens:
            numeric_value, _ = parse_numeric_value(token)
            if numeric_value is not None:
                numeric_tokens.append(numeric_value)

        return QueryContext(
            original_query=query,
            normalized_query=normalized_query,
            corrected_query=" ".join(corrected_tokens),
            corrected_tokens=corrected_tokens,
            retrieval_tokens=retrieval_tokens,
            numeric_tokens=numeric_tokens,
            corrections=corrections,
            applied_synonyms=applied_synonyms,
            layout_corrections=layout_corrections,
            typo_corrections=typo_corrections,
            synonym_mappings=synonym_mappings,
        )

    def _resolve_query_token(
        self,
        token: str,
        *,
        lexicon: dict[str, int],
        lexicon_terms: list[str],
        prefix_candidate_cache: dict[str, list[str]],
    ) -> dict[str, Any]:
        display_token = token
        corrections: list[dict[str, Any]] = []
        layout_corrections: list[dict[str, Any]] = []
        typo_corrections: list[dict[str, Any]] = []
        synonym_mappings: list[dict[str, Any]] = []
        synonym_rewrites: list[str] = []

        layout_variant = self._select_layout_variant(token, lexicon)
        if layout_variant and layout_variant != token:
            display_token = layout_variant
            layout_entry = {
                "type": "keyboard_layout",
                "from": token,
                "to": layout_variant,
                "keyboard": self._detect_layout_direction(token),
            }
            corrections.append(layout_entry)
            layout_corrections.append(layout_entry)

        canonical = SYNONYM_MAP.get(display_token, display_token)
        known_token = display_token in lexicon or canonical in lexicon
        if not known_token and len(display_token) >= 4:
            best = self._best_lexicon_match(display_token, lexicon_terms)
            if best is None:
                prefix_candidates = self._load_prefix_lexicon_candidates(
                    display_token, prefix_candidate_cache
                )
                best = self._best_lexicon_match(display_token, prefix_candidates)
            if best is not None:
                if best["term"] == display_token:
                    best = None
            if best is not None:
                display_token = best["term"]
                typo_entry = {
                    "type": "typo",
                    "from": token,
                    "to": best["term"],
                    "score": best["score"],
                }
                corrections.append(typo_entry)
                typo_corrections.append(typo_entry)

        canonical = SYNONYM_MAP.get(display_token, display_token)
        if canonical != display_token:
            synonym_entry = {
                "type": "synonym",
                "from": display_token,
                "to": canonical,
            }
            synonym_mappings.append(synonym_entry)
            synonym_rewrites.append(f"{display_token} -> {canonical}")

        return {
            "displayToken": display_token,
            "corrections": corrections,
            "layoutCorrections": layout_corrections,
            "typoCorrections": typo_corrections,
            "synonymMappings": synonym_mappings,
            "synonymRewrites": synonym_rewrites,
        }

    def _select_layout_variant(self, token: str, lexicon: dict[str, int]) -> str | None:
        variants = []
        for variant in keyboard_layout_variants(token):
            canonical = SYNONYM_MAP.get(variant, variant)
            score = lexicon.get(variant, 0) + lexicon.get(canonical, 0)
            if score > 0:
                variants.append((score, variant))
        if not variants:
            return None
        variants.sort(key=lambda item: (-item[0], item[1]))
        return variants[0][1]

    def _detect_layout_direction(self, source: str) -> str:
        if re.search(r"[a-z]", source, re.IGNORECASE) and not re.search(
            r"[\u0400-\u04ff]", source, re.IGNORECASE
        ):
            return "en_to_ru"
        if re.search(r"[\u0400-\u04ff]", source, re.IGNORECASE) and not re.search(
            r"[a-z]", source, re.IGNORECASE
        ):
            return "ru_to_en"
        return "mixed"

    def _query_interpretation_payload(self, context: QueryContext) -> dict[str, Any]:
        return {
            "correctedTokens": context.corrected_tokens,
            "retrievalTokens": context.retrieval_tokens,
            "layoutCorrections": context.layout_corrections,
            "typoCorrections": context.typo_corrections,
            "synonymMappings": context.synonym_mappings,
        }

    def _empty_query_interpretation(self) -> dict[str, Any]:
        return {
            "correctedTokens": [],
            "retrievalTokens": [],
            "layoutCorrections": [],
            "typoCorrections": [],
            "synonymMappings": [],
        }

    def _best_lexicon_match(self, token: str, choices: list[str]) -> dict[str, Any] | None:
        if not choices:
            return None

        if process is not None and fuzz is not None:
            best = process.extractOne(
                token,
                choices,
                scorer=fuzz.ratio,
                score_cutoff=88,
            )
            if best:
                return {"term": best[0], "score": round(float(best[1]), 2)}
            return None

        best_term = None
        best_score = 0.0
        for choice in choices:
            score = SequenceMatcher(a=token, b=choice).ratio() * 100
            if score >= 88 and score > best_score:
                best_term = choice
                best_score = score
        if best_term is None:
            return None
        return {"term": best_term, "score": round(best_score, 2)}

    def _load_prefix_lexicon_candidates(
        self,
        token: str,
        cache: dict[str, list[str]],
    ) -> list[str]:
        for prefix_length in (5, 4, 3):
            if len(token) < prefix_length:
                continue
            prefix = token[:prefix_length]
            if prefix not in cache:
                rows = self.db.query_all(
                    """
                    SELECT term
                    FROM lexicon
                    WHERE term LIKE ?
                    ORDER BY doc_freq DESC
                    LIMIT 128
                    """,
                    [f"{prefix}%"],
                )
                cache[prefix] = [row["term"] for row in rows]
            if cache[prefix]:
                return cache[prefix]
        return []

    def _candidate_queries(self, tokens: list[str]) -> list[str]:
        search_tokens = self._prepare_fts_terms(tokens)
        if not search_tokens:
            return []

        deduped_tokens = list(dict.fromkeys(search_tokens[:8]))
        queries = [" ".join(f'"{token}"' for token in deduped_tokens)]
        if len(deduped_tokens) > 1:
            queries.append(" OR ".join(f'"{token}"' for token in deduped_tokens))
        queries.append(" OR ".join(f"{token}*" for token in deduped_tokens[:6]))
        return list(dict.fromkeys(query for query in queries if query))

    def _count_candidates(self, tokens: list[str]) -> int:
        for query in self._candidate_queries(tokens):
            row = self.db.query_one(
                """
                SELECT COUNT(*) AS count
                FROM product_fts
                WHERE product_fts MATCH ?
                """,
                [query],
            )
            if row and int(row["count"]) > 0:
                return int(row["count"])
        return 0

    def _retrieve_candidates(self, tokens: list[str], candidate_limit: int) -> list[dict[str, Any]]:
        rows: list[Any] = []
        for query in self._candidate_queries(tokens):
            rows = self.db.query_all(
                """
                SELECT
                    p.*,
                    bm25(product_fts) AS bm25
                FROM product_fts
                JOIN products p ON p.ste_id = product_fts.ste_id
                WHERE product_fts MATCH ?
                ORDER BY bm25(product_fts)
                LIMIT ?
                """,
                [query, candidate_limit],
            )
            if rows:
                break

        attr_map = self._load_attribute_map([row["ste_id"] for row in rows])
        return [
            {
                "product": row,
                "bm25": float(row["bm25"]),
                "attributes": attr_map.get(row["ste_id"], []),
            }
            for row in rows
        ]

    def _retrieve_recommendation_candidates(
        self,
        customer_id: str | None,
        candidate_limit: int,
    ) -> list[dict[str, Any]]:
        candidate_rows: dict[str, dict[str, Any]] = {}

        if customer_id:
            history_rows = self.db.query_all(
                """
                SELECT
                    p.*,
                    css.weight AS history_weight,
                    0.0 AS category_weight,
                    0 AS popularity
                FROM customer_ste_stats css
                JOIN products p ON p.ste_id = css.ste_id
                WHERE css.customer_inn = ?
                ORDER BY css.weight DESC, p.updated_at DESC
                LIMIT ?
                """,
                [customer_id, candidate_limit],
            )
            self._merge_recommendation_rows(candidate_rows, history_rows)

            category_rows = self.db.query_all(
                """
                SELECT category_norm, weight
                FROM customer_category_stats
                WHERE customer_inn = ?
                ORDER BY weight DESC
                LIMIT 6
                """,
                [customer_id],
            )
            if category_rows:
                category_values = [row["category_norm"] for row in category_rows]
                category_weights = {
                    row["category_norm"]: float(row["weight"]) for row in category_rows
                }
                placeholders = ",".join("?" for _ in category_values)
                params = [*category_values, candidate_limit * 2]
                category_candidates = self.db.query_all(
                    f"""
                    SELECT
                        p.*,
                        0.0 AS history_weight,
                        0.0 AS category_weight,
                        COUNT(c.contract_key) AS popularity
                    FROM products p
                    LEFT JOIN contracts c ON c.ste_id = p.ste_id
                    WHERE p.category_norm IN ({placeholders})
                    GROUP BY p.ste_id
                    ORDER BY popularity DESC, p.updated_at DESC
                    LIMIT ?
                    """,
                    params,
                )
                for row in category_candidates:
                    entry = candidate_rows.setdefault(
                        row["ste_id"],
                        {
                            "product": row,
                            "historyWeight": 0.0,
                            "categoryWeight": 0.0,
                            "popularity": 0,
                        },
                    )
                    entry["product"] = row
                    entry["categoryWeight"] = max(
                        entry["categoryWeight"],
                        category_weights.get(row["category_norm"], 0.0),
                    )
                    entry["popularity"] = max(entry["popularity"], int(row["popularity"] or 0))

        if len(candidate_rows) < candidate_limit:
            popular_rows = self.db.query_all(
                """
                SELECT
                    p.*,
                    0.0 AS history_weight,
                    0.0 AS category_weight,
                    COUNT(c.contract_key) AS popularity
                FROM contracts c
                JOIN products p ON p.ste_id = c.ste_id
                WHERE c.matched_product = 1
                GROUP BY p.ste_id
                ORDER BY popularity DESC, p.updated_at DESC
                LIMIT ?
                """,
                [candidate_limit],
            )
            self._merge_recommendation_rows(candidate_rows, popular_rows)

        ranked_entries = sorted(
            candidate_rows.values(),
            key=lambda entry: (
                -self._recommendation_proxy_score(entry),
                -int(entry.get("popularity", 0)),
                entry["product"]["title_raw"],
                entry["product"]["ste_id"],
            ),
        )
        selected_entries = ranked_entries[: candidate_limit * 4]
        attr_map = self._load_attribute_map([entry["product"]["ste_id"] for entry in selected_entries])
        for entry in selected_entries:
            entry["attributes"] = attr_map.get(entry["product"]["ste_id"], [])
            entry["explorationBonus"] = self._stable_exploration_bonus(
                customer_id,
                entry["product"]["ste_id"],
                entry["product"]["category_norm"],
                has_direct_history=float(entry.get("historyWeight", 0.0)) > 0,
            )
        return selected_entries

    def _merge_recommendation_rows(
        self,
        candidate_rows: dict[str, dict[str, Any]],
        rows: list[Any],
    ) -> None:
        for row in rows:
            entry = candidate_rows.setdefault(
                row["ste_id"],
                {
                    "product": row,
                    "historyWeight": 0.0,
                    "categoryWeight": 0.0,
                    "popularity": 0,
                },
            )
            entry["product"] = row
            entry["historyWeight"] = max(
                entry["historyWeight"],
                float(row["history_weight"] or 0.0),
            )
            entry["categoryWeight"] = max(
                entry["categoryWeight"],
                float(row["category_weight"] or 0.0),
            )
            entry["popularity"] = max(entry["popularity"], int(row["popularity"] or 0))

    def _load_attribute_map(self, ste_ids: list[str]) -> dict[str, list[Any]]:
        if not ste_ids:
            return {}

        ste_ids = list(dict.fromkeys(ste_ids))
        placeholders = ",".join("?" for _ in ste_ids)
        attr_rows = self.db.query_all(
            f"""
            SELECT
                ste_id,
                attr_name_raw,
                attr_name_norm,
                attr_value_raw,
                attr_value_norm,
                numeric_value
            FROM product_attributes
            WHERE ste_id IN ({placeholders})
            """,
            ste_ids,
        )

        attr_map: dict[str, list[Any]] = {}
        for attr in attr_rows:
            attr_map.setdefault(attr["ste_id"], []).append(attr)
        return attr_map

    def _prepare_fts_terms(self, tokens: list[str]) -> list[str]:
        prepared: list[str] = []
        for token in tokens:
            prepared.extend(part for part in FTS_TERM_RE.findall(token) if part)
        return list(dict.fromkeys(prepared))

    def _load_personalization_overlay(
        self,
        customer_id: str | None,
        session_id: str | None,
    ) -> dict[str, Any]:
        profile_categories: dict[str, float] = {}
        profile_products: dict[str, float] = {}
        profile_tokens: dict[str, float] = {}

        if customer_id:
            profile_row = self.db.query_one(
                """
                SELECT token_weights_json
                FROM customer_profiles
                WHERE customer_inn = ?
                """,
                [customer_id],
            )
            if profile_row and profile_row["token_weights_json"]:
                for item in json.loads(profile_row["token_weights_json"]):
                    profile_tokens[item["value"]] = float(item["weight"])

            for row in self.db.query_all(
                "SELECT category_norm, weight FROM customer_category_stats WHERE customer_inn = ?",
                [customer_id],
            ):
                profile_categories[row["category_norm"]] = float(row["weight"])

            for row in self.db.query_all(
                "SELECT ste_id, weight FROM customer_ste_stats WHERE customer_inn = ?",
                [customer_id],
            ):
                profile_products[row["ste_id"]] = float(row["weight"])

        session_products: dict[str, float] = {}
        session_categories: dict[str, float] = {}
        if session_id:
            event_rows = self.db.query_all(
                """
                SELECT event_type, ste_id, category_norm
                FROM events
                WHERE session_id = ?
                ORDER BY created_at DESC
                LIMIT 250
                """,
                [session_id],
            )
            for row in event_rows:
                delta = EVENT_WEIGHTS.get(row["event_type"], 0.0)
                if row["ste_id"]:
                    session_products[row["ste_id"]] = (
                        session_products.get(row["ste_id"], 0.0) + delta
                    )
                if row["category_norm"]:
                    session_categories[row["category_norm"]] = (
                        session_categories.get(row["category_norm"], 0.0) + delta * 0.6
                    )

        return {
            "profileCategories": profile_categories,
            "profileProducts": profile_products,
            "profileTokens": profile_tokens,
            "sessionProducts": session_products,
            "sessionCategories": session_categories,
        }

    def _recommendation_proxy_score(self, entry: dict[str, Any]) -> float:
        """Mix popularity, category affinity, and direct history before final rerank."""
        history_weight = float(entry.get("historyWeight", 0.0))
        category_weight = float(entry.get("categoryWeight", 0.0))
        popularity = max(0, int(entry.get("popularity", 0)))
        proxy = 0.42 * math.log1p(popularity)
        proxy += 0.28 * math.log1p(category_weight)
        proxy += 0.22 * math.log1p(history_weight)
        if history_weight <= 0 and category_weight > 0:
            proxy += 0.12
        return proxy

    def _stable_exploration_bonus(
        self,
        customer_id: str | None,
        ste_id: str,
        category_norm: str,
        *,
        has_direct_history: bool,
    ) -> float:
        seed = f"{customer_id or 'global'}::{category_norm}::{ste_id}"
        digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
        value = int(digest[:8], 16) / 0xFFFFFFFF
        ceiling = 0.04 if has_direct_history else 0.18
        return round(value * ceiling, 4)

    def _score_candidate(
        self,
        candidate: dict[str, Any],
        context: QueryContext,
        *,
        overlay: dict[str, Any] | None,
        include_debug: bool,
    ) -> dict[str, Any]:
        row = candidate["product"]
        attributes = self._dedupe_attributes(candidate["attributes"])
        title_norm = row["title_norm"]
        category_norm = row["category_norm"]
        search_text = row["search_text"]

        factors: list[dict[str, Any]] = []
        score = bm25_to_score(candidate["bm25"]) * 2.0
        factors.append(
            {
                "type": "lexical",
                "value": round(score, 4),
                "reason": "Совпадение в полнотекстовом индексе",
            }
        )

        if context.corrected_query and context.corrected_query in title_norm:
            score += 1.2
            factors.append(
                {
                    "type": "title_phrase",
                    "value": 1.2,
                    "reason": "Точная фраза запроса найдена в названии",
                }
            )

        title_tokens = set(tokenize(title_norm))
        query_tokens = [token for token in context.retrieval_tokens if token]
        matched_tokens = [token for token in query_tokens if token in title_tokens]
        category_matched = any(token in category_norm for token in query_tokens)
        if matched_tokens:
            token_bonus = min(0.9, 0.18 * len(set(matched_tokens)))
            score += token_bonus
            factors.append(
                {
                    "type": "token_overlap",
                    "value": round(token_bonus, 4),
                    "reason": f"Совпавшие слова в названии: {', '.join(sorted(set(matched_tokens))[:6])}",
                }
            )

        if category_matched:
            score += 0.6
            factors.append(
                {
                    "type": "category",
                    "value": 0.6,
                    "reason": f"Категория совпала: {row['category_raw']}",
                }
            )

        attr_matches = 0
        attr_reason: list[str] = []
        for attr in attributes:
            if any(
                token in attr["attr_name_norm"] or token in attr["attr_value_norm"]
                for token in query_tokens
            ):
                attr_matches += 1
                attr_reason.append(f"{attr['attr_name_raw']}={attr['attr_value_raw']}")
        if attr_matches:
            attr_bonus = min(1.2, 0.25 * attr_matches)
            score += attr_bonus
            factors.append(
                {
                    "type": "attributes",
                    "value": round(attr_bonus, 4),
                    "reason": f"Совпавшие характеристики: {'; '.join(attr_reason[:3])}",
                }
            )

        numeric_matches = 0
        for numeric_value in context.numeric_tokens:
            for attr in attributes:
                if attr["numeric_value"] is None:
                    continue
                if abs(float(attr["numeric_value"]) - numeric_value) <= 0.01:
                    numeric_matches += 1
                    break
        if numeric_matches:
            numeric_bonus = min(1.0, 0.5 * numeric_matches)
            score += numeric_bonus
            factors.append(
                {
                    "type": "numeric",
                    "value": round(numeric_bonus, 4),
                    "reason": f"Совпало числовых ограничений: {numeric_matches}",
                }
            )

        if overlay:
            relevance_gate = min(
                1.0,
                0.2
                + 0.16 * len(set(matched_tokens))
                + 0.12 * attr_matches
                + 0.18 * numeric_matches
                + (0.18 if context.corrected_query and context.corrected_query in title_norm else 0.0)
                + (0.12 if category_matched else 0.0),
            )
            product_weight = overlay["profileProducts"].get(row["ste_id"], 0.0)
            if product_weight > 0:
                bonus = min(0.75, 0.28 * math.log1p(product_weight)) * relevance_gate
                score += bonus
                factors.append(
                    {
                        "type": "history_product",
                        "value": round(bonus, 4),
                        "reason": "Заказчик уже покупал этот СТЕ",
                    }
                )

            category_weight = overlay["profileCategories"].get(category_norm, 0.0)
            if category_weight > 0:
                bonus = min(0.55, 0.14 * math.log1p(category_weight)) * max(
                    0.45, relevance_gate
                )
                score += bonus
                factors.append(
                    {
                        "type": "history_category",
                        "value": round(bonus, 4),
                        "reason": "Заказчик часто покупает эту категорию",
                    }
                )

            token_hits: list[str] = []
            token_bonus = 0.0
            for token in dict.fromkeys(query_tokens):
                token_weight = overlay["profileTokens"].get(token, 0.0)
                if token_weight <= 0:
                    continue
                if token in search_text or token in title_norm or token in category_norm:
                    token_hits.append(token)
                    token_bonus += min(0.16, 0.015 * token_weight)
            if token_bonus > 0:
                token_bonus = min(0.45, token_bonus) * max(0.55, relevance_gate)
                score += token_bonus
                factors.append(
                    {
                        "type": "history_tokens",
                        "value": round(token_bonus, 4),
                        "reason": f"Профиль заказчика усилил термины: {', '.join(token_hits[:5])}",
                    }
                )

            session_delta = overlay["sessionProducts"].get(row["ste_id"], 0.0)
            if session_delta:
                score += session_delta
                factors.append(
                    {
                        "type": "session_product",
                        "value": round(session_delta, 4),
                        "reason": (
                            "Положительный сигнал в сессии поднял этот товар"
                            if session_delta > 0
                            else "Негативный сигнал в сессии понизил этот товар"
                        ),
                    }
                )

            session_category_delta = overlay["sessionCategories"].get(category_norm, 0.0)
            if session_category_delta:
                score += session_category_delta
                factors.append(
                    {
                        "type": "session_category",
                        "value": round(session_category_delta, 4),
                        "reason": (
                            "Положительный сигнал в сессии усилил категорию"
                            if session_category_delta > 0
                            else "Негативный сигнал в сессии ослабил категорию"
                        ),
                    }
                )

        score = round(score, 6)
        explanation_parts = [factor["reason"] for factor in factors if factor["value"] != 0]
        payload = {
            "product": self._product_payload(row, attributes),
            "score": score,
            "explanation": "; ".join(explanation_parts[:4]) or "Совпадение по поисковому индексу",
        }
        if include_debug:
            payload["scoreBreakdown"] = factors
            payload["corrections"] = context.corrections
        return payload

    def _score_recommendation_candidate(
        self,
        candidate: dict[str, Any],
        *,
        overlay: dict[str, Any] | None,
        include_debug: bool,
    ) -> dict[str, Any]:
        row = candidate["product"]
        attributes = self._dedupe_attributes(candidate.get("attributes", []))
        category_norm = row["category_norm"]
        search_text = row["search_text"]

        factors: list[dict[str, Any]] = []
        score = 0.2

        history_weight = float(candidate.get("historyWeight", 0.0))
        if history_weight > 0:
            bonus = min(1.15, 0.34 * math.log1p(history_weight))
            score += bonus
            factors.append(
                {
                    "type": "history_product",
                    "value": round(bonus, 4),
                    "reason": "Заказчик уже закупал этот СТЕ, поэтому товар поднят в базовой подборке.",
                }
            )

        category_weight = float(candidate.get("categoryWeight", 0.0))
        if category_weight > 0:
            bonus = min(0.95, 0.2 * math.log1p(category_weight))
            score += bonus
            factors.append(
                {
                    "type": "history_category",
                    "value": round(bonus, 4),
                    "reason": f"Категория входит в сильные предпочтения заказчика: {row['category_raw']}",
                }
            )

        popularity = int(candidate.get("popularity", 0))
        if popularity > 0:
            bonus = min(1.05, 0.16 * math.log1p(popularity))
            score += bonus
            factors.append(
                {
                    "type": "popular",
                    "value": round(bonus, 4),
                    "reason": "Товар часто встречается в закупках и подходит для стартовой витрины.",
                }
            )

        exploration_bonus = float(candidate.get("explorationBonus", 0.0))
        if exploration_bonus > 0:
            score += exploration_bonus
            factors.append(
                {
                    "type": "exploration",
                    "value": round(exploration_bonus, 4),
                    "reason": (
                        "В подборку добавлен близкий вариант из подходящей категории, чтобы не показывать только ранее купленные СТЕ."
                        if history_weight <= 0
                        else "Подборка слегка разнообразена, чтобы рядом с привычными СТЕ появлялись похожие варианты."
                    ),
                }
            )

        if overlay:
            profile_tokens = sorted(
                overlay["profileTokens"].items(),
                key=lambda item: (-item[1], item[0]),
            )[:12]
            token_hits: list[str] = []
            token_bonus = 0.0
            for token, token_weight in profile_tokens:
                if token in search_text:
                    token_hits.append(token)
                    token_bonus += min(0.12, 0.012 * token_weight)
            if token_bonus > 0:
                token_bonus = min(0.55, token_bonus)
                score += token_bonus
                factors.append(
                    {
                        "type": "history_tokens",
                        "value": round(token_bonus, 4),
                        "reason": f"Название и характеристики совпали с частыми терминами профиля: {', '.join(token_hits[:5])}",
                    }
                )

            session_delta = overlay["sessionProducts"].get(row["ste_id"], 0.0)
            if session_delta:
                score += session_delta
                factors.append(
                    {
                        "type": "session_product",
                        "value": round(session_delta, 4),
                        "reason": (
                            "Текущая сессия уже дала положительный сигнал по этому товару."
                            if session_delta > 0
                            else "Текущая сессия дала отрицательный сигнал по этому товару."
                        ),
                    }
                )

            session_category_delta = overlay["sessionCategories"].get(category_norm, 0.0)
            if session_category_delta:
                score += session_category_delta
                factors.append(
                    {
                        "type": "session_category",
                        "value": round(session_category_delta, 4),
                        "reason": (
                            "Действия в текущей сессии усилили эту категорию."
                            if session_category_delta > 0
                            else "Действия в текущей сессии ослабили эту категорию."
                        ),
                    }
                )

        score = round(score, 6)
        explanation_parts = [factor["reason"] for factor in factors if factor["value"] != 0]
        payload = {
            "product": self._product_payload(row, attributes),
            "score": score,
            "explanation": "; ".join(explanation_parts[:4])
            or "Подборка сформирована по истории закупок и популярности товара.",
            "_recommendationMeta": {
                "historyWeight": history_weight,
                "categoryWeight": category_weight,
                "popularity": popularity,
            },
        }
        if include_debug:
            payload["scoreBreakdown"] = factors
            payload["corrections"] = []
        return payload

    def _blend_recommendation_feed(
        self,
        ranked: list[dict[str, Any]],
        customer_id: str | None,
    ) -> list[dict[str, Any]]:
        if not customer_id:
            for item in ranked:
                item.pop("_recommendationMeta", None)
            return ranked

        direct_history: list[dict[str, Any]] = []
        related_category: list[dict[str, Any]] = []
        popular_only: list[dict[str, Any]] = []

        for item in ranked:
            meta = item.get("_recommendationMeta", {})
            history_weight = float(meta.get("historyWeight", 0.0))
            category_weight = float(meta.get("categoryWeight", 0.0))
            if history_weight > 0:
                direct_history.append(item)
            elif category_weight > 0:
                related_category.append(item)
            else:
                popular_only.append(item)

        blended: list[dict[str, Any]] = []
        while direct_history or related_category or popular_only:
            for bucket in (direct_history, related_category, direct_history, popular_only):
                if bucket:
                    blended.append(bucket.pop(0))
            if not related_category and not popular_only and direct_history:
                blended.extend(direct_history)
                break

        for item in blended:
            item.pop("_recommendationMeta", None)
        return blended

    def _product_payload(self, row, attributes) -> dict[str, Any]:
        unique_attributes = self._dedupe_attributes(attributes)
        return {
            "id": row["ste_id"],
            "title": row["title_raw"],
            "category": row["category_raw"],
            "brandGuess": row["brand_guess"],
            "modelGuess": row["model_guess"],
            "attributesRaw": row["attributes_raw"],
            "attributes": [
                {
                    "name": attr["attr_name_raw"],
                    "value": attr["attr_value_raw"],
                    "numericValue": attr["numeric_value"],
                }
                for attr in unique_attributes
            ],
        }

    def _dedupe_attributes(self, attributes: list[Any]) -> list[Any]:
        seen: set[tuple[str, str, str]] = set()
        unique_attributes: list[Any] = []
        for attr in attributes:
            name_norm = attr["attr_name_norm"] if "attr_name_norm" in attr.keys() else None
            name_raw = attr["attr_name_raw"] if "attr_name_raw" in attr.keys() else None
            value_norm = attr["attr_value_norm"] if "attr_value_norm" in attr.keys() else None
            value_raw = attr["attr_value_raw"] if "attr_value_raw" in attr.keys() else None
            numeric_value = attr["numeric_value"] if "numeric_value" in attr.keys() else None
            key = (
                name_norm or name_raw or "",
                value_norm or value_raw or "",
                "" if numeric_value is None else str(numeric_value),
            )
            if key in seen:
                continue
            seen.add(key)
            unique_attributes.append(attr)
        return unique_attributes

    def _normalize_filters(self, filters: dict[str, list[str]]) -> dict[str, list[str]]:
        normalized: dict[str, list[str]] = {}
        for key, values in filters.items():
            cleaned = [str(value).strip() for value in values if str(value).strip()]
            if cleaned:
                normalized[key] = list(dict.fromkeys(cleaned))
        return normalized

    def _apply_filters(
        self,
        ranked: list[dict[str, Any]],
        filters: dict[str, list[str]],
    ) -> list[dict[str, Any]]:
        categories = set(filters.get("categories", []))
        brands = set(filters.get("brands", []))
        attribute_pairs = set(filters.get("attributes", []))

        filtered: list[dict[str, Any]] = []
        for item in ranked:
            product = item["product"]
            attributes = product.get("attributes", [])
            if categories and product["category"] not in categories:
                continue
            if brands and (product.get("brandGuess") or "Без бренда") not in brands:
                continue
            if attribute_pairs:
                product_attribute_pairs = {
                    f"{attribute['name']}::{attribute['value']}" for attribute in attributes
                }
                if not attribute_pairs.issubset(product_attribute_pairs):
                    continue
            filtered.append(item)
        return filtered

    def _build_facets(self, ranked: list[dict[str, Any]]) -> dict[str, Any]:
        category_counts: dict[str, int] = {}
        brand_counts: dict[str, int] = {}
        attribute_groups: dict[str, dict[str, int]] = {}

        for item in ranked[:120]:
            product = item["product"]
            category = product["category"]
            brand = product.get("brandGuess") or "Без бренда"
            category_counts[category] = category_counts.get(category, 0) + 1
            brand_counts[brand] = brand_counts.get(brand, 0) + 1

            for attribute in product.get("attributes", [])[:8]:
                name = attribute["name"]
                value = attribute["value"]
                if len(value) > 64:
                    continue
                group = attribute_groups.setdefault(name, {})
                group[value] = group.get(value, 0) + 1

        top_attribute_groups = sorted(
            attribute_groups.items(),
            key=lambda item: (-sum(item[1].values()), item[0]),
        )[:4]

        return {
            "categories": [
                {"value": value, "count": count}
                for value, count in sorted(
                    category_counts.items(),
                    key=lambda item: (-item[1], item[0]),
                )[:8]
            ],
            "brands": [
                {"value": value, "count": count}
                for value, count in sorted(
                    brand_counts.items(),
                    key=lambda item: (-item[1], item[0]),
                )[:8]
            ],
            "attributes": [
                {
                    "name": name,
                    "values": [
                        {
                            "value": value,
                            "count": count,
                            "key": f"{name}::{value}",
                        }
                        for value, count in sorted(
                            values.items(),
                            key=lambda item: (-item[1], item[0]),
                        )[:6]
                    ],
                }
                for name, values in top_attribute_groups
            ],
        }
