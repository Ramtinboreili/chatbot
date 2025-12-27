from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.services.auth import (
    authenticate_user,
    create_session,
    create_user,
    get_current_user,
    revoke_session,
)

router = APIRouter()


class AuthPayload(BaseModel):
    email: str
    password: str


@router.post("/auth/signup")
def signup(payload: AuthPayload):
    try:
        user = create_user(payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token = create_session(user["id"])
    return {"token": token, "user": user}


@router.post("/auth/login")
def login(payload: AuthPayload):
    user = authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_session(user["id"])
    return {"token": token, "user": user}


@router.post("/auth/logout")
def logout(user=Depends(get_current_user), authorization: str | None = Header(default=None)):
    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
    revoke_session(token)
    return {"status": "ok", "user": user}


@router.get("/auth/me")
def me(user=Depends(get_current_user)):
    return {"user": user}
