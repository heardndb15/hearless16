from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    language: str = "ru"


class SubtitleRequest(BaseModel):
    text: str
    language: str = "ru"


class SoundAlertCreate(BaseModel):
    user_id: str
    sound_type: str


class UserProgressCreate(BaseModel):
    user_id: str
    gesture_id: str
    learned: bool = False
    accuracy: float = 0.0
    attempts: int = 0
    best_accuracy: float = 0.0


class GestureRecognizeRequest(BaseModel):
    image: str
    target_gesture: Optional[str] = None
    language: Literal["kz", "ru"] = "kz"


class TranscriptionRequest(BaseModel):
    language: str = "ru"
    audio_data: Optional[str] = None


class LectureSaveRequest(BaseModel):
    user_id: str
    title: str
    transcript: str
    summary: Optional[str] = None
    highlights: Optional[dict] = None


class LectureAnalyzeRequest(BaseModel):
    transcript: str


class MessageItem(BaseModel):
    role: str
    content: str


class LectureChatRequest(BaseModel):
    transcript: str
    message: str
    history: Optional[List[MessageItem]] = []


