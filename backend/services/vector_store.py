"""
Vector store using pure Python/sklearn embeddings.
No ONNX, no CoreML, no GPU required — works on all platforms.
"""
import hashlib
import numpy as np
import chromadb
from chromadb import EmbeddingFunction, Documents, Embeddings
from typing import List, Dict, Any
import config


class HashEmbeddingFunction(EmbeddingFunction):
    """
    Fast deterministic embeddings using character n-gram hashing.
    No ML model needed — works fully offline on any machine.
    Dimension: 384 (same as MiniLM-L6).
    """
    DIM = 384

    def __call__(self, input: Documents) -> Embeddings:
        results = []
        for text in input:
            vec = self._embed(text)
            results.append(vec.tolist())
        return results

    def _embed(self, text: str) -> np.ndarray:
        text = text.lower().strip()
        vec = np.zeros(self.DIM, dtype=np.float32)

        # Character trigrams
        for i in range(len(text) - 2):
            gram = text[i:i+3]
            h = int(hashlib.md5(gram.encode()).hexdigest(), 16)
            idx = h % self.DIM
            vec[idx] += 1.0

        # Word unigrams
        for word in text.split():
            h = int(hashlib.md5(word.encode()).hexdigest(), 16)
            idx = h % self.DIM
            vec[idx] += 2.0

        # Word bigrams
        words = text.split()
        for i in range(len(words) - 1):
            gram = words[i] + " " + words[i+1]
            h = int(hashlib.md5(gram.encode()).hexdigest(), 16)
            idx = h % self.DIM
            vec[idx] += 1.5

        # L2 normalise
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec


_client = None
_collection = None
_ef = None


def _get_collection():
    global _client, _collection, _ef
    if _collection is not None:
        return _collection

    _ef = HashEmbeddingFunction()
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
    ids = [f"{doc_id}__chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": doc_id, "document_name": doc_name, "chunk_index": i}
        for i in range(len(chunks))
    ]
    for i in range(0, len(chunks), 100):
        collection.add(
            ids=ids[i : i + 100],
            documents=chunks[i : i + 100],
            metadatas=metadatas[i : i + 100],
        )
    return len(chunks)


def search(
    query: str, top_k: int = None, document_ids: List[str] = None
) -> List[Dict[str, Any]]:
    collection = _get_collection()
    k = top_k or config.TOP_K_RESULTS
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

    hits = []
    docs      = results.get("documents", [[]])[0]
    metas     = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    for doc, meta, dist in zip(docs, metas, distances):
        hits.append({
            "text":          doc,
            "document_id":   meta.get("document_id", ""),
            "document_name": meta.get("document_name", ""),
            "chunk_index":   meta.get("chunk_index", 0),
            "score":         1 - dist,
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
