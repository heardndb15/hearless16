import sys


FREEDOMSPEECH_BASE_URL = "https://freedomspeech.kz"


class FreedomSpeechError(Exception):
    """freedomspeech.kz itself failed (missing key, auth, quota, network) —
    distinct from a legitimate empty transcript, so callers (the /ws/transcribe
    handler, the landing API route) can surface a real error to the user
    instead of treating a dead upstream the same as silence."""


def transcribe_with_freedomspeech(audio_bytes: bytes) -> str | None:
    from app.config import FREEDOMSPEECH_API_KEY
    if not FREEDOMSPEECH_API_KEY:
        raise FreedomSpeechError("FreedomSpeech not configured")

    from openai import OpenAI
    from app.services.whisper_service import detect_audio_format

    client = OpenAI(
        api_key=FREEDOMSPEECH_API_KEY,
        base_url=f"{FREEDOMSPEECH_BASE_URL}/v1",
        # Without an explicit timeout the SDK's default can leave a hung
        # freedomspeech.kz request open for minutes, and since every
        # /ws/transcribe chunk for a session is serialized behind
        # diarize_lock, one slow request freezes all subsequent Kazakh
        # subtitles for that session. Fail fast instead.
        timeout=8.0,
        max_retries=0,
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
    try:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=(f"audio.{ext}", audio_bytes),
            language="kk",
        )
    except Exception as e:
        print(f"FreedomSpeech transcription error: {e!r}", file=sys.stderr)
        raise FreedomSpeechError(str(e)) from e
    return (response.text or "").strip() or None
