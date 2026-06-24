import uuid
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from app.database import get_supabase
from app.dependencies import get_current_user

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

def _format_post(row: dict, liked_post_ids: set) -> dict:
    author = row.get("users") or {}
    if isinstance(author, list):
        author = author[0] if author else {}
    return {
        "id": row["id"],
        "text": row["text"],
        "image_url": row.get("image_url"),
        "likes_count": row.get("likes_count", 0),
        "comments_count": row.get("comments_count", 0),
        "liked_by_me": row["id"] in liked_post_ids,
        "created_at": str(row["created_at"]),
        "author": {
            "id": author.get("id", row["user_id"]),
            "name": author.get("name", "Пользователь"),
            "avatar_url": None,
        },
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/posts")
async def list_posts(
    sort: Literal["new", "popular"] = "new",
    limit: int = 20,
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    db = get_supabase()
    order_col = "created_at" if sort == "new" else "likes_count"

    response = (
        db.table("posts")
        .select("id, text, image_url, likes_count, comments_count, created_at, user_id, users(id, name)")
        .order(order_col, desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    posts = response.data or []

    liked_set: set = set()
    if current_user and posts:
        post_ids = [p["id"] for p in posts]
        likes_res = (
            db.table("post_likes")
            .select("post_id")
            .eq("user_id", current_user["id"])
            .in_("post_id", post_ids)
            .execute()
        )
        liked_set = {l["post_id"] for l in (likes_res.data or [])}

    return [_format_post(p, liked_set) for p in posts]


@router.post("/posts")
async def create_post(data: PostCreate, current_user: dict = Depends(get_current_user)):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="Текст поста не может быть пустым")
    db = get_supabase()
    row = db.table("posts").insert({
        "user_id": current_user["id"],
        "text": data.text.strip(),
        "image_url": data.image_url,
    }).execute()
    if not row.data:
        raise HTTPException(status_code=500, detail="Не удалось создать пост")

    post = row.data[0]
    user_res = db.table("users").select("name").eq("id", current_user["id"]).single().execute()
    author_name = (user_res.data or {}).get("name", "Пользователь")

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
    existing = db.table("posts").select("user_id").eq("id", post_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if existing.data["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужой пост")
    db.table("posts").delete().eq("id", post_id).execute()
    return {"ok": True}


@router.post("/posts/{post_id}/like")
async def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = (
        db.table("post_likes")
        .select("user_id")
        .eq("user_id", current_user["id"])
        .eq("post_id", post_id)
        .execute()
    )
    if existing.data:
        db.table("post_likes").delete().eq("user_id", current_user["id"]).eq("post_id", post_id).execute()
        liked = False
    else:
        try:
            db.table("post_likes").insert({"user_id": current_user["id"], "post_id": post_id}).execute()
            liked = True
        except Exception:
            # Unique constraint violation — already liked by concurrent request
            liked = True

    post_res = db.table("posts").select("likes_count").eq("id", post_id).single().execute()
    likes_count = (post_res.data or {}).get("likes_count", 0)
    return {"liked": liked, "likes_count": likes_count}


@router.get("/posts/{post_id}/comments")
async def list_comments(post_id: str):
    db = get_supabase()
    response = (
        db.table("post_comments")
        .select("id, text, created_at, user_id, users(id, name)")
        .eq("post_id", post_id)
        .order("created_at", desc=False)
        .execute()
    )
    result = []
    for c in (response.data or []):
        author = c.get("users") or {}
        if isinstance(author, list):
            author = author[0] if author else {}
        result.append({
            "id": c["id"],
            "text": c["text"],
            "created_at": str(c["created_at"]),
            "author": {
                "id": author.get("id", c["user_id"]),
                "name": author.get("name", "Пользователь"),
                "avatar_url": None,
            },
        })
    return result


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    data: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    if not data.text.strip():
        raise HTTPException(status_code=422, detail="Комментарий не может быть пустым")
    db = get_supabase()
    row = db.table("post_comments").insert({
        "post_id": post_id,
        "user_id": current_user["id"],
        "text": data.text.strip(),
    }).execute()
    if not row.data:
        raise HTTPException(status_code=500, detail="Не удалось создать комментарий")
    c = row.data[0]
    user_res = db.table("users").select("name").eq("id", current_user["id"]).single().execute()
    author_name = (user_res.data or {}).get("name", "Пользователь")
    return {
        "id": c["id"],
        "text": c["text"],
        "created_at": str(c["created_at"]),
        "author": {"id": current_user["id"], "name": author_name, "avatar_url": None},
    }


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    db = get_supabase()
    existing = db.table("post_comments").select("user_id").eq("id", comment_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    if existing.data["user_id"] != current_user["id"]:
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
