from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, VaultModel, UserModel
from auth import get_current_user, hash_password
from schemas import VaultInfoResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/vault", tags=["vault"])


class VaultSetupRequest(BaseModel):
    vault_name: str
    username: str = "admin"
    password: str = "admin"


@router.get("/info", response_model=VaultInfoResponse)
async def get_vault_info(db: Session = Depends(get_db)):
    """Public endpoint — called on app boot to decide routing."""
    vault = db.query(VaultModel).first()
    if not vault:
        return VaultInfoResponse(name="Vault", setup_complete=False)
    return VaultInfoResponse(
        name=vault.name,
        setup_complete=vault.setup_complete,
        created_at=vault.created_at,
    )


@router.post("/setup")
async def setup_vault(
    req: VaultSetupRequest,
    db: Session = Depends(get_db),
):
    vault = db.query(VaultModel).first()
    if vault and vault.setup_complete:
        raise HTTPException(status_code=400, detail="Vault already set up")

    if not vault:
        vault = VaultModel(id=1, name=req.vault_name, setup_complete=True)
        db.add(vault)
    else:
        vault.name = req.vault_name
        vault.setup_complete = True

    # Only create admin if no users exist
    existing_user = db.query(UserModel).first()
    if not existing_user:
        if len(req.password) < 4:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 4 characters"
            )
        admin = UserModel(
            username=req.username.strip() or "admin",
            hashed_pw=hash_password(req.password),
        )
        db.add(admin)

    db.commit()
    return {"ok": True, "message": "Vault configured"}
