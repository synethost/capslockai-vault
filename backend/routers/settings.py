from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, UserModel, VaultModel
from auth import get_current_user, hash_password, verify_password
import config, os, json
from pathlib import Path

router = APIRouter(prefix="/api/settings", tags=["settings"])

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangeVaultNameRequest(BaseModel):
    vault_name: str

class ChangeModelRequest(BaseModel):
    provider: str
    model_name: str

class SettingsResponse(BaseModel):
    vault_name: str
    username: str
    ai_provider: str
    model_name: str
    ollama_url: str

@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    vault = db.query(VaultModel).first()
    return SettingsResponse(
        vault_name=vault.name if vault else "My Vault",
        username=current_user.username,
        role=getattr(current_user, 'role', 'admin'),
        ai_provider=os.environ.get("VAULT_AI_PROVIDER", "ollama"),
        model_name=config.OLLAMA_MODEL,
        ollama_url=config.OLLAMA_BASE_URL,
    )

@router.post("/password")
async def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if not verify_password(req.current_password, current_user.hashed_pw):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    current_user.hashed_pw = hash_password(req.new_password)
    db.commit()
    return {"ok": True}

@router.post("/vault-name")
async def change_vault_name(
    req: ChangeVaultNameRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if not req.vault_name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    vault = db.query(VaultModel).first()
    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")
    vault.name = req.vault_name.strip()
    db.commit()
    return {"ok": True}

@router.post("/model")
async def change_model(
    req: ChangeModelRequest,
    current_user: UserModel = Depends(get_current_user),
):
    data_dir = Path(os.environ.get("VAULT_DATA_DIR", "./data"))
    cfg_file = data_dir / "ai_config.json"
    cfg_file.write_text(json.dumps({"provider": req.provider, "model_name": req.model_name}))
    config.OLLAMA_MODEL = req.model_name
    return {"ok": True}

@router.get("/ollama-models")
async def list_ollama_models(current_user: UserModel = Depends(get_current_user)):
    import httpx
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{config.OLLAMA_BASE_URL}/api/tags")
            if r.status_code == 200:
                return {"models": [m["name"] for m in r.json().get("models", [])]}
    except Exception:
        pass
    return {"models": []}
