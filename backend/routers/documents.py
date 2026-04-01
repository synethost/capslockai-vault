import uuid
import shutil
import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db, DocumentModel, UserModel
from auth import get_current_user
from schemas import DocumentResponse
from services.document_processor import extract_text, chunk_text
from services.vector_store import index_document, delete_document
import config

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    db: Session = Depends(get_db),
    _: UserModel = Depends(get_current_user),
):
    docs = db.query(DocumentModel).order_by(DocumentModel.created_at.desc()).all()
    return docs


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: UserModel = Depends(get_current_user),
):
    # Validate type
    content_type = file.content_type or ""
    suffix = Path(file.filename or "").suffix.lower()

    allowed_suffixes = {".pdf", ".docx", ".doc", ".txt", ".md", ".pptx", ".xlsx", ".csv"}
    if content_type not in ALLOWED_TYPES and suffix not in allowed_suffixes:
        raise HTTPException(status_code=415, detail=f"File type not supported: {content_type}")

    # Read and size-check
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    doc_id   = str(uuid.uuid4())
    filename = file.filename or f"document{suffix}"
    dest     = config.UPLOADS_DIR / f"{doc_id}{suffix}"

    # Save to disk
    dest.write_bytes(contents)

    # Create DB record (status=processing)
    doc = DocumentModel(
        id=doc_id,
        name=filename,
        size=len(contents),
        type=content_type or f"application/{suffix.lstrip('.')}",
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Index in background so upload returns immediately
    background_tasks.add_task(_index_document, doc_id, filename, dest, content_type, db)

    return doc


async def _index_document(doc_id: str, name: str, path: Path, mime: str, db: Session):
    """Background task: extract text, chunk, index into ChromaDB, update status."""
    try:
        # Run CPU-bound extraction in thread pool
        loop = asyncio.get_event_loop()
        text, page_count = await loop.run_in_executor(None, extract_text, path, mime)

        if not text.strip():
            _update_status(db, doc_id, "error", None)
            return

        chunks = await loop.run_in_executor(
            None, chunk_text, text, config.CHUNK_SIZE, config.CHUNK_OVERLAP
        )
        await loop.run_in_executor(None, index_document, doc_id, name, chunks)
        _update_status(db, doc_id, "ready", page_count)

    except Exception as e:
        print(f"[indexing error] {doc_id}: {e}")
        _update_status(db, doc_id, "error", None)


def _update_status(db: Session, doc_id: str, status: str, page_count):
    from database import SessionLocal
    with SessionLocal() as session:
        doc = session.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
        if doc:
            doc.status = status
            if page_count is not None:
                doc.page_count = page_count
            session.commit()


@router.delete("/{doc_id}", status_code=204)
async def delete_doc(
    doc_id: str,
    db: Session = Depends(get_db),
    _: UserModel = Depends(get_current_user),
):
    doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from ChromaDB
    delete_document(doc_id)

    # Remove file from disk
    for f in config.UPLOADS_DIR.glob(f"{doc_id}*"):
        f.unlink(missing_ok=True)

    db.delete(doc)
    db.commit()
    return None
