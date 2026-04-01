"""
Vector store with Ollama semantic embeddings.
Uses nomic-embed-text for high-quality semantic search.
Falls back to llama3.2 if nomic-embed-text is not available.
No ONNX, no CoreML, no external ML libraries required.
"""
import json
import urllib.request
import numpy as np
import chromadb
from chromadb import EmbeddingFunction, Documents, Embeddings
from typing import List, Dict, Any
import config

EMBED_MODELS = ["nomic-embed-text", "mxbai-embed-large", config.OLLAMA_MODEL]


def _get_embed_model() -> str:
    """Find the best available embedding model in Ollama."""
    try:
        with urllib.request.urlopen(
            f"{config.OLLAMA_BASE_URL}/api/tags", timeout=3
        ) as r:
            models = [m["name"] for m in json.loads(r.read()).get("models", [])]
        for candidate in EMBED_MODELS:
            for m in models:
                if candidate.split(":")[0] in m:
                    return m
        return models[0] if models else config.OLLAMA_MODEL
    except Exception:
        return config.OLLAMA_MODEL


class OllamaEmbeddingFunction(EmbeddingFunction):
    """
    Semantic embeddings via Ollama /api/embeddings endpoint.
    Uses nomic-embed-text by default — a dedicated embedding model
    that outperforms general LLMs at retrieval tasks.
    """

    def __init__(self):
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            self._model = _get_embed_model()

    def __call__(self, input: Documents) -> Embeddings:
        self._ensure_model()
        results = []
        for text in input:
            vec = self._embed_one(text)
            results.append(vec)
        return results

    def _embed_one(self, text: str) -> list:
        try:
            payload = json.dumps({
                "model": self._model,
                "prompt": text[:8192],  # Trim to avoid token limits
            }).encode()
            req = urllib.request.Request(
                f"{config.OLLAMA_BASE_URL}/api/embeddings",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
                embedding = data.get("embedding", [])
                if embedding:
                    # L2 normalise for cosine similarity
                    arr  = np.array(embedding, dtype=np.float32)
                    norm = np.linalg.norm(arr)
                    if norm > 0:
                        arr = arr / norm
                    return arr.tolist()
        except Exception as e:
            print(f"[embedding error] {e} — falling back to zeros")

        # Fallback: hash-based embedding
        return _hash_embed(text)


def _hash_embed(text: str, dim: int = 768) -> list:
    """Deterministic fallback when Ollama is unavailable."""
    import hashlib
    text = text.lower().strip()
    vec  = np.zeros(dim, dtype=np.float32)
    for i in range(len(text) - 2):
        h   = int(hashlib.md5(text[i:i+3].encode()).hexdigest(), 16)
        vec[h % dim] += 1.0
    for word in text.split():
        h   = int(hashlib.md5(word.encode()).hexdigest(), 16)
        vec[h % dim] += 2.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


_client     = None
_collection = None
_ef         = None


def _get_collection():
    global _client, _collection, _ef
    if _collection is not None:
        return _collection
    _ef     = OllamaEmbeddingFunction()
    _client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
    _collection = _client.get_or_create_collection(
        name="vault_documents",
        embedding_function=_ef,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def index_document(doc_id: str, doc_name: str, chunks: List[str]) -> int:
    if not chunks:
        return 0
    collection = _get_collection()
    ids       = [f"{doc_id}__chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": doc_id, "document_name": doc_name, "chunk_index": i}
        for i in range(len(chunks))
    ]
    for i in range(0, len(chunks), 50):
        collection.add(
            ids=ids[i : i + 50],
            documents=chunks[i : i + 50],
            metadatas=metadatas[i : i + 50],
        )
    return len(chunks)


def search(
    query: str, top_k: int = None, document_ids: List[str] = None
) -> List[Dict[str, Any]]:
    collection = _get_collection()
    k     = top_k or config.TOP_K_RESULTS
    where = {"document_id": {"$in": document_ids}} if document_ids else None
    try:
        n = collection.count()
        if n == 0:
            return []
        results = collection.query(
            query_texts=[query],
            n_results=min(k, n),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    hits      = []
    docs      = results.get("documents", [[]])[0]
    metas     = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    for doc, meta, dist in zip(docs, metas, distances):
        hits.append({
            "text":          doc,
            "document_id":   meta.get("document_id", ""),
            "document_name": meta.get("document_name", ""),
            "chunk_index":   meta.get("chunk_index", 0),
            "score":         round(1 - dist, 4),
        })
    return hits


def delete_document(doc_id: str):
    try:
        _get_collection().delete(where={"document_id": doc_id})
    except Exception:
        pass


def document_count() -> int:
    try:
        return _get_collection().count()
    except Exception:
        return 0
