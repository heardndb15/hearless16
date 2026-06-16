import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routes import users, subtitles, gestures, alerts, transcribe, sos
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


@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    await websocket.accept()
    import numpy as np
    from app.services.whisper_service import audio_bytes_to_float, floats_to_wav_bytes

    session_floats = np.array([], dtype=np.float32)
    transcribed_len = 0

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            action = data.get("action")

            if action == "chunk":
                audio_b64 = data.get("audio", "")
                import base64
                audio_bytes = base64.b64decode(audio_b64)
                chunk_floats = audio_bytes_to_float(audio_bytes)
                if len(chunk_floats) > 0:
                    session_floats = np.concatenate([session_floats, chunk_floats])

                if len(session_floats) - transcribed_len >= 16000:
                    wav_bytes = floats_to_wav_bytes(session_floats)
                    text = await asyncio.to_thread(transcribe_audio, wav_bytes)
                    if text:
                        await websocket.send_json({
                            "type": "text",
                            "text": text.strip(),
                            "full_text": text.strip(),
                        })
                    transcribed_len = len(session_floats)

            elif action == "stop":
                if len(session_floats) > 0:
                    wav_bytes = floats_to_wav_bytes(session_floats)
                    text = await asyncio.to_thread(transcribe_audio, wav_bytes)
                    if text:
                        await websocket.send_json({
                            "type": "final",
                            "text": text.strip(),
                            "full_text": text.strip(),
                        })
                    else:
                        await websocket.send_json({
                            "type": "final",
                            "text": "",
                            "full_text": "",
                        })
                else:
                    await websocket.send_json({
                        "type": "final",
                        "text": "",
                        "full_text": "",
                    })
                break

    except WebSocketDisconnect:
        pass


@app.get("/health")
async def health():
    return {"status": "ok"}
