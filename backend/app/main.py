"""FastAPI application entry point for the search MVP."""

from __future__ import annotations

from contextlib import asynccontextmanager
import warnings

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
from pydantic.warnings import UnsupportedFieldAttributeWarning

from app.api import router
from app.config import settings
from app.services import RuntimeServices, build_runtime

warnings.filterwarnings("ignore", category=UnsupportedFieldAttributeWarning)


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
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


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
