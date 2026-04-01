# CapsLockAI Vault — Frontend Build Guide

## USB Bundle Structure

```
VAULT-USB/
├── launch-windows.bat          ← Windows: double-click to run
├── launch-macos.command        ← macOS: double-click to run
├── launch-linux.sh             ← Linux: chmod +x, then run
│
├── backend/                    ← Your existing FastAPI app (unchanged)
│   ├── main.py
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   └── dist/                   ← Built React app (output of: npm run build)
│       ├── index.html
│       └── assets/
│
├── runtime/
│   ├── wheels/                 ← All Python wheels, pre-downloaded offline
│   ├── windows/python/         ← Embedded Python 3.12 for Windows
│   ├── macos-arm/python/       ← Python for Apple Silicon
│   ├── macos-x86/python/       ← Python for Intel Mac
│   ├── linux-x86/python/       ← Python for Linux x86_64
│   └── linux-arm/python/       ← Python for Linux ARM
│
└── data/                       ← Created automatically on first run
    ├── uploads/
    ├── chroma/
    └── vault.db
```

---

## Building the Frontend

### Prerequisites
- Node.js 18+ (only needed on the build machine, not the USB)
- npm

### Steps

```bash
cd frontend
npm install
npm run build
```

The `dist/` folder is self-contained — copy it to `VAULT-USB/frontend/dist/`.

All fonts are bundled via `@fontsource` npm packages — **no internet needed at runtime**.

---

## Backend API Contract

The frontend expects these FastAPI endpoints:

### Auth
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/token` | form: `username`, `password` | `{access_token, token_type}` |
| GET | `/api/auth/me` | — | `{id, username, email?}` |
| POST | `/api/auth/logout` | — | 204 |

### Vault
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/vault/info` | — | `{name, setup_complete, created_at?}` |
| POST | `/api/vault/setup` | `{vault_name}` | 200 |

### Documents
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/documents` | Returns `VaultDocument[]` |
| POST | `/api/documents/upload` | `multipart/form-data`, field `file` |
| DELETE | `/api/documents/{id}` | 204 |

**VaultDocument shape:**
```json
{
  "id": "uuid",
  "name": "filename.pdf",
  "size": 204800,
  "type": "application/pdf",
  "status": "ready",
  "created_at": "2024-01-01T00:00:00Z",
  "page_count": 12
}
```

### Chat
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/chat/message` | `{message, document_ids?}` | `ChatResponse` |
| GET | `/api/chat/history` | — | `ChatMessage[]` |
| DELETE | `/api/chat/history` | — | 204 |

**ChatResponse shape:**
```json
{
  "id": "uuid",
  "response": "The leave policy states…",
  "sources": [
    {
      "document_name": "Employee Handbook.pdf",
      "document_id": "uuid",
      "page": 14,
      "excerpt": "Optional short excerpt"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Status & Health
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | 200 (any body) — used for readiness check |
| GET | `/api/status` | `SystemStatus` |

**SystemStatus shape:**
```json
{
  "ai_status": "ready",
  "ai_provider": "ollama",
  "model_name": "llama3.2:3b",
  "documents_count": 5,
  "internet_available": false
}
```

`ai_status` values: `"ready"` | `"loading"` | `"offline"` | `"error"`

---

## FastAPI Static File Serving

Add this to `main.py` so the backend serves the React frontend:

```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

FRONTEND_DIR = os.environ.get("VAULT_FRONTEND_DIR", "../frontend/dist")

# Mount static assets AFTER all API routes
app.mount("/assets", StaticFiles(directory=f"{FRONTEND_DIR}/assets"), name="assets")

# Catch-all: serve index.html for React Router
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index = os.path.join(FRONTEND_DIR, "index.html")
    return FileResponse(index)
```

---

## Environment Variables

All read by both the launcher scripts and `main.py`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_DATA_DIR` | `./data` | Where SQLite, ChromaDB, and uploads live |
| `VAULT_FRONTEND_DIR` | `../frontend/dist` | Path to built React app |
| `VAULT_PORT` | `8000` | Port the server listens on |
| `VAULT_HOST` | `127.0.0.1` | Bind address (never expose externally) |

---

## Offline Font Verification

Run after `npm install` to confirm fonts are bundled:

```bash
ls node_modules/@fontsource/fraunces/files/
ls node_modules/@fontsource/dm-sans/files/
```

Both should show `.woff2` files. These get copied into `dist/assets/` during build.

---

## Testing the Bundle

1. Build the frontend: `npm run build`
2. Copy `dist/` to the USB bundle
3. Run the launcher for your platform
4. Open `http://127.0.0.1:8000` — you should see the Welcome screen
5. Go through the wizard — vault name → add a document → watch the progress animation
6. Verify the main chat interface loads and the status badge shows "AI is ready"

---

## Common Issues

| Symptom | Fix |
|---------|-----|
| Windows SmartScreen blocks `.bat` | Sign the script or right-click → Run anyway |
| macOS: "cannot be opened" | `System Preferences → Security → Open Anyway` or code-sign |
| Blank page in browser | Check `VAULT_FRONTEND_DIR` points to the `dist/` folder |
| "AI unavailable" badge | Ollama not running or model not pulled — check backend logs |
| Font shows system fallback | Run `npm install` then `npm run build` again |
