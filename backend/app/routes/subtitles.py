from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.models import SubtitleRequest
from app.dependencies import get_current_user

router = APIRouter(prefix="/subtitles", tags=["subtitles"])


@router.post("/")
async def save_subtitle(data: SubtitleRequest, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    try:
        response = db.table("subtitles_history").insert({
            "user_id": current_user["id"],
            "text": data.text,
            "language": data.language,
        }).execute()
        return response.data
    except Exception as e:
        msg = str(e)
        if "relation" in msg or "does not exist" in msg or "table" in msg.lower():
            raise HTTPException(status_code=503, detail="Database unavailable: subtitles_history table missing. Run migrations.")
        raise HTTPException(status_code=503, detail=f"Database error: {msg[:120]}")


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

