"""Runtime synonym resolution backed by SQLite rules."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.config import settings
from app.services.text_utils import (
    SYNONYM_GROUPS,
    SYNONYM_MAP,
    build_seed_synonym_pairs,
    normalize_text,
)


class SynonymResolver:
    """Resolves canonical terms and runtime synonym expansion."""

    def __init__(self, rows: list[dict[str, Any]] | list[Any]) -> None:
        self.alias_to_canonical: dict[tuple[str, str], str] = {}
        self.canonical_to_aliases: dict[tuple[str, str], list[str]] = defaultdict(list)

        for alias, canonical in build_seed_synonym_pairs():
            self._register(alias, canonical, "global")
        for canonical, aliases in SYNONYM_GROUPS.items():
            canonical_norm = normalize_text(canonical)
            for alias in aliases:
                self._register(normalize_text(alias), canonical_norm, "global")

        for row in rows:
            scope = normalize_text(self._row_value(row, "scope", "global")) or "global"
            alias = normalize_text(self._row_value(row, "alias"))
            canonical = normalize_text(self._row_value(row, "canonical"))
            status = normalize_text(self._row_value(row, "status", "active"))
            if not alias or not canonical or status != "active":
                continue
            self._register(alias, canonical, scope)

    def canonicalize(self, token: str, *, scopes: list[str] | None = None) -> str:
        normalized = normalize_text(token)
        scope_list = ["global", *(scopes or [])]
        for scope in scope_list:
            canonical = self.alias_to_canonical.get((normalized, scope))
            if canonical:
                return canonical
        return SYNONYM_MAP.get(normalized, normalized)

    def expand(
        self,
        tokens: list[str],
        *,
        scopes: list[str] | None = None,
    ) -> tuple[list[str], list[str], list[dict[str, Any]]]:
        scope_list = ["global", *(scopes or [])]
        expanded: list[str] = []
        applied: list[str] = []
        mappings: list[dict[str, Any]] = []

        for token in tokens:
            normalized = normalize_text(token)
            canonical = self.canonicalize(normalized, scopes=scope_list)
            expanded.append(canonical)
            if canonical != normalized:
                applied.append(f"{normalized} -> {canonical}")
                mappings.append({"type": "synonym", "from": normalized, "to": canonical})

            aliases: list[str] = []
            for scope in scope_list:
                aliases.extend(self.canonical_to_aliases.get((canonical, scope), []))
            aliases.extend(SYNONYM_GROUPS.get(canonical, []))
            deduped_aliases: list[str] = []
            for alias in aliases:
                alias_norm = normalize_text(alias)
                if not alias_norm or alias_norm == canonical or alias_norm in deduped_aliases:
                    continue
                deduped_aliases.append(alias_norm)
                if len(deduped_aliases) >= settings.SYNONYM_MAX_ALIASES:
                    break
            expanded.extend(deduped_aliases)

        return list(dict.fromkeys(expanded)), list(dict.fromkeys(applied)), mappings

    def _register(self, alias: str, canonical: str, scope: str) -> None:
        if not alias or not canonical:
            return
        key = (alias, scope)
        self.alias_to_canonical[key] = canonical
        aliases_key = (canonical, scope)
        if alias != canonical and alias not in self.canonical_to_aliases[aliases_key]:
            self.canonical_to_aliases[aliases_key].append(alias)

    def _row_value(self, row: Any, key: str, default: str = "") -> str:
        if isinstance(row, dict):
            return str(row.get(key, default))
        try:
            return str(row[key])
        except Exception:
            return default
