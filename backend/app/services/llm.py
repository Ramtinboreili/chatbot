import os
import requests

LLM_API_BASE_URL = os.getenv("LLM_API_BASE_URL", "").rstrip("/")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")


def generate_response(system_prompt: str, user_prompt: str) -> str:
    if not LLM_API_BASE_URL:
        raise ValueError("LLM_API_BASE_URL is not set")

    base = LLM_API_BASE_URL
    if base.endswith("/chat/completions"):
        base = base.rsplit("/chat/completions", 1)[0]
    url = f"{base}/chat/completions"
    headers = {
        "Content-Type": "application/json",
    }
    if LLM_API_KEY:
        headers["Authorization"] = f"Bearer {LLM_API_KEY}"

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    response = requests.post(url, headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()

    choices = data.get("choices", [])
    if not choices:
        raise ValueError("LLM API returned no choices")

    message = choices[0].get("message", {})
    return message.get("content", "").strip()
