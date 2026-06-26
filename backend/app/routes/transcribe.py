import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
from app.config import OPENAI_API_KEY
from app.dependencies import get_current_user
from app.limiter import limiter

router = APIRouter(prefix="/transcribe", tags=["transcribe"])

# Map display labels (sent by frontend) or ISO codes to Whisper-compatible codes
_LANG_NORM: dict[str, str] = {
    "ru": "ru", "kk": "kk", "en": "en",
    "ENG": "en",
    # Whisper also accepts full names
    "russian": "ru", "kazakh": "kk", "english": "en",
}


def _normalize_lang(lang: str) -> str:
    return _LANG_NORM.get(lang, "ru")


@router.post("/")
@limiter.limit("10/minute")
async def transcribe_audio_route(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form(default="ru"),
    current_user: dict = Depends(get_current_user),
):
    from app.services.whisper_service import transcribe_audio
    contents = await file.read()
    text = await asyncio.to_thread(transcribe_audio, contents, _normalize_lang(language))
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
        transcribe_with_diarization, contents, _normalize_lang(language), session_state
    )
    return {
        "text": result["text"],
        "segments": result["segments"],
        "next_speaker": session_state["current_speaker"],
        "next_end": session_state["last_end"],
    }
