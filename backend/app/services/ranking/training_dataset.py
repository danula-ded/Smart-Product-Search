"""Offline helpers for generating lightweight ranking training rows."""

from __future__ import annotations

from dataclasses import dataclass

from app.services.text_utils import title_snippet_tokens


@dataclass(frozen=True)
class RankingTrainingCase:
    customer_id: str
    query: str
    expected_ste_id: str


def build_training_cases(contract_rows: list[dict]) -> list[RankingTrainingCase]:
    cases: list[RankingTrainingCase] = []
    for row in contract_rows:
        query = row.get("purchase_name_raw") or row.get("title_raw") or ""
        query = query.strip()
        if not query and row.get("title_raw"):
            query = title_snippet_tokens(row["title_raw"])
        if not query:
            continue
        cases.append(
            RankingTrainingCase(
                customer_id=str(row["customer_inn"]),
                query=query,
                expected_ste_id=str(row["ste_id"]),
            )
        )
    return cases
