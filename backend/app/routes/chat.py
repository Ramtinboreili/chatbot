from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.chat import answer_question

router = APIRouter()


class ChatRequest(BaseModel):
    query: str


@router.post("/chat")
def chat(request: ChatRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    return answer_question(request.query)
