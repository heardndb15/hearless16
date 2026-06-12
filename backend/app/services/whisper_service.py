import io
import wave
import numpy as np

WHISPER_AVAILABLE = False
WHISPER_MODEL = None


def get_local_whisper():
    global WHISPER_MODEL, WHISPER_AVAILABLE
    if WHISPER_MODEL is None and WHISPER_AVAILABLE is not False:
        try:
            from faster_whisper import WhisperModel
            WHISPER_MODEL = WhisperModel("small", device="cpu", compute_type="int8")
            WHISPER_AVAILABLE = True
        except Exception:
            WHISPER_MODEL = False
            WHISPER_AVAILABLE = False
    return WHISPER_MODEL if WHISPER_AVAILABLE else None


def audio_bytes_to_float(audio_bytes: bytes, target_sr: int = 16000) -> np.ndarray:
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            sr = wf.getframerate()
            frames = wf.readframes(wf.getnframes())
            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    except wave.Error:
        try:
            audio = _convert_with_ffmpeg(audio_bytes, target_sr)
        except Exception:
            return np.array([], dtype=np.float32)
        return audio

    if len(audio) == 0:
        return np.array([], dtype=np.float32)
    if sr != target_sr:
        ratio = target_sr / sr
        new_len = int(len(audio) * ratio)
        audio = np.interp(
            np.linspace(0, len(audio) - 1, new_len),
            np.arange(len(audio)),
            audio,
        )
    return audio


def _convert_with_ffmpeg(audio_bytes: bytes, target_sr: int = 16000) -> np.ndarray:
    from pydub import AudioSegment
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as tmp_in:
        tmp_in.write(audio_bytes)
        tmp_in.flush()
        seg = AudioSegment.from_file(tmp_in.name)
        seg = seg.set_frame_rate(target_sr).set_channels(1).set_sample_width(2)
        raw = seg.raw_data
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def transcribe_local(audio_bytes: bytes) -> str | None:
    model = get_local_whisper()
    if model is None:
        return None

    audio = audio_bytes_to_float(audio_bytes)
    if len(audio) == 0:
        return ""
    segments, _ = model.transcribe(audio, beam_size=1)
    return " ".join(seg.text for seg in segments)


def transcribe_openai(audio_bytes: bytes, language: str = "ru") -> str:
    from openai import OpenAI
    from app.config import OPENAI_API_KEY

    if not OPENAI_API_KEY:
        return ""

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.wav", audio_bytes),
        language=language,
    )
    return response.text


def transcribe_audio(audio_bytes: bytes, language: str = "ru") -> str:
    result = transcribe_local(audio_bytes)
    if result is not None:
        return result
    return transcribe_openai(audio_bytes, language)
