import os
import requests

EMBEDDING_API_BASE_URL = os.getenv("EMBEDDING_API_BASE_URL", "").rstrip("/")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not EMBEDDING_API_BASE_URL:
        raise ValueError("EMBEDDING_API_BASE_URL is not set")

    url = f"{EMBEDDING_API_BASE_URL}/embeddings"
    headers = {
        "Content-Type": "application/json",
    }
    if EMBEDDING_API_KEY:
        headers["Authorization"] = f"Bearer {EMBEDDING_API_KEY}"

    payload = {
        "model": EMBEDDING_MODEL,
        "input": texts,
    }

    response = requests.post(url, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()

    embeddings = [item["embedding"] for item in data.get("data", [])]
    if len(embeddings) != len(texts):
        raise ValueError("Embedding API returned unexpected number of vectors")

    return embeddings
