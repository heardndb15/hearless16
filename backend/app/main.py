import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routes import users, subtitles, gestures, alerts, transcribe, sos, study
from app.services.whisper_service import transcribe_audio

app = FastAPI(
    title="Hearless API",
    description="Бэкенд для приложения Hearless — помощь глухим и слабослышащим",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hearless16-ej8b.vercel.app",
        "https://hearless16-1.onrender.com",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(subtitles.router)
app.include_router(gestures.router)
app.include_router(alerts.router)
app.include_router(transcribe.router)
app.include_router(sos.router)
app.include_router(study.router)


@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    await websocket.accept()
    
    # Check if a transcription model or API key is available
    from app.services.whisper_service import get_local_whisper
    from app.config import OPENAI_API_KEY
    
    if get_local_whisper() is None and not OPENAI_API_KEY:
        await websocket.send_json({
            "type": "error",
            "message": "No transcription engine configured on backend. Local Whisper is missing and OPENAI_API_KEY is not set."
        })
        await websocket.close()
        return

    session_bytes = b""
    session_chunks = [] # Для M4A файлов с мобильного
    last_transcribed_len = 0
    
    # Режим стриминга (True для потокового WebM с веба, False для независимых M4A с мобильного)
    is_stream = None
    current_full_text = ""

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
                            text = await asyncio.to_thread(transcribe_audio, session_bytes)
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
                    # Если это независимые файлы (M4A на мобильном)
                    session_chunks.append(audio_bytes)
                    from app.services.whisper_service import merge_audio_chunks, detect_audio_format
                    first_ext = detect_audio_format(session_chunks[0])
                    try:
                        merged_bytes = await asyncio.to_thread(merge_audio_chunks, session_chunks, first_ext)
                        if merged_bytes:
                            text = await asyncio.to_thread(transcribe_audio, merged_bytes)
                        else:
                            text = ""
                    except Exception as e:
                        import sys
                        print(f"Error in ws merged transcribe: {e}", file=sys.stderr)
                        text = ""
                    if text:
                        current_full_text = text.strip()
                        await websocket.send_json({
                            "type": "text",
                            "text": current_full_text,
                            "full_text": current_full_text,
                        })

            elif action == "stop":
                if is_stream:
                    if len(session_bytes) > 0:
                        try:
                            text = await asyncio.to_thread(transcribe_audio, session_bytes)
                        except Exception as e:
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



