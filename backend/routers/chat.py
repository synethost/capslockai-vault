import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, MessageModel, UserModel
from auth import get_current_user
from schemas import ChatRequest, ChatResponse, ChatMessageResponse, MessageSource
from services.vector_store import search
from services.ai_service import generate_answer
import config

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(
    req: ChatRequest,
    db: Session = Depends(get_db),
    _: UserModel = Depends(get_current_user),
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # ── 1. Save user message ──────────────────────────────────────────
    user_msg = MessageModel(
        id=str(uuid.uuid4()),
        role="user",
        content=req.message,
        sources=None,
    )
    db.add(user_msg)
    db.commit()

    # ── 2. Retrieve relevant chunks from vector store ─────────────────
    chunks = search(
        query=req.message,
        top_k=config.TOP_K_RESULTS,
        document_ids=req.document_ids,
    )

    # ── 3. Generate answer ────────────────────────────────────────────
    answer_text = await generate_answer(req.message, chunks)

    # ── 4. Build sources list ─────────────────────────────────────────
    sources = []
    seen = set()
    for chunk in chunks:
        doc_id = chunk["document_id"]
        if doc_id not in seen and chunk["score"] > 0.3:
            seen.add(doc_id)
            sources.append(MessageSource(
                document_name=chunk["document_name"],
                document_id=doc_id,
                excerpt=chunk["text"][:200] if chunk["text"] else None,
            ))

    # ── 5. Save assistant message ─────────────────────────────────────
    now = datetime.now(timezone.utc)
    response_id = str(uuid.uuid4())
    ai_msg = MessageModel(
        id=response_id,
        role="assistant",
        content=answer_text,
        sources=json.dumps([s.model_dump() for s in sources]),
        created_at=now,
    )
    db.add(ai_msg)
    db.commit()

    return ChatResponse(
        id=response_id,
        response=answer_text,
        sources=sources,
        timestamp=now,
    )


@router.get("/history", response_model=list[ChatMessageResponse])
async def get_history(
    db: Session = Depends(get_db),
    _: UserModel = Depends(get_current_user),
):
    messages = db.query(MessageModel).order_by(MessageModel.created_at.asc()).all()
    result = []
    for m in messages:
        sources = []
        if m.sources:
            try:
                raw = json.loads(m.sources)
                sources = [MessageSource(**s) for s in raw]
            except Exception:
                pass
        result.append(ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            sources=sources or None,
            timestamp=m.created_at,
        ))
    return result


@router.delete("/history", status_code=204)
async def clear_history(
    db: Session = Depends(get_db),
    _: UserModel = Depends(get_current_user),
):
    db.query(MessageModel).delete()
    db.commit()
    return None
