"""Abstract interface and error types for LLM providers."""

from abc import ABC, abstractmethod
from typing import Optional

from app.domain import ParsedQuery


class LLMProviderError(RuntimeError):
    """Base provider error."""


class LLMUnavailableError(LLMProviderError):
    """Raised when the configured provider cannot be used."""


class LLMResponseError(LLMProviderError):
    """Raised when the provider returns an invalid structured response."""


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    provider_name = "base"

    @abstractmethod
    def is_available(self) -> bool:
        """Return True when the provider is ready to serve requests."""

    @abstractmethod
    def parse_query(
        self, query: str, catalog_context: Optional[dict] = None
    ) -> ParsedQuery:
        """Parse a user query into a structured ParsedQuery object."""

    @abstractmethod
    def generate_explanation(
        self, original_query: str, product_title: str, match_type: str
    ) -> str:
        """Generate a short explanation for a search match."""
