import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.ingest import router as ingest_router
from app.routes.chat import router as chat_router

app = FastAPI(title="Minimal RAG API")

# Allow local frontend access by default.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/config")
def api_config():
    return {
        "llm_model": os.getenv("LLM_MODEL", ""),
    }
