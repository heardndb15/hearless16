from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.models import SilentSOSCreate, SOSAlertCreate
from app.dependencies import get_current_user

router = APIRouter(prefix="/sos", tags=["sos"])


@router.post("/alert")
async def create_sos_alert(data: SOSAlertCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    response = (
        db.table("sos_events")
        .insert({
            "user_id": current_user["id"],
            "type": "normal",
            "lat": data.lat,
            "lng": data.lng,
            "created_at": data.timestamp,
        })
        .execute()
    )
    return response.data


@router.post("/silent")
async def create_silent_sos(data: SilentSOSCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    response = (
        db.table("sos_events")
        .insert({
            "user_id": current_user["id"],
            "type": "silent",
            "lat": data.lat,
            "lng": data.lng,
            "created_at": data.timestamp,
        })
        .execute()
    )
    return response.data


@router.get("/{user_id}")
async def get_sos_history(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
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
async def resolve_sos(event_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    
    # Verify ownership of the SOS event
    event = db.table("sos_events").select("user_id").eq("id", event_id).execute()
    if not event.data:
        raise HTTPException(status_code=404, detail="SOS событие не найдено")
    if event.data[0]["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    response = (
        db.table("sos_events")
        .update({"resolved_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", event_id)
        .execute()
    )
    return response.data

