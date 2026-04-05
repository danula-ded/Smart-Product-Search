"""Dataset upload, ingestion jobs, and incremental index rebuilding."""

from __future__ import annotations

import csv
import json
import sqlite3
import shutil
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.services.search_service import SearchService
from app.services.ranking.training_dataset import build_training_cases
from app.services.search_nlp.morphology import MorphologyService
from app.services.text_utils import (
    SYNONYM_GROUPS,
    SYNONYM_MAP,
    build_search_text,
    build_seed_synonym_pairs,
    clean_cell,
    counter_to_top_items,
    guess_brand_and_model,
    is_alphanumeric_model,
    looks_like_unit,
    log_cost_weight,
    normalize_text,
    parse_attributes,
    parse_numeric_value,
    recency_weight,
    simple_russian_lemma,
    tokenize,
)
from app.storage.sqlite_db import SQLiteDatabase, utcnow_iso


VALID_MODES = {"replace_all", "upsert_ste", "append_contracts", "upsert_bundle"}
STE_BATCH_SIZE = 2000
CONTRACT_BATCH_SIZE = 5000
MAX_JOB_WARNINGS = 200

STE_HEADER_FIELDS = {
    "id сте",
    "идентификатор сте",
    "наименование сте",
    "категория",
    "атрибуты",
}
CONTRACT_HEADER_FIELDS = {
    "наименование закупки",
    "идентификатор контракта",
    "идентификатор сте",
    "дата заключения контракта",
    "стоимость контракта",
    "инн заказчика",
    "наименование заказчика",
    "регион заказчика",
    "инн поставщика",
    "наименование поставщика",
    "регион поставщика",
}


@dataclass
class ImportStats:
    products_upserted: int = 0
    attributes_upserted: int = 0
    contracts_upserted: int = 0
    matched_contracts: int = 0
    unmatched_contracts: int = 0
    customers_rebuilt: int = 0
    demo_profiles: int = 0
    lexicon_terms: int = 0
    dictionary_terms: int = 0
    synonym_candidates: int = 0
    synonym_rules: int = 0
    ranking_model_ready: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "productsUpserted": self.products_upserted,
            "attributesUpserted": self.attributes_upserted,
            "contractsUpserted": self.contracts_upserted,
            "matchedContracts": self.matched_contracts,
            "unmatchedContracts": self.unmatched_contracts,
            "customersRebuilt": self.customers_rebuilt,
            "demoProfiles": self.demo_profiles,
            "lexiconTerms": self.lexicon_terms,
            "dictionaryTerms": self.dictionary_terms,
            "synonymCandidates": self.synonym_candidates,
            "synonymRules": self.synonym_rules,
            "rankingModelReady": self.ranking_model_ready,
        }


class DatasetService:
    """Owns upload jobs and data ingestion into SQLite."""

    def __init__(self, db: SQLiteDatabase, search_service: SearchService | None = None) -> None:
        self.db = db
        self.search_service = search_service
        self.executor = ThreadPoolExecutor(max_workers=settings.JOB_WORKERS)
        settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
        self.morphology = MorphologyService()

    def shutdown(self) -> None:
        self.executor.shutdown(wait=False, cancel_futures=True)

    def submit_upload(
        self,
        mode: str,
        ste_file: UploadFile | None,
        contracts_file: UploadFile | None,
    ) -> str:
        mode = (mode or "").strip()
        if mode not in VALID_MODES:
            raise HTTPException(status_code=400, detail="Unsupported upload mode.")

        if mode == "replace_all" and (ste_file is None or contracts_file is None):
            raise HTTPException(
                status_code=400,
                detail="replace_all requires both STE and contracts files.",
            )
        if mode == "upsert_bundle" and (ste_file is None or contracts_file is None):
            raise HTTPException(
                status_code=400,
                detail="upsert_bundle requires both STE and contracts files.",
            )
        if mode == "upsert_ste" and ste_file is None:
            raise HTTPException(status_code=400, detail="upsert_ste requires STE file.")
        if mode == "append_contracts" and contracts_file is None:
            raise HTTPException(
                status_code=400, detail="append_contracts requires contracts file."
            )

        job_id = str(uuid.uuid4())
        created_at = utcnow_iso()
        job_dir = settings.UPLOAD_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        ste_path = self._persist_upload(job_dir, "ste", ste_file) if ste_file else None
        contracts_path = (
            self._persist_upload(job_dir, "contracts", contracts_file)
            if contracts_file
            else None
        )

        self.db.execute(
            """
            INSERT INTO ingestion_jobs (
                job_id, status, mode, created_at, progress, warnings_json, errors_json, stats_json
            ) VALUES (?, 'queued', ?, ?, 0, '[]', '[]', '{}')
            """,
            [job_id, mode, created_at],
        )
        self.executor.submit(self._run_job, job_id, mode, ste_path, contracts_path)
        return job_id

    def get_job(self, job_id: str) -> dict | None:
        row = self.db.query_one(
            "SELECT * FROM ingestion_jobs WHERE job_id = ?",
            [job_id],
        )
        return self._job_row_to_dict(row) if row else None

    def get_summary(self) -> dict:
        counts = self.db.query_one(
            """
            SELECT
                (SELECT COUNT(*) FROM products) AS products_count,
                (SELECT COUNT(*) FROM contracts) AS contracts_count,
                (SELECT COUNT(*) FROM customer_profiles) AS profiles_count,
                (SELECT COUNT(*) FROM demo_profiles) AS demo_profiles_count,
                (SELECT COUNT(*) FROM ingestion_jobs WHERE status = 'successful') AS successful_jobs
            """
        )
        jobs = self.db.query_all(
            "SELECT * FROM ingestion_jobs ORDER BY created_at DESC LIMIT 10"
        )
        latest_success = self.db.query_one(
            """
            SELECT * FROM ingestion_jobs
            WHERE status = 'successful'
            ORDER BY finished_at DESC
            LIMIT 1
            """
        )
        return {
            "counts": {
                "products": counts["products_count"] if counts else 0,
                "contracts": counts["contracts_count"] if counts else 0,
                "profiles": counts["profiles_count"] if counts else 0,
                "demoProfiles": counts["demo_profiles_count"] if counts else 0,
                "successfulJobs": counts["successful_jobs"] if counts else 0,
            },
            "activeIndex": {
                "dbPath": str(settings.DB_PATH),
                "lastSuccessfulJob": self._job_row_to_dict(latest_success)
                if latest_success
                else None,
            },
            "imports": [self._job_row_to_dict(row) for row in jobs],
        }

    def submit_default_import(self, mode: str = "replace_all") -> str:
        if mode not in {"replace_all", "upsert_bundle"}:
            raise HTTPException(
                status_code=400,
                detail="Default import supports replace_all or upsert_bundle only.",
            )

        ste_path, contracts_path = self._detect_default_dataset_files()
        if ste_path is None or contracts_path is None:
            raise HTTPException(
                status_code=404,
                detail="Could not detect default STE and contracts files in project data directory.",
            )

        job_id = str(uuid.uuid4())
        created_at = utcnow_iso()
        self.db.execute(
            """
            INSERT INTO ingestion_jobs (
                job_id, status, mode, created_at, progress, warnings_json, errors_json, stats_json
            ) VALUES (?, 'queued', ?, ?, 0, '[]', '[]', '{}')
            """,
            [job_id, f"default_{mode}", created_at],
        )
        self.executor.submit(self._run_job, job_id, mode, ste_path, contracts_path)
        return job_id

    def clear_database(self) -> dict:
        with self.db.connect() as connection:
            cursor = connection.cursor()
            self._clear_all(cursor)
            cursor.execute("DELETE FROM ingestion_jobs")
            connection.commit()
        self.db.compact()
        if self.search_service is not None:
            self.search_service.invalidate_runtime_caches()
        return {"success": True}

    def _persist_upload(
        self, job_dir: Path, prefix: str, upload_file: UploadFile
    ) -> Path:
        suffix = Path(upload_file.filename or "").suffix or ".csv"
        target = job_dir / f"{prefix}{suffix}"
        with target.open("wb") as destination:
            shutil.copyfileobj(upload_file.file, destination)
        upload_file.file.close()
        return target

    def _detect_default_dataset_files(self) -> tuple[Path | None, Path | None]:
        data_dir = settings.PROJECT_ROOT / "data"
        if not data_dir.exists():
            return None, None

        ste_path = None
        contracts_path = None
        for path in sorted(data_dir.glob("*.csv")):
            try:
                with path.open("r", encoding="utf-8-sig", newline="") as handle:
                    first_row = next(csv.reader(handle, delimiter=";"), [])
            except Exception:
                continue
            if len(first_row) == 4:
                ste_path = path
            elif len(first_row) == 11:
                contracts_path = path
        return ste_path, contracts_path

    def _run_job(
        self,
        job_id: str,
        mode: str,
        ste_path: Path | None,
        contracts_path: Path | None,
    ) -> None:
        warnings: list[str] = []
        stats = ImportStats()
        touched_customers: set[str] = set()
        now = utcnow_iso()

        self._update_job(
            job_id,
            status="running",
            started_at=now,
            progress=0.02,
        )

        try:
            with self.db.connect() as connection:
                cursor = connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON;")

                if mode == "replace_all":
                    self._clear_all(cursor)
                    connection.commit()
                    self._update_job(job_id, progress=0.08)

                if ste_path:
                    ste_result = self._ingest_ste_file(
                        cursor,
                        ste_path,
                        warnings,
                        job_id=job_id,
                        replace_existing=mode != "replace_all",
                    )
                    stats.products_upserted += ste_result["products"]
                    stats.attributes_upserted += ste_result["attributes"]
                    connection.commit()
                    self._update_job(job_id, progress=0.45 if contracts_path else 0.68)

                if contracts_path:
                    contract_result = self._ingest_contracts_file(
                        cursor,
                        contracts_path,
                        warnings,
                        job_id=job_id,
                    )
                    stats.contracts_upserted += contract_result["contracts"]
                    stats.matched_contracts += contract_result["matched"]
                    stats.unmatched_contracts += contract_result["unmatched"]
                    touched_customers.update(contract_result["customers"])
                    connection.commit()
                    self._update_job(job_id, progress=0.72)

                if mode == "replace_all":
                    touched_customers = {
                        row["customer_inn"]
                        for row in cursor.execute(
                            "SELECT DISTINCT customer_inn FROM contracts"
                        ).fetchall()
                    }

                if touched_customers:
                    stats.customers_rebuilt = self._rebuild_customer_profiles(
                        cursor, touched_customers
                    )
                    connection.commit()
                    self._update_job(job_id, progress=0.86)

                stats.demo_profiles = self._rebuild_demo_profiles(cursor)
                stats.lexicon_terms = self._rebuild_lexicon(cursor)
                stats.dictionary_terms = self._rebuild_term_dictionary(cursor)
                self._rebuild_symspell_dictionary_artifact(cursor)
                stats.synonym_candidates = self._mine_synonym_candidates(cursor)
                stats.synonym_rules = self._materialize_synonym_rules(cursor)
                self._rebuild_search_text_and_fts(cursor, job_id=job_id)
                stats.ranking_model_ready = self._train_or_refresh_ranker(cursor)
                cursor.execute("DELETE FROM runtime_cache")
                connection.commit()

            try:
                if mode == "replace_all":
                    self.db.compact()
                else:
                    self.db.optimize()
            except Exception as exc:
                self._append_warning(
                    warnings,
                    f"Database compaction skipped: {exc}",
                )

            if self.search_service is not None:
                self.search_service.invalidate_runtime_caches()
                self.search_service.prewarm()

            self._update_job(
                job_id,
                status="successful",
                finished_at=utcnow_iso(),
                progress=1.0,
                warnings=warnings,
                stats=stats.as_dict(),
            )
        except Exception as exc:  # pragma: no cover - covered via API tests
            self._update_job(
                job_id,
                status="failed",
                finished_at=utcnow_iso(),
                progress=1.0,
                warnings=warnings,
                errors=[str(exc)],
                stats=stats.as_dict(),
            )

    def _update_job(
        self,
        job_id: str,
        *,
        status: str | None = None,
        started_at: str | None = None,
        finished_at: str | None = None,
        progress: float | None = None,
        warnings: list[str] | None = None,
        errors: list[str] | None = None,
        stats: dict | None = None,
    ) -> None:
        fields: list[str] = []
        params: list[object] = []
        if status is not None:
            fields.append("status = ?")
            params.append(status)
        if started_at is not None:
            fields.append("started_at = ?")
            params.append(started_at)
        if finished_at is not None:
            fields.append("finished_at = ?")
            params.append(finished_at)
        if progress is not None:
            fields.append("progress = ?")
            params.append(progress)
        if warnings is not None:
            fields.append("warnings_json = ?")
            params.append(json.dumps(warnings, ensure_ascii=False))
        if errors is not None:
            fields.append("errors_json = ?")
            params.append(json.dumps(errors, ensure_ascii=False))
        if stats is not None:
            fields.append("stats_json = ?")
            params.append(json.dumps(stats, ensure_ascii=False))

        if not fields:
            return

        params.append(job_id)
        self.db.execute(
            f"UPDATE ingestion_jobs SET {', '.join(fields)} WHERE job_id = ?",
            params,
        )

    def _clear_all(self, cursor) -> None:
        for table in (
            "product_attributes",
            "products",
            "contracts",
            "customer_profiles",
            "customer_category_stats",
            "customer_ste_stats",
            "events",
            "saved_results",
            "demo_profiles",
            "quality_cases",
            "lexicon",
            "term_dictionary",
            "synonym_rules",
            "synonym_candidates",
            "model_artifacts",
            "runtime_cache",
        ):
            cursor.execute(f"DELETE FROM {table}")
        cursor.execute("DELETE FROM product_fts")
        for artifact_path in settings.ARTIFACTS_DIR.glob("*"):
            if artifact_path.is_file():
                artifact_path.unlink(missing_ok=True)

    def _estimate_total_rows(self, path: Path, skip_header: bool) -> int:
        file_size = path.stat().st_size
        if file_size <= 0:
            return 1
        sample_size = min(file_size, 1_048_576)
        with path.open("rb") as handle:
            sample = handle.read(sample_size)
        line_count = sample.count(b"\n") or 1
        average_line_size = max(1.0, sample_size / line_count)
        estimated = int(file_size / average_line_size)
        if skip_header and estimated > 0:
            estimated -= 1
        return max(estimated, 1)

    def _update_stage_progress(
        self,
        job_id: str,
        *,
        stage_start: float,
        stage_end: float,
        processed: int,
        estimated_total: int,
    ) -> None:
        progress = stage_start + (stage_end - stage_start) * min(
            1.0, processed / max(estimated_total, 1)
        )
        connection: sqlite3.Connection | None = None
        try:
            connection = sqlite3.connect(self.db.path, timeout=0.05, check_same_thread=False)
            connection.execute("PRAGMA busy_timeout=50;")
            connection.execute(
                "UPDATE ingestion_jobs SET progress = ? WHERE job_id = ?",
                [round(progress, 4), job_id],
            )
            connection.commit()
        except sqlite3.OperationalError:
            return
        finally:
            if connection is not None:
                connection.close()

    def _delete_by_ids(self, cursor, table: str, column: str, values: list[str]) -> None:
        unique_values = list(dict.fromkeys(values))
        if not unique_values:
            return
        chunk_size = 500
        for index in range(0, len(unique_values), chunk_size):
            chunk = unique_values[index : index + chunk_size]
            placeholders = ",".join("?" for _ in chunk)
            cursor.execute(
                f"DELETE FROM {table} WHERE {column} IN ({placeholders})",
                chunk,
            )

    def _append_warning(self, warnings: list[str], message: str) -> None:
        if len(warnings) < MAX_JOB_WARNINGS:
            warnings.append(message)

    def _ingest_ste_file(
        self,
        cursor,
        path: Path,
        warnings: list[str],
        *,
        job_id: str,
        replace_existing: bool,
    ) -> dict:
        rows = 0
        attributes_count = 0
        reader, skip_header = self._open_detected_reader(path, "ste", warnings)
        estimated_rows = self._estimate_total_rows(path, skip_header)

        products_batch: dict[str, tuple] = {}
        attributes_batch: dict[str, list[tuple]] = {}
        fts_batch: dict[str, tuple] = {}
        touched_ids: set[str] = set()

        def flush_batch() -> None:
            nonlocal products_batch, attributes_batch, fts_batch, touched_ids
            if not products_batch:
                return
            touched_id_list = sorted(touched_ids)
            self._delete_by_ids(cursor, "product_attributes", "ste_id", touched_id_list)
            self._delete_by_ids(cursor, "product_fts", "ste_id", touched_id_list)
            cursor.executemany(
                """
                INSERT INTO products (
                    ste_id, title_raw, title_norm, category_raw, category_norm,
                    attributes_raw, brand_guess, model_guess, search_text, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(ste_id) DO UPDATE SET
                    title_raw = excluded.title_raw,
                    title_norm = excluded.title_norm,
                    category_raw = excluded.category_raw,
                    category_norm = excluded.category_norm,
                    attributes_raw = excluded.attributes_raw,
                    brand_guess = excluded.brand_guess,
                    model_guess = excluded.model_guess,
                    search_text = excluded.search_text,
                    updated_at = excluded.updated_at
                """,
                list(products_batch.values()),
            )
            flattened_attributes = [
                row for rows in attributes_batch.values() for row in rows
            ]
            if flattened_attributes:
                cursor.executemany(
                    """
                    INSERT INTO product_attributes (
                        ste_id, attr_name_raw, attr_name_norm, attr_value_raw, attr_value_norm,
                        numeric_value, unit
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    flattened_attributes,
                )
            cursor.executemany(
                "INSERT INTO product_fts (ste_id, search_text) VALUES (?, ?)",
                list(fts_batch.values()),
            )
            cursor.connection.commit()
            self._update_stage_progress(
                job_id,
                stage_start=0.08,
                stage_end=0.45,
                processed=rows,
                estimated_total=estimated_rows,
            )
            products_batch = {}
            attributes_batch = {}
            fts_batch = {}
            touched_ids = set()

        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            csv_reader = csv.reader(handle, delimiter=reader["delimiter"])
            for row_index, row in enumerate(csv_reader):
                if row_index == 0 and skip_header:
                    continue
                if not row or not any(cell.strip() for cell in row):
                    continue
                if len(row) != 4:
                    self._append_warning(
                        warnings,
                        f"STE row {row_index + 1} skipped: expected 4 columns, got {len(row)}."
                    )
                    continue

                ste_id, title, category, attributes_raw = [clean_cell(cell) for cell in row]
                if not ste_id or not title or not category:
                    self._append_warning(
                        warnings,
                        f"STE row {row_index + 1} skipped: required fields are empty."
                    )
                    continue

                brand_guess, model_guess = guess_brand_and_model(title)
                attributes = parse_attributes(attributes_raw)
                search_text = build_search_text(
                    title,
                    category,
                    attributes,
                    brand_guess=brand_guess,
                    model_guess=model_guess,
                )
                timestamp = utcnow_iso()
                products_batch[ste_id] = (
                    (
                        ste_id,
                        title,
                        normalize_text(title),
                        category,
                        normalize_text(category),
                        attributes_raw,
                        brand_guess,
                        model_guess,
                        search_text,
                        timestamp,
                        timestamp,
                    )
                )
                touched_ids.add(ste_id)
                fts_batch[ste_id] = (ste_id, search_text)

                current_attributes: list[tuple] = []
                for attr_name, attr_value in attributes:
                    numeric_value, unit = parse_numeric_value(attr_value)
                    current_attributes.append(
                        (
                            ste_id,
                            attr_name,
                            normalize_text(attr_name),
                            attr_value,
                            normalize_text(attr_value),
                            numeric_value,
                            unit,
                        )
                    )
                    attributes_count += 1
                attributes_batch[ste_id] = current_attributes

                rows += 1
                if len(products_batch) >= STE_BATCH_SIZE:
                    flush_batch()

        flush_batch()
        if replace_existing:
            cursor.execute(
                """
                UPDATE contracts
                SET matched_product = CASE
                    WHEN EXISTS (
                        SELECT 1 FROM products p WHERE p.ste_id = contracts.ste_id
                    ) THEN 1
                    ELSE 0
                END
                """
            )
            cursor.connection.commit()
        return {"products": rows, "attributes": attributes_count}

    def _ingest_contracts_file(
        self,
        cursor,
        path: Path,
        warnings: list[str],
        *,
        job_id: str,
    ) -> dict:
        rows = 0
        matched = 0
        unmatched = 0
        touched_customers: set[str] = set()
        reader, skip_header = self._open_detected_reader(path, "contracts", warnings)
        estimated_rows = self._estimate_total_rows(path, skip_header)
        product_ids = {
            row["ste_id"] for row in cursor.execute("SELECT ste_id FROM products").fetchall()
        }
        contracts_batch: list[tuple] = []

        def flush_batch() -> None:
            nonlocal contracts_batch
            if not contracts_batch:
                return
            cursor.executemany(
                """
                INSERT INTO contracts (
                    contract_key, contract_id, ste_id, purchase_name_raw, purchase_name_norm,
                    contract_date, cost, customer_inn, customer_name, customer_region,
                    supplier_inn, supplier_name, supplier_region, matched_product,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(contract_key) DO UPDATE SET
                    purchase_name_raw = excluded.purchase_name_raw,
                    purchase_name_norm = excluded.purchase_name_norm,
                    contract_date = excluded.contract_date,
                    cost = excluded.cost,
                    customer_name = excluded.customer_name,
                    customer_region = excluded.customer_region,
                    supplier_inn = excluded.supplier_inn,
                    supplier_name = excluded.supplier_name,
                    supplier_region = excluded.supplier_region,
                    matched_product = excluded.matched_product,
                    updated_at = excluded.updated_at
                """,
                contracts_batch,
            )
            cursor.connection.commit()
            self._update_stage_progress(
                job_id,
                stage_start=0.45,
                stage_end=0.72,
                processed=rows,
                estimated_total=estimated_rows,
            )
            contracts_batch = []

        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            csv_reader = csv.reader(handle, delimiter=reader["delimiter"])
            for row_index, row in enumerate(csv_reader):
                if row_index == 0 and skip_header:
                    continue
                if not row or not any(cell.strip() for cell in row):
                    continue
                if len(row) != 11:
                    self._append_warning(
                        warnings,
                        f"Contracts row {row_index + 1} skipped: expected 11 columns, got {len(row)}."
                    )
                    continue

                cleaned = [clean_cell(cell) for cell in row]
                (
                    purchase_name,
                    contract_id,
                    ste_id,
                    contract_date,
                    cost_raw,
                    customer_inn,
                    customer_name,
                    customer_region,
                    supplier_inn,
                    supplier_name,
                    supplier_region,
                ) = cleaned
                if not contract_id or not ste_id or not customer_inn:
                    self._append_warning(
                        warnings,
                        f"Contracts row {row_index + 1} skipped: required ids are empty."
                    )
                    continue

                cost = None
                if cost_raw:
                    try:
                        cost = float(cost_raw)
                    except ValueError:
                        self._append_warning(
                            warnings,
                            f"Contracts row {row_index + 1} has invalid cost '{cost_raw}'."
                        )

                matched_product = 1 if ste_id in product_ids else 0
                matched += 1 if matched_product else 0
                unmatched += 0 if matched_product else 1

                contract_key = f"{contract_id}:{ste_id}"
                timestamp = utcnow_iso()
                contracts_batch.append(
                    (
                        contract_key,
                        contract_id,
                        ste_id,
                        purchase_name,
                        normalize_text(purchase_name),
                        contract_date or None,
                        cost,
                        customer_inn,
                        customer_name,
                        customer_region,
                        supplier_inn,
                        supplier_name,
                        supplier_region,
                        matched_product,
                        timestamp,
                        timestamp,
                    )
                )
                rows += 1
                touched_customers.add(customer_inn)
                if len(contracts_batch) >= CONTRACT_BATCH_SIZE:
                    flush_batch()

        flush_batch()

        return {
            "contracts": rows,
            "matched": matched,
            "unmatched": unmatched,
            "customers": touched_customers,
        }

    def _rebuild_customer_profiles(self, cursor, customer_inns: set[str]) -> int:
        if not customer_inns:
            return 0

        customer_list = sorted(customer_inns)
        self._delete_by_ids(cursor, "customer_profiles", "customer_inn", customer_list)
        self._delete_by_ids(
            cursor, "customer_category_stats", "customer_inn", customer_list
        )
        self._delete_by_ids(cursor, "customer_ste_stats", "customer_inn", customer_list)

        placeholders = ",".join("?" for _ in customer_list)
        rows = cursor.execute(
            f"""
            SELECT
                c.customer_inn,
                c.customer_name,
                c.ste_id,
                c.purchase_name_raw,
                c.contract_date,
                c.cost,
                c.matched_product,
                p.category_norm,
                p.title_raw
            FROM contracts c
            LEFT JOIN products p ON p.ste_id = c.ste_id
            WHERE c.customer_inn IN ({placeholders})
            ORDER BY c.customer_inn
            """,
            customer_list,
        )

        profile_rows: list[tuple] = []
        category_rows: list[tuple] = []
        ste_rows: list[tuple] = []

        current_customer: str | None = None
        current_name = ""
        purchase_count = 0
        matched_purchase_count = 0
        total_spend = 0.0
        last_purchase_at: str | None = None
        category_weights: Counter[str] = Counter()
        ste_weights: Counter[str] = Counter()
        token_weights: Counter[str] = Counter()

        def flush_customer() -> None:
            nonlocal current_customer
            nonlocal current_name
            nonlocal purchase_count
            nonlocal matched_purchase_count
            nonlocal total_spend
            nonlocal last_purchase_at
            nonlocal category_weights
            nonlocal ste_weights
            nonlocal token_weights
            if current_customer is None or purchase_count == 0:
                return
            timestamp = utcnow_iso()
            profile_rows.append(
                (
                    current_customer,
                    current_name,
                    purchase_count,
                    matched_purchase_count,
                    total_spend,
                    last_purchase_at,
                    json.dumps(counter_to_top_items(category_weights, 8), ensure_ascii=False),
                    json.dumps(counter_to_top_items(ste_weights, 10), ensure_ascii=False),
                    json.dumps(counter_to_top_items(token_weights, 30), ensure_ascii=False),
                    timestamp,
                )
            )
            category_rows.extend(
                (current_customer, category_norm, float(weight))
                for category_norm, weight in category_weights.items()
            )
            ste_rows.extend(
                (current_customer, ste_id, float(weight))
                for ste_id, weight in ste_weights.items()
            )

        for row in rows:
            customer_inn = row["customer_inn"]
            if current_customer is not None and customer_inn != current_customer:
                flush_customer()
                purchase_count = 0
                matched_purchase_count = 0
                total_spend = 0.0
                last_purchase_at = None
                category_weights = Counter()
                ste_weights = Counter()
                token_weights = Counter()

            if customer_inn != current_customer:
                current_customer = customer_inn
                current_name = row["customer_name"]

            purchase_count += 1
            matched_purchase_count += 1 if row["matched_product"] else 0
            total_spend += float(row["cost"] or 0.0)
            if recency_weight(row["contract_date"]) > 0 and (
                last_purchase_at is None or row["contract_date"] > last_purchase_at
            ):
                last_purchase_at = row["contract_date"]

            weight = 1.0 + recency_weight(row["contract_date"]) + log_cost_weight(
                row["cost"]
            )
            if row["category_norm"]:
                category_weights[row["category_norm"]] += weight
            ste_weights[row["ste_id"]] += weight
            for token in tokenize(row["purchase_name_raw"]):
                token_weights[token] += weight
            if row["title_raw"]:
                for token in tokenize(row["title_raw"]):
                    token_weights[token] += weight * 0.8

        flush_customer()

        if profile_rows:
            cursor.executemany(
                """
                INSERT INTO customer_profiles (
                    customer_inn, customer_name, purchase_count, matched_purchase_count,
                    total_spend, last_purchase_at, top_categories_json, top_ste_ids_json,
                    token_weights_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(customer_inn) DO UPDATE SET
                    customer_name = excluded.customer_name,
                    purchase_count = excluded.purchase_count,
                    matched_purchase_count = excluded.matched_purchase_count,
                    total_spend = excluded.total_spend,
                    last_purchase_at = excluded.last_purchase_at,
                    top_categories_json = excluded.top_categories_json,
                    top_ste_ids_json = excluded.top_ste_ids_json,
                    token_weights_json = excluded.token_weights_json,
                    updated_at = excluded.updated_at
                """,
                profile_rows,
            )
        if category_rows:
            cursor.executemany(
                """
                INSERT INTO customer_category_stats (customer_inn, category_norm, weight)
                VALUES (?, ?, ?)
                """,
                category_rows,
            )
        if ste_rows:
            cursor.executemany(
                """
                INSERT INTO customer_ste_stats (customer_inn, ste_id, weight)
                VALUES (?, ?, ?)
                """,
                ste_rows,
            )
        return len(profile_rows)

    def _rebuild_demo_profiles(self, cursor) -> int:
        rows = cursor.execute(
            """
            SELECT
                cp.customer_inn,
                cp.customer_name,
                cp.purchase_count,
                cp.matched_purchase_count,
                cp.top_categories_json,
                COUNT(ccs.category_norm) AS category_diversity
            FROM customer_profiles cp
            LEFT JOIN customer_category_stats ccs ON ccs.customer_inn = cp.customer_inn
            GROUP BY cp.customer_inn
            ORDER BY cp.matched_purchase_count DESC, category_diversity DESC, cp.purchase_count DESC
            LIMIT 12
            """
        ).fetchall()

        cursor.execute("DELETE FROM demo_profiles")
        selected = rows[:3]
        for order, row in enumerate(selected, start=1):
            summary = {
                "customerName": row["customer_name"],
                "purchaseCount": row["purchase_count"],
                "matchedPurchaseCount": row["matched_purchase_count"],
                "topCategories": json.loads(row["top_categories_json"]),
            }
            cursor.execute(
                """
                INSERT INTO demo_profiles (customer_inn, label, summary_json, sort_order)
                VALUES (?, ?, ?, ?)
                """,
                [
                    row["customer_inn"],
                    f"Demo profile {order}",
                    json.dumps(summary, ensure_ascii=False),
                    order,
                ],
            )
        return len(selected)

    def _rebuild_lexicon(self, cursor) -> int:
        counter: Counter[str] = Counter()
        rows = cursor.execute("SELECT search_text FROM products").fetchall()
        for row in rows:
            counter.update(tokenize(row["search_text"]))

        cursor.execute("DELETE FROM lexicon")
        cursor.executemany(
            "INSERT INTO lexicon (term, doc_freq) VALUES (?, ?)",
            [(term, int(doc_freq)) for term, doc_freq in counter.most_common(25000)],
        )
        return len(counter)

    def _rebuild_term_dictionary(self, cursor) -> int:
        term_stats: dict[str, dict[str, Any]] = {}

        def register_terms(text: str | None, source_mask: int, forced_type: str | None = None) -> None:
            seen_tokens = set(tokenize(text))
            for token in seen_tokens:
                lemma = self.morphology.lemma(token, forced_type)
                info = term_stats.setdefault(
                    token,
                    {
                        "lemma": lemma or simple_russian_lemma(token) or token,
                        "doc_freq": 0,
                        "term_type": forced_type or self._infer_term_type(token),
                        "source_mask": 0,
                    },
                )
                info["doc_freq"] += 1
                info["source_mask"] |= source_mask
                if forced_type:
                    info["term_type"] = forced_type
                if not info["lemma"]:
                    info["lemma"] = lemma or token

        for row in cursor.execute(
            """
            SELECT title_raw, category_raw, brand_guess, model_guess, attributes_raw
            FROM products
            """
        ).fetchall():
            register_terms(row["title_raw"], 1)
            register_terms(row["category_raw"], 2, forced_type="category")
            if row["brand_guess"]:
                register_terms(row["brand_guess"], 4, forced_type="brand")
            if row["model_guess"]:
                register_terms(row["model_guess"], 8, forced_type="model")
            for attr_name, attr_value in parse_attributes(row["attributes_raw"]):
                register_terms(attr_name, 16, forced_type="attribute")
                register_terms(attr_value, 32)

        for row in cursor.execute(
            "SELECT purchase_name_raw FROM contracts"
        ).fetchall():
            register_terms(row["purchase_name_raw"], 64)

        for alias, canonical in build_seed_synonym_pairs():
            register_terms(alias, 128, forced_type=self._infer_term_type(canonical))
            register_terms(canonical, 128, forced_type=self._infer_term_type(canonical))

        timestamp = utcnow_iso()
        cursor.execute("DELETE FROM term_dictionary")
        cursor.executemany(
            """
            INSERT INTO term_dictionary (
                term, lemma, doc_freq, term_type, source_mask, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    term,
                    str(meta["lemma"]),
                    int(meta["doc_freq"]),
                    str(meta["term_type"]),
                    int(meta["source_mask"]),
                    timestamp,
                )
                for term, meta in sorted(term_stats.items())
                if term
            ],
        )
        snapshot_path = settings.ARTIFACTS_DIR / "term_dictionary_snapshot.json"
        snapshot_path.write_text(
            json.dumps(
                {
                    term: {
                        "lemma": meta["lemma"],
                        "docFreq": meta["doc_freq"],
                        "termType": meta["term_type"],
                        "sourceMask": meta["source_mask"],
                    }
                    for term, meta in sorted(term_stats.items())
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        self._upsert_model_artifact(
            cursor,
            artifact_key="term_dictionary_snapshot",
            path=snapshot_path,
            signature={
                "terms": len(term_stats),
            },
            meta={"kind": "term_dictionary"},
        )
        return len(term_stats)

    def _rebuild_symspell_dictionary_artifact(self, cursor) -> None:
        rows = cursor.execute(
            """
            SELECT term, doc_freq
            FROM term_dictionary
            ORDER BY doc_freq DESC, term ASC
            """
        ).fetchall()
        path = settings.ARTIFACTS_DIR / "symspell_dictionary.txt"
        with path.open("w", encoding="utf-8", newline="\n") as handle:
            for row in rows:
                handle.write(f"{row['term']} {int(row['doc_freq'])}\n")
        self._upsert_model_artifact(
            cursor,
            artifact_key="symspell_dictionary",
            path=path,
            signature={"terms": len(rows)},
            meta={"kind": "symspell"},
        )

    def _mine_synonym_candidates(self, cursor) -> int:
        candidates: dict[tuple[str, str, str], dict[str, Any]] = {}
        timestamp = utcnow_iso()

        def remember(alias: str, canonical: str, score: float, source: str, scope: str = "global", context: dict[str, Any] | None = None) -> None:
            alias_norm = normalize_text(alias)
            canonical_norm = normalize_text(canonical)
            if not alias_norm or not canonical_norm or alias_norm == canonical_norm:
                return
            key = (alias_norm, canonical_norm, scope)
            previous = candidates.get(key)
            if previous and previous["score"] >= score:
                return
            candidates[key] = {
                "alias": alias_norm,
                "canonical": canonical_norm,
                "score": round(score, 4),
                "source": source,
                "context_json": json.dumps(context or {}, ensure_ascii=False),
                "status": "pending",
                "updated_at": timestamp,
            }

        for alias, canonical in build_seed_synonym_pairs():
            remember(alias, canonical, 1.0, "seed")

        lemma_groups: dict[str, list[tuple[str, int, str]]] = {}
        for row in cursor.execute(
            """
            SELECT term, lemma, doc_freq, term_type
            FROM term_dictionary
            """
        ).fetchall():
            lemma_groups.setdefault(row["lemma"], []).append(
                (row["term"], int(row["doc_freq"]), str(row["term_type"]))
            )

        for lemma, terms in lemma_groups.items():
            if len(terms) < 2:
                continue
            terms.sort(key=lambda item: (-item[1], item[0]))
            canonical = terms[0][0]
            canonical_type = terms[0][2]
            for term, doc_freq, term_type in terms[1:8]:
                if term_type != canonical_type and canonical_type not in {"token", term_type}:
                    continue
                confidence = 0.94 if canonical_type in {"token", "category", "attribute"} else 0.90
                remember(
                    term,
                    canonical,
                    confidence,
                    "lemma_group",
                    context={"lemma": lemma, "docFreq": doc_freq},
                )

        cursor.execute("DELETE FROM synonym_candidates")
        cursor.executemany(
            """
            INSERT INTO synonym_candidates (
                alias, canonical, scope, score, source, context_json, status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    payload["alias"],
                    payload["canonical"],
                    scope,
                    payload["score"],
                    payload["source"],
                    payload["context_json"],
                    payload["status"],
                    payload["updated_at"],
                )
                for (alias, canonical, scope), payload in sorted(candidates.items())
            ],
        )
        snapshot_path = settings.ARTIFACTS_DIR / "synonym_snapshot.json"
        snapshot_path.write_text(
            json.dumps(
                sorted(candidates.values(), key=lambda item: (-item["score"], item["alias"])),
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        self._upsert_model_artifact(
            cursor,
            artifact_key="synonym_snapshot",
            path=snapshot_path,
            signature={"candidates": len(candidates)},
            meta={"kind": "synonyms"},
        )
        return len(candidates)

    def _materialize_synonym_rules(self, cursor) -> int:
        timestamp = utcnow_iso()
        term_types = {
            row["term"]: row["term_type"]
            for row in cursor.execute(
                "SELECT term, term_type FROM term_dictionary"
            ).fetchall()
        }
        cursor.execute("DELETE FROM synonym_rules")

        rules: dict[tuple[str, str, str], tuple[float, str, str]] = {}

        for alias, canonical in build_seed_synonym_pairs():
            rules[(alias, canonical, "global")] = (1.0, "seed", "active")

        for row in cursor.execute(
            """
            SELECT alias, canonical, scope, score, source
            FROM synonym_candidates
            WHERE score >= 0.92
            ORDER BY score DESC
            """
        ).fetchall():
            alias = row["alias"]
            canonical = row["canonical"]
            if alias == canonical:
                continue
            alias_type = term_types.get(alias, "token")
            canonical_type = term_types.get(canonical, "token")
            if alias_type not in {"token", canonical_type} and canonical_type not in {"token", alias_type}:
                continue
            rules[(alias, canonical, row["scope"])] = (
                float(row["score"]),
                str(row["source"]),
                "active",
            )

        cursor.executemany(
            """
            INSERT INTO synonym_rules (
                alias, canonical, scope, confidence, source, status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    alias,
                    canonical,
                    scope,
                    confidence,
                    source,
                    status,
                    timestamp,
                )
                for (alias, canonical, scope), (confidence, source, status) in sorted(rules.items())
            ],
        )
        return len(rules)

    def _rebuild_search_text_and_fts(self, cursor, *, job_id: str) -> None:
        synonym_map: dict[str, str] = dict(SYNONYM_MAP)
        synonym_groups: dict[str, list[str]] = {
            key: list(values) for key, values in SYNONYM_GROUPS.items()
        }

        for row in cursor.execute(
            """
            SELECT alias, canonical
            FROM synonym_rules
            WHERE status = 'active' AND scope = 'global'
            """
        ).fetchall():
            alias = normalize_text(row["alias"])
            canonical = normalize_text(row["canonical"])
            synonym_map[alias] = canonical
            values = synonym_groups.setdefault(canonical, [])
            if alias not in values and alias != canonical:
                values.append(alias)

        product_rows = cursor.execute(
            """
            SELECT ste_id, title_raw, category_raw, attributes_raw, brand_guess, model_guess
            FROM products
            ORDER BY ste_id
            """
        ).fetchall()
        total = max(len(product_rows), 1)
        cursor.execute("DELETE FROM product_fts")

        batch: list[tuple[str, str, str]] = []
        for index, row in enumerate(product_rows, start=1):
            attributes = parse_attributes(row["attributes_raw"])
            search_text = build_search_text(
                row["title_raw"],
                row["category_raw"],
                attributes,
                brand_guess=row["brand_guess"],
                model_guess=row["model_guess"],
                synonyms_map=synonym_map,
                synonym_groups=synonym_groups,
                include_lemmas=True,
            )
            batch.append((search_text, utcnow_iso(), row["ste_id"]))
            cursor.execute(
                "INSERT INTO product_fts (ste_id, search_text) VALUES (?, ?)",
                [row["ste_id"], search_text],
            )
            if len(batch) >= STE_BATCH_SIZE:
                cursor.executemany(
                    "UPDATE products SET search_text = ?, updated_at = ? WHERE ste_id = ?",
                    batch,
                )
                batch = []
                self._update_stage_progress(
                    job_id,
                    stage_start=0.92,
                    stage_end=0.98,
                    processed=index,
                    estimated_total=total,
                )

        if batch:
            cursor.executemany(
                "UPDATE products SET search_text = ?, updated_at = ? WHERE ste_id = ?",
                batch,
            )

    def _train_or_refresh_ranker(self, cursor) -> int:
        if not settings.RANKER_ENABLED:
            return 0
        artifact_path = settings.ARTIFACTS_DIR / "catboost_ranker.cbm"
        contract_rows = [
            dict(row)
            for row in cursor.execute(
                """
                SELECT c.customer_inn, c.ste_id, c.purchase_name_raw, p.title_raw
                FROM contracts c
                JOIN products p ON p.ste_id = c.ste_id
                WHERE c.matched_product = 1
                ORDER BY c.updated_at DESC
                LIMIT 2000
                """
            ).fetchall()
        ]
        cases = build_training_cases(contract_rows)
        if artifact_path.exists():
            artifact_path.unlink()

        meta = {
            "kind": "catboost_ranker",
            "cases": len(cases),
            "enabled": False,
            "version": "fallback-v1",
        }
        trained_groups = 0
        if len(cases) >= 50:
            try:
                from catboost import CatBoostRanker, Pool

                from app.services.ranking.features import ordered_feature_values
                from app.services.search_service import SearchService

                search_service = SearchService(self.db)
                feature_rows: list[list[float]] = []
                labels: list[float] = []
                group_ids: list[int] = []
                sampled_cases = cases[: min(len(cases), 600)]
                for group_id, case in enumerate(sampled_cases, start=1):
                    response = search_service.search(
                        query=case.query,
                        customer_id=case.customer_id,
                        session_id=None,
                        limit=min(settings.RANKER_CANDIDATES, 24),
                        offset=0,
                        include_debug=False,
                        enable_personalization=True,
                        track_event=False,
                    )
                    rows = response.get("results", [])
                    positive_rows = [
                        row
                        for row in rows
                        if row["product"]["id"] == case.expected_ste_id
                    ]
                    negative_rows = [
                        row
                        for row in rows
                        if row["product"]["id"] != case.expected_ste_id
                    ]
                    if not positive_rows or not negative_rows:
                        continue
                    for row in [*positive_rows[:1], *negative_rows[:7]]:
                        feature_rows.append(
                            ordered_feature_values(
                                row.get("_rankingFeatures", {}),
                                feed_mode=False,
                            )
                        )
                        labels.append(1.0 if row["product"]["id"] == case.expected_ste_id else 0.0)
                        group_ids.append(group_id)
                    trained_groups += 1

                if trained_groups >= 20 and feature_rows:
                    pool = Pool(feature_rows, label=labels, group_id=group_ids)
                    model = CatBoostRanker(
                        iterations=60,
                        depth=6,
                        learning_rate=0.12,
                        loss_function="YetiRankPairwise",
                        verbose=False,
                        random_seed=42,
                    )
                    model.fit(pool)
                    model.save_model(str(artifact_path))
                    meta = {
                        "kind": "catboost_ranker",
                        "cases": len(cases),
                        "groups": trained_groups,
                        "enabled": True,
                        "version": "catboost-v1",
                    }
            except Exception:
                trained_groups = 0

        self._upsert_model_artifact(
            cursor,
            artifact_key="catboost_ranker",
            path=artifact_path,
            signature={"cases": len(cases), "groups": trained_groups},
            meta=meta,
        )
        return 1 if meta.get("enabled") else 0

    def _upsert_model_artifact(
        self,
        cursor,
        *,
        artifact_key: str,
        path: Path,
        signature: dict[str, Any],
        meta: dict[str, Any],
    ) -> None:
        cursor.execute(
            """
            INSERT INTO model_artifacts (artifact_key, signature_json, path, meta_json, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(artifact_key) DO UPDATE SET
                signature_json = excluded.signature_json,
                path = excluded.path,
                meta_json = excluded.meta_json,
                updated_at = excluded.updated_at
            """,
            [
                artifact_key,
                json.dumps(signature, ensure_ascii=False),
                str(path),
                json.dumps(meta, ensure_ascii=False),
                utcnow_iso(),
            ],
        )

    def _infer_term_type(self, token: str) -> str:
        normalized = normalize_text(token)
        if not normalized:
            return "token"
        if looks_like_unit(normalized):
            return "unit"
        if is_alphanumeric_model(normalized):
            return "model"
        if normalized in {"smartbuy", "lenovo", "dell"}:
            return "brand"
        if any(character.isdigit() for character in normalized):
            return "model"
        return "token"

    def _open_detected_reader(
        self, path: Path, dataset_type: str, warnings: list[str]
    ) -> tuple[dict[str, str], bool]:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            preview = handle.read(4096)
        delimiter = ";" if preview.count(";") >= preview.count(",") else ","
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            first_row = next(csv.reader(handle, delimiter=delimiter), [])

        normalized_cells = [normalize_text(cell) for cell in first_row]
        if dataset_type == "ste":
            header_hits = sum(1 for cell in normalized_cells if cell in STE_HEADER_FIELDS)
            skip_header = len(first_row) == 4 and header_hits >= 2
            if len(first_row) not in {0, 4}:
                self._append_warning(
                    warnings,
                    f"STE schema warning: first row has {len(first_row)} columns."
                )
        else:
            header_hits = sum(
                1 for cell in normalized_cells if cell in CONTRACT_HEADER_FIELDS
            )
            skip_header = len(first_row) == 11 and header_hits >= 3
            if len(first_row) not in {0, 11}:
                self._append_warning(
                    warnings,
                    f"Contracts schema warning: first row has {len(first_row)} columns."
                )
        return {"delimiter": delimiter}, skip_header

    def _job_row_to_dict(self, row) -> dict:
        return {
            "jobId": row["job_id"],
            "status": row["status"],
            "mode": row["mode"],
            "createdAt": row["created_at"],
            "startedAt": row["started_at"],
            "finishedAt": row["finished_at"],
            "progress": row["progress"],
            "warnings": json.loads(row["warnings_json"] or "[]"),
            "errors": json.loads(row["errors_json"] or "[]"),
            "stats": json.loads(row["stats_json"] or "{}"),
        }
