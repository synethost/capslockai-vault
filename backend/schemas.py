from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


# ── Vault ─────────────────────────────────────────────────────────────
class VaultInfoResponse(BaseModel):
    name: str
    setup_complete: bool
    created_at: Optional[datetime] = None

class VaultSetupRequest(BaseModel):
    vault_name: str


# ── Documents ─────────────────────────────────────────────────────────
class DocumentResponse(BaseModel):
    id: str
    name: str
    size: int
    type: str
    status: str
    page_count: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────────────
class MessageSource(BaseModel):
    document_name: str
    document_id: str
    page: Optional[int] = None
    excerpt: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    document_ids: Optional[List[str]] = None

class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[List[MessageSource]] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: str
    response: str
    sources: List[MessageSource]
    timestamp: datetime


# ── Status ────────────────────────────────────────────────────────────
class SystemStatusResponse(BaseModel):
    ai_status: str          # ready | loading | offline | error
    ai_provider: str        # ollama | openai | none
    model_name: Optional[str] = None
    documents_count: int
    internet_available: bool
