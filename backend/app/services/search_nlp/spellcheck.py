"""Spell correction with SymSpell and deterministic fallback scoring."""

from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
import math
from typing import Any

try:  # pragma: no cover - optional dependency
    from rapidfuzz import fuzz, process
except Exception:  # pragma: no cover
    fuzz = None
    process = None

try:  # pragma: no cover - optional dependency
    from symspellpy import SymSpell, Verbosity
except Exception:  # pragma: no cover
    SymSpell = None
    Verbosity = None

from app.config import settings
from app.services.text_utils import normalize_text


@dataclass(frozen=True)
class SpellCandidate:
    term: str
    score: float
    distance: int
    doc_freq: int
    term_type: str
    source: str


class SpellcheckService:
    """Fast token spell correction with optional SymSpell support."""

    def __init__(self, term_dictionary: dict[str, dict[str, Any]]) -> None:
        self.term_dictionary = term_dictionary
        self._terms = list(term_dictionary.keys())
        self._symspell = None
        if SymSpell is not None:
            self._symspell = SymSpell(
                max_dictionary_edit_distance=settings.SPELLCHECK_MAX_EDIT_DISTANCE,
                prefix_length=7,
            )
            for term, meta in term_dictionary.items():
                try:
                    self._symspell.create_dictionary_entry(term, int(meta["doc_freq"]))
                except Exception:
                    continue

    def suggest(
        self,
        token: str,
        *,
        protected: bool,
        term_type: str | None = None,
        limit: int | None = None,
    ) -> list[SpellCandidate]:
        normalized = normalize_text(token)
        if protected or not normalized or normalized in self.term_dictionary:
            return []

        max_candidates = limit or settings.SPELLCHECK_MAX_SUGGESTIONS
        candidates: list[SpellCandidate] = []
        if self._symspell is not None and Verbosity is not None:
            try:
                suggestions = self._symspell.lookup(
                    normalized,
                    Verbosity.TOP,
                    max_edit_distance=settings.SPELLCHECK_MAX_EDIT_DISTANCE,
                    transfer_casing=False,
                    include_unknown=False,
                )
            except Exception:
                suggestions = []
            for suggestion in suggestions[:max_candidates]:
                meta = self.term_dictionary.get(suggestion.term)
                if not meta:
                    continue
                score = self._composite_score(
                    token=normalized,
                    candidate=suggestion.term,
                    doc_freq=int(meta["doc_freq"]),
                    candidate_type=str(meta["term_type"]),
                    requested_type=term_type,
                    raw_score=max(
                        0.0,
                        1.0
                        - (
                            float(getattr(suggestion, "distance", 0))
                            / max(1, len(normalized))
                        ),
                    ),
                )
                candidates.append(
                    SpellCandidate(
                        term=suggestion.term,
                        score=score,
                        distance=int(getattr(suggestion, "distance", 0)),
                        doc_freq=int(meta["doc_freq"]),
                        term_type=str(meta["term_type"]),
                        source="symspell",
                    )
                )

        if not candidates:
            candidates.extend(
                self._fallback_suggestions(
                    normalized,
                    requested_type=term_type,
                    limit=max_candidates,
                )
            )

        candidates.sort(
            key=lambda item: (-item.score, item.distance, -item.doc_freq, item.term)
        )
        deduped: list[SpellCandidate] = []
        seen: set[str] = set()
        for candidate in candidates:
            if candidate.term in seen:
                continue
            seen.add(candidate.term)
            deduped.append(candidate)
            if len(deduped) >= max_candidates:
                break
        return deduped

    def _fallback_suggestions(
        self,
        token: str,
        *,
        requested_type: str | None,
        limit: int,
    ) -> list[SpellCandidate]:
        if not self._terms:
            return []
        results: list[SpellCandidate] = []
        if process is not None and fuzz is not None:
            matches = process.extract(
                token,
                self._terms,
                scorer=fuzz.ratio,
                limit=limit * 2,
                score_cutoff=70,
            )
        else:
            matches = [
                (
                    term,
                    SequenceMatcher(a=token, b=term).ratio() * 100.0,
                    None,
                )
                for term in self._terms
            ]
            matches.sort(key=lambda item: item[1], reverse=True)
            matches = [item for item in matches[: limit * 2] if item[1] >= 70]

        for term, raw_score, _ in matches:
            meta = self.term_dictionary.get(term)
            if not meta:
                continue
            distance = max(abs(len(token) - len(term)), 0)
            results.append(
                SpellCandidate(
                    term=term,
                    score=self._composite_score(
                        token=token,
                        candidate=term,
                        doc_freq=int(meta["doc_freq"]),
                        candidate_type=str(meta["term_type"]),
                        requested_type=requested_type,
                        raw_score=float(raw_score) / 100.0,
                    ),
                    distance=distance,
                    doc_freq=int(meta["doc_freq"]),
                    term_type=str(meta["term_type"]),
                    source="fallback",
                )
            )
        return results

    def _composite_score(
        self,
        *,
        token: str,
        candidate: str,
        doc_freq: int,
        candidate_type: str,
        requested_type: str | None,
        raw_score: float,
    ) -> float:
        edit_confidence = max(0.0, min(raw_score, 1.0))
        frequency_score = min(1.0, math.log1p(max(doc_freq, 0)) / 4.5)
        if requested_type in {None, "", "token"}:
            type_score = 1.0
        else:
            type_score = 1.0 if candidate_type == requested_type else 0.75
        if token[:2] and token[:2] == candidate[:2]:
            context_score = 1.0
        elif token[:1] and token[:1] == candidate[:1]:
            context_score = 0.9
        else:
            context_score = 0.35
        total = (
            0.40 * edit_confidence
            + 0.25 * frequency_score
            + 0.20 * type_score
            + 0.15 * context_score
        )
        return round(total, 4)
