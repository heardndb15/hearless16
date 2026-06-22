from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.models import SubtitleRequest
from app.dependencies import get_current_user

router = APIRouter(prefix="/subtitles", tags=["subtitles"])


@router.post("/")
async def save_subtitle(data: SubtitleRequest, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    payload = data.model_dump()
    payload["user_id"] = current_user["id"]
    response = db.table("subtitles_history").insert(payload).execute()
    return response.data


@router.get("/{user_id}")
async def get_history(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    db = get_supabase()
    response = (
        db.table("subtitles_history")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data

