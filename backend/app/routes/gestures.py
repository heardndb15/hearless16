import base64
from fastapi import APIRouter, HTTPException
from app.database import get_supabase
from app.models import UserProgressCreate, GestureRecognizeRequest
from app.signflow_model import recognize_gesture

router = APIRouter(prefix="/gestures", tags=["gestures"])


@router.get("/")
async def get_gestures(category: str | None = None):
    db = get_supabase()
    query = db.table("gestures").select("*")
    if category:
        query = query.eq("category", category)
    response = query.execute()
    return response.data


@router.get("/{gesture_id}")
async def get_gesture(gesture_id: str):
    db = get_supabase()
    response = db.table("gestures").select("*").eq("id", gesture_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Жест не найден")
    return response.data[0]


@router.post("/recognize")
async def recognize(data: GestureRecognizeRequest):
    frame = base64.b64decode(data.image)
    result = recognize_gesture(frame, data.target_gesture)
    return result


@router.post("/progress")
async def save_progress(data: UserProgressCreate):
    db = get_supabase()
    response = db.table("user_progress").upsert(data.model_dump()).execute()
    return response.data


@router.get("/progress/{user_id}")
async def get_progress(user_id: str):
    db = get_supabase()
    response = (
        db.table("user_progress")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data
