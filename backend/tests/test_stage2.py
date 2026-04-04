"""Tests for ingestion modes, schema handling, and incremental updates."""

from __future__ import annotations

from .conftest import wait_for_job


def seed_dataset(client, ste_csv, contracts_csv):
    response = client.post(
        "/datasets/upload",
        data={"mode": "replace_all"},
        files={
            "ste_file": ("ste.csv", ste_csv, "text/csv"),
            "contracts_file": ("contracts.csv", contracts_csv, "text/csv"),
        },
    )
    return wait_for_job(client, response.json()["jobId"])


def test_upsert_ste_adds_new_searchable_product(client, ste_csv, contracts_csv):
    seed_dataset(client, ste_csv, contracts_csv)

    extra_ste = (
        "4001;Фентанил трансдермальная терапевтическая система 25 мкг/час;АНАЛЬГЕТИКИ,N02;"
        "\"Дозировка:25 мкг/час;Лекарственная форма:трансдермальная терапевтическая система\"\n"
    ).encode("utf-8")
    response = client.post(
        "/datasets/upload",
        data={"mode": "upsert_ste"},
        files={"ste_file": ("extra_ste.csv", extra_ste, "text/csv")},
    )
    job = wait_for_job(client, response.json()["jobId"])
    assert job["status"] == "successful"
    assert job["stats"]["productsUpserted"] == 1

    search = client.post("/search", json={"query": "фентанил 25 мкг", "limit": 10})
    assert search.status_code == 200
    assert search.json()["results"][0]["product"]["id"] == "4001"


def test_append_contracts_updates_customer_profile(client, ste_csv, contracts_csv):
    seed_dataset(client, ste_csv, contracts_csv)

    extra_contracts = (
        "\"Флеш накопитель SMARTBUY Crown USB 2.0 черный 4 Гб\";50005;1002;2025-03-01 00:00:00;900.00;7700000001;ГБУ Тест 1;Москва;7800000001;ООО Поставщик 1;Москва\n"
    ).encode("utf-8")
    response = client.post(
        "/datasets/upload",
        data={"mode": "append_contracts"},
        files={"contracts_file": ("extra_contracts.csv", extra_contracts, "text/csv")},
    )
    job = wait_for_job(client, response.json()["jobId"])
    assert job["status"] == "successful"
    assert job["stats"]["contractsUpserted"] == 1

    profiles = client.get("/profiles/demo").json()
    assert any(profile["customerId"] == "7700000001" for profile in profiles)


def test_upsert_bundle_updates_products_and_contracts_together(client, ste_csv, contracts_csv):
    seed_dataset(client, ste_csv, contracts_csv)

    bundle_ste = (
        "5001;Монитор Dell UltraSharp U2720Q;Мониторы;"
        "\"Разрешение:3840x2160;Частота:60 Гц;Диагональ:27 дюйм\"\n"
    ).encode("utf-8")
    bundle_contract = (
        "\"Монитор Dell UltraSharp U2720Q\";50006;5001;2025-03-05 00:00:00;42000.00;7700000004;ГБУ Тест 4;Москва;7800000003;ООО Поставщик 3;Москва\n"
    ).encode("utf-8")
    response = client.post(
        "/datasets/upload",
        data={"mode": "upsert_bundle"},
        files={
            "ste_file": ("bundle_ste.csv", bundle_ste, "text/csv"),
            "contracts_file": ("bundle_contract.csv", bundle_contract, "text/csv"),
        },
    )
    job = wait_for_job(client, response.json()["jobId"])
    assert job["status"] == "successful"
    assert job["stats"]["productsUpserted"] == 1
    assert job["stats"]["contractsUpserted"] == 1

    search = client.post(
        "/search",
        json={"query": "ultrasharp 27 4k", "customerId": "7700000004"},
    ).json()
    assert search["results"][0]["product"]["id"] == "5001"


def test_schema_detection_handles_headers_and_warnings(client):
    ste_with_header = (
        "Идентификатор СТЕ;Наименование;Категория;Атрибуты\n"
        "9001;Тестовый товар;Категория;\"Цвет:синий\"\n"
    ).encode("utf-8")
    contracts_with_header = (
        "Наименование закупки;Идентификатор контракта;Идентификатор СТЕ;Дата заключения контракта;Стоимость контракта;ИНН заказчика;Наименование заказчика;Регион заказчика;ИНН поставщика;Наименование поставщика;Регион поставщика\n"
        "\"Тестовый товар\";90001;9001;2025-01-01 00:00:00;10.00;7700090001;Заказчик;Москва;7800090001;Поставщик;Москва\n"
    ).encode("utf-8")
    response = client.post(
        "/datasets/upload",
        data={"mode": "replace_all"},
        files={
            "ste_file": ("ste_header.csv", ste_with_header, "text/csv"),
            "contracts_file": ("contracts_header.csv", contracts_with_header, "text/csv"),
        },
    )
    job = wait_for_job(client, response.json()["jobId"])
    assert job["status"] == "successful"
    assert job["stats"]["productsUpserted"] == 1
    assert job["stats"]["contractsUpserted"] == 1

