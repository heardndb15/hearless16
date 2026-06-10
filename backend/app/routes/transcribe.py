from fastapi import APIRouter, HTTPException, UploadFile, File
from openai import OpenAI
from app.config import OPENAI_API_KEY

router = APIRouter(prefix="/transcribe", tags=["transcribe"])
client = OpenAI(api_key=OPENAI_API_KEY)


@router.post("/")
async def transcribe_audio(file: UploadFile = File(...)):
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500, detail="API ключ OpenAI не настроен"
        )

    contents = await file.read()
    response = client.audio.transcriptions.create(
        model="whisper-1",
        file=(file.filename or "audio.wav", contents),
        language="ru",
    )
    return {"text": response.text}
