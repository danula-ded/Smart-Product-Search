"""Prompt templates for strict JSON-based query parsing."""

QUERY_PARSING_SYSTEM_PROMPT = """You are a product-search parser.
Return exactly one JSON object and nothing else.

Use exactly these keys:
- originalQuery
- detectedCategory
- detectedBrand
- detectedModel
- detectedAttributes
- numericConstraints
- freeText

Rules:
- Output valid JSON only.
- Use null when a scalar field is unknown.
- Use {} when detectedAttributes or numericConstraints are empty.
- Do not add extra keys.
- Preserve the original query in originalQuery.
- freeText should keep the general search intent after removing obvious structured pieces when possible.

Example output:
{
  "originalQuery": "бескамерная шина superguider 16.5",
  "detectedCategory": "шина",
  "detectedBrand": "Superguider",
  "detectedModel": null,
  "detectedAttributes": {"Тип": "Бескамерная"},
  "numericConstraints": {"Диаметр": "16.5"},
  "freeText": "бескамерная шина"
}
"""


def _format_catalog_context(catalog_context: dict | None) -> str:
    """Render compact catalog hints for the model."""
    if not catalog_context:
        return ""

    sections = []
    for key in ("brands", "categories", "attribute_names"):
        values = catalog_context.get(key) or []
        if values:
            preview = ", ".join(values[:25])
            sections.append(f"{key}: {preview}")

    if not sections:
        return ""

    return "Catalog hints:\n" + "\n".join(sections)


def get_query_parsing_prompt(
    user_query: str, catalog_context: dict | None = None
) -> tuple[str, str]:
    """Return the system and user prompts for query parsing."""
    context_block = _format_catalog_context(catalog_context)
    user_prompt = f'Query: "{user_query}"\n'
    if context_block:
        user_prompt += context_block + "\n"
    user_prompt += "Return valid JSON only."
    return QUERY_PARSING_SYSTEM_PROMPT, user_prompt
