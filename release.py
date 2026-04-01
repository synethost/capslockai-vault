#!/usr/bin/env python3
"""
CapsLockAI Vault — Release Script
Usage: python3 release.py 1.1.0 "Fixed document indexing on Windows"

Builds the update zip and prints the version.json to upload to GitHub.
"""
import sys, json, hashlib, zipfile
from pathlib import Path

ROOT = Path(__file__).parent

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

UPDATE_PATHS = ["backend", "frontend/dist", "tray_app.py", "updater.py"]
SKIP_PATHS   = ["runtime", "ollama/models", "data", "_downloads", ".update_backup",
                 "__pycache__", ".pyc"]

def build_zip(version: str) -> Path:
    out = ROOT / f"vault-update-{version}.zip"
    print(f"Building {out}...")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for path_str in UPDATE_PATHS:
            src = ROOT / path_str
            if not src.exists():
                print(f"  Skipping {path_str} (not found)")
                continue
            if src.is_dir():
                for f in src.rglob("*"):
                    if f.is_file():
                        # Skip cache files
                        if any(skip in str(f) for skip in SKIP_PATHS):
                            continue
                        arcname = f.relative_to(ROOT)
                        z.write(f, arcname)
            else:
                z.write(src, path_str)
    size = out.stat().st_size
    print(f"Built: {out} ({size // 1024} KB)")
    return out

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 release.py <version> [release notes]")
        print("Example: python3 release.py 1.1.0 'Fixed Windows indexing'")
        sys.exit(1)

    version = sys.argv[1].lstrip("v")
    notes   = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else f"Release v{version}"

    # Bump VERSION file
    (ROOT / "VERSION").write_text(version + "\n")
    print(f"Version set to: {version}")

    # Build zip
    zip_path = build_zip(version)
    sha      = sha256_file(zip_path)

    # Print version.json
    GITHUB_USER = "YOUR_GITHUB_USERNAME"
    GITHUB_REPO = "capslockai-vault"
    download_url = (
        f"https://github.com/{GITHUB_USER}/{GITHUB_REPO}/"
        f"releases/download/v{version}/vault-update-{version}.zip"
    )

    version_json = {
        "version": version,
        "released": __import__("datetime").date.today().isoformat(),
        "notes": notes,
        "download_url": download_url,
        "min_version": "1.0.0",
        "sha256": sha,
    }

    out_json = ROOT / "version.json"
    out_json.write_text(json.dumps(version_json, indent=2))

    print("\n" + "="*60)
    print("RELEASE STEPS")
    print("="*60)
    print(f"\n1. Go to: https://github.com/{GITHUB_USER}/{GITHUB_REPO}/releases/new")
    print(f"2. Tag: v{version}")
    print(f"3. Upload: {zip_path.name}")
    print(f"\n4. Commit version.json to main branch:")
    print(f"   git add version.json VERSION")
    print(f"   git commit -m 'Release v{version}: {notes}'")
    print(f"   git push")
    print(f"\n5. All USB drives will auto-detect this update within 24h")
    print(f"\nSHA256 (for verification): {sha}")

if __name__ == "__main__":
    main()
