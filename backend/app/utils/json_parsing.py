"""Utilities for extracting and validating JSON returned by an LLM."""

import json
import logging
import re
from typing import Any, Optional

from pydantic import ValidationError

from app.domain import ParsedQuery
from app.schemas import ParsedQuerySchema

logger = logging.getLogger(__name__)


def safe_parse_json(response_text: str, fallback_value=None):
    """Safely parse JSON from a raw LLM response string."""
    if not response_text:
        return fallback_value

    candidates = [response_text]

    code_block_match = re.search(
        r"```(?:json)?\s*(.*?)\s*```", response_text, re.DOTALL
    )
    if code_block_match:
        candidates.append(code_block_match.group(1))

    object_match = re.search(r"\{.*\}", response_text, re.DOTALL)
    if object_match:
        candidates.append(object_match.group(0))

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    logger.warning("Failed to parse JSON from response: %s", response_text[:200])
    return fallback_value


def validate_parsed_query_json(data: dict[str, Any]) -> Optional[ParsedQuerySchema]:
    """Validate parsed-query JSON and return the typed schema on success."""
    try:
        return ParsedQuerySchema.model_validate(data)
    except ValidationError as exc:
        logger.warning("Parsed query payload validation failed: %s", exc)
        return None


def schema_to_domain_parsed_query(schema: ParsedQuerySchema) -> ParsedQuery:
    """Convert a validated ParsedQuerySchema into the domain dataclass."""
    return ParsedQuery(
        original_query=schema.original_query,
        detected_category=schema.detected_category,
        detected_brand=schema.detected_brand,
        detected_model=schema.detected_model,
        detected_attributes=dict(schema.detected_attributes),
        numeric_constraints=dict(schema.numeric_constraints),
        free_text=schema.free_text,
    )
