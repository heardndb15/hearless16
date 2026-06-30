from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase
from app.models import UserCreate
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


class UsernameUpdate(BaseModel):
    name: str


@router.post("/")
async def create_user(data: UserCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    payload = data.model_dump()
    payload["id"] = current_user["id"]
    response = db.table("users").insert(payload).execute()
    return response.data


@router.patch("/me/username")
async def update_username(data: UsernameUpdate, current_user: dict = Depends(get_current_user)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Имя не может быть пустым")
    if len(name) > 32:
        raise HTTPException(status_code=422, detail="Имя не может быть длиннее 32 символов")
    db = get_supabase()
    existing = db.table("users").select("id").eq("id", current_user["id"]).execute()
    if existing.data:
        db.table("users").update({"name": name}).eq("id", current_user["id"]).execute()
    else:
        db.table("users").insert({"id": current_user["id"], "name": name, "language": "ru"}).execute()
    return {"name": name}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("users").select("name, plan, plan_expires_at").eq("id", current_user["id"]).single().execute()

    row = result.data or {}
    plan = row.get("plan", "free")
    expires = row.get("plan_expires_at")

    # Downgrade if subscription expired
    if expires:
        try:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                plan = "free"
        except Exception:
            pass

    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": row.get("name", ""),
        "plan": plan,
        "plan_expires_at": expires,
    }


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    db = get_supabase()
    response = db.table("users").select("*").eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return response.data[0]


@router.put("/{user_id}")
async def update_user(user_id: str, data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    db = get_supabase()
    response = (
        db.table("users")
        .update(data.model_dump())
        .eq("id", user_id)
        .execute()
    )
    return response.data

