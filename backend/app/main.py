import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.limiter import limiter
from app.routes import users, subtitles, gestures, alerts, transcribe, community, polar
from app.services.whisper_service import transcribe_audio


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.migrate import run_migrations
    await asyncio.to_thread(run_migrations)
    yield


app = FastAPI(
    title="Hearless API",
    description="Бэкенд для приложения Hearless — помощь глухим и слабослышащим",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hearless16-pcug.vercel.app",
        "https://hearless16-1.onrender.com",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://hearless16[a-zA-Z0-9\-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(subtitles.router)
app.include_router(gestures.router)
app.include_router(alerts.router)
app.include_router(transcribe.router)
app.include_router(community.router, prefix="/community")
app.include_router(polar.router)


@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket, token: str | None = None, lang: str = "ru", format: str = "webm"):
    await websocket.accept()
    
    is_authenticated = False
    if token:
        from app.database import get_supabase
        db = get_supabase()
        try:
            user_res = db.auth.get_user(token)
            if user_res and getattr(user_res, "user", None):
                is_authenticated = True
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": "Неверный или просроченный токен авторизации."
                })
                await websocket.close()
                return
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"Ошибка авторизации: {str(e)}"
            })
            await websocket.close()
            return
    # Guest mode: no token → transcription allowed but auto-save skipped on backend

    # Check if a transcription model or API key is available.
    # Kazakh only ever goes through FreedomSpeech (see transcribe_audio), so it
    # must never touch get_local_whisper(): that call is a synchronous,
    # blocking faster-whisper model load/download from the HF Hub on first
    # use, which freezes the whole event loop for every connection on this
    # worker — on Render's free tier that "first use" is every cold start,
    # and it used to run unconditionally even for lang=kk, which doesn't need
    # it at all and would time out the WS handshake while it downloaded.
    from app.config import OPENAI_API_KEY, REPLICATE_API_TOKEN, FREEDOMSPEECH_API_KEY

    if lang == "kk":
        if not FREEDOMSPEECH_API_KEY:
            await websocket.send_json({
                "type": "error",
                "message": "FreedomSpeech API key not configured on backend."
            })
            await websocket.close()
            return
    else:
        from app.services.whisper_service import get_local_whisper
        local_whisper = await asyncio.to_thread(get_local_whisper)
        if local_whisper is None and not OPENAI_API_KEY and not REPLICATE_API_TOKEN:
            await websocket.send_json({
                "type": "error",
                "message": "No transcription engine configured on backend. Local Whisper is missing and OPENAI_API_KEY is not set."
            })
            await websocket.close()
            return

    session_bytes = b""
    audio_window_chunks: list[bytes] = []  # sliding window of recent M4A chunks
    last_transcribed_len = 0
    
    # Режим стриминга (True для потокового WebM с веба, False для независимых M4A с мобильного)
    is_stream = None
    current_full_text = ""

    # Streaming PCM variables
    pcm_buffer = bytearray()
    finalized_text = ""
    interim_text = ""
    interim_segments: list = []
    chunk_counter = 0
    diarize_state: dict = {"current_speaker": 0, "last_end": 0.0}
    diarize_lock: asyncio.Lock = asyncio.Lock()

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            action = data.get("action")

            if action == "chunk":
                audio_b64 = data.get("audio", "")
                import base64
                audio_bytes = base64.b64decode(audio_b64)
                if len(audio_bytes) == 0:
                    continue

                if format == "pcm":
                    pcm_buffer.extend(audio_bytes)
                    chunk_counter += 1
                    
                    # Transcribe every 2 chunks (~400-600ms of audio) to balance latency and CPU
                    if chunk_counter % 2 == 0:
                        from app.services.whisper_service import transcribe_with_diarization, pcm_to_wav_bytes
                        wav_bytes = pcm_to_wav_bytes(bytes(pcm_buffer))
                        sliding_window = len(pcm_buffer) >= 256000

                        # Every diarization call is serialized behind diarize_lock, so one
                        # slow/hung call (e.g. a lagging FreedomSpeech request for Kazakh)
                        # would otherwise stall every later chunk in this session forever.
                        # Bound it and just skip this chunk's update on timeout/failure.
                        try:
                            async with diarize_lock:
                                diarize_result = await asyncio.wait_for(
                                    asyncio.to_thread(
                                        transcribe_with_diarization, wav_bytes, lang, diarize_state
                                    ),
                                    timeout=12.0,
                                )
                        except Exception as e:
                            import sys
                            print(f"PCM diarization failed/timed out: {e}", file=sys.stderr)
                            if sliding_window:
                                pcm_buffer = pcm_buffer[-64000:]
                            continue

                        if sliding_window:
                            # Slide window: keep the last 2 seconds (16000 * 2 * 2 = 64000 bytes) for context overlap
                            pcm_buffer = pcm_buffer[-64000:]
                            from app.services.whisper_service import merge_transcripts
                            finalized_text = merge_transcripts(finalized_text, diarize_result["text"])
                            interim_text = ""
                            interim_segments = []
                        else:
                            interim_text = diarize_result["text"]
                            interim_segments = diarize_result["segments"]

                        current_full_text = finalized_text
                        if interim_text:
                            current_full_text = (current_full_text + " " + interim_text).strip()

                        await websocket.send_json({
                            "type": "text",
                            "text": current_full_text,
                            "full_text": current_full_text,
                            "segments": interim_segments if interim_text else [],
                        })
                else:
                    # При первом чанке определяем формат
                    if is_stream is None:
                        from app.services.whisper_service import detect_audio_format
                        ext = detect_audio_format(audio_bytes)
                        if ext == "webm":
                            is_stream = True
                        else:
                            is_stream = False

                    if is_stream:
                        # Если это непрерывный поток (WebM)
                        session_bytes += audio_bytes
                        # Распознаем на первом чанке или при накоплении 12KB новых данных (~1.5-2 сек)
                        if last_transcribed_len == 0 or len(session_bytes) - last_transcribed_len >= 12000:
                            try:
                                text = await asyncio.wait_for(
                                    asyncio.to_thread(transcribe_audio, session_bytes, language=lang),
                                    timeout=15.0
                                )
                            except asyncio.TimeoutError:
                                text = ""
                                import sys
                                print("Transcription timed out (webm stream)", file=sys.stderr)
                            except Exception as e:
                                import sys
                                print(f"Error in ws stream transcribe: {e}", file=sys.stderr)
                                text = ""
                            if text:
                                current_full_text = text.strip()
                                await websocket.send_json({
                                    "type": "text",
                                    "text": current_full_text,
                                    "full_text": current_full_text,
                                })
                            last_transcribed_len = len(session_bytes)
                    else:
                        # Independent M4A files from mobile — sliding window of last 3 chunks
                        # to keep transcription cost bounded regardless of session length
                        from app.services.whisper_service import merge_audio_chunks, merge_transcripts, detect_audio_format
                        ext = detect_audio_format(audio_bytes)
                        try:
                            audio_window_chunks.append(audio_bytes)
                            if len(audio_window_chunks) > 3:
                                audio_window_chunks[:] = audio_window_chunks[-3:]

                            if len(audio_window_chunks) == 1:
                                merged_window = audio_bytes
                            else:
                                merged_window = await asyncio.wait_for(
                                    asyncio.to_thread(merge_audio_chunks, list(audio_window_chunks), ext),
                                    timeout=10.0
                                )
                                if not merged_window:
                                    merged_window = audio_bytes

                            chunk_text = await asyncio.wait_for(
                                asyncio.to_thread(transcribe_audio, merged_window, language=lang),
                                timeout=15.0
                            )
                            if chunk_text and chunk_text.strip():
                                current_full_text = merge_transcripts(current_full_text, chunk_text.strip())
                        except Exception as e:
                            import sys
                            print(f"M4A chunk transcription failed: {e}", file=sys.stderr)
                            try:
                                chunk_text = await asyncio.to_thread(transcribe_audio, audio_bytes, language=lang)
                                if chunk_text and chunk_text.strip():
                                    from app.services.whisper_service import merge_transcripts as mt
                                    current_full_text = mt(current_full_text, chunk_text.strip())
                            except Exception as ex:
                                print(f"Single-chunk transcribe also failed: {ex}", file=sys.stderr)

                        await websocket.send_json({
                            "type": "text",
                            "text": current_full_text,
                            "full_text": current_full_text,
                        })

            elif action == "stop":
                if format == "pcm":
                    if len(pcm_buffer) > 0:
                        from app.services.whisper_service import transcribe_pcm, merge_transcripts
                        last_text = await asyncio.wait_for(
                            asyncio.to_thread(transcribe_pcm, bytes(pcm_buffer), lang),
                            timeout=15.0
                        )
                        current_full_text = merge_transcripts(finalized_text, last_text)
                    await websocket.send_json({
                        "type": "final",
                        "text": current_full_text,
                        "full_text": current_full_text,
                    })
                else:
                    if is_stream:
                        if len(session_bytes) > 0:
                            try:
                                text = await asyncio.wait_for(
                                    asyncio.to_thread(transcribe_audio, session_bytes, language=lang),
                                    timeout=15.0
                                )
                            except (asyncio.TimeoutError, Exception) as e:
                                import sys
                                print(f"Error in ws stop transcribe: {e}", file=sys.stderr)
                                text = ""
                            if text:
                                current_full_text = text.strip()
                            await websocket.send_json({
                                "type": "final",
                                "text": current_full_text,
                                "full_text": current_full_text,
                            })
                        else:
                            await websocket.send_json({
                                "type": "final",
                                "text": "",
                                "full_text": "",
                            })
                    else:
                        # Для мобильного финальный текст - это накопленный текст
                        await websocket.send_json({
                            "type": "final",
                            "text": "",
                            "full_text": current_full_text,
                        })
                break

    except WebSocketDisconnect:
        pass


@app.get("/health")
async def health():
    return {"status": "ok"}



