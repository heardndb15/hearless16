from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    language: str = "ru"


class SubtitleRequest(BaseModel):
    user_id: str
    text: str


class SoundAlertCreate(BaseModel):
    user_id: str
    sound_type: str


class UserProgressCreate(BaseModel):
    user_id: str
    gesture_id: str
    learned: bool = False
    accuracy: float = 0.0


class TranscriptionRequest(BaseModel):
    language: str = "ru"
    audio_data: Optional[str] = None
