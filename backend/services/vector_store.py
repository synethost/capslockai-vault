"""
Vector store — Ollama semantic embeddings with auto dimension fix.
"""
import json, hashlib, shutil, threading
import urllib.request
import numpy as np
from pathlib import Path
from typing import List, Dict, Any
import config

EMBED_DIM = 768
_lock     = threading.Lock()
_col      = None

def _embed(texts: list) -> list:
    model = _pick_model()
    results = []
    for text in texts:
        try:
            payload = json.dumps({"model": model, "prompt": text[:8192]}).encode()
            req = urllib.request.Request(
                f"{config.OLLAMA_BASE_URL}/api/embeddings",
                data=payload, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=30) as r:
                emb = json.loads(r.read()).get("embedding", [])
            if emb:
                arr  = np.array(emb, dtype=np.float32)
                norm = np.linalg.norm(arr)
                results.append((arr / norm if norm > 0 else arr).tolist())
                continue
        except Exception as e:
            print(f"[embed] {e} — hash fallback")
        results.append(_hash(text))
    return results

def _pick_model() -> str:
    try:
        with urllib.request.urlopen(f"{config.OLLAMA_BASE_URL}/api/tags", timeout=3) as r:
            names = [m["name"] for m in json.loads(r.read()).get("models", [])]
        for cand in ["nomic-embed-text", "mxbai-embed-large", config.OLLAMA_MODEL]:
            for n in names:
                if cand.split(":")[0] in n:
                    return n
        return names[0] if names else config.OLLAMA_MODEL
    except Exception:
        return config.OLLAMA_MODEL

def _hash(text: str) -> list:
    vec = np.zeros(EMBED_DIM, dtype=np.float32)
    t   = text.lower().strip()
    for i in range(len(t) - 2):
        vec[int(hashlib.md5(t[i:i+3].encode()).hexdigest(), 16) % EMBED_DIM] += 1.0
    for w in t.split():
        vec[int(hashlib.md5(w.encode()).hexdigest(), 16) % EMBED_DIM] += 2.0
    norm = np.linalg.norm(vec)
    return (vec / norm if norm > 0 else vec).tolist()

def _new_col():
    import chromadb
    path = Path(config.CHROMA_DIR)
    path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(path))
    try:
        client.delete_collection("vault_documents")
    except Exception:
        pass
    return client.create_collection(
        "vault_documents",
        metadata={"hnsw:space": "cosine"})

def _get_col():
    global _col
    with _lock:
        if _col is not None:
            return _col
        import chromadb
        path = Path(config.CHROMA_DIR)
        path.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(path))
        try:
            col = client.get_collection("vault_documents")
            # Verify dimension with a probe
            test = _embed(["ping"])
            col.add(ids=["__probe__"], embeddings=[test[0]], documents=["ping"])
            col.delete(ids=["__probe__"])
            _col = col
        except Exception as e:
            if "dimension" in str(e).lower() or "already exists" in str(e).lower() or "tenant" in str(e).lower() or "NotFound" in type(e).__name__:
                print(f"[vector_store] Resetting collection ({e})")
                shutil.rmtree(str(path))
                path.mkdir(parents=True, exist_ok=True)
                client = chromadb.PersistentClient(path=str(path))
                _col   = client.create_collection("vault_documents", metadata={"hnsw:space": "cosine"})
            elif "does not exist" in str(e) or "NotFound" in type(e).__name__:
                _col = client.create_collection("vault_documents", metadata={"hnsw:space": "cosine"})
            else:
                raise
    return _col

def index_document(doc_id: str, doc_name: str, chunks: List[str]) -> int:
    if not chunks: return 0
    col  = _get_col()
    ids  = [f"{doc_id}__chunk_{i}" for i in range(len(chunks))]
    meta = [{"document_id": doc_id, "document_name": doc_name, "chunk_index": i} for i in range(len(chunks))]
    embs = _embed(chunks)
    for i in range(0, len(chunks), 20):
        col.add(ids=ids[i:i+20], embeddings=embs[i:i+20], documents=chunks[i:i+20], metadatas=meta[i:i+20])
    return len(chunks)

def search(query: str, top_k: int = None, document_ids: List[str] = None) -> List[Dict[str, Any]]:
    col = _get_col()
    k   = top_k or config.TOP_K_RESULTS
    where = {"document_id": {"$in": document_ids}} if document_ids else None
    try:
        n = col.count()
        if n == 0: return []
        emb = _embed([query])
        r   = col.query(query_embeddings=[emb[0]], n_results=min(k, n), where=where,
                        include=["documents", "metadatas", "distances"])
    except Exception:
        return []
    return [{"text": d, "document_id": m.get("document_id",""), "document_name": m.get("document_name",""),
             "chunk_index": m.get("chunk_index",0), "score": round(1-dist,4)}
            for d, m, dist in zip(r["documents"][0], r["metadatas"][0], r["distances"][0])]

def delete_document(doc_id: str):
    try: _get_col().delete(where={"document_id": doc_id})
    except Exception: pass

def document_count() -> int:
    try: return _get_col().count()
    except Exception: return 0
