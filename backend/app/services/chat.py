from app.services.embedding import embed_texts
from app.services.llm import generate_response
from app.services.vector_store import vector_store

SYSTEM_PROMPT = (
    "You are a helpful assistant. Use the provided context to answer the user. "
    "If the context is not relevant, say you do not know."
)


def answer_question(query: str) -> dict:
    query_embedding = embed_texts([query])[0]
    results = vector_store.search(query_embedding, top_k=4)

    context_blocks = []
    for item in results:
        source = item.get("source") or "unknown"
        context_blocks.append(f"Source: {source}\n{item['text']}")

    context = "\n\n".join(context_blocks) if context_blocks else "(no context)"

    prompt = (
        "Context:\n"
        f"{context}\n\n"
        "Question:\n"
        f"{query}\n\n"
        "Answer:"
    )

    response_text = generate_response(SYSTEM_PROMPT, prompt)

    return {
        "answer": response_text,
        "context_used": context_blocks,
    }
