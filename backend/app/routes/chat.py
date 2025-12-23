from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.chat import answer_question, stream_answer_question

router = APIRouter()


class ChatRequest(BaseModel):
    query: str


@router.post("/chat")
def chat(request: ChatRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    return answer_question(request.query)


@router.post("/chat/stream")
def chat_stream(request: ChatRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    def event_stream():
        try:
            for chunk in stream_answer_question(request.query):
                yield f"data: {chunk}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {str(exc)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
