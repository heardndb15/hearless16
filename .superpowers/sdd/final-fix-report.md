# Final Fix Report — Critical/Important Code Review Issues

## Changes Applied

### `mobile/src/screens/CommunityFeedScreen.tsx`
- **Fix 1 (Critical):** Added `if (!name || !name.trim()) return "??"` guard at the top of `initials()` to prevent crash on empty or whitespace-only names.
- **Fix 3 (Critical):** Added `useFocusEffect` import from `@react-navigation/native`. Added a `useFocusEffect` hook that clears posts and re-fetches when the screen regains focus (e.g., after returning from CreatePostScreen). Replaced the original `useEffect([sort, token])` with a `isFirstRender` ref pattern so sort changes still trigger a re-fetch but the initial mount is handled exclusively by `useFocusEffect`, preventing double-fetch.

### `mobile/src/screens/PostDetailScreen.tsx`
- **Fix 1 (Critical):** Added `if (!name || !name.trim()) return "??"` guard at the top of `initials()`.

### `backend/app/routes/community.py`
- **Fix 2 (Critical):** Replaced single `.order(order_col, desc=True)` call with conditional logic: popular sort chains `.order("likes_count", desc=True).order("created_at", desc=True)`; new sort uses `.order("created_at", desc=True)` only. This ensures stable ordering for posts with equal like counts.
- **Fix 4 (Important):** Added `Query` to FastAPI imports. Changed `limit` and `offset` params in `list_posts` to use `Query(default=20, ge=1, le=100)` and `Query(default=0, ge=0)` respectively, preventing unbounded queries.
- **Fix 5 (Important):** Added post existence check in `create_comment` before inserting: `db.table("posts").select("id").eq("id", post_id).single().execute()` — raises HTTP 404 if post not found instead of letting Supabase return a raw 500.
- **Fix 6 (Important):** Renamed loop variable `l` to `row` in the liked set comprehension (`liked_set = {row["post_id"] for row in ...}`).

## TypeScript Check
`npx tsc --noEmit` completed with no output (zero errors, zero warnings).
