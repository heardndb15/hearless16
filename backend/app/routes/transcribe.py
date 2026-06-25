import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from app.config import OPENAI_API_KEY
from app.dependencies import get_current_user

router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("/")
async def transcribe_audio_route(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    from app.services.whisper_service import transcribe_audio
    contents = await file.read()
    text = await asyncio.to_thread(transcribe_audio, contents, "ru")
    return {"text": text}


