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
    import os

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as tmp_in:
            tmp_path = tmp_in.name
            tmp_in.write(audio_bytes)
            tmp_in.flush()
        seg = AudioSegment.from_file(tmp_path)
        seg = seg.set_frame_rate(target_sr).set_channels(1).set_sample_width(2)
        raw = seg.raw_data
        return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


def floats_to_wav_bytes(floats: np.ndarray, sr: int = 16000) -> bytes:
    # convert float32 to int16
    int_data = (floats * 32767.0).astype(np.int16)
    out_buf = io.BytesIO()
    with wave.open(out_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(int_data.tobytes())
    return out_buf.getvalue()



def transcribe_local(audio_bytes: bytes) -> str | None:
    try:
        model = get_local_whisper()
        if model is None:
            return None

        audio = audio_bytes_to_float(audio_bytes)
        if len(audio) == 0:
            return ""
        segments, _ = model.transcribe(audio, beam_size=1)
        return " ".join(seg.text for seg in segments)
    except Exception as e:
        import sys
        print(f"Error in transcribe_local: {e}", file=sys.stderr)
        return None


def detect_audio_format(audio_bytes: bytes) -> str:
    if audio_bytes.startswith(b"\x1a\x45\xdf\xa3"):
        return "webm"
    if b"ftyp" in audio_bytes[:20]:
        return "m4a"
    if audio_bytes.startswith(b"RIFF"):
        return "wav"
    return "wav"


def transcribe_openai(audio_bytes: bytes, language: str = "ru") -> str:
    try:
        from openai import OpenAI
        from app.config import OPENAI_API_KEY

        if not OPENAI_API_KEY:
            return ""

        client = OpenAI(api_key=OPENAI_API_KEY)
        ext = detect_audio_format(audio_bytes)
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=(f"audio.{ext}", audio_bytes),
            language=language,
        )
        return response.text
    except Exception as e:
        import sys
        print(f"Error in transcribe_openai: {e}", file=sys.stderr)
        return ""


def transcribe_audio(audio_bytes: bytes, language: str = "ru") -> str:
    try:
        result = transcribe_local(audio_bytes)
        if result is not None:
            return result
        return transcribe_openai(audio_bytes, language)
    except Exception as e:
        import sys
        print(f"Error in transcribe_audio: {e}", file=sys.stderr)
        return ""
