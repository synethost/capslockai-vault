from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db, UserModel
from auth import get_current_user, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


# ── Schemas ───────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "member"
    email: Optional[str] = None


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None


VALID_ROLES = {"admin", "member", "viewer"}


def require_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    if getattr(current_user, "role", "admin") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── List users ────────────────────────────────────────────────────────
@router.get("", response_model=list[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin),
):
    return db.query(UserModel).order_by(UserModel.id).all()


# ── Create user ───────────────────────────────────────────────────────
@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    req: CreateUserRequest,
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin),
):
    if req.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_ROLES)}")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    existing = db.query(UserModel).filter(UserModel.username == req.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    user = UserModel(
        username=req.username.strip(),
        email=req.email,
        hashed_pw=hash_password(req.password),
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Update user ───────────────────────────────────────────────────────
@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    req: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.role is not None:
        if req.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(VALID_ROLES)}")
        # Prevent removing the last admin
        if user.role == "admin" and req.role != "admin":
            admin_count = db.query(UserModel).filter(UserModel.role == "admin").count()
            if admin_count <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last admin")
        user.role = req.role

    if req.password is not None:
        if len(req.password) < 4:
            raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
        user.hashed_pw = hash_password(req.password)

    if req.email is not None:
        user.email = req.email

    db.commit()
    db.refresh(user)
    return user


# ── Delete user ───────────────────────────────────────────────────────
@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        admin_count = db.query(UserModel).filter(UserModel.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin")

    db.delete(user)
    db.commit()
    return None
