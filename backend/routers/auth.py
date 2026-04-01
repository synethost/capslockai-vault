from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db, UserModel
from auth import authenticate_user, create_access_token, get_current_user, hash_password
from schemas import TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/token", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    return current_user


@router.post("/logout", status_code=204)
async def logout():
    # JWT is stateless — client just drops the token
    return None


@router.post("/register", response_model=UserResponse, status_code=201)
async def register_first_admin(
    username: str,
    password: str,
    email: str = None,
    db: Session = Depends(get_db),
):
    """
    One-time endpoint to create the first admin user.
    Disabled after first user exists.
    """
    existing = db.query(UserModel).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Users already exist. Contact your vault administrator."
        )
    user = UserModel(
        username=username,
        email=email,
        hashed_pw=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
