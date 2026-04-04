"""Tests for query normalization, typo recovery, and behavior signals."""

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


def test_typo_recovery_and_synonyms_are_reported(client, ste_csv, contracts_csv):
    seed_dataset(client, ste_csv, contracts_csv)

    response = client.post(
        "/search",
        json={
            "query": "смартбуй флешка 16 гб",
            "customerId": "7700000001",
            "sessionId": "session-typo",
            "includeDebug": True,
        },
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["results"][0]["product"]["id"] == "1001"
    assert payload["correctedQuery"]
    assert payload["appliedSynonyms"]


def test_feedback_and_saved_results_write_real_state(client, ste_csv, contracts_csv):
    seed_dataset(client, ste_csv, contracts_csv)

    save_response = client.post(
        "/saved-results",
        json={"userId": "7700000001", "productId": "1001", "note": "Сохранить"},
    )
    assert save_response.status_code == 200
    saved = client.get("/saved-results", params={"user_id": "7700000001"})
    assert saved.status_code == 200
    assert saved.json()["totalCount"] >= 1

    feedback = client.post(
        "/feedback",
        json={"userId": "7700000001", "productId": "1001", "isRelevant": True},
    )
    assert feedback.status_code == 200


def test_future_dated_contract_is_stored_but_not_used_as_recency_boost(client, ste_csv, contracts_csv):
    seed_dataset(client, ste_csv, contracts_csv)

    search = client.post(
        "/search",
        json={
            "query": "неизвестный товар",
            "customerId": "7700000003",
            "sessionId": "future-check",
            "includeDebug": True,
        },
    )
    payload = search.json()
    assert search.status_code == 200
    assert payload["profileSummary"]["customerId"] == "7700000003"
    assert payload["profileSummary"]["lastPurchaseAt"] is None

