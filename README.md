# Minimal Self-Hosted RAG App

A tiny, self-hosted Retrieval-Augmented Generation (RAG) chatbot with a FastAPI backend and a static frontend. Upload files, embed them, and ask questions against the stored chunks.

## How RAG Works (Short Version)

1. **Ingest**: Upload a document (txt, md, pdf). The backend extracts text and splits it into fixed-size chunks.
2. **Embed**: Each chunk is sent to an external embedding API to get vectors.
3. **Store**: Vectors are kept in an in-memory vector store.
4. **Retrieve**: For a question, the backend embeds the query and performs cosine similarity search.
5. **Generate**: The top chunks are stitched into a context prompt and sent to an external LLM API.

## Configure External APIs

Set the environment variables in `.env` (copy from `.env.example`). The app expects OpenAI-compatible endpoints:

- `LLM_API_BASE_URL` (e.g. `http://localhost:11434/v1`)
- `LLM_API_KEY`
- `LLM_MODEL` (default: `gpt-4o-mini`)
- `EMBEDDING_API_BASE_URL` (e.g. `http://localhost:11434/v1`)
- `EMBEDDING_API_KEY`
- `EMBEDDING_MODEL` (default: `text-embedding-3-small`)

The backend calls:

- `POST {LLM_API_BASE_URL}/chat/completions`
- `POST {EMBEDDING_API_BASE_URL}/embeddings`

If your API expects different routes, adjust `backend/app/services/llm.py` and `backend/app/services/embedding.py`.

## Run Locally With Docker

1. Copy env file:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up --build
```

3. Open the frontend:

- `http://localhost:8080`

The backend is at:

- `http://localhost:8000`

## API Summary

- `POST /api/ingest` multipart form field `file` (txt, md, pdf)
- `POST /api/chat` JSON `{ "query": "..." }`

## Notes

- No database or auth.
- Vector store is in-memory; restart clears data.
- CORS is enabled for all origins for local development.
