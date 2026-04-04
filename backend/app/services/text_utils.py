"""Normalization, parsing, and scoring helpers for search and ingestion."""

from __future__ import annotations

import math
import re
from collections import Counter
from functools import lru_cache
from typing import Iterable


CYRILLIC_RANGE = "\u0400-\u04ff"
TOKEN_RE = re.compile(
    rf"[a-z{CYRILLIC_RANGE}0-9]+(?:[./,-][a-z{CYRILLIC_RANGE}0-9]+)*",
    re.IGNORECASE,
)
NUMBER_RE = re.compile(
    rf"(\d+(?:[.,]\d+)?)\s*([a-z{CYRILLIC_RANGE}/%]+)?",
    re.IGNORECASE,
)
LATIN_RE = re.compile(r"[a-z]", re.IGNORECASE)
CYRILLIC_RE = re.compile(rf"[{CYRILLIC_RANGE}]")

STOPWORDS = {
    "и",
    "в",
    "во",
    "на",
    "с",
    "со",
    "по",
    "для",
    "из",
    "к",
    "у",
    "от",
    "до",
    "или",
    "the",
    "with",
    "and",
    "of",
}

SYNONYM_MAP = {
    "смартбай": "smartbuy",
    "смартбуй": "smartbuy",
    "смарт-бей": "smartbuy",
    "смарт-буй": "smartbuy",
    "леново": "lenovo",
    "делл": "dell",
    "юсб": "usb",
    "флешка": "usb",
    "флэшка": "usb",
    "флеш": "usb",
    "накопитель": "usb",
    "flash": "usb",
    "флешнакопитель": "usb",
    "флеш-накопитель": "usb",
    "ноут": "ноутбук",
    "ноуты": "ноутбук",
    "лэптоп": "ноутбук",
    "ультрабук": "ноутбук",
    "телефон": "смартфон",
    "мобильник": "смартфон",
    "мобила": "смартфон",
    "ручка": "канцтовары",
    "канцелярия": "канцтовары",
    "шина": "шины",
    "покрышка": "шины",
    "резина": "шины",
    "тсм": "трансдермальная",
    "таб": "таблетки",
    "табл": "таблетки",
    "таблетка": "таблетки",
    "амп": "ампула",
    "ампу": "ампула",
}

SYNONYM_GROUPS = {
    "usb": ["флешка", "флэшка", "накопитель", "flash"],
    "смартфон": ["телефон", "phone", "iphone"],
    "ноутбук": ["ноут", "laptop", "notebook", "ультрабук"],
    "шины": ["шина", "покрышка", "tire", "tyre", "резина"],
    "таблетки": ["таб", "табл", "таблетка", "tablets"],
    "канцтовары": ["канцелярия", "ручка", "office"],
}

EN_TO_RU_LAYOUT = str.maketrans(
    "`qwertyuiop[]asdfghjkl;'zxcvbnm,./",
    "ёйцукенгшщзхъфывапролджэячсмитьбю.",
)
RU_TO_EN_LAYOUT = str.maketrans(
    "ёйцукенгшщзхъфывапролджэячсмитьбю.",
    "`qwertyuiop[]asdfghjkl;'zxcvbnm,./",
)

NORMALIZE_TRANSLATION = str.maketrans(
    {
        "ё": "е",
        "Ё": "е",
        "№": " n ",
        "—": "-",
        "–": "-",
        "−": "-",
        "×": "x",
        "«": '"',
        "»": '"',
    }
)


def clean_cell(value: str | None) -> str:
    if value is None:
        return ""
    cleaned = (
        str(value)
        .replace("\ufeff", "")
        .replace("\u200b", "")
        .replace("\xa0", " ")
        .strip()
        .strip('"')
        .strip()
    )
    cleaned = cleaned.lstrip("\t")
    return re.sub(r"\s+", " ", cleaned)


def normalize_text(value: str | None) -> str:
    cleaned = clean_cell(value).translate(NORMALIZE_TRANSLATION).lower()
    cleaned = re.sub(r"(?<=\d),(?=\d)", ".", cleaned)
    cleaned = re.sub(r"(?<=\d)\s*[xх]\s*(?=\d)", " x ", cleaned)
    cleaned = re.sub(r"(?<=\d)([a-z\u0400-\u04ff%]+)\b", r" \1", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def tokenize(value: str | None) -> list[str]:
    tokens: list[str] = []
    for token in TOKEN_RE.findall(normalize_text(value)):
        if not token or token in STOPWORDS:
            continue
        tokens.append(token)
        if any(separator in token for separator in ("-", "/", ".", ",")):
            for part in re.split(r"[-/.,]+", token):
                if part and part not in STOPWORDS:
                    tokens.append(part)
    return list(dict.fromkeys(tokens))


def _contains_latin(value: str) -> bool:
    return bool(LATIN_RE.search(value))


def _contains_cyrillic(value: str) -> bool:
    return bool(CYRILLIC_RE.search(value))


@lru_cache(maxsize=8192)
def keyboard_layout_variants(token: str) -> tuple[str, ...]:
    normalized = normalize_text(token)
    if not normalized:
        return ()

    has_latin = _contains_latin(normalized)
    has_cyrillic = _contains_cyrillic(normalized)
    variants: list[str] = []

    if has_latin and not has_cyrillic:
        variants.append(normalized.translate(EN_TO_RU_LAYOUT))
    if has_cyrillic and not has_latin:
        variants.append(normalized.translate(RU_TO_EN_LAYOUT))

    return tuple(
        dict.fromkeys(variant for variant in variants if variant and variant != normalized)
    )


def expand_synonyms(tokens: Iterable[str]) -> tuple[list[str], list[str]]:
    expanded: list[str] = []
    applied: list[str] = []
    for token in tokens:
        canonical = SYNONYM_MAP.get(token, token)
        expanded.append(canonical)
        if canonical != token:
            applied.append(f"{token} -> {canonical}")
        aliases = SYNONYM_GROUPS.get(canonical, [])
        expanded.extend(aliases)
    return list(dict.fromkeys(expanded)), applied


def build_search_text(
    title: str,
    category: str,
    attributes: list[tuple[str, str]],
    brand_guess: str | None = None,
    model_guess: str | None = None,
) -> str:
    parts = [normalize_text(title), normalize_text(category)]
    if brand_guess:
        parts.append(normalize_text(brand_guess))
    if model_guess:
        parts.append(normalize_text(model_guess))
    for name, value in attributes:
        parts.append(normalize_text(name))
        parts.append(normalize_text(value))
    tokens, _ = expand_synonyms(tokenize(" ".join(parts)))
    return " ".join(tokens)


def parse_attributes(raw: str | None) -> list[tuple[str, str]]:
    raw_text = clean_cell(raw)
    if not raw_text:
        return []

    attributes: list[tuple[str, str]] = []
    for chunk in re.split(r"[;\n|]+", raw_text):
        if ":" not in chunk:
            continue
        name, value = chunk.split(":", 1)
        name = clean_cell(name)
        value = clean_cell(value)
        if not name or not value:
            continue
        attributes.append((name, value))
    return attributes


def parse_numeric_value(value: str | None) -> tuple[float | None, str | None]:
    normalized = normalize_text(value)
    if not normalized:
        return None, None
    match = NUMBER_RE.search(normalized)
    if not match:
        return None, None
    try:
        numeric_value = float(match.group(1))
    except ValueError:
        return None, None
    return numeric_value, match.group(2) or None


def guess_brand_and_model(title: str) -> tuple[str | None, str | None]:
    tokens = tokenize(title)
    if not tokens:
        return None, None

    brand = None
    model = None
    for token in tokens[:6]:
        canonical = SYNONYM_MAP.get(token, token)
        if canonical.isalpha() and len(canonical) > 2:
            brand = canonical.upper() if canonical.isupper() else canonical.capitalize()
            break

    for token in tokens:
        if len(token) >= 2 and any(character.isdigit() for character in token):
            model = token.upper()
            break

    return brand, model


def title_snippet_tokens(title: str, limit: int = 5) -> str:
    return " ".join(tokenize(title)[:limit])


def bm25_to_score(bm25_value: float) -> float:
    return 1.0 / (1.0 + abs(bm25_value))


def recency_weight(contract_date: str | None) -> float:
    if not contract_date:
        return 0.0
    try:
        from datetime import datetime, timezone

        current = datetime.now(timezone.utc)
        if "T" in contract_date:
            normalized = contract_date.replace("Z", "+00:00")
            contract_dt = datetime.fromisoformat(normalized)
        else:
            contract_dt = datetime.fromisoformat(contract_date)
            if contract_dt.tzinfo is None:
                contract_dt = contract_dt.replace(tzinfo=timezone.utc)
        if contract_dt > current:
            return 0.0
        age_days = max(0.0, (current - contract_dt).days)
        return max(0.0, 1.5 - min(age_days, 3650) / 3650)
    except Exception:
        return 0.0


def log_cost_weight(cost: float | None) -> float:
    if cost is None or cost <= 0:
        return 0.0
    return min(0.6, math.log10(cost + 10.0) / 6.0)


def counter_to_top_items(counter: Counter[str], limit: int) -> list[dict[str, float]]:
    return [
        {"value": key, "weight": round(value, 4)}
        for key, value in counter.most_common(limit)
    ]
