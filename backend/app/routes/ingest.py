from fastapi import APIRouter, Depends, File, UploadFile, HTTPException

from app.services.ingestion import ingest_document
from app.services.auth import get_current_user

router = APIRouter()


@router.post("/ingest")
async def ingest_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Missing filename")

    content = await file.read()
    try:
        result = ingest_document(file.filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result
