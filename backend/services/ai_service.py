import httpx
import json
from typing import List, Dict, Tuple
import config

# ── Provider detection ────────────────────────────────────────────────

async def detect_provider() -> Tuple[str, str, bool]:
    """
    Returns (provider, model_name, internet_available).
    Tries Ollama first, then OpenAI, then 'none'.
    """
    # Check Ollama (always preferred — fully offline)
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{config.OLLAMA_BASE_URL}/api/tags")
            if r.status_code == 200:
                models = r.json().get("models", [])
                names = [m["name"] for m in models]
                # Use configured model if available, else first available
                model = config.OLLAMA_MODEL
                if model not in names and names:
                    model = names[0]
                if names:
                    return "ollama", model, await _check_internet()
    except Exception:
        pass

    # Check OpenAI
    internet = await _check_internet()
    if internet and config.OPENAI_API_KEY:
        return "openai", config.OPENAI_MODEL, True

    return "none", "", internet


async def _check_internet() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get("https://1.1.1.1", follow_redirects=True)
            return r.status_code < 500
    except Exception:
        return False


# ── Chat ──────────────────────────────────────────────────────────────

async def generate_answer(
    question: str,
    context_chunks: List[Dict],
) -> str:
    """
    Generate an answer grounded in the retrieved context chunks.
    Tries Ollama, falls back to OpenAI, falls back to a helpful error.
    """
    if not context_chunks:
        context_text = "No relevant documents found."
    else:
        parts = []
        for i, chunk in enumerate(context_chunks, 1):
            parts.append(
                f"[Source {i}: {chunk['document_name']}]\n{chunk['text']}"
            )
        context_text = "\n\n---\n\n".join(parts)

    system_prompt = (
        "You are a helpful AI assistant for a company knowledge base. "
        "Answer the user's question using ONLY the information provided in the document excerpts below. "
        "Be concise and direct. If the answer isn't in the documents, say so clearly — "
        "do not make up information. "
        "Format your answer in plain language that non-technical users can understand."
    )

    user_prompt = (
        f"Document excerpts:\n\n{context_text}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )

    # Try Ollama
    try:
        answer = await _ollama_chat(system_prompt, user_prompt)
        if answer:
            return answer
    except Exception:
        pass

    # Try OpenAI
    if config.OPENAI_API_KEY:
        try:
            answer = await _openai_chat(system_prompt, user_prompt)
            if answer:
                return answer
        except Exception:
            pass

    return (
        "I'm sorry — the AI engine isn't available right now. "
        "Please make sure Ollama is running on your device, or check your internet connection "
        "if you're using an online AI provider."
    )


async def _ollama_chat(system: str, user: str) -> str:
    provider, model, _ = await detect_provider()
    if provider != "ollama":
        raise RuntimeError("Ollama not available")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "stream": False,
        "options": {"temperature": 0.1},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            f"{config.OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        r.raise_for_status()
        data = r.json()
        return data["message"]["content"].strip()


async def _openai_chat(system: str, user: str) -> str:
    headers = {
        "Authorization": f"Bearer {config.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": config.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        "temperature": 0.1,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
        )
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()
