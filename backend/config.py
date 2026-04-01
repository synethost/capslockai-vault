import os
from pathlib import Path

# ── Base paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = Path(os.environ.get("VAULT_DATA_DIR", BASE_DIR.parent / "data"))
FRONTEND_DIR = Path(os.environ.get("VAULT_FRONTEND_DIR", BASE_DIR.parent / "frontend" / "dist"))

# ── Sub-directories (auto-created on startup) ─────────────────────────
UPLOADS_DIR = DATA_DIR / "uploads"
CHROMA_DIR  = DATA_DIR / "chroma"
DB_PATH     = DATA_DIR / "vault.db"

# ── Server ────────────────────────────────────────────────────────────
HOST = os.environ.get("VAULT_HOST", "127.0.0.1")
PORT = int(os.environ.get("VAULT_PORT", "8000"))

# ── Auth ──────────────────────────────────────────────────────────────
SECRET_KEY      = os.environ.get("VAULT_SECRET_KEY", "change-me-in-production-use-a-long-random-string")
ALGORITHM       = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days — suits SME non-tech users

# ── AI providers ──────────────────────────────────────────────────────
OLLAMA_BASE_URL  = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL     = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
OPENAI_API_KEY   = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL     = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

# ── Embeddings ────────────────────────────────────────────────────────
EMBEDDING_MODEL  = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# ── RAG ───────────────────────────────────────────────────────────────
CHUNK_SIZE       = 800    # characters per chunk
CHUNK_OVERLAP    = 100
TOP_K_RESULTS    = 5      # how many chunks to retrieve per query

def ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
