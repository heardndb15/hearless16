import asyncio
import base64
from fastapi import APIRouter, HTTPException, Depends, Request
from app.database import get_supabase
from app.models import UserProgressCreate, GestureRecognizeRequest
from app.signflow_model import recognize_gesture
from app.dependencies import get_current_user
from app.limiter import limiter

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
@limiter.limit("60/minute")
async def recognize(request: Request, data: GestureRecognizeRequest):
    try:
        frame = base64.b64decode(data.image, validate=False)
        # recognize_gesture is a synchronous, CPU-bound MediaPipe call (and can
        # block on a model download on first use). Running it inline on the
        # event loop would stall every other request on this worker — notably
        # the /ws/transcribe subtitles socket — for as long as it takes, since
        # Render's free tier runs a single worker/event loop.
        result = await asyncio.to_thread(recognize_gesture, frame, data.target_gesture)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import sys
        print(f"recognize error: {e}", file=sys.stderr)
        return {"gesture": None, "confidence": 0, "components": {"hand_shape": 0, "position": 0, "movement": 0}, "landmarks": None, "error": "processing_error"}


@router.post("/progress")
async def save_progress(data: UserProgressCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    payload = data.model_dump()
    payload["user_id"] = current_user["id"]
    response = db.table("user_progress").upsert(payload).execute()
    return response.data


@router.get("/progress/{user_id}")
async def get_progress(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    db = get_supabase()
    response = (
        db.table("user_progress")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data

