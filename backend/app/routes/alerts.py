from fastapi import APIRouter
from app.database import get_supabase
from app.models import SoundAlertCreate

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/")
async def create_alert(data: SoundAlertCreate):
    db = get_supabase()
    response = db.table("sound_alerts").insert(data.model_dump()).execute()
    return response.data


@router.get("/{user_id}")
async def get_alerts(user_id: str):
    db = get_supabase()
    response = (
        db.table("sound_alerts")
        .select("*")
        .eq("user_id", user_id)
        .order("detected_at", desc=True)
        .execute()
    )
    return response.data
