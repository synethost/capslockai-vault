#!/bin/bash
# CapsLockAI Vault — macOS launcher
# Make executable: chmod +x launch-macos.command

set -euo pipefail

# ── Resolve paths ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"

# Detect architecture
ARCH="$(uname -m)"
if [[ "$ARCH" == "arm64" ]]; then
    PYTHON="$ROOT/runtime/macos-arm/python/bin/python3"
else
    PYTHON="$ROOT/runtime/macos-x86/python/bin/python3"
fi

BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend/dist"
DATA="$ROOT/data"
PORT=8000

# ── Terminal title ────────────────────────────────────────────────────
echo -e "\033]0;CapsLockAI Vault\007"
clear

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        CapsLockAI Vault              ║"
echo "  ║        Starting your AI assistant…   ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Check runtime ─────────────────────────────────────────────────────
if [[ ! -x "$PYTHON" ]]; then
    echo "  [ERROR] Bundled Python runtime not found: $PYTHON"
    echo "  Please re-download the full Vault bundle."
    read -p "  Press Enter to close..."
    exit 1
fi

# ── First-run data dirs ────────────────────────────────────────────────
mkdir -p "$DATA/uploads" "$DATA/chroma"

# ── Environment ────────────────────────────────────────────────────────
export VAULT_DATA_DIR="$DATA"
export VAULT_FRONTEND_DIR="$FRONTEND"
export VAULT_PORT="$PORT"
export VAULT_HOST="127.0.0.1"

echo "  [1/3] Setting up environment..."
"$PYTHON" -m pip install --quiet --no-index \
    --find-links="$ROOT/runtime/wheels" \
    -r "$BACKEND/requirements.txt" 2>/dev/null || true

echo "  [2/3] Starting AI backend..."
"$PYTHON" -m uvicorn main:app \
    --host 127.0.0.1 \
    --port "$PORT" \
    --app-dir "$BACKEND" \
    --log-level warning &
BACKEND_PID=$!

# ── Trap: kill backend when terminal closes ────────────────────────────
cleanup() {
    echo ""
    echo "  Shutting down Vault..."
    kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ── Wait for backend ──────────────────────────────────────────────────
echo "  [3/3] Waiting for backend..."
for i in $(seq 1 30); do
    sleep 1
    if curl -s -o /dev/null "http://127.0.0.1:$PORT/api/health"; then
        break
    fi
done

echo ""
echo "  ✓ Vault is running at http://127.0.0.1:$PORT"
echo ""
echo "  Opening in your browser..."
open "http://127.0.0.1:$PORT"

echo "  ┌─────────────────────────────────────────┐"
echo "  │  Vault is running. Keep this window     │"
echo "  │  open while you use it.                 │"
echo "  │                                         │"
echo "  │  Press Ctrl+C or close this window      │"
echo "  │  to shut Vault down.                    │"
echo "  └─────────────────────────────────────────┘"
echo ""

# ── Keep alive ─────────────────────────────────────────────────────────
wait "$BACKEND_PID"
