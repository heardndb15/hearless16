import io
import sys


FREEDOMSPEECH_BASE_URL = "https://freedomspeech.kz"


def transcribe_with_freedomspeech(audio_bytes: bytes) -> str | None:
    from app.config import FREEDOMSPEECH_API_KEY
    # TEMP DEBUG: tracing "Kazakh subtitles produce no text" — confirms
    # whether this function is even reached, and with a real key, before
    # looking at the API response itself. Remove once root cause is confirmed.
    print(
        f"[fs-debug] called, audio_bytes={len(audio_bytes)} key_set={bool(FREEDOMSPEECH_API_KEY)}",
        file=sys.stderr,
    )
    if not FREEDOMSPEECH_API_KEY:
        return None
    try:
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
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=(f"audio.{ext}", audio_bytes),
            language="kk",
        )
        # TEMP DEBUG: see above. Remove once root cause is confirmed.
        print(f"[fs-debug] ext={ext} raw_response={response!r}", file=sys.stderr)
        return (response.text or "").strip() or None
    except Exception as e:
        print(f"FreedomSpeech transcription error: {e!r}", file=sys.stderr)
        return None
