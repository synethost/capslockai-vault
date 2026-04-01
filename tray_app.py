#!/usr/bin/env python3
"""
CapsLockAI Vault — System Tray App with Auto-Update
macOS: pythonw tray_app.py
Windows/Linux: python tray_app.py
"""
import os, sys, time, subprocess, threading, webbrowser, platform
from pathlib import Path

ROOT       = Path(__file__).parent
BACKEND    = ROOT / "backend"
LOCAL_DATA = Path.home() / ".capslockai-vault"
FRONTEND   = ROOT / "frontend" / "dist"
PORT       = int(os.environ.get("VAULT_PORT", "8000"))
URL        = f"http://127.0.0.1:{PORT}"
IS_MAC     = platform.system() == "Darwin"
IS_WINDOWS = platform.system() == "Windows"

def find_python():
    arch = platform.machine().lower()
    if IS_MAC:
        key = "macos-arm" if "arm" in arch else "macos-x86"
        p = ROOT / "runtime" / key / "python" / "bin" / "python3"
    elif IS_WINDOWS:
        p = ROOT / "runtime" / "windows" / "python" / "python.exe"
    else:
        key = "linux-arm" if "arm" in arch else "linux-x86"
        p = ROOT / "runtime" / key / "python" / "bin" / "python3"
    return str(p) if p.exists() else sys.executable

def find_ollama():
    try:
        if IS_MAC:
            hits = [m for m in (ROOT/"ollama"/"bin"/"macos").rglob("ollama")
                    if m.is_file() and not m.suffix]
            return str(hits[0]) if hits else None
        elif IS_WINDOWS:
            p = ROOT / "ollama" / "bin" / "windows" / "ollama.exe"
            return str(p) if p.exists() else None
        else:
            arch = platform.machine().lower()
            key  = "linux-arm" if "arm" in arch else "linux-x86"
            hits = list((ROOT/"ollama"/"bin"/key).rglob("ollama"))
            return str(hits[0]) if hits else None
    except Exception:
        return None

PYTHON = find_python()
OLLAMA = find_ollama()

_status      = "starting"
_update_info = None
_updating    = False
backend_proc = None
ollama_proc  = None

STATUS_LABELS = {
    "starting": "⏳  Starting…",
    "ready":    "✓  AI is ready",
    "error":    "✗  Error — restart",
}

def build_env():
    LOCAL_DATA.mkdir(parents=True, exist_ok=True)
    (LOCAL_DATA / "uploads").mkdir(exist_ok=True)
    (LOCAL_DATA / "chroma").mkdir(exist_ok=True)
    e = os.environ.copy()
    e.update({
        "VAULT_DATA_DIR":         str(LOCAL_DATA),
        "VAULT_FRONTEND_DIR":     str(FRONTEND),
        "VAULT_PORT":             str(PORT),
        "VAULT_HOST":             "127.0.0.1",
        "ORT_DISABLE_COREML":    "1",
        "TOKENIZERS_PARALLELISM": "false",
        "OLLAMA_MODELS":          str(ROOT / "ollama" / "models"),
    })
    return e

def start_services():
    global _status, backend_proc, ollama_proc
    env = build_env()
    if OLLAMA and Path(OLLAMA).exists():
        try:
            ollama_proc = subprocess.Popen([OLLAMA, "serve"], env=env,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(2)
        except Exception as ex:
            print(f"Ollama skipped: {ex}")
    try:
        backend_proc = subprocess.Popen(
            [PYTHON, str(BACKEND / "main.py")],
            env=env, cwd=str(BACKEND),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as ex:
        print(f"Backend failed: {ex}")
        _status = "error"
        return
    import urllib.request
    for _ in range(30):
        time.sleep(1)
        try:
            urllib.request.urlopen(f"{URL}/api/health", timeout=1)
            _status = "ready"
            _notify("CapsLockAI Vault", "Your vault is ready.")
            threading.Thread(target=check_for_updates, daemon=True).start()
            return
        except Exception:
            pass
    _status = "error"

def stop_services():
    global backend_proc, ollama_proc
    for p in [backend_proc, ollama_proc]:
        if p:
            try: p.terminate()
            except Exception: pass
    backend_proc = ollama_proc = None

def open_vault():
    webbrowser.open(URL)

def _notify(title, msg):
    try:
        if IS_MAC:
            subprocess.run(["osascript", "-e",
                f'display notification "{msg}" with title "{title}"'],
                capture_output=True)
    except Exception:
        pass

def check_for_updates():
    global _update_info
    updater = ROOT / "updater.py"
    if not updater.exists():
        return
    try:
        result = subprocess.run(
            [PYTHON, str(updater), "--check"],
            capture_output=True, text=True, timeout=15)
        output = result.stdout.strip()
        if "Update available" in output:
            parts   = output.split("v")
            version = parts[-1].strip() if len(parts) > 1 else "new"
            _update_info = {"version": version}
            _notify("Vault update available",
                    f"v{version} is ready — click the menu to install.")
    except Exception as e:
        print(f"Update check: {e}")

def install_update():
    global _updating, _update_info
    if _updating:
        return
    _updating = True
    def do_update():
        global _updating, _update_info
        try:
            _notify("Vault", "Downloading update…")
            result = subprocess.run(
                [PYTHON, str(ROOT / "updater.py"), "--install"],
                capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                _update_info = None
                _notify("Vault updated", "Restart Vault to apply the new version.")
            else:
                _notify("Update failed", "Could not install update. Try again later.")
        except Exception as e:
            _notify("Update failed", str(e))
        finally:
            _updating = False
    threading.Thread(target=do_update, daemon=True).start()

def run_mac():
    import rumps
    class VaultTray(rumps.App):
        def __init__(self):
            super().__init__("✦", quit_button=None)
            self._rebuild()
        def _rebuild(self):
            items = [
                rumps.MenuItem("Open Vault", callback=lambda _: open_vault()),
                None,
                rumps.MenuItem(STATUS_LABELS.get(_status, "…")),
            ]
            if _update_info:
                items += [None, rumps.MenuItem(
                    f"⬆  Update to v{_update_info['version']}",
                    callback=lambda _: install_update())]
            items += [
                None,
                rumps.MenuItem("Check for updates",
                    callback=lambda _: threading.Thread(
                        target=check_for_updates, daemon=True).start()),
                rumps.MenuItem("Quit Vault", callback=self._quit),
            ]
            self.menu = items
        @rumps.timer(4)
        def tick(self, _): self._rebuild()
        def _quit(self, _):
            stop_services()
            rumps.quit_application()
    VaultTray().run()

def run_pystray():
    import pystray
    from PIL import Image, ImageDraw
    img  = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([8, 20, 56, 56], radius=6, fill="#E8A048")
    draw.arc([18, 8, 46, 32], start=200, end=340, fill="#E8A048", width=5)
    draw.ellipse([27, 33, 37, 43], fill="#1A0E00")
    def menu():
        items = [
            pystray.MenuItem("Open Vault", lambda *_: open_vault(), default=True),
            pystray.MenuItem(STATUS_LABELS.get(_status, "…"),
                lambda *_: None, enabled=False),
            pystray.Menu.SEPARATOR,
        ]
        if _update_info:
            items += [
                pystray.MenuItem(f"Update to v{_update_info['version']}",
                    lambda *_: install_update()),
                pystray.Menu.SEPARATOR,
            ]
        items += [
            pystray.MenuItem("Check for updates",
                lambda *_: threading.Thread(
                    target=check_for_updates, daemon=True).start()),
            pystray.MenuItem("Quit Vault",
                lambda icon, _: (stop_services(), icon.stop())),
        ]
        return pystray.Menu(*items)
    pystray.Icon("CapsLockAI Vault", img, "CapsLockAI Vault", menu=menu).run()

if __name__ == "__main__":
    threading.Thread(target=start_services, daemon=True).start()
    if IS_MAC:
        run_mac()
    else:
        run_pystray()
