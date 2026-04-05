"""FastAPI application entry point for the search MVP."""

from __future__ import annotations

from contextlib import asynccontextmanager
import warnings

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import router
from app.config import settings
from app.services import RuntimeServices, build_runtime

try:  # pragma: no cover
    from pydantic.warnings import UnsupportedFieldAttributeWarning
except ImportError:  # pragma: no cover
    UnsupportedFieldAttributeWarning = None

if UnsupportedFieldAttributeWarning is not None:
    warnings.filterwarnings("ignore", category=UnsupportedFieldAttributeWarning)
else:  # pragma: no cover
    warnings.filterwarnings("ignore", message=".*FieldAttributeWarning.*")


def initialize_app_state(app: FastAPI) -> RuntimeServices:
    settings.reload()
    settings.RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    runtime = build_runtime(settings.DB_PATH)
    previous = getattr(app.state, "runtime", None)
    if previous is not None and hasattr(previous.datasets, "shutdown"):
        previous.datasets.shutdown()
    app.state.runtime = runtime
    return runtime


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_app_state(app)
    try:
        yield
    finally:
        runtime = getattr(app.state, "runtime", None)
        if runtime is not None:
            runtime.datasets.shutdown()


app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


frontend_dist = settings.PROJECT_ROOT / "frontend" / "dist"
frontend_index = frontend_dist / "index.html"

if frontend_dist.exists():
    for asset_name in (
        "assets",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
        "apple-touch-icon.png",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "favicon.ico",
        "site.webmanifest",
    ):
        asset_path = frontend_dist / asset_name
        if asset_path.is_dir():
            app.mount(f"/{asset_name}", StaticFiles(directory=asset_path), name=f"frontend-{asset_name}")
        elif asset_path.is_file():
            route_path = f"/{asset_name}"

            @app.get(route_path, include_in_schema=False)
            async def serve_frontend_asset(asset_path=asset_path):
                return FileResponse(asset_path)

    @app.get("/", include_in_schema=False)
    async def serve_frontend_index():
        return FileResponse(frontend_index)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_spa(full_path: str):
        return FileResponse(frontend_index)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    app.openapi_schema = get_openapi(
        title=settings.API_TITLE,
        version=settings.API_VERSION,
        description=settings.API_DESCRIPTION,
        routes=app.routes,
    )
    return app.openapi_schema


app.openapi = custom_openapi


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
