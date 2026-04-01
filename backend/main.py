
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

import config
from config import ensure_dirs
from database import init_db
from routers import auth, vault, documents, chat, status, users, settings


# ── Lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs()
    init_db()
    print(f"✓ CapsLockAI Vault started — http://{config.HOST}:{config.PORT}")
    yield


# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="CapsLockAI Vault",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    lifespan=lifespan,
)

# CORS — only allow local origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   f"http://localhost:{config.PORT}", f"http://127.0.0.1:{config.PORT}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(vault.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(status.router)
app.include_router(settings.router)
app.include_router(users.router)


# ── Serve React frontend ───────────────────────────────────────────────
FRONTEND = config.FRONTEND_DIR

if FRONTEND.exists():
    assets = FRONTEND / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=str(assets)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        index = FRONTEND / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return JSONResponse(
            {"detail": "Frontend not built. Run: cd frontend && npm run build"},
            status_code=503,
        )
else:
    @app.get("/", include_in_schema=False)
    async def no_frontend():
        return JSONResponse({
            "message": "CapsLockAI Vault API is running.",
            "docs": "/api/docs",
            "note": "Frontend not found. Build it with: cd frontend && npm run build",
        })


# ── Dev entry point ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=False,
        log_level="info",
    )
