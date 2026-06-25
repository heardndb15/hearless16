import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
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


@router.post("/diarize")
@limiter.limit("10/minute")
async def diarize_audio_route(
    request: Request,
    file: UploadFile = File(...),
    last_speaker: int = Form(default=0),
    last_end: float = Form(default=0.0),
    language: str = Form(default="ru"),
    current_user: dict = Depends(get_current_user),
):
    from app.services.whisper_service import transcribe_with_diarization
    contents = await file.read()
    session_state = {"current_speaker": last_speaker, "last_end": last_end}
    result = await asyncio.to_thread(
        transcribe_with_diarization, contents, language, session_state
    )
    return {
        "text": result["text"],
        "segments": result["segments"],
        "next_speaker": session_state["current_speaker"],
        "next_end": session_state["last_end"],
    }
