"""TEMP DEBUG: diagnosing "Kazakh subtitles return empty text on Render but
work identically when the same code is run locally" — surfaces the raw
FreedomSpeech client error directly in the HTTP response since we don't have
Render log access. Remove this file and its router registration in main.py
once root-caused.
"""
import sys
from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/debug", tags=["debug"])


@router.post("/freedomspeech")
async def debug_freedomspeech(file: UploadFile = File(...)):
    from app.config import FREEDOMSPEECH_API_KEY

    audio_bytes = await file.read()
    info: dict = {
        "key_set": bool(FREEDOMSPEECH_API_KEY),
        "key_len": len(FREEDOMSPEECH_API_KEY) if FREEDOMSPEECH_API_KEY else 0,
        "audio_bytes": len(audio_bytes),
    }

    try:
        from openai import OpenAI
        from app.services.whisper_service import detect_audio_format

        ext = detect_audio_format(audio_bytes)
        info["detected_ext"] = ext

        client = OpenAI(
            api_key=FREEDOMSPEECH_API_KEY,
            base_url="https://freedomspeech.kz/v1",
            timeout=8.0,
            max_retries=0,
            default_headers={
                "X-API-Key": FREEDOMSPEECH_API_KEY,
                "User-Agent": "python-httpx/0.27.0",
            },
        )
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=(f"audio.{ext}", audio_bytes),
            language="kk",
        )
        info["success"] = True
        info["text"] = response.text
        info["raw_response_repr"] = repr(response)
    except Exception as e:
        info["success"] = False
        info["exception_type"] = type(e).__name__
        info["exception_repr"] = repr(e)
        info["exception_str"] = str(e)
        # openai SDK's APIStatusError/APIError carry the actual HTTP
        # status + body, which is exactly what we need to see.
        status_code = getattr(e, "status_code", None)
        if status_code is not None:
            info["status_code"] = status_code
        response_obj = getattr(e, "response", None)
        if response_obj is not None:
            try:
                info["response_text"] = response_obj.text[:2000]
            except Exception:
                pass
        body = getattr(e, "body", None)
        if body is not None:
            info["error_body"] = str(body)[:2000]
        print(f"[debug_freedomspeech] {info}", file=sys.stderr)

    return info
