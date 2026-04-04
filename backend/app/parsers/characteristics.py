"""
Parser for product characteristics string.

Parses strings like "Ширина профиля:256 мм;Тип:Бескамерная;Индекс скорости:A3"
into structured attributes.
"""

from typing import Dict, Optional


def parse_characteristics(raw_string: Optional[str]) -> Dict[str, str]:
    """
    Parse characteristics string into key-value pairs.

    Args:
        raw_string: Raw characteristics string, e.g., "Ширина профиля:256 мм;Тип:Бескамерная"

    Returns:
        Dictionary of parsed attributes, e.g., {"Ширина профиля": "256 мм", "Тип": "Бескамерная"}

    Handles:
    - None input -> empty dict
    - Empty string -> empty dict
    - Malformed entries (no colon) -> skipped
    - Trims keys and values
    """
    if not raw_string or not raw_string.strip():
        return {}

    attributes = {}

    # Split by semicolon
    entries = raw_string.split(";")

    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue

        # Split by first colon
        if ":" not in entry:
            continue  # Skip malformed entries

        key, value = entry.split(":", 1)
        key = key.strip()
        value = value.strip()

        if key and value:  # Only add non-empty key-value pairs
            attributes[key] = value

    return attributes


def parse_and_create_attributes(raw_string: Optional[str]) -> list:
    """
    Parse characteristics and return list of ProductAttribute objects.

    Args:
        raw_string: Raw characteristics string

    Returns:
        List of ProductAttribute objects
    """
    from app.domain import ProductAttribute

    parsed = parse_characteristics(raw_string)
    return [ProductAttribute(name=k, value=v) for k, v in parsed.items()]
