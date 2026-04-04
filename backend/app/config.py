"""Application configuration for the upload-driven search MVP."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


def _read_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    """Mutable settings loaded from environment variables."""

    def __init__(self) -> None:
        self.BACKEND_ROOT = Path(__file__).resolve().parents[1]
        self.PROJECT_ROOT = self.BACKEND_ROOT.parent
        load_dotenv(self.BACKEND_ROOT / ".env")
        self.reload()

    def reload(self) -> None:
        self.API_VERSION = "1.0.0"
        self.API_TITLE = "Smart Product Search MVP"
        self.API_DESCRIPTION = (
            "Upload-driven smart product search with SQLite FTS5 personalization"
        )

        self.HOST = os.getenv("HOST", "0.0.0.0")
        self.PORT = int(os.getenv("PORT", "8000"))
        self.DEBUG = _read_bool("DEBUG", True)

        self.CORS_ORIGINS = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "*").split(",")
            if origin.strip()
        ] or ["*"]

        self.RUNTIME_DIR = Path(
            os.getenv("RUNTIME_DIR", self.BACKEND_ROOT / "runtime")
        ).resolve()
        self.UPLOAD_DIR = Path(
            os.getenv("UPLOAD_DIR", self.RUNTIME_DIR / "uploads")
        ).resolve()
        self.DB_PATH = Path(
            os.getenv("DB_PATH", self.RUNTIME_DIR / "search.sqlite")
        ).resolve()

        self.SEARCH_CANDIDATES = int(os.getenv("SEARCH_CANDIDATES", "1500"))
        self.LEXICON_LIMIT = int(os.getenv("LEXICON_LIMIT", "5000"))
        self.JOB_WORKERS = int(os.getenv("JOB_WORKERS", "1"))
        self.METRICS_SAMPLE_SIZE = int(os.getenv("METRICS_SAMPLE_SIZE", "18"))

        self.LLM_ENABLED = _read_bool("LLM_ENABLED", False)
        self.LLM_PROVIDER = os.getenv("LLM_PROVIDER", "local_qwen")
        self.LLM_MODEL_PATH = os.getenv("LLM_MODEL_PATH")
        self.LLM_DEVICE = os.getenv("LLM_DEVICE", "cpu")
        self.LLM_MAX_NEW_TOKENS = int(os.getenv("LLM_MAX_NEW_TOKENS", "256"))
        self.LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))


settings = Settings()
