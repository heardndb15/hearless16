from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY

_client: Client | None = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError(
                "SUPABASE_URL и SUPABASE_KEY должны быть заданы в переменных окружения"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


def fetch_single(query) -> dict | None:
    """Execute a `.single()`-terminated PostgREST query, returning the row
    dict or None when no row matches. `.single()` sets an Accept header that
    makes PostgREST (and supabase-py) raise instead of returning empty data
    when 0 rows match, unlike every other query shape in this codebase."""
    try:
        return query.execute().data
    except Exception:
        return None
