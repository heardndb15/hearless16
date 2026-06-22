from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase
from app.models import UserCreate
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/")
async def create_user(data: UserCreate, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    payload = data.model_dump()
    payload["id"] = current_user["id"]
    response = db.table("users").insert(payload).execute()
    return response.data


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

