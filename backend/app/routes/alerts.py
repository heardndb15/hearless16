from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.models import SoundAlertCreate
from app.dependencies import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/")
async def create_alert(data: SoundAlertCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    payload = data.model_dump()
    payload["user_id"] = current_user["id"]
    response = db.table("sound_alerts").insert(payload).execute()
    return response.data


@router.get("/{user_id}")
async def get_alerts(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    db = get_supabase()
    response = (
        db.table("sound_alerts")
        .select("*")
        .eq("user_id", user_id)
        .order("detected_at", desc=True)
        .execute()
    )
    return response.data

