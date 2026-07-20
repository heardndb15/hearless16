# Profile Perks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a username handle, join date, plan badge, and activity stats to the web dashboard profile page (`/dashboard/profile`), plus a database column and editable field for the username.

**Architecture:** One backend migration task (adds the `username` column) followed by two frontend tasks against the same file, `landing/app/dashboard/profile/page.tsx` — first the read-only summary card (badge, join date, stats, username display), then the username edit field and its save-path validation, since the edit path has a genuinely different risk profile (write validation, uniqueness conflict handling) from the read-only display work.

**Tech Stack:** FastAPI + psycopg2 migration runner (backend), Next.js 14 client component + Supabase JS client (landing). No test framework in either — verification is `python -m py_compile` / `npx tsc --noEmit` plus manual checks, matching this repo's existing pattern (see `docs/superpowers/plans/2026-07-20-profile-plan-card.md`).

## Global Constraints

- Username format: exactly `^[a-z0-9_]{3,20}$`, enforced both client-side (before save) and at the DB level (CHECK constraint) — same regex in both places, verbatim.
- `username` column is nullable; Postgres `UNIQUE` permits multiple `NULL`s, so this is not a migration blocker for existing rows.
- Reuse the existing `plan` state and `PLAN_NAMES` map already in `landing/app/dashboard/profile/page.tsx` — do not redeclare them.
- New card uses the same `glass-card rounded-2xl p-6 md:p-8` treatment as the two existing cards on this page (plan card, settings card), for visual consistency.
- `backend/app/migrate.py`'s `_MIGRATIONS` list runs every block on every backend startup; each block is independently try/excepted by the runner (see `run_migrations()` at the bottom of that file), so idempotent SQL (`ADD COLUMN IF NOT EXISTS`) needs no extra wrapping, but non-idempotent SQL (`ADD CONSTRAINT`) must use the file's existing `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` pattern (see the `CREATE POLICY` blocks in the same file for the exact form).
- Spec: `docs/superpowers/specs/2026-07-20-profile-perks-design.md`.

---

### Task 1: Database migration — add `username` column

**Files:**
- Modify: `backend/app/migrate.py`

**Interfaces:**
- Produces: a nullable, unique `users.username TEXT` column with a `username_format` CHECK constraint (`username IS NULL OR username ~ '^[a-z0-9_]{3,20}$'`), which Tasks 2 and 3 read/write via the existing Supabase browser client.

- [ ] **Step 1: Add the migration blocks**

In `backend/app/migrate.py`, find this existing block (it's the most recently added column, right after `plan`/`plan_expires_at`/`polar_customer_id`):

```python
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio TEXT
    """,
```

Add two new blocks immediately after it (still inside the `_MIGRATIONS` list):

```python
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio TEXT
    """,
    """
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username TEXT UNIQUE
    """,
    """DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT username_format
        CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd backend && python -m py_compile app/migrate.py` (on Windows, use `py -3 -m py_compile app/migrate.py` if `python` isn't on PATH)
Expected: no output, exit code 0.

- [ ] **Step 3: Sanity-check the SQL by eye against the file's existing conventions**

Read `backend/app/migrate.py` once more after editing and confirm:
- The two new blocks are plain triple-quoted strings inside the `_MIGRATIONS` list (a Python list of strings), not accidentally nested or missing a trailing comma.
- The `DO $$ ... END $$` block matches the exact structure of the existing `CREATE POLICY` blocks elsewhere in the same file (e.g. `"""DO $$ BEGIN CREATE POLICY ... EXCEPTION WHEN duplicate_object THEN NULL; END $$"""`) — same opening/closing, same exception clause.

There is no local database to run this against (`DATABASE_URL` is a Render/Supabase production connection string, not available in this environment) — the migration actually applies the next time the backend process starts (`run_migrations()` runs in `backend/app/main.py`'s FastAPI `lifespan`). Note this in your report: the column will exist in production only after the next backend deploy, not immediately after this commit.

- [ ] **Step 4: Commit**

```bash
git add backend/app/migrate.py
git commit -m "$(cat <<'EOF'
feat(backend): add username column to users table

Nullable, unique, with a username_format CHECK constraint
(^[a-z0-9_]{3,20}$) enforced at the DB level as a backstop to the
same client-side validation the profile page performs before save.
EOF
)"
```

---

### Task 2: Profile summary card — badge, join date, stats, username display

**Depends on:** Task 1 (reads the `username` and `created_at` columns; `created_at` already existed, `username` is new from Task 1). Note: PostgREST errors the *entire* select when a requested column doesn't exist yet — it doesn't return `null` for just that field — so if landing's deploy lands before Task 1's migration has actually run in production, a combined select would blank the whole profile. That's why the fetch is split into two independent queries (see the final review fix on `page.tsx`), keeping the core profile fields safe regardless of migration timing.

**Files:**
- Modify: `landing/app/dashboard/profile/page.tsx`

**Interfaces:**
- Consumes: existing `plan`, `PLAN_NAMES`, `avatarPreview`, `name` state already in the file (added by the earlier plan-card task); existing `supabase.from("users").select(...)` call in the `onAuthStateChange` handler.
- Produces: `username: string | null` state, `usernameInputRef: React.RefObject<HTMLInputElement>` (a ref Task 3 attaches to the username `<input>` it creates — this task only creates the ref and a button that calls `.focus()` on it), `formatJoinDate(iso: string): string` helper, `PLAN_BADGE_STYLES: Record<"free"|"basic"|"pro", string>` map.

- [ ] **Step 1: Add new state and the join-date formatter**

In `landing/app/dashboard/profile/page.tsx`, find the existing formatter (currently right after `PLAN_NAMES`):

```tsx
function formatPlanExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
```

Add a second formatter and a plan-badge style map right after it:

```tsx
function formatPlanExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

const PLAN_BADGE_STYLES: Record<"free" | "basic" | "pro", string> = {
  free: "bg-white/10 text-[#9AA5BD]",
  basic: "bg-accent/20 text-accent",
  pro: "bg-[#7B1FA2]/20 text-[#C084FC]",
};
```

Find the existing state block (currently):

```tsx
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState<"kk" | "ru">("ru");
  const [plan, setPlan] = useState<"free" | "basic" | "pro">("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");
```

Replace it with (adds `username`, `createdAt`, the two stats counters, and the ref):

```tsx
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState<"kk" | "ru">("ru");
  const [plan, setPlan] = useState<"free" | "basic" | "pro">("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [gesturesLearned, setGesturesLearned] = useState(0);
  const [subtitlesSaved, setSubtitlesSaved] = useState(0);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");
```

- [ ] **Step 2: Extend the profile fetch and add the two stats count queries**

Find the `onAuthStateChange` handler's body (currently):

```tsx
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("users")
          .select("name, bio, avatar_url, language, plan, plan_expires_at")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setName(profile.name || "");
              setBio(profile.bio || "");
              setAvatarUrl(profile.avatar_url || "");
              setAvatarPreview(profile.avatar_url || "");
              setLanguage((profile.language as "kk" | "ru") || "ru");
              setPlan((profile.plan as "free" | "basic" | "pro") || "free");
              setPlanExpiresAt(profile.plan_expires_at || null);
            }
            setLoading(false);
          });
        return;
      }
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });
```

Replace it with (extends the `select`, sets the two new fields, and fires the two independent count queries):

```tsx
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        const userId = session.user.id;
        supabase
          .from("users")
          .select("name, bio, avatar_url, language, plan, plan_expires_at, username, created_at")
          .eq("id", userId)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setName(profile.name || "");
              setBio(profile.bio || "");
              setAvatarUrl(profile.avatar_url || "");
              setAvatarPreview(profile.avatar_url || "");
              setLanguage((profile.language as "kk" | "ru") || "ru");
              setPlan((profile.plan as "free" | "basic" | "pro") || "free");
              setPlanExpiresAt(profile.plan_expires_at || null);
              setUsername(profile.username || null);
              setCreatedAt(profile.created_at || null);
            }
            setLoading(false);
          });
        supabase
          .from("user_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("learned", true)
          .then(({ count }) => setGesturesLearned(count || 0));
        supabase
          .from("subtitles_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .then(({ count }) => setSubtitlesSaved(count || 0));
        return;
      }
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });
```

- [ ] **Step 3: Render the profile summary card**

Find the render return block (currently):

```tsx
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-[#F5F5F7]">Настройки профиля</h2>
        <p className="text-[#9AA5BD] text-sm max-w-2xl font-medium">
          Управляйте своей учетной записью, языковыми предпочтениями и параметрами приватности.
        </p>
      </div>

      <div className="max-w-xl glass-card rounded-2xl p-6 md:p-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#9AA5BD] uppercase tracking-wider mb-1">Текущий тариф</p>
```

Insert the new summary card between the header block and the plan card:

```tsx
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-[#F5F5F7]">Настройки профиля</h2>
        <p className="text-[#9AA5BD] text-sm max-w-2xl font-medium">
          Управляйте своей учетной записью, языковыми предпочтениями и параметрами приватности.
        </p>
      </div>

      <div className="max-w-xl glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shrink-0 bg-white/10 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#9AA5BD] text-2xl font-bold font-syne">{name?.[0]?.toUpperCase() || "?"}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-syne font-extrabold text-xl text-[#F5F5F7] truncate">{name || "Пользователь"}</p>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-syne ${PLAN_BADGE_STYLES[plan]}`}>
                {PLAN_NAMES[plan]}
              </span>
            </div>
            {username ? (
              <p className="text-sm text-[#9AA5BD] font-medium mt-0.5">@{username}</p>
            ) : (
              <button
                type="button"
                onClick={() => usernameInputRef.current?.focus()}
                className="text-sm text-accent font-medium mt-0.5 hover:underline"
              >
                Добавить username
              </button>
            )}
            {createdAt && (
              <p className="text-xs text-[#9AA5BD] mt-0.5">С нами с {formatJoinDate(createdAt)}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <p className="font-syne font-extrabold text-xl text-[#F5F5F7]">{gesturesLearned}</p>
            <p className="text-xs text-[#9AA5BD] font-medium mt-0.5">Жестов выучено</p>
          </div>
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <p className="font-syne font-extrabold text-xl text-[#F5F5F7]">{subtitlesSaved}</p>
            <p className="text-xs text-[#9AA5BD] font-medium mt-0.5">Субтитров сохранено</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl glass-card rounded-2xl p-6 md:p-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#9AA5BD] uppercase tracking-wider mb-1">Текущий тариф</p>
```

- [ ] **Step 4: Type-check**

Run: `cd landing && npx tsc --noEmit`
Expected: no errors. (`usernameInputRef` will be unused by anything except its own `.focus()` call until Task 3 attaches it to an input — an unused ref passed only to itself is not a TypeScript error, so this compiles standalone.)

- [ ] **Step 5: Commit**

```bash
git add landing/app/dashboard/profile/page.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add profile summary card (badge, join date, stats)

Adds a card above the plan card on /dashboard/profile showing the
account's plan badge, join date, activity stats (gestures learned,
subtitles saved), and username (or a prompt to add one, wired to
Task 3's username input via a ref).
EOF
)"
```

---

### Task 3: Username edit field with validation and save handling

**Depends on:** Task 2 (uses the `username`/`setUsername` state and `usernameInputRef` it created).

**Files:**
- Modify: `landing/app/dashboard/profile/page.tsx`

**Interfaces:**
- Consumes: `username: string | null` / `setUsername` and `usernameInputRef` from Task 2; existing `handleSave` function and its `message`/`setMessage` state.
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Add save-time validation and uniqueness error handling**

Find the existing `handleSave` function (currently):

```tsx
  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ name, bio, language, avatar_url: avatarUrl })
      .eq("id", user.id);

    if (error) {
      setMessage("Ошибка сохранения: " + error.message);
    } else {
      setMessage("Настройки успешно сохранены!");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }
```

Replace it with:

```tsx
  async function handleSave() {
    if (!user) return;
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      setMessage("Username должен содержать 3-20 символов: латиница, цифры, нижнее подчёркивание");
      return;
    }
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ name, bio, language, avatar_url: avatarUrl, username: username || null })
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505") {
        setMessage("Username уже занят, выберите другой");
      } else {
        setMessage("Ошибка сохранения: " + error.message);
      }
    } else {
      setMessage("Настройки успешно сохранены!");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }
```

- [ ] **Step 2: Add the Username field to the settings form**

Find the Name field block (currently):

```tsx
        {/* Name */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-[#9AA5BD] uppercase tracking-wider">
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            className="w-full px-4 py-3 rounded-xl bg-[#12182A]/60 border border-white/10 focus:border-accent text-[#F5F5F7] text-sm font-semibold outline-none transition-colors"
            placeholder="Введите ваше имя"
          />
        </div>

        {/* Bio */}
```

Insert the new field between Name and Bio:

```tsx
        {/* Name */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-[#9AA5BD] uppercase tracking-wider">
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            className="w-full px-4 py-3 rounded-xl bg-[#12182A]/60 border border-white/10 focus:border-accent text-[#F5F5F7] text-sm font-semibold outline-none transition-colors"
            placeholder="Введите ваше имя"
          />
        </div>

        {/* Username */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-[#9AA5BD] uppercase tracking-wider">
            Username
          </label>
          <input
            ref={usernameInputRef}
            type="text"
            value={username || ""}
            onChange={(e) => setUsername(e.target.value.toLowerCase() || null)}
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-[#12182A]/60 border border-white/10 focus:border-accent text-[#F5F5F7] text-sm font-semibold outline-none transition-colors"
            placeholder="ваш_username"
          />
          <p className="text-xs text-[#9AA5BD]">3-20 символов: латиница, цифры, нижнее подчёркивание</p>
        </div>

        {/* Bio */}
```

- [ ] **Step 3: Type-check**

Run: `cd landing && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `cd landing && npm run dev`, open `http://localhost:3000/dashboard/profile` while logged in as a real user (see the report file from `docs/superpowers/plans/2026-07-20-profile-plan-card.md`'s Task 1 for why this needs a real Supabase session — the same constraint applies here). Confirm:
- The summary card shows the plan badge, "Добавить username" (for an account with no username yet), and (if `created_at` is populated) the join date.
- Typing a username in the settings form and clicking "Сохранить изменения" updates `@username` in the summary card above after the page's next load (or immediately if you also update local state — either is acceptable, this task doesn't require optimistic-update the summary card without a refetch).
- Saving an invalid username (e.g. `"ab"`, too short, or containing uppercase/spaces before normalization) shows the client-side validation message and does not hit the network.
- Saving a username already taken by a different account (if you have two test accounts) shows "Username уже занят, выберите другой".
- Clicking "Добавить username" focuses the Username input.

Note in your report whether this manual pass was completed or blocked (e.g. no second test account to verify the uniqueness-conflict path) — do not silently skip it.

- [ ] **Step 5: Commit**

```bash
git add landing/app/dashboard/profile/page.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add editable username field with validation

Adds a Username field to the profile settings form, validated
client-side against the same ^[a-z0-9_]{3,20}$ pattern the DB
enforces, with a specific "already taken" message on a Postgres
unique-violation (23505) instead of the generic save-error text.
EOF
)"
```
