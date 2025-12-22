from fastapi import APIRouter, File, UploadFile, HTTPException

from app.services.ingestion import ingest_document

router = APIRouter()


@router.post("/ingest")
async def ingest_file(file: UploadFile = File(...)):
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Missing filename")

    content = await file.read()
    try:
        result = ingest_document(file.filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result
