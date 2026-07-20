# Profile Perks: Username, Join Date, Plan Badge, Activity Stats — Hearless

**Date:** 2026-07-20
**Scope:** Web dashboard profile page (`landing/app/dashboard/profile/page.tsx`) only. Mobile app and Community are not touched.

## Problem

The profile page currently shows only avatar/name/bio/language/email and (as of the prior feature) a plan card. There's no username/handle, no visible join date, no plan indicator alongside identity, and no sense of the account's activity. The user asked for all four in one go.

## Solution

Add a new "profile summary" card at the top of `/dashboard/profile`, above the existing plan card, plus an editable username field in the settings form.

### 1. Username (`username` column, new)

**Database** (`backend/app/migrate.py`, appended to `_MIGRATIONS`, following the file's existing idempotent-block conventions):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE
```
```sql
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT username_format
    CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$
```
- Nullable (existing accounts have no username until they set one; Postgres `UNIQUE` allows multiple `NULL`s, so this doesn't collide).
- Format enforced at the DB level as a defense-in-depth backstop; the frontend enforces the same rule before ever sending a request.
- The existing `users` RLS policy `"Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id)` already covers writing this column — no new policy needed.

**Frontend — display:** under the name in the new summary card, `@{username}` in a muted/secondary color, or (if `username` is null) a small "Добавить username" text button that focuses the edit field below.

**Frontend — edit:** a new "Username" field in the existing settings form (`landing/app/dashboard/profile/page.tsx`), directly below the "Ваше имя" field, with:
- Input normalized to lowercase as the user types (`.toLowerCase()`), max length 20.
- Client-side format validation before save: `/^[a-z0-9_]{3,20}$/`. If the field is non-empty and fails, show an inline error and don't call Supabase.
- Empty field is allowed (clears/keeps username null) — this is not a required field.
- On save, `handleSave`'s existing `supabase.from("users").update(...)` call includes `username: username || null`. Supabase/Postgres returns a unique-violation error (`error.code === "23505"`) when the username is taken; catch that specific code and show "Username уже занят, выберите другой" instead of the generic error message. Any other error keeps the existing generic "Ошибка сохранения: " + message behavior.

### 2. Join date ("С нами с ...")

`created_at` already exists on `users` and is already returned by any `select("*")`-style read; add it to the existing narrower `.select(...)` call. Format with the same `toLocaleDateString("ru-RU", ...)` approach already used for `plan_expires_at`, but coarser — month + year only (`{ month: "long", year: "numeric" }`), e.g. "С нами с июля 2026". Displayed as a small muted line in the new summary card.

### 3. Plan badge

Reuses the `plan` state that already exists on this page (added for the plan card feature). A small pill next to the name in the summary card:
- `free` → gray/neutral pill, text "Free"
- `basic` → accent-blue pill, text "Basic"
- `pro` → a distinct color (purple, matching `PaywallScreen.tsx`'s Pro card color `#7B1FA2`, for cross-platform consistency), text "Pro"

### 4. Activity stats

Two counts, fetched with Supabase's `head: true, count: "exact"` (count-only, no rows returned, so this is cheap):
```ts
const { count: gesturesLearned } = await supabase
  .from("user_progress")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId)
  .eq("learned", true);

const { count: subtitlesSaved } = await supabase
  .from("subtitles_history")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId);
```
Both tables already have RLS allowing a user to read their own rows (`user_progress`: `backend/supabase/migration.sql`; `subtitles_history`: `backend/app/migrate.py`), so this works with the existing anon-key browser client already used throughout this page — no new backend endpoint.

Displayed as two small stat tiles side by side in the summary card: "Выучено жестов: N" and "Субтитров сохранено: N". `null`/undefined count (query error) displays as `0`, not a crash — this is decorative, not critical data.

## Layout

New card order on `/dashboard/profile`, all using the existing `glass-card rounded-2xl p-6 md:p-8` treatment for visual consistency with the plan card added earlier:

1. **Profile summary card (new):** avatar thumbnail + name + plan badge (row), `@username` or "Добавить username" (line), "С нами с ..." (line), stats row (2 tiles) at the bottom.
2. **Plan card (existing, unchanged).**
3. **Settings form (existing, unchanged except: new Username field added between Name and Bio).**

## Edge cases

- `username` unset (`null`): summary card shows "Добавить username" instead of `@null`; settings form's username input starts empty.
- Save with a username already taken by someone else: Postgres unique-violation (`23505`) → specific inline error message, form stays editable, other fields (name/bio/language) are NOT rolled back from the failed save (matches existing behavior: today's `handleSave` already sends every field in one `update()` call, so this is not a new failure mode, just a new possible error code from the same call).
- Stats queries fail (network/RLS misconfig): treat as `0`, don't block the rest of the page from rendering (the page's `loading` gate already covers the initial profile fetch; these two count queries are decorative and load asynchronously into their own local state without blocking anything else).
- User has zero gestures learned / zero subtitles saved: tiles show "0", not hidden — this is expected early-account state, not an error.

## Out of scope

- Community posts/comments still show `name` only — not switched to `@username`. Separate feature if wanted later.
- No username-based profile lookup/routing (e.g. `hearless.live/@nurdana`) — display only.
- No mobile app changes — this is the web dashboard only, matching how the plan card and glass-card features were also web-only.
- No retroactive backfill/prompt forcing existing users to pick a username — it's optional, discoverable via the summary card and settings form.
