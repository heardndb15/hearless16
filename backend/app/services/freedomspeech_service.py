import io
import sys


FREEDOMSPEECH_BASE_URL = "https://freedomspeech.kz"


def transcribe_with_freedomspeech(audio_bytes: bytes) -> str | None:
    from app.config import FREEDOMSPEECH_API_KEY
    if not FREEDOMSPEECH_API_KEY:
        return None
    try:
        from openai import OpenAI
        from app.services.whisper_service import detect_audio_format

        client = OpenAI(
            api_key=FREEDOMSPEECH_API_KEY,
            base_url=f"{FREEDOMSPEECH_BASE_URL}/v1",
        )
        ext = detect_audio_format(audio_bytes)
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=(f"audio.{ext}", audio_bytes),
            language="kk",
        )
        return (response.text or "").strip() or None
    except Exception as e:
        print(f"FreedomSpeech transcription error: {e}", file=sys.stderr)
        return None
