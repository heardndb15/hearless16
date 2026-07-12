from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase, fetch_single

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Отсутствует токен авторизации")

    token = credentials.credentials
    db = get_supabase()

    try:
        user_res = db.auth.get_user(token)
    except Exception as e:
        import sys
        print(f"get_current_user auth error: {e}", file=sys.stderr)
        raise HTTPException(status_code=401, detail="Ошибка авторизации. Попробуйте войти заново.")

    if not user_res or not getattr(user_res, "user", None):
        raise HTTPException(status_code=401, detail="Неверный или просроченный токен авторизации")

    user = user_res.user

    # Fetch plan from users table
    row = fetch_single(db.table("users").select("plan").eq("id", user.id).single())
    plan = (row or {}).get("plan", "free")

    return {"id": user.id, "email": user.email, "plan": plan}
