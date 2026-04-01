from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, UserModel, DocumentModel, MessageModel
from auth import get_current_user
from services.ai_service import detect_provider
import os
from pathlib import Path
import config

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("")
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    total_docs    = db.query(DocumentModel).count()
    ready_docs    = db.query(DocumentModel).filter(DocumentModel.status == "ready").count()
    error_docs    = db.query(DocumentModel).filter(DocumentModel.status == "error").count()
    indexing_docs = db.query(DocumentModel).filter(DocumentModel.status == "processing").count()
    total_size    = db.query(func.sum(DocumentModel.size)).scalar() or 0
    total_messages  = db.query(MessageModel).count()
    user_messages   = db.query(MessageModel).filter(MessageModel.role == "user").count()
    ai_messages     = db.query(MessageModel).filter(MessageModel.role == "assistant").count()
    total_users     = db.query(UserModel).count()

    recent_messages = (db.query(MessageModel).filter(MessageModel.role == "user")
        .order_by(MessageModel.created_at.desc()).limit(8).all())
    recent_activity = [{"id": m.id, "content": m.content[:120] + ("..." if len(m.content) > 120 else ""),
        "timestamp": m.created_at.isoformat() if m.created_at else None} for m in recent_messages]

    recent_docs = (db.query(DocumentModel).order_by(DocumentModel.created_at.desc()).limit(5).all())
    recent_documents = [{"id": d.id, "name": d.name, "size": d.size, "status": d.status,
        "created_at": d.created_at.isoformat() if d.created_at else None} for d in recent_docs]

    provider, model_name, internet = await detect_provider()
    uploads_dir = Path(os.environ.get("VAULT_DATA_DIR", "./data")) / "uploads"
    disk_used = sum(f.stat().st_size for f in uploads_dir.rglob("*") if f.is_file()) if uploads_dir.exists() else 0

    return {
        "documents": {"total": total_docs, "ready": ready_docs, "error": error_docs,
            "indexing": indexing_docs, "total_size_bytes": total_size},
        "chat": {"total_messages": total_messages, "questions_asked": user_messages, "answers_given": ai_messages},
        "users": {"total": total_users},
        "ai": {"provider": provider, "model_name": model_name, "internet": internet,
            "status": "ready" if provider != "none" else "offline"},
        "storage": {"disk_used_bytes": disk_used},
        "recent_activity": recent_activity,
        "recent_documents": recent_documents,
    }
