"""Service wrapper that selects the configured provider and handles fallback."""

from functools import lru_cache
import logging
from typing import Optional

from app.config import settings
from app.domain import ParsedQuery
from app.services.llm.base import LLMProvider, LLMProviderError
from app.services.llm.fallback_parser import FallbackParser
from app.services.llm.local_qwen_provider import LocalQwenProvider
from app.services.llm.mock_provider import MockLLMProvider

logger = logging.getLogger(__name__)


class QueryParsingService:
    """Service that parses queries with a primary provider and safe fallback."""

    def __init__(
        self,
        primary_provider: Optional[LLMProvider],
        fallback_provider: Optional[LLMProvider] = None,
    ):
        self.primary_provider = primary_provider
        self.fallback_provider = fallback_provider or FallbackParser()

    def parse_query(
        self, query: str, catalog_context: Optional[dict] = None
    ) -> ParsedQuery:
        if self.primary_provider and self.primary_provider.is_available():
            try:
                return self.primary_provider.parse_query(
                    query, catalog_context=catalog_context
                )
            except LLMProviderError as exc:
                logger.warning(
                    "Primary LLM provider failed, using fallback parser: %s", exc
                )
            except Exception as exc:
                logger.warning(
                    "Unexpected primary provider failure, using fallback parser: %s",
                    exc,
                )

        return self.fallback_provider.parse_query(
            query, catalog_context=catalog_context
        )

    def generate_explanation(
        self, original_query: str, product_title: str, match_type: str
    ) -> str:
        provider = (
            self.primary_provider
            if self.primary_provider and self.primary_provider.is_available()
            else self.fallback_provider
        )
        try:
            return provider.generate_explanation(
                original_query, product_title, match_type
            )
        except Exception:
            return self.fallback_provider.generate_explanation(
                original_query, product_title, match_type
            )


def create_primary_provider() -> Optional[LLMProvider]:
    """Create the configured primary provider, if enabled."""
    if not settings.LLM_ENABLED:
        logger.info("LLM is disabled, fallback parser will be used")
        return None

    provider_name = settings.LLM_PROVIDER.strip().lower()
    if provider_name == "mock":
        return MockLLMProvider()

    if provider_name == "local_qwen":
        return LocalQwenProvider(
            model_path=settings.LLM_MODEL_PATH,
            device=settings.LLM_DEVICE,
            max_new_tokens=settings.LLM_MAX_NEW_TOKENS,
            temperature=settings.LLM_TEMPERATURE,
        )

    logger.warning(
        "Unknown LLM provider '%s', using fallback parser only", settings.LLM_PROVIDER
    )
    return None


@lru_cache(maxsize=1)
def get_query_parsing_service() -> QueryParsingService:
    """Return a cached query parsing service."""
    return QueryParsingService(
        primary_provider=create_primary_provider(), fallback_provider=FallbackParser()
    )


def reset_llm_service_cache():
    """Clear cached provider instances for tests or config reloads."""
    get_query_parsing_service.cache_clear()
