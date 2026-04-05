"""Fast query understanding pipeline for runtime search."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.config import settings
from app.services.search_nlp.morphology import MorphologyService
from app.services.search_nlp.normalizer import QueryNormalizer
from app.services.search_nlp.spellcheck import SpellCandidate, SpellcheckService
from app.services.search_nlp.synonyms import SynonymResolver
from app.services.text_utils import (
    looks_like_unit,
    normalize_text,
    parse_numeric_value,
    tokenize,
)
from app.storage.sqlite_db import SQLiteDatabase


@dataclass
class QueryUnderstandingResult:
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
    lemma_mappings: list[dict[str, Any]] = field(default_factory=list)
    spell_candidates: list[dict[str, Any]] = field(default_factory=list)
    protected_tokens: list[str] = field(default_factory=list)


class QueryUnderstandingService:
    """Caches term dictionary + synonym rules and parses incoming queries."""

    def __init__(self, db: SQLiteDatabase) -> None:
        self.db = db
        self.normalizer = QueryNormalizer()
        self.morphology = MorphologyService()
        self._revision: tuple[str, str] | None = None
        self._term_dictionary: dict[str, dict[str, Any]] = {}
        self._spellcheck = SpellcheckService({})
        self._synonyms = SynonymResolver([])

    def parse(self, query: str) -> QueryUnderstandingResult:
        self._refresh_if_needed()
        normalized = self.normalizer.normalize(query)
        corrections: list[dict[str, Any]] = []
        layout_corrections: list[dict[str, Any]] = []
        typo_corrections: list[dict[str, Any]] = []
        synonym_mappings: list[dict[str, Any]] = []
        lemma_mappings: list[dict[str, Any]] = []
        spell_candidates_payload: list[dict[str, Any]] = []
        protected_tokens: list[str] = []

        corrected_tokens: list[str] = []
        retrieval_tokens: list[str] = []

        for token in normalized.tokens:
            token_type = self._infer_requested_type(token)
            protected = self._is_protected_token(token, token_type)
            if protected:
                protected_tokens.append(token)

            resolved_token = token
            layout_variant = self._select_layout_variant(token, token_type)
            if layout_variant and layout_variant != token:
                resolved_token = layout_variant
                entry = {
                    "type": "keyboard_layout",
                    "from": token,
                    "to": layout_variant,
                    "keyboard": self._detect_layout_direction(token),
                }
                corrections.append(entry)
                layout_corrections.append(entry)

            exact_meta = self._term_dictionary.get(resolved_token)
            requested_type = token_type or (exact_meta["term_type"] if exact_meta else None)
            suggestions = self._spellcheck.suggest(
                resolved_token,
                protected=protected,
                term_type=requested_type,
            )
            if suggestions:
                spell_candidates_payload.append(
                    {
                        "token": token,
                        "candidates": [
                            {
                                "term": suggestion.term,
                                "score": suggestion.score,
                                "distance": suggestion.distance,
                                "source": suggestion.source,
                            }
                            for suggestion in suggestions[: settings.SPELLCHECK_MAX_SUGGESTIONS]
                        ],
                    }
                )

            replacement_mode = "exact"
            if suggestions:
                best = suggestions[0]
                if best.score >= 0.65:
                    resolved_token = best.term
                    replacement_mode = "strong"
                    typo_entry = {
                        "type": "typo",
                        "from": token,
                        "to": best.term,
                        "score": best.score,
                    }
                    corrections.append(typo_entry)
                    typo_corrections.append(typo_entry)
                elif best.score >= 0.55:
                    replacement_mode = "soft"
                    retrieval_tokens.append(best.term)

            term_type = self._term_dictionary.get(resolved_token, {}).get(
                "term_type",
                requested_type or "token",
            )
            lemma = self.morphology.lemma(resolved_token, str(term_type))
            if lemma and lemma != resolved_token:
                lemma_mappings.append(
                    {
                        "from": resolved_token,
                        "to": lemma,
                    }
                )
                retrieval_tokens.append(lemma)

            corrected_tokens.append(resolved_token)
            retrieval_tokens.append(resolved_token)
            if replacement_mode == "soft":
                retrieval_tokens.append(token)

        expanded_retrieval, applied_synonyms, runtime_synonym_mappings = self._synonyms.expand(
            retrieval_tokens
        )
        synonym_mappings.extend(runtime_synonym_mappings)

        numeric_tokens = list(normalized.numeric_tokens)
        for token in corrected_tokens:
            numeric_value, _ = parse_numeric_value(token)
            if numeric_value is not None:
                numeric_tokens.append(numeric_value)

        final_retrieval_tokens = list(dict.fromkeys(tokenize(" ".join(expanded_retrieval))))
        if not final_retrieval_tokens:
            final_retrieval_tokens = list(dict.fromkeys(expanded_retrieval))

        return QueryUnderstandingResult(
            original_query=query,
            normalized_query=normalized.normalized_query,
            corrected_query=" ".join(corrected_tokens),
            corrected_tokens=corrected_tokens,
            retrieval_tokens=final_retrieval_tokens,
            numeric_tokens=list(dict.fromkeys(numeric_tokens)),
            corrections=corrections,
            applied_synonyms=applied_synonyms,
            layout_corrections=layout_corrections,
            typo_corrections=typo_corrections,
            synonym_mappings=synonym_mappings,
            lemma_mappings=lemma_mappings,
            spell_candidates=spell_candidates_payload,
            protected_tokens=protected_tokens,
        )

    def _refresh_if_needed(self) -> None:
        row = self.db.query_one(
            """
            SELECT
                COALESCE((SELECT MAX(updated_at) FROM term_dictionary), '') AS dict_revision,
                COALESCE((SELECT MAX(updated_at) FROM synonym_rules), '') AS synonym_revision
            """
        )
        revision = (
            str(row["dict_revision"] if row else ""),
            str(row["synonym_revision"] if row else ""),
        )
        if revision == self._revision:
            return

        rows = self.db.query_all(
            """
            SELECT term, lemma, doc_freq, term_type, source_mask
            FROM term_dictionary
            """
        )
        self._term_dictionary = {
            normalize_text(row["term"]): {
                "lemma": normalize_text(row["lemma"]),
                "doc_freq": int(row["doc_freq"]),
                "term_type": str(row["term_type"]),
                "source_mask": int(row["source_mask"]),
            }
            for row in rows
        }
        self._spellcheck = SpellcheckService(self._term_dictionary)
        self._synonyms = SynonymResolver(
            [
                {
                    "alias": row["alias"],
                    "canonical": row["canonical"],
                    "scope": row["scope"],
                    "status": row["status"],
                }
                for row in self.db.query_all(
                    """
                    SELECT alias, canonical, scope, status
                    FROM synonym_rules
                    WHERE status = 'active'
                    """
                )
            ]
        )
        self._revision = revision

    def _infer_requested_type(self, token: str) -> str:
        normalized = normalize_text(token)
        meta = self._term_dictionary.get(normalized)
        if meta:
            return str(meta["term_type"])
        if looks_like_unit(normalized):
            return "unit"
        if any(character.isdigit() for character in normalized):
            return "model"
        return "token"

    def _is_protected_token(self, token: str, token_type: str) -> bool:
        normalized = normalize_text(token)
        if len(normalized) < 4:
            return True
        if token_type in {"brand", "model", "unit"}:
            return True
        if looks_like_unit(normalized):
            return True
        return any(character.isdigit() for character in normalized) and any(
            character.isalpha() for character in normalized
        )

    def _select_layout_variant(self, token: str, requested_type: str) -> str | None:
        variants: list[tuple[float, str]] = []
        for variant in self.normalizer.keyboard_variants(token):
            meta = self._term_dictionary.get(variant)
            if not meta:
                continue
            type_bonus = 1.0 if meta["term_type"] == requested_type else 0.7
            variants.append((float(meta["doc_freq"]) * type_bonus, variant))
        if not variants:
            return None
        variants.sort(key=lambda item: (-item[0], item[1]))
        return variants[0][1]

    def _detect_layout_direction(self, source: str) -> str:
        normalized = normalize_text(source)
        if any("a" <= char <= "z" for char in normalized) and not any("а" <= char <= "я" for char in normalized):
            return "en_to_ru"
        if any("а" <= char <= "я" for char in normalized) and not any("a" <= char <= "z" for char in normalized):
            return "ru_to_en"
        return "mixed"
