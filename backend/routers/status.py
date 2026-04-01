from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, DocumentModel
from schemas import SystemStatusResponse
from services.ai_service import detect_provider

router = APIRouter(tags=["status"])


@router.get("/api/health")
async def health():
    return {"status": "ok"}


@router.get("/api/status", response_model=SystemStatusResponse)
async def get_status(db: Session = Depends(get_db)):
    provider, model_name, internet = await detect_provider()

    doc_count = db.query(DocumentModel).filter(DocumentModel.status == "ready").count()

    if provider == "none":
        ai_status = "offline"
    else:
        ai_status = "ready"

    return SystemStatusResponse(
        ai_status=ai_status,
        ai_provider=provider,
        model_name=model_name if model_name else None,
        documents_count=doc_count,
        internet_available=internet,
    )
