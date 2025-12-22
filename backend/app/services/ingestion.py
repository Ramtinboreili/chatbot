from app.services.embedding import embed_texts
from app.services.vector_store import vector_store
from app.utils.text import chunk_text, extract_text


def ingest_document(filename: str, content: bytes) -> dict:
    text = extract_text(filename, content)
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("No text content extracted")

    embeddings = embed_texts(chunks)
    vector_store.add_documents(embeddings, chunks, source=filename)

    return {
        "status": "ingested",
        "filename": filename,
        "chunks": len(chunks),
    }
