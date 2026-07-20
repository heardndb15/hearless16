# Profile Plan Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the user's current plan on the web dashboard profile page (`/dashboard/profile`) with a link to `/pricing`, so plan info is visible without leaving the account.

**Architecture:** Single-file change to `landing/app/dashboard/profile/page.tsx`. Extend the existing Supabase profile fetch to also read `plan` and `plan_expires_at`, store them in two new pieces of state, and render a new card above the existing settings card.

**Tech Stack:** Next.js 14 App Router (client component), Supabase JS client, Tailwind CSS. No test framework exists in `landing/` (no jest/vitest/playwright — `package.json` only has `dev`/`build`/`start`), so verification is TypeScript compilation (`next build`) plus manual browser check, matching how other UI-only changes in this repo are verified.

## Global Constraints

- Plan values in the DB are lowercase: `'free' | 'basic' | 'pro'` (see `CHECK (plan IN ('free','basic','pro'))` in `docs/superpowers/specs/2026-06-29-polar-payments-design.md`). Treat `null`/missing as `'free'`.
- Card visual style must match the existing settings card exactly: `bg-[#12182A]/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 md:p-8`.
- No new dependencies, no new API routes — this is a read of columns that already exist and are already populated by `backend/app/routes/polar.py`.
- Spec: `docs/superpowers/specs/2026-07-20-profile-plan-card-design.md`.

---

### Task 1: Add plan card to the profile page

**Files:**
- Modify: `landing/app/dashboard/profile/page.tsx`

**Interfaces:**
- Consumes: existing `supabase.from("users").select(...)` query in the `onAuthStateChange` handler (currently selects `name, bio, avatar_url, language`); existing `loading` state that gates the whole page's render.
- Produces: nothing consumed by other tasks — this plan has a single task.

- [ ] **Step 1: Add `Link` import and plan state**

In `landing/app/dashboard/profile/page.tsx`, change the imports at the top of the file (currently lines 1-6):

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";
```

to:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";
```

Then, in the state declarations block (currently lines 12-21):

```tsx
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState<"kk" | "ru">("ru");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");
```

add two new state variables after `language`:

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

- [ ] **Step 2: Fetch `plan` and `plan_expires_at` alongside the rest of the profile**

Find the `onAuthStateChange` handler (currently lines 31-54):

```tsx
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("users")
          .select("name, bio, avatar_url, language")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setName(profile.name || "");
              setBio(profile.bio || "");
              setAvatarUrl(profile.avatar_url || "");
              setAvatarPreview(profile.avatar_url || "");
              setLanguage((profile.language as "kk" | "ru") || "ru");
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

Replace it with:

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

- [ ] **Step 3: Add a plan display-name map and date formatter**

Immediately above the `export default function ProfilePage()` line (currently line 8), add:

```tsx
const PLAN_NAMES: Record<"free" | "basic" | "pro", string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
};

function formatPlanExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
```

- [ ] **Step 4: Render the plan card above the settings card**

Find the render return block (currently lines 124-133):

```tsx
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-[#F5F5F7]">Настройки профиля</h2>
        <p className="text-[#9AA5BD] text-sm max-w-2xl font-medium">
          Управляйте своей учетной записью, языковыми предпочтениями и параметрами приватности.
        </p>
      </div>

      <div className="max-w-xl bg-[#12182A]/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 md:p-8 space-y-6">
```

Insert a new card between the header block and the settings card:

```tsx
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-[#F5F5F7]">Настройки профиля</h2>
        <p className="text-[#9AA5BD] text-sm max-w-2xl font-medium">
          Управляйте своей учетной записью, языковыми предпочтениями и параметрами приватности.
        </p>
      </div>

      <div className="max-w-xl bg-[#12182A]/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 md:p-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#9AA5BD] uppercase tracking-wider mb-1">Текущий тариф</p>
          <p className="font-syne font-extrabold text-2xl text-[#F5F5F7]">{PLAN_NAMES[plan]}</p>
          {plan !== "free" && planExpiresAt && (
            <p className="text-xs text-[#9AA5BD] font-medium mt-1">
              Продлится: {formatPlanExpiry(planExpiresAt)}
            </p>
          )}
        </div>
        <Link
          href="/pricing"
          className="px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-syne font-bold text-sm tracking-wide shadow-md transition-colors duration-200 whitespace-nowrap"
        >
          {plan === "free" ? "Улучшить план" : "Сменить тариф"}
        </Link>
      </div>

      <div className="max-w-xl bg-[#12182A]/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 md:p-8 space-y-6">
```

- [ ] **Step 5: Type-check the change**

Run: `cd landing && npx tsc --noEmit`
Expected: no errors. If `@types/node`/`@types/react` resolution is slow the first time, that's fine — the command should still exit 0 with no diagnostic output.

- [ ] **Step 6: Start the dev server and verify visually**

Run: `cd landing && npm run dev`

With the server running, open `http://localhost:3000/dashboard/profile` in a browser while logged in as a real user (needs a Supabase session — log in via `/login` first if not already). Confirm:
- A new card appears above "Настройки профиля" showing the account's plan (e.g. "Free" for a new account).
- The button reads "Улучшить план" for a free account, or "Сменить тариф" for basic/pro, and clicking it navigates to `/pricing`.
- For an account with `plan != 'free'` and a `plan_expires_at` set in the `users` table, the "Продлится: DD.MM.YYYY" line appears with the correct date.
- The rest of the profile page (avatar, name, bio, language, save, sign out) still works exactly as before.

Stop the dev server (Ctrl+C) when done.

- [ ] **Step 7: Commit**

```bash
git add landing/app/dashboard/profile/page.tsx
git commit -m "$(cat <<'EOF'
feat(landing): show current plan on profile page

Adds a plan card to /dashboard/profile with a link to /pricing, so
users can see their tier and upgrade without leaving the account.
EOF
)"
```
