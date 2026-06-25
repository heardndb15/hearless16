import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Request
from app.config import OPENAI_API_KEY
from app.dependencies import get_current_user
from app.limiter import limiter

router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("/")
@limiter.limit("10/minute")
async def transcribe_audio_route(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    from app.services.whisper_service import transcribe_audio
    contents = await file.read()
    text = await asyncio.to_thread(transcribe_audio, contents, "ru")
    return {"text": text}
