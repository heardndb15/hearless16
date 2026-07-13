from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import get_supabase, fetch_single, run_query
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
    response = await run_query(db.table("users").insert(payload))
    return response.data


@router.patch("/me/username")
async def update_username(data: UsernameUpdate, current_user: dict = Depends(get_current_user)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Имя не может быть пустым")
    if len(name) > 32:
        raise HTTPException(status_code=422, detail="Имя не может быть длиннее 32 символов")
    db = get_supabase()
    existing = await run_query(db.table("users").select("id").eq("id", current_user["id"]))
    if existing.data:
        await run_query(db.table("users").update({"name": name}).eq("id", current_user["id"]))
    else:
        await run_query(db.table("users").insert({"id": current_user["id"], "name": name, "language": "ru"}))
    return {"name": name}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    row = await fetch_single(
        db.table("users").select("name, bio, avatar_url, plan, plan_expires_at").eq("id", current_user["id"]).single()
    ) or {}
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
        "bio": row.get("bio", ""),
        "avatar_url": row.get("avatar_url", ""),
        "plan": plan,
        "plan_expires_at": expires,
    }


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    db = get_supabase()
    response = await run_query(db.table("users").select("*").eq("id", user_id))
    if not response.data:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return response.data[0]


@router.put("/{user_id}")
async def update_user(user_id: str, data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    db = get_supabase()
    response = await run_query(
        db.table("users")
        .update(data.model_dump())
        .eq("id", user_id)
    )
    return response.data

