from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.chat import answer_question
from app.services.auth import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    query: str


@router.post("/chat")
def chat(request: ChatRequest, user=Depends(get_current_user)):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    return answer_question(request.query)
