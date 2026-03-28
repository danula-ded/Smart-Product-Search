"""
Application configuration.
"""

from typing import Optional


class Settings:
    """Application settings."""

    # API
    API_VERSION: str = "0.1.0"
    API_TITLE: str = "Smart Product Search MVP"
    API_DESCRIPTION: str = "Personalized smart product search system"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: list = ["*"]

    def __init__(self):
        pass


# Global settings instance
settings = Settings()
