#!/usr/bin/env python3
"""
CapsLockAI Vault — Auto Updater
Checks for updates, downloads them, and applies to the USB bundle.

Can be run:
  - Automatically by tray_app.py on startup and every 24h
  - Manually: python updater.py
  - Force check: python updater.py --check
  - Force install: python updater.py --install
"""
import os, sys, json, hashlib, shutil, zipfile, tempfile, platform
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

# ── Config ─────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent
VERSION_FILE = ROOT / "VERSION"
UPDATE_URL   = "https://raw.githubusercontent.com/YOUR_USERNAME/capslockai-vault/main/version.json"
BACKUP_DIR   = ROOT / ".update_backup"
LOG_FILE     = Path.home() / ".capslockai-vault" / "update.log"

# What gets updated (everything except runtime, ollama models, and data)
UPDATE_PATHS = ["backend", "frontend/dist", "tray_app.py", "updater.py"]
SKIP_PATHS   = ["runtime", "ollama/models", "data", "_downloads", ".update_backup"]


def log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


def get_current_version() -> str:
    if VERSION_FILE.exists():
        return VERSION_FILE.read_text().strip()
    return "0.0.0"


def set_current_version(version: str):
    VERSION_FILE.write_text(version)


def parse_version(v: str) -> tuple:
    try:
        return tuple(int(x) for x in v.split(".")[:3])
    except Exception:
        return (0, 0, 0)


def check_internet() -> bool:
    try:
        urllib.request.urlopen("https://1.1.1.1", timeout=3)
        return True
    except Exception:
        return False


def fetch_latest_info() -> dict | None:
    try:
        with urllib.request.urlopen(UPDATE_URL, timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        log(f"Could not fetch update info: {e}")
        return None


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def download_update(url: str, dest: Path, expected_sha: str | None = None) -> bool:
    log(f"Downloading update from {url}...")
    try:
        def progress(count, block_size, total):
            if total > 0:
                pct = min(100, count * block_size * 100 // total)
                print(f"\r  {pct}%  ", end="", flush=True)

        urllib.request.urlretrieve(url, dest, reporthook=progress)
        print()

        if expected_sha:
            actual = sha256_file(dest)
            if actual != expected_sha:
                log(f"SHA256 mismatch! Expected {expected_sha}, got {actual}")
                dest.unlink(missing_ok=True)
                return False

        log(f"Downloaded: {dest} ({dest.stat().st_size // 1024} KB)")
        return True
    except Exception as e:
        log(f"Download failed: {e}")
        return False


def backup_current():
    """Back up current app files before applying update."""
    if BACKUP_DIR.exists():
        shutil.rmtree(BACKUP_DIR)
    BACKUP_DIR.mkdir(parents=True)

    for path in UPDATE_PATHS:
        src = ROOT / path
        if src.exists():
            dst = BACKUP_DIR / path
            if src.is_dir():
                shutil.copytree(src, dst)
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)

    log(f"Backup created at {BACKUP_DIR}")


def restore_backup():
    """Restore from backup if update fails."""
    if not BACKUP_DIR.exists():
        log("No backup found to restore")
        return False

    log("Restoring from backup...")
    for path in UPDATE_PATHS:
        src = BACKUP_DIR / path
        dst = ROOT / path
        if src.exists():
            if dst.exists():
                if dst.is_dir():
                    shutil.rmtree(dst)
                else:
                    dst.unlink()
            if src.is_dir():
                shutil.copytree(src, dst)
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)

    log("Restore complete")
    return True


def apply_update(zip_path: Path, new_version: str) -> bool:
    """
    Apply update from zip file.
    The zip should contain: backend/, frontend/dist/, tray_app.py, updater.py
    It should NOT contain: runtime/, ollama/, data/
    """
    log(f"Applying update v{new_version}...")

    try:
        # Backup first
        backup_current()

        # Extract to temp dir
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            log("Extracting update...")

            with zipfile.ZipFile(zip_path) as z:
                # Safety check — reject zip if it contains dangerous paths
                for name in z.namelist():
                    for skip in SKIP_PATHS:
                        if name.startswith(skip) or f"/{skip}" in name:
                            log(f"SAFETY: Skipping {name} (protected path)")
                            break
                    else:
                        z.extract(name, tmp_path)

            # Find the root of extracted content
            # (zip might have a top-level folder or not)
            extracted = list(tmp_path.iterdir())
            if len(extracted) == 1 and extracted[0].is_dir():
                src_root = extracted[0]
            else:
                src_root = tmp_path

            # Apply each update path
            for path in UPDATE_PATHS:
                src = src_root / path
                dst = ROOT / path
                if not src.exists():
                    continue

                log(f"  Updating {path}...")
                if dst.exists():
                    if dst.is_dir():
                        shutil.rmtree(dst)
                    else:
                        dst.unlink()

                if src.is_dir():
                    shutil.copytree(src, dst)
                else:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)

        # Update version file
        set_current_version(new_version)
        log(f"Update applied successfully — now at v{new_version}")

        # Clean up backup on success
        if BACKUP_DIR.exists():
            shutil.rmtree(BACKUP_DIR)

        return True

    except Exception as e:
        log(f"Update failed: {e}")
        log("Attempting to restore backup...")
        restore_backup()
        return False


def needs_update(current: str, latest: str, min_ver: str | None = None) -> bool:
    """Return True if latest > current."""
    if min_ver and parse_version(current) < parse_version(min_ver):
        log(f"WARNING: Current version {current} is below minimum {min_ver}")
        return True
    return parse_version(latest) > parse_version(current)


def check_and_apply(force: bool = False) -> dict:
    """
    Full update check + apply cycle.
    Returns {available, version, applied, error}
    """
    result = {"available": False, "version": None, "applied": False, "error": None}

    current = get_current_version()
    log(f"Current version: {current}")

    if not check_internet():
        log("No internet — skipping update check")
        result["error"] = "offline"
        return result

    info = fetch_latest_info()
    if not info:
        result["error"] = "fetch_failed"
        return result

    latest = info.get("version", "0.0.0")
    result["version"] = latest

    if not force and not needs_update(current, latest, info.get("min_version")):
        log(f"Already up to date (v{current})")
        return result

    result["available"] = True
    log(f"Update available: v{current} → v{latest}")
    log(f"Release notes: {info.get('notes', 'No notes')}")

    if not force:
        # Return without applying — let caller decide
        return result

    # Download
    download_url = info.get("download_url")
    if not download_url:
        result["error"] = "no_download_url"
        return result

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        ok = download_update(download_url, tmp_path, info.get("sha256"))
        if not ok:
            result["error"] = "download_failed"
            return result

        applied = apply_update(tmp_path, latest)
        result["applied"] = applied
        if not applied:
            result["error"] = "apply_failed"
    finally:
        tmp_path.unlink(missing_ok=True)

    return result


def build_release_zip(output_path: Path | None = None) -> Path:
    """
    Build a release zip from the current source.
    Only includes UPDATE_PATHS (not runtime, models, or data).
    Use this to create the zip you upload to GitHub Releases.
    """
    version = get_current_version()
    out = output_path or Path(f"vault-update-{version}.zip")

    log(f"Building release zip for v{version}...")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for path_str in UPDATE_PATHS:
            src = ROOT / path_str
            if not src.exists():
                log(f"  Skipping {path_str} (not found)")
                continue
            if src.is_dir():
                for f in src.rglob("*"):
                    if f.is_file():
                        arcname = f.relative_to(ROOT)
                        z.write(f, arcname)
                        log(f"  + {arcname}")
            else:
                z.write(src, path_str)
                log(f"  + {path_str}")

    size = out.stat().st_size
    sha  = sha256_file(out)
    log(f"Release zip: {out} ({size // 1024} KB)")
    log(f"SHA256: {sha}")
    log("")
    log("Next steps:")
    log(f"  1. Upload {out} to GitHub Releases as v{version}")
    log(f"  2. Update version.json with the SHA256 above and the download URL")
    log(f"  3. Commit version.json to the main branch")

    return out


# ── CLI ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="CapsLockAI Vault updater")
    p.add_argument("--check",   action="store_true", help="Check for updates only")
    p.add_argument("--install", action="store_true", help="Check and install if available")
    p.add_argument("--build",   action="store_true", help="Build a release zip")
    p.add_argument("--version", action="store_true", help="Show current version")
    args = p.parse_args()

    if args.version:
        print(get_current_version())
        sys.exit(0)

    if args.build:
        build_release_zip()
        sys.exit(0)

    if args.check:
        result = check_and_apply(force=False)
        if result["available"]:
            print(f"Update available: v{result['version']}")
            print(f"Run with --install to apply")
        else:
            print(f"Up to date (v{get_current_version()})")
        sys.exit(0)

    if args.install:
        result = check_and_apply(force=True)
        if result["applied"]:
            print(f"Updated to v{result['version']}")
        elif result.get("error") == "offline":
            print("Offline — cannot check for updates")
        else:
            print(f"Update failed: {result.get('error', 'unknown')}")
        sys.exit(1 if result.get("error") else 0)

    # Default: check only
    result = check_and_apply(force=False)
    if result["available"]:
        print(f"Update available: v{result['version']}")
