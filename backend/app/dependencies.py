from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Отсутствует токен авторизации")

    token = credentials.credentials
    db = get_supabase()

    try:
        user_res = db.auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Ошибка авторизации: {str(e)}")

    if not user_res or not getattr(user_res, "user", None):
        raise HTTPException(status_code=401, detail="Неверный или просроченный токен авторизации")

    user = user_res.user

    # Fetch plan from users table
    try:
        result = db.table("users").select("plan").eq("id", user.id).single().execute()
        plan = (result.data or {}).get("plan", "free")
    except Exception:
        plan = "free"

    return {"id": user.id, "email": user.email, "plan": plan}
