"""Integration tests for upload, search, and dynamic personalization APIs."""

from __future__ import annotations

from app.config import settings

from .conftest import wait_for_job


def _upload_test_dataset(client, ste_csv, contracts_csv) -> None:
    response = client.post(
        "/datasets/upload",
        data={"mode": "replace_all"},
        files={
            "ste_file": ("ste.csv", ste_csv, "text/csv"),
            "contracts_file": ("contracts.csv", contracts_csv, "text/csv"),
        },
    )
    assert response.status_code == 200
    job = wait_for_job(client, response.json()["jobId"])
    assert job["status"] == "successful"


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_replace_all_upload_and_summary(client, ste_csv, contracts_csv):
    _upload_test_dataset(client, ste_csv, contracts_csv)

    summary = client.get("/datasets/summary")
    payload = summary.json()
    assert payload["counts"]["products"] == 4
    assert payload["counts"]["contracts"] == 4
    assert payload["counts"]["profiles"] >= 3


def test_search_returns_personalized_results_after_upload(client, ste_csv, contracts_csv):
    _upload_test_dataset(client, ste_csv, contracts_csv)

    baseline = client.post(
        "/search",
        json={"query": "thinkpad lenovo", "limit": 10, "offset": 0},
    )
    personalized = client.post(
        "/search",
        json={
            "query": "thinkpad lenovo",
            "customerId": "7700000001",
            "sessionId": "session-1",
            "limit": 10,
            "offset": 0,
            "includeDebug": True,
        },
    )

    assert baseline.status_code == 200
    assert personalized.status_code == 200
    assert personalized.json()["results"][0]["product"]["id"] == "3001"
    assert personalized.json()["profileSummary"]["customerId"] == "7700000001"
    assert personalized.json()["results"][0]["score"] >= baseline.json()["results"][0]["score"]
    assert personalized.json()["results"][0]["scoreBreakdown"]


def test_search_handles_keyboard_layout_and_reports_interpretation(
    client, ste_csv, contracts_csv
):
    _upload_test_dataset(client, ste_csv, contracts_csv)

    response = client.post(
        "/search",
        json={
            "query": "aktirf smartbuy 16",
            "limit": 10,
            "offset": 0,
            "includeDebug": True,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["product"]["id"] == "1001"
    assert payload["correctedQuery"].startswith("флешка")
    assert any(item["from"] == "aktirf" for item in payload["queryInterpretation"]["layoutCorrections"])
    assert "usb" in payload["searchTermsUsed"]
    assert payload["queryInterpretation"]["synonymMappings"]


def test_search_handles_typos_and_synonyms(client, ste_csv, contracts_csv):
    _upload_test_dataset(client, ste_csv, contracts_csv)

    response = client.post(
        "/search",
        json={
            "query": "флешка smartbu 16",
            "limit": 10,
            "offset": 0,
            "includeDebug": True,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["product"]["id"] == "1001"
    assert payload["correctedQuery"].split()[1] == "smartbuy"
    assert any(item["to"] == "smartbuy" for item in payload["queryInterpretation"]["typoCorrections"])
    assert any(item["to"] == "usb" for item in payload["queryInterpretation"]["synonymMappings"])


def test_duplicate_ste_rows_do_not_create_duplicate_search_results(
    client, ste_csv, contracts_csv
):
    duplicate_row = (
        "1001;Флеш-накопитель SMARTBUY Glossy USB 2.0 черный 16 Гб;USB-накопители;"
        "\"Объем накопителя:16.00000;Цвет:черный;Интерфейс подключения:USB 2\"\n"
    ).encode("utf-8")
    _upload_test_dataset(client, ste_csv + duplicate_row, contracts_csv)

    response = client.post(
        "/search",
        json={
            "query": "smartbuy usb 16",
            "limit": 10,
            "offset": 0,
            "includeDebug": True,
        },
    )
    assert response.status_code == 200
    ids = [item["product"]["id"] for item in response.json()["results"]]
    assert len(ids) == len(set(ids))


def test_dynamic_events_change_follow_up_ranking(client, ste_csv, contracts_csv):
    _upload_test_dataset(client, ste_csv, contracts_csv)

    session_id = "session-dynamic"
    initial = client.post(
        "/search",
        json={
            "query": "smartbuy usb 16",
            "customerId": "7700000001",
            "sessionId": session_id,
            "includeDebug": True,
        },
    ).json()
    top_before = initial["results"][0]["product"]["id"]

    event = client.post(
        "/events",
        json={
            "sessionId": session_id,
            "customerId": "7700000001",
            "eventType": "marked_irrelevant",
            "productId": top_before,
            "query": "smartbuy usb 16",
            "position": 1,
        },
    )
    assert event.status_code == 200

    after = client.post(
        "/search",
        json={
            "query": "smartbuy usb 16",
            "customerId": "7700000001",
            "sessionId": session_id,
            "includeDebug": True,
        },
    ).json()
    assert (
        after["results"][0]["product"]["id"] != top_before
        or after["results"][0]["score"] <= initial["results"][0]["score"]
    )


def test_profiles_and_metrics_endpoints(client, ste_csv, contracts_csv):
    _upload_test_dataset(client, ste_csv, contracts_csv)

    profiles = client.get("/profiles/demo")
    assert profiles.status_code == 200
    assert len(profiles.json()) >= 1

    metrics = client.get("/metrics/summary")
    assert metrics.status_code == 200
    payload = metrics.json()
    assert "baseline" in payload
    assert "personalized" in payload


def test_bootstrap_default_dataset_and_clear_endpoint(
    client, ste_csv, contracts_csv, tmp_path, monkeypatch
):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "catalog.csv").write_bytes(ste_csv)
    (data_dir / "contracts.csv").write_bytes(contracts_csv)
    monkeypatch.setattr(settings, "PROJECT_ROOT", tmp_path)

    bootstrap = client.post("/datasets/bootstrap-default")
    assert bootstrap.status_code == 200
    job_id = bootstrap.json()["jobId"]
    job = wait_for_job(client, job_id)
    assert job["status"] == "successful"

    summary = client.get("/datasets/summary")
    assert summary.status_code == 200
    assert summary.json()["counts"]["products"] == 4

    cleared = client.post("/datasets/clear")
    assert cleared.status_code == 200
    assert cleared.json()["success"] is True

    after_clear = client.get("/datasets/summary")
    payload = after_clear.json()
    assert payload["counts"]["products"] == 0
    assert payload["counts"]["contracts"] == 0
    assert payload["imports"] == []
