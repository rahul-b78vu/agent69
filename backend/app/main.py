"""
FastAPI application entry point for Agent 69.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config.settings import get_settings
from app.database.init_db import init_db
from app.api import auth, students, alerts, agent, dashboard, reports, calibration, settings, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables and initial defaults/demo accounts exist
    init_db()
    yield


settings_config = get_settings()

app = FastAPI(
    title=settings_config.APP_NAME,
    version="1.0.0",
    description="Agent 69: Production-style University Student Support Early-Warning System",
    lifespan=lifespan,
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(calibration.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(audit.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok", "system": "Agent 69"}


# --- Static frontend serving (unified deployment for Render / Docker) ---
def get_frontend_dir() -> str | None:
    candidates = [
        # 1. backend/static
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")),
        # 2. frontend/dist relative to backend
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")),
        # 3. current working dir static
        os.path.abspath(os.path.join(os.getcwd(), "static")),
        # 4. current working dir frontend/dist
        os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist")),
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isfile(os.path.join(c, "index.html")):
            return c
    return None


frontend_dir = get_frontend_dir()

if frontend_dir:
    assets_dir = os.path.join(frontend_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_root():
        index_file = os.path.join(frontend_dir, "index.html")
        return FileResponse(index_file)

    @app.get("/{full_path:path}")
    async def serve_spa_or_static(full_path: str):
        # Don't intercept API or OpenAPI documentation routes
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")

        file_candidate = os.path.join(frontend_dir, full_path)
        if os.path.isfile(file_candidate):
            return FileResponse(file_candidate)

        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)

        return {"system": "Agent 69 - Early Warning Agent", "status": "operational"}
else:
    @app.get("/")
    def root():
        return {
            "system": "Agent 69 - Early Warning Agent",
            "status": "operational",
            "docs": "/docs",
            "disclaimer": "This system detects observed patterns requiring human review. It is not an autonomous decision-maker.",
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
