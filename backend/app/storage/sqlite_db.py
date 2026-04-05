"""SQLite storage primitives for the upload-driven search MVP."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Sequence


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class SQLiteDatabase:
    """Thin database manager with per-operation connections."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def initialize(self) -> None:
        with self.connect() as connection:
            cursor = connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.execute("PRAGMA temp_store=MEMORY;")

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS products (
                    ste_id TEXT PRIMARY KEY,
                    title_raw TEXT NOT NULL,
                    title_norm TEXT NOT NULL,
                    category_raw TEXT NOT NULL,
                    category_norm TEXT NOT NULL,
                    attributes_raw TEXT NOT NULL,
                    brand_guess TEXT,
                    model_guess TEXT,
                    search_text TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_products_category_norm
                ON products (category_norm)
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS product_attributes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ste_id TEXT NOT NULL,
                    attr_name_raw TEXT NOT NULL,
                    attr_name_norm TEXT NOT NULL,
                    attr_value_raw TEXT NOT NULL,
                    attr_value_norm TEXT NOT NULL,
                    numeric_value REAL,
                    unit TEXT,
                    FOREIGN KEY (ste_id) REFERENCES products (ste_id) ON DELETE CASCADE
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_product_attributes_ste_id
                ON product_attributes (ste_id)
                """
            )
            cursor.execute(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS product_fts
                USING fts5(
                    ste_id UNINDEXED,
                    search_text,
                    tokenize='unicode61 remove_diacritics 2'
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS contracts (
                    contract_key TEXT PRIMARY KEY,
                    contract_id TEXT NOT NULL,
                    ste_id TEXT NOT NULL,
                    purchase_name_raw TEXT NOT NULL,
                    purchase_name_norm TEXT NOT NULL,
                    contract_date TEXT,
                    cost REAL,
                    customer_inn TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    customer_region TEXT NOT NULL,
                    supplier_inn TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    supplier_region TEXT NOT NULL,
                    matched_product INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_contracts_customer_inn
                ON contracts (customer_inn)
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_contracts_ste_id
                ON contracts (ste_id)
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_contracts_matched_product_ste_id
                ON contracts (matched_product, ste_id)
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS customer_profiles (
                    customer_inn TEXT PRIMARY KEY,
                    customer_name TEXT NOT NULL,
                    purchase_count INTEGER NOT NULL,
                    matched_purchase_count INTEGER NOT NULL,
                    total_spend REAL NOT NULL,
                    last_purchase_at TEXT,
                    top_categories_json TEXT NOT NULL,
                    top_ste_ids_json TEXT NOT NULL,
                    token_weights_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS customer_category_stats (
                    customer_inn TEXT NOT NULL,
                    category_norm TEXT NOT NULL,
                    weight REAL NOT NULL,
                    PRIMARY KEY (customer_inn, category_norm)
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS customer_ste_stats (
                    customer_inn TEXT NOT NULL,
                    ste_id TEXT NOT NULL,
                    weight REAL NOT NULL,
                    PRIMARY KEY (customer_inn, ste_id)
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    customer_inn TEXT,
                    event_type TEXT NOT NULL,
                    ste_id TEXT,
                    category_norm TEXT,
                    query TEXT,
                    position INTEGER,
                    dwell_ms INTEGER,
                    created_at TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_events_session_id
                ON events (session_id)
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_events_customer_inn
                ON events (customer_inn)
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS saved_results (
                    id TEXT PRIMARY KEY,
                    session_id TEXT,
                    customer_inn TEXT,
                    ste_id TEXT NOT NULL,
                    note TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_saved_results_customer_inn
                ON saved_results (customer_inn)
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ingestion_jobs (
                    job_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT,
                    progress REAL NOT NULL DEFAULT 0,
                    warnings_json TEXT NOT NULL DEFAULT '[]',
                    errors_json TEXT NOT NULL DEFAULT '[]',
                    stats_json TEXT NOT NULL DEFAULT '{}'
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS demo_profiles (
                    customer_inn TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    summary_json TEXT NOT NULL,
                    sort_order INTEGER NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS quality_cases (
                    case_id TEXT PRIMARY KEY,
                    customer_inn TEXT,
                    query TEXT NOT NULL,
                    expected_ste_id TEXT NOT NULL,
                    notes TEXT
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS lexicon (
                    term TEXT PRIMARY KEY,
                    doc_freq INTEGER NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS term_dictionary (
                    term TEXT PRIMARY KEY,
                    lemma TEXT NOT NULL,
                    doc_freq INTEGER NOT NULL,
                    term_type TEXT NOT NULL,
                    source_mask INTEGER NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_term_dictionary_lemma
                ON term_dictionary (lemma)
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS synonym_rules (
                    alias TEXT NOT NULL,
                    canonical TEXT NOT NULL,
                    scope TEXT NOT NULL DEFAULT 'global',
                    confidence REAL NOT NULL,
                    source TEXT NOT NULL,
                    status TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY(alias, canonical, scope)
                )
                """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_synonym_rules_status_scope
                ON synonym_rules (status, scope)
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS synonym_candidates (
                    alias TEXT NOT NULL,
                    canonical TEXT NOT NULL,
                    scope TEXT NOT NULL DEFAULT 'global',
                    score REAL NOT NULL,
                    source TEXT NOT NULL,
                    context_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY(alias, canonical, scope)
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS model_artifacts (
                    artifact_key TEXT PRIMARY KEY,
                    signature_json TEXT NOT NULL,
                    path TEXT NOT NULL,
                    meta_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS runtime_cache (
                    cache_key TEXT PRIMARY KEY,
                    signature_json TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.commit()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON;")
        connection.execute("PRAGMA busy_timeout=10000;")
        connection.execute("PRAGMA temp_store=MEMORY;")
        try:
            yield connection
        finally:
            connection.close()

    def execute(self, query: str, params: Sequence[Any] | None = None) -> None:
        with self.connect() as connection:
            connection.execute(query, params or [])
            connection.commit()

    def query_all(
        self, query: str, params: Sequence[Any] | None = None
    ) -> list[sqlite3.Row]:
        with self.connect() as connection:
            return connection.execute(query, params or []).fetchall()

    def query_one(
        self, query: str, params: Sequence[Any] | None = None
    ) -> sqlite3.Row | None:
        with self.connect() as connection:
            return connection.execute(query, params or []).fetchone()

    def mark_running_jobs_interrupted(self) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                UPDATE ingestion_jobs
                SET status = 'interrupted',
                    finished_at = ?,
                    errors_json = ?
                WHERE status IN ('queued', 'running')
                """,
                (
                    utcnow_iso(),
                    json.dumps(
                        ["Job was interrupted by service restart or shutdown."],
                        ensure_ascii=False,
                    ),
                ),
            )
            connection.commit()
