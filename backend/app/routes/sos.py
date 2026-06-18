from datetime import datetime, timezone
from fastapi import APIRouter
from app.database import get_supabase
from app.models import SilentSOSCreate, SOSAlertCreate

router = APIRouter(prefix="/sos", tags=["sos"])


@router.post("/alert")
async def create_sos_alert(data: SOSAlertCreate):
    db = get_supabase()
    response = (
        db.table("sos_events")
        .insert({
            "user_id": data.user_id,
            "type": "normal",
            "lat": data.lat,
            "lng": data.lng,
            "created_at": data.timestamp,
        })
        .execute()
    )
    return response.data


@router.post("/silent")
async def create_silent_sos(data: SilentSOSCreate):
    db = get_supabase()
    response = (
        db.table("sos_events")
        .insert({
            "user_id": data.user_id,
            "type": "silent",
            "lat": data.lat,
            "lng": data.lng,
            "created_at": data.timestamp,
        })
        .execute()
    )
    return response.data


@router.get("/{user_id}")
async def get_sos_history(user_id: str):
    db = get_supabase()
    response = (
        db.table("sos_events")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


@router.post("/{event_id}/resolve")
async def resolve_sos(event_id: str):
    db = get_supabase()
    response = (
        db.table("sos_events")
        .update({"resolved_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", event_id)
        .execute()
    )
    return response.data
