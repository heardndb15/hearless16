import io
import wave
import numpy as np

WHISPER_AVAILABLE = None  # None = not tried, True = loaded, False = failed
WHISPER_MODEL = None


def get_local_whisper():
    global WHISPER_MODEL, WHISPER_AVAILABLE
    if WHISPER_MODEL is None and WHISPER_AVAILABLE is None:
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


def pcm_to_wav_bytes(pcm_bytes: bytes, sr: int = 16000) -> bytes:
    """Wraps raw 16-bit signed PCM bytes with a standard 44-byte WAV header in-memory."""
    num_samples = len(pcm_bytes) // 2
    chunk_size = 36 + len(pcm_bytes)
    byte_rate = sr * 2  # 16-bit = 2 bytes per sample, 1 channel
    block_align = 2
    
    header = bytearray(44)
    # RIFF Header
    header[0:4] = b"RIFF"
    header[4:8] = chunk_size.to_bytes(4, byteorder="little")
    header[8:12] = b"WAVE"
    # fmt Subchunk
    header[12:16] = b"fmt "
    header[16:20] = (16).to_bytes(4, byteorder="little")  # Subchunk1Size (16 for PCM)
    header[20:22] = (1).to_bytes(2, byteorder="little")   # AudioFormat (1 for PCM)
    header[22:24] = (1).to_bytes(2, byteorder="little")   # NumChannels (1 for mono)
    header[24:28] = sr.to_bytes(4, byteorder="little")    # SampleRate
    header[28:32] = byte_rate.to_bytes(4, byteorder="little")  # ByteRate
    header[32:34] = block_align.to_bytes(2, byteorder="little")  # BlockAlign
    header[34:36] = (16).to_bytes(2, byteorder="little")  # BitsPerSample (16)
    # data Subchunk
    header[36:40] = b"data"
    header[40:44] = len(pcm_bytes).to_bytes(4, byteorder="little")  # Subchunk2Size
    
    return bytes(header) + pcm_bytes


def transcribe_pcm(pcm_bytes: bytes, language: str = "ru") -> str:
    """Transcribes raw PCM bytes by wrapping them in a WAV header and calling transcribe_audio."""
    wav_bytes = pcm_to_wav_bytes(pcm_bytes)
    return transcribe_audio(wav_bytes, language=language)


def merge_transcripts(old_text: str, new_text: str) -> str:
    """Stitches together two overlapping transcript segments using suffix-prefix alignment."""
    old_words = old_text.strip().split()
    new_words = new_text.strip().split()
    
    if not old_words:
        return new_text
    if not new_words:
        return old_text
        
    # Find the longest suffix of old_words that matches a prefix of new_words
    max_overlap = min(len(old_words), len(new_words))
    overlap_len = 0
    
    for i in range(1, max_overlap + 1):
        if old_words[-i:] == new_words[:i]:
            overlap_len = i
            
    if overlap_len > 0:
        return " ".join(old_words[:-overlap_len] + new_words)
    else:
        # Fallback: if no match, check if old ends with punctuation
        if old_text.strip().endswith((".", "?", "!")):
            return old_text.strip() + " " + new_text.strip()
        # Fuzzy fallback: if words are similar, stitch them or just space-join
        return old_text.strip() + " " + new_text.strip()




SILENCE_GAP_THRESHOLD = 0.5  # seconds gap = potential speaker change


def transcribe_with_diarization(
    audio_bytes: bytes,
    language: str = "ru",
    session_state: dict | None = None,
) -> dict:
    """
    Transcribes audio and assigns speaker IDs using silence-gap heuristic.

    session_state is a mutable dict {"current_speaker": int, "last_end": float}
    shared across multiple calls in a WebSocket session to maintain continuity.
    Pass None to start fresh.
    """
    if session_state is None:
        session_state = {"current_speaker": 0, "last_end": 0.0}

    model = get_local_whisper()
    if model is None:
        text = transcribe_openai(audio_bytes, language)
        speaker = session_state["current_speaker"]
        return {
            "text": text,
            "segments": [{"text": text, "speaker": speaker, "start": 0.0, "end": 0.0}],
        }

    audio = audio_bytes_to_float(audio_bytes)
    if len(audio) == 0:
        return {"text": "", "segments": []}

    raw_segs, _ = model.transcribe(audio, beam_size=1, language=language)
    seg_list = list(raw_segs)

    if not seg_list:
        return {"text": "", "segments": []}

    result_segments = []
    for seg in seg_list:
        gap = seg.start - session_state["last_end"]
        if gap > SILENCE_GAP_THRESHOLD and session_state["last_end"] > 0:
            session_state["current_speaker"] = (session_state["current_speaker"] + 1) % 4
        session_state["last_end"] = seg.end

        result_segments.append({
            "text": seg.text.strip(),
            "speaker": session_state["current_speaker"],
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
        })

    full_text = " ".join(s["text"] for s in result_segments)
    return {"text": full_text, "segments": result_segments}


def merge_audio_chunks(chunks: list[bytes], format: str = "m4a") -> bytes:
    from pydub import AudioSegment
    import io
    import tempfile
    import os

    if not chunks:
        return b""
    if len(chunks) == 1:
        return chunks[0]

    try:
        combined = None
        for chunk in chunks:
            with tempfile.NamedTemporaryFile(suffix=f".{format}", delete=False) as tmp:
                tmp.write(chunk)
                tmp.flush()
                tmp_name = tmp.name
            try:
                segment = AudioSegment.from_file(tmp_name)
                if combined is None:
                    combined = segment
                else:
                    combined += segment
            finally:
                if os.path.exists(tmp_name):
                    os.unlink(tmp_name)

        if combined is None:
            return b""

        out_buf = io.BytesIO()
        combined.export(out_buf, format="wav")
        return out_buf.getvalue()
    except Exception as e:
        import sys
        print(f"Error merging audio chunks: {e}", file=sys.stderr)
        return b""
