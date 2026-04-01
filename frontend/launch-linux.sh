#!/bin/bash
# CapsLockAI Vault — Linux launcher
# Usage: ./launch-linux.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"

# Detect architecture
ARCH="$(uname -m)"
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    PYTHON="$ROOT/runtime/linux-arm/python/bin/python3"
else
    PYTHON="$ROOT/runtime/linux-x86/python/bin/python3"
fi

BACKEND="$ROOT/backend"
DATA="$ROOT/data"
PORT=8000

clear
echo ""
echo "  CapsLockAI Vault — Starting..."
echo ""

if [[ ! -x "$PYTHON" ]]; then
    echo "  [ERROR] Runtime not found: $PYTHON"
    exit 1
fi

mkdir -p "$DATA/uploads" "$DATA/chroma"

export VAULT_DATA_DIR="$DATA"
export VAULT_PORT="$PORT"
export VAULT_HOST="127.0.0.1"

echo "  [1/3] Installing dependencies..."
"$PYTHON" -m pip install --quiet --no-index \
    --find-links="$ROOT/runtime/wheels" \
    -r "$BACKEND/requirements.txt" 2>/dev/null || true

echo "  [2/3] Starting backend..."
"$PYTHON" -m uvicorn main:app \
    --host 127.0.0.1 \
    --port "$PORT" \
    --app-dir "$BACKEND" \
    --log-level warning &
BACKEND_PID=$!

cleanup() { kill "$BACKEND_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "  [3/3] Waiting for backend..."
for i in $(seq 1 30); do
    sleep 1
    curl -s -o /dev/null "http://127.0.0.1:$PORT/api/health" && break
done

# Try to open browser (various Linux desktop environments)
URL="http://127.0.0.1:$PORT"
echo ""
echo "  ✓ Running at $URL"
echo ""
(xdg-open "$URL" 2>/dev/null || \
 gio open "$URL" 2>/dev/null || \
 firefox "$URL" 2>/dev/null || \
 google-chrome "$URL" 2>/dev/null || \
 chromium-browser "$URL" 2>/dev/null || \
 echo "  Open your browser and go to: $URL") &

echo "  Press Ctrl+C to stop."
echo ""
wait "$BACKEND_PID"
