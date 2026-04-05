from __future__ import annotations

from app.services.search_nlp.morphology import MorphologyService
from app.services.search_nlp.query_understanding import QueryUnderstandingService
from app.services.search_nlp.spellcheck import SpellcheckService
from app.storage.sqlite_db import SQLiteDatabase, utcnow_iso


def test_morphology_service_normalizes_common_russian_forms():
    morphology = MorphologyService()
    assert morphology.lemma("конфеты") == morphology.lemma("конфетами")
    assert morphology.lemma("рабочая") == morphology.lemma("рабочие")


def test_spellcheck_service_corrects_basic_typos():
    spellcheck = SpellcheckService(
        {
            "рабочая": {
                "lemma": "рабочий",
                "doc_freq": 120,
                "term_type": "token",
                "source_mask": 1,
            },
            "наушники": {
                "lemma": "наушник",
                "doc_freq": 90,
                "term_type": "token",
                "source_mask": 1,
            },
            "smartbuy": {
                "lemma": "smartbuy",
                "doc_freq": 500,
                "term_type": "brand",
                "source_mask": 1,
            },
        }
    )

    assert spellcheck.suggest("ребочая", protected=False, term_type="token")[0].term == "рабочая"
    assert spellcheck.suggest("наушнеки", protected=False, term_type="token")[0].term == "наушники"
    assert spellcheck.suggest("smartbu", protected=False, term_type="brand")[0].term == "smartbuy"


def test_query_understanding_service_uses_dictionary_and_synonyms(tmp_path):
    db = SQLiteDatabase(tmp_path / "search.sqlite")
    timestamp = utcnow_iso()
    with db.connect() as connection:
        cursor = connection.cursor()
        cursor.executemany(
            """
            INSERT INTO term_dictionary (term, lemma, doc_freq, term_type, source_mask, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("флешка", "флешка", 120, "token", 1, timestamp),
                ("smartbuy", "smartbuy", 500, "brand", 1, timestamp),
                ("usb", "usb", 90, "token", 1, timestamp),
            ],
        )
        cursor.executemany(
            """
            INSERT INTO synonym_rules (alias, canonical, scope, confidence, source, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("флешка", "usb", "global", 1.0, "seed", "active", timestamp),
            ],
        )
        connection.commit()

    service = QueryUnderstandingService(db)
    result = service.parse("aktirf smartbu 16")

    assert result.corrected_tokens[0] == "флешка"
    assert result.corrected_tokens[1] == "smartbuy"
    assert "usb" in result.retrieval_tokens
    assert "16" in result.protected_tokens
    assert result.layout_corrections
    assert result.typo_corrections
    assert result.spell_candidates


def test_query_understanding_does_not_overcorrect_known_russian_words(tmp_path):
    db = SQLiteDatabase(tmp_path / "search.sqlite")
    timestamp = utcnow_iso()
    with db.connect() as connection:
        cursor = connection.cursor()
        cursor.executemany(
            """
            INSERT INTO term_dictionary (term, lemma, doc_freq, term_type, source_mask, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                ("бакалея", "бакалея", 150, "token", 1, timestamp),
                ("рабочая", "рабочий", 200, "token", 1, timestamp),
            ],
        )
        connection.commit()

    service = QueryUnderstandingService(db)

    battery = service.parse("батарея")
    assert battery.corrected_tokens == ["батарея"]
    assert not battery.typo_corrections

    notebook = service.parse("ребочая")
    assert notebook.corrected_tokens == ["рабочая"]
    assert notebook.typo_corrections[0]["to"] == "рабочая"
