from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import SPAStaticFiles


def build_frontend_app(tmp_path) -> TestClient:
    dist_dir = tmp_path / "dist"
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True)
    (dist_dir / "index.html").write_text("<html><body>spa-entry</body></html>", encoding="utf-8")
    (assets_dir / "app.js").write_text("console.log('asset');", encoding="utf-8")

    app = FastAPI()
    app.mount("/", SPAStaticFiles(directory=dist_dir, html=True), name="frontend")
    return TestClient(app)


def test_spa_route_refresh_returns_index_html(tmp_path):
    client = build_frontend_app(tmp_path)

    response = client.get("/catalog", headers={"accept": "text/html"})

    assert response.status_code == 200
    assert "spa-entry" in response.text


def test_static_asset_is_served_without_fallback(tmp_path):
    client = build_frontend_app(tmp_path)

    response = client.get("/assets/app.js")

    assert response.status_code == 200
    assert "console.log('asset');" in response.text


def test_non_html_request_keeps_not_found_response(tmp_path):
    client = build_frontend_app(tmp_path)

    response = client.get("/catalog", headers={"accept": "application/json"})

    assert response.status_code == 404
