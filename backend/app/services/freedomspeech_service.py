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
            default_headers={
                # FreedomSpeech authenticates via X-API-Key, not the
                # OpenAI-style Authorization: Bearer header the SDK sends.
                "X-API-Key": FREEDOMSPEECH_API_KEY,
                # Their Cloudflare WAF blocks (403) requests carrying the
                # SDK's own "OpenAI/Python x.x" User-Agent outright —
                # override it to a generic one that isn't filtered.
                "User-Agent": "python-httpx/0.27.0",
            },
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
