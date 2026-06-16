from fastapi import APIRouter
from app.database import get_supabase
from app.models import SubtitleRequest

router = APIRouter(prefix="/subtitles", tags=["subtitles"])


@router.post("/")
async def save_subtitle(data: SubtitleRequest):
    db = get_supabase()
    response = db.table("subtitles_history").insert(data.model_dump()).execute()
    return response.data


@router.get("/{user_id}")
async def get_history(user_id: str):
    db = get_supabase()
    response = (
        db.table("subtitles_history")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data
