"""Runtime service container for FastAPI state."""

from __future__ import annotations

from dataclasses import dataclass

from app.storage.sqlite_db import SQLiteDatabase
from app.services.dataset_service import DatasetService
from app.services.metrics_service import MetricsService
from app.services.search_service import SearchService


@dataclass
class RuntimeServices:
    db: SQLiteDatabase
    datasets: DatasetService
    search: SearchService
    metrics: MetricsService


def build_runtime(db_path) -> RuntimeServices:
    db = SQLiteDatabase(db_path)
    db.mark_running_jobs_interrupted()
    search = SearchService(db)
    datasets = DatasetService(db, search)
    metrics = MetricsService(db, search)
    search.prewarm()
    return RuntimeServices(db=db, datasets=datasets, search=search, metrics=metrics)
