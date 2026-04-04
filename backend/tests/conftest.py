"""Shared fixtures for the upload-driven backend."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from app.main import app, initialize_app_state


@pytest.fixture(autouse=True)
def isolated_runtime(tmp_path, monkeypatch):
    runtime_dir = tmp_path / "runtime"
    monkeypatch.setenv("RUNTIME_DIR", str(runtime_dir))
    monkeypatch.setenv("UPLOAD_DIR", str(runtime_dir / "uploads"))
    monkeypatch.setenv("DB_PATH", str(runtime_dir / "search.sqlite"))
    initialize_app_state(app)
    yield
    runtime = getattr(app.state, "runtime", None)
    if runtime is not None:
        runtime.datasets.shutdown()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def ste_csv() -> bytes:
    return (
        "\ufeff1001;Флеш-накопитель SMARTBUY Glossy USB 2.0 черный 16 Гб;USB-накопители;"
        "\"Объем накопителя:16.00000;Цвет:черный;Интерфейс подключения:USB 2\"\n"
        "1002;Флеш-накопитель SMARTBUY Crown USB 2.0 черный 4 Гб;USB-накопители;"
        "\"Объем накопителя:4.00000;Цвет:черный;Интерфейс подключения:USB 2\"\n"
        "2001;Парацетамол табл. 500 мг №10;Анальгетики;"
        "\"МНН или химическое, группировочное наименование:Парацетамол;Дозировка:500 мг;Лекарственная форма:таблетки\"\n"
        "3001;Ноутбук Lenovo ThinkPad X1 Carbon;Ноутбуки;"
        "\"Оперативная память:16 ГБ;Процессор:Intel Core i7;Диагональ:14 дюйм\"\n"
    ).encode("utf-8")


@pytest.fixture
def contracts_csv() -> bytes:
    return (
        "\"Флеш-накопитель SMARTBUY Glossy USB 2.0 черный 16 Гб\";50001;1001;2025-01-10 10:00:00;1200.00;7700000001;ГБУ Тест 1;Москва;7800000001;ООО Поставщик 1;Москва\n"
        "\"Парацетамол табл. 500 мг №10\";50002;2001;2025-02-11 12:30:00;350.00;7700000002;ГБУ Тест 2;Москва;7800000002;ООО Поставщик 2;Москва\n"
        "\"Ноутбук Lenovo ThinkPad X1 Carbon\";50003;3001;2024-12-20 09:15:00;125000.00;7700000001;ГБУ Тест 1;Москва;7800000003;ООО Поставщик 3;Москва\n"
        "\"Неизвестный товар\";50004;9999;2026-12-25 00:00:00;500.00;7700000003;ГБУ Тест 3;Москва;7800000004;ООО Поставщик 4;Москва\n"
    ).encode("utf-8")


def wait_for_job(client: TestClient, job_id: str, timeout: float = 5.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        response = client.get(f"/datasets/jobs/{job_id}")
        payload = response.json()
        if payload["status"] in {"successful", "failed", "interrupted"}:
            return payload
        time.sleep(0.05)
    raise AssertionError(f"Job {job_id} did not finish in time")
