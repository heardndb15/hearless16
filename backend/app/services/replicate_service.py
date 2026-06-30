import io
import sys


# Language names Whisper on Replicate expects
_LANG_MAP = {
    "ru": "russian",
    "kk": "kazakh",
    "en": "english",
}


def transcribe_with_replicate(audio_bytes: bytes, language: str = "ru") -> str | None:
    from app.config import REPLICATE_API_TOKEN
    if not REPLICATE_API_TOKEN:
        return None
    try:
        import replicate

        client = replicate.Client(api_token=REPLICATE_API_TOKEN)
        lang_name = _LANG_MAP.get(language, "russian")

        output = client.run(
            "openai/whisper",
            input={
                "audio": io.BytesIO(audio_bytes),
                "language": lang_name,
                "transcription": "plain text",
                "translate": False,
            },
        )

        if isinstance(output, dict):
            return (output.get("transcription") or "").strip() or None
        text = str(output).strip() if output else None
        return text or None
    except Exception as e:
        print(f"Replicate transcription error: {e}", file=sys.stderr)
        return None
