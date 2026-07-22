from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    language: str = "ru"


class SubtitleRequest(BaseModel):
    # Caps a saved transcript at ~100k chars (many hours of speech) so a
    # malformed/abusive client can't force a multi-MB insert into
    # subtitles_history through an unbounded string field.
    text: str = Field(max_length=100_000)
    language: str = "ru"


class SoundAlertCreate(BaseModel):
    user_id: str
    sound_type: str = Field(max_length=100)


class UserProgressCreate(BaseModel):
    user_id: str
    gesture_id: str
    learned: bool = False
    accuracy: float = 0.0
    attempts: int = 0
    best_accuracy: float = 0.0


class GestureRecognizeRequest(BaseModel):
    # A quality=0.4 downscaled selfie-cam frame is a few hundred KB of base64
    # at most; 4M chars (~3MB decoded) comfortably covers that while still
    # rejecting the unbounded payloads a malicious/broken client could send
    # straight into memory before base64.b64decode ever runs.
    image: str = Field(max_length=4_000_000)
    target_gesture: Optional[str] = Field(default=None, max_length=100)
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


