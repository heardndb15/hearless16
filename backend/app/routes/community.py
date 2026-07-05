import uuid
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from pydantic import BaseModel
from app.database import get_supabase, fetch_single
from app.dependencies import get_current_user
from app.limiter import limiter

router = APIRouter(tags=["community"])


# ── Models ────────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    text: str
    image_url: Optional[str] = None


class CommentCreate(BaseModel):
    text: str


# ── Optional auth helper ──────────────────────────────────────────────────────

async def get_optional_user(request: Request) -> Optional[dict]:
    """Returns user dict if valid Bearer token present, else None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        db = get_supabase()
        user_res = db.auth.get_user(token)
        if user_res and getattr(user_res, "user", None):
            return {"id": str(user_res.user.id)}
    except Exception:
        pass
    return None


# ── Helper: format post row from Supabase ────────────────────────────────────

def _format_post(row: dict, liked_post_ids: set, users_map: dict | None = None) -> dict:
    user_id = row["user_id"]
    author = (users_map or {}).get(str(user_id), {})
    return {
        "id": row["id"],
        "text": row["text"],
        "image_url": row.get("image_url"),
        "likes_count": row.get("likes_count", 0),
        "comments_count": row.get("comments_count", 0),
        "liked_by_me": row["id"] in liked_post_ids,
        "created_at": str(row["created_at"]),
        "author": {
            "id": author.get("id", user_id),
            "name": author.get("name", "Пользователь"),
            "avatar_url": None,
        },
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/posts")
async def list_posts(
    sort: Literal["new", "popular"] = "new",
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    db = get_supabase()
    try:
        query = (
            db.table("posts")
            .select("id, text, image_url, likes_count, comments_count, created_at, user_id")
        )
        if sort == "popular":
            query = query.order("likes_count", desc=True).order("created_at", desc=True)
        else:
            query = query.order("created_at", desc=True)
        response = query.range(offset, offset + limit - 1).execute()
        posts = response.data or []
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)}")

    # Fetch author names separately to avoid PostgREST FK join issues
    users_map: dict = {}
    if posts:
        user_ids = list({str(p["user_id"]) for p in posts})
        try:
            users_res = db.table("users").select("id, name").in_("id", user_ids).execute()
            users_map = {str(u["id"]): u for u in (users_res.data or [])}
        except Exception:
            pass

    liked_set: set = set()
    if current_user and posts:
        post_ids = [p["id"] for p in posts]
        try:
            likes_res = (
                db.table("post_likes")
                .select("post_id")
                .eq("user_id", current_user["id"])
                .in_("post_id", post_ids)
                .execute()
            )
            liked_set = {row["post_id"] for row in (likes_res.data or [])}
        except Exception:
            pass

    return [_format_post(p, liked_set, users_map) for p in posts]


@router.post("/posts")
@limiter.limit("20/minute")
async def create_post(request: Request, data: PostCreate, current_user: dict = Depends(get_current_user)):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="Текст поста не может быть пустым")

    user_token = request.headers.get("Authorization", "")[7:]  # strip "Bearer "
    db = get_supabase()

    try:
        # Use user JWT so insert satisfies RLS even if SUPABASE_KEY is anon key
        row = db.postgrest.auth(user_token).from_("posts").insert({
            "user_id": current_user["id"],
            "text": data.text.strip(),
            "image_url": data.image_url,
        }).execute()
    except Exception:
        # Fallback: try with default client (works when SUPABASE_KEY is service role key)
        row = db.table("posts").insert({
            "user_id": current_user["id"],
            "text": data.text.strip(),
            "image_url": data.image_url,
        }).execute()

    if not row.data:
        raise HTTPException(status_code=500, detail="Не удалось создать пост")

    post = row.data[0]
    user_row = fetch_single(db.table("users").select("name").eq("id", current_user["id"]).single())
    author_name = (user_row or {}).get("name", "Пользователь")

    return {
        "id": post["id"],
        "text": post["text"],
        "image_url": post.get("image_url"),
        "likes_count": 0,
        "comments_count": 0,
        "liked_by_me": False,
        "created_at": str(post["created_at"]),
        "author": {"id": current_user["id"], "name": author_name, "avatar_url": None},
    }


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = fetch_single(db.table("posts").select("user_id").eq("id", post_id).single())
    if not existing:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if existing["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужой пост")
    db.table("posts").delete().eq("id", post_id).execute()
    return {"ok": True}


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    user_token = request.headers.get("Authorization", "")[7:]
    db = get_supabase()
    if not fetch_single(db.table("posts").select("id").eq("id", post_id).single()):
        raise HTTPException(status_code=404, detail="Пост не найден")
    authed = db.postgrest.auth(user_token)
    existing = (
        db.table("post_likes")
        .select("user_id")
        .eq("user_id", current_user["id"])
        .eq("post_id", post_id)
        .execute()
    )
    if existing.data:
        try:
            authed.from_("post_likes").delete().eq("user_id", current_user["id"]).eq("post_id", post_id).execute()
        except Exception:
            db.table("post_likes").delete().eq("user_id", current_user["id"]).eq("post_id", post_id).execute()
        liked = False
    else:
        try:
            authed.from_("post_likes").insert({"user_id": current_user["id"], "post_id": post_id}).execute()
            liked = True
        except Exception:
            try:
                db.table("post_likes").insert({"user_id": current_user["id"], "post_id": post_id}).execute()
                liked = True
            except Exception:
                liked = True  # Unique constraint — already liked

    post_row = fetch_single(db.table("posts").select("likes_count").eq("id", post_id).single())
    likes_count = (post_row or {}).get("likes_count", 0)
    return {"liked": liked, "likes_count": likes_count}


@router.get("/posts/{post_id}/comments")
async def list_comments(post_id: str):
    db = get_supabase()
    try:
        response = (
            db.table("post_comments")
            .select("id, text, created_at, user_id")
            .eq("post_id", post_id)
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)}")

    comments = response.data or []

    # Fetch author names separately
    users_map: dict = {}
    if comments:
        user_ids = list({str(c["user_id"]) for c in comments})
        try:
            users_res = db.table("users").select("id, name").in_("id", user_ids).execute()
            users_map = {str(u["id"]): u for u in (users_res.data or [])}
        except Exception:
            pass

    return [
        {
            "id": c["id"],
            "text": c["text"],
            "created_at": str(c["created_at"]),
            "author": {
                "id": users_map.get(str(c["user_id"]), {}).get("id", c["user_id"]),
                "name": users_map.get(str(c["user_id"]), {}).get("name", "Пользователь"),
                "avatar_url": None,
            },
        }
        for c in comments
    ]


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    data: CommentCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="Комментарий не может быть пустым")
    user_token = request.headers.get("Authorization", "")[7:]
    db = get_supabase()
    if not fetch_single(db.table("posts").select("id").eq("id", post_id).single()):
        raise HTTPException(status_code=404, detail="Post not found")
    try:
        row = db.postgrest.auth(user_token).from_("post_comments").insert({
            "post_id": post_id,
            "user_id": current_user["id"],
            "text": data.text.strip(),
        }).execute()
    except Exception:
        row = db.table("post_comments").insert({
            "post_id": post_id,
            "user_id": current_user["id"],
            "text": data.text.strip(),
        }).execute()
    if not row.data:
        raise HTTPException(status_code=500, detail="Не удалось создать комментарий")
    c = row.data[0]
    user_row = fetch_single(db.table("users").select("name").eq("id", current_user["id"]).single())
    author_name = (user_row or {}).get("name", "Пользователь")
    return {
        "id": c["id"],
        "text": c["text"],
        "created_at": str(c["created_at"]),
        "author": {"id": current_user["id"], "name": author_name, "avatar_url": None},
    }


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = fetch_single(db.table("post_comments").select("user_id").eq("id", comment_id).single())
    if not existing:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    if existing["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужой комментарий")
    db.table("post_comments").delete().eq("id", comment_id).execute()
    return {"ok": True}


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=422, detail="Только JPEG, PNG, WebP")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Файл слишком большой. Максимум 5MB")

    from app.config import SUPABASE_URL
    ext = "jpg" if file.content_type == "image/jpeg" else file.content_type.split("/")[1]
    path = f"{current_user['id']}/{uuid.uuid4()}.{ext}"

    db = get_supabase()
    try:
        db.storage.from_("community-media").upload(path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не удалось загрузить файл: {str(e)}")

    image_url = f"{SUPABASE_URL}/storage/v1/object/public/community-media/{path}"
    return {"image_url": image_url}
