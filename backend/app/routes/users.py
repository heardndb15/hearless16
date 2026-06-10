from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models import UserCreate

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/")
async def create_user(data: UserCreate):
    response = supabase.table("users").insert(data.model_dump()).execute()
    return response.data


@router.get("/{user_id}")
async def get_user(user_id: str):
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return response.data[0]


@router.put("/{user_id}")
async def update_user(user_id: str, data: UserCreate):
    response = (
        supabase.table("users")
        .update(data.model_dump())
        .eq("id", user_id)
        .execute()
    )
    return response.data
