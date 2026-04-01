@echo off
title CapsLockAI Vault
color 0A
cls

echo.
echo   ╔══════════════════════════════════════╗
echo   ║        CapsLockAI Vault              ║
echo   ║        Starting your AI assistant…   ║
echo   ╚══════════════════════════════════════╝
echo.

:: Resolve paths relative to this script's location
set "ROOT=%~dp0"
set "PYTHON=%ROOT%runtime\windows\python\python.exe"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend\dist"
set "DATA=%ROOT%data"
set "PORT=8000"

:: Check Python runtime is bundled
if not exist "%PYTHON%" (
    echo   [ERROR] Bundled Python runtime not found.
    echo   Please re-download the full Vault bundle.
    pause
    exit /b 1
)

:: Create data dirs if first run
if not exist "%DATA%" mkdir "%DATA%"
if not exist "%DATA%\uploads" mkdir "%DATA%\uploads"
if not exist "%DATA%\chroma" mkdir "%DATA%\chroma"

echo   [1/3] Setting up environment...

:: Set environment
set "VAULT_DATA_DIR=%DATA%"
set "VAULT_FRONTEND_DIR=%FRONTEND%"
set "VAULT_PORT=%PORT%"
set "VAULT_HOST=127.0.0.1"

:: Install/verify deps (only first run — uses bundled wheels)
"%PYTHON%" -m pip install --quiet --no-index --find-links="%ROOT%runtime\wheels" -r "%BACKEND%\requirements.txt" >nul 2>&1

echo   [2/3] Starting AI backend...

:: Start FastAPI server
start /b "" "%PYTHON%" -m uvicorn main:app ^
    --host 127.0.0.1 ^
    --port %PORT% ^
    --app-dir "%BACKEND%" ^
    --log-level warning

:: Wait for backend to be ready (max 30s)
echo   [3/3] Waiting for backend...
set /a WAIT=0
:WAIT_LOOP
timeout /t 1 /nobreak >nul
curl -s -o nul "http://127.0.0.1:%PORT%/api/health" && goto READY
set /a WAIT+=1
if %WAIT% lss 30 goto WAIT_LOOP

echo   [WARN] Backend slow to start — opening browser anyway...

:READY
echo.
echo   ✓ Vault is running at http://127.0.0.1:%PORT%
echo.
echo   Opening in your browser...

:: Open browser
start "" "http://127.0.0.1:%PORT%"

echo   ┌─────────────────────────────────────────┐
echo   │  Vault is running. Keep this window     │
echo   │  open while you use it.                 │
echo   │                                         │
echo   │  Close this window to shut Vault down.  │
echo   └─────────────────────────────────────────┘
echo.

:: Keep alive — when user closes this window the server dies
:KEEPALIVE
timeout /t 60 /nobreak >nul
curl -s -o nul "http://127.0.0.1:%PORT%/api/health" || goto DEAD
goto KEEPALIVE

:DEAD
echo.
echo   Vault has stopped. You can close this window.
pause
