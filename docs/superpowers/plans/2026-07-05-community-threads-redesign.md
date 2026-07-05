# Community Section Threads-Style Redesign (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the web Community section (feed, general chat, DMs) to a Threads-style layout — left icon rail on desktop / bottom tab bar on mobile, a single centered feed column, infinite scroll with skeleton loaders, and a "Clean Blue" color system matching the mobile app's existing redesign.

**Architecture:** Pure frontend change to three existing files (`landing/app/community/page.tsx`, `ChatTab.tsx`, `DmsTab.tsx`) plus one new file (`landing/app/community/theme.ts`) holding the shared color tokens. No backend, no Supabase schema, no new dependencies, no changes to `globals.css` or any other page.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, inline styles (existing convention in this file — no CSS modules/Tailwind used here), one scoped `<style>` block for keyframes/media-query classes (already the existing pattern for `@keyframes spin`).

## Global Constraints

- No backend changes: same API endpoints (`/community/posts`, `/community/posts/{id}/like`, etc.), same Supabase tables/RLS, same auth flow.
- No changes to `globals.css` or any file outside `landing/app/community/`.
- No automated test framework exists in `landing/` (confirmed: `package.json` has no test runner, no jest/vitest/playwright config anywhere in the repo). Do **not** introduce one for this visual-only phase — verification is manual (dev server + browser) plus `grep` checks for the mechanical color-token swap, consistent with how the rest of this codebase is verified.
- Preserve existing behavior exactly except where a task explicitly changes it: same post/comment/like/DM/chat data flow, same Supabase realtime subscriptions, same character limits, same auth gating (unauthenticated users still see "Войти" instead of post/like/DM actions).
- Color tokens (from the approved spec, `docs/superpowers/specs/2026-07-05-community-threads-redesign-design.md`):
  - `bg = "#FFFFFF"`, `bgList = "#F4F7FB"`, `accent = "#1565C0"`, `text = "#1A1A2E"`, `textSecondary = "#9CA3AF"`, `border = "#E8EDF5"`, `chipBg = "#EBF3FF"`, `cardShadow = "0 2px 12px rgba(0,0,0,0.07)"`, `cardRadius = 16`, `likeActive = "#ef4444"` (unchanged from today)
  - Error-state colors (`#FEF2F2`, `#FECACA`, `#DC2626`) are **not** part of this palette swap — leave them as-is, they're unrelated to the accent system.

---

### Task 1: Create shared theme tokens

**Files:**
- Create: `landing/app/community/theme.ts`

**Interfaces:**
- Produces: named exports `bg`, `bgList`, `accent`, `text`, `textSecondary`, `border`, `chipBg`, `cardShadow`, `cardRadius`, `likeActive` — all `string` except `cardRadius` (`number`). Tasks 2–4 import these.

- [ ] **Step 1: Write the file**

```ts
export const bg = "#FFFFFF";
export const bgList = "#F4F7FB";
export const accent = "#1565C0";
export const text = "#1A1A2E";
export const textSecondary = "#9CA3AF";
export const border = "#E8EDF5";
export const chipBg = "#EBF3FF";
export const cardShadow = "0 2px 12px rgba(0,0,0,0.07)";
export const cardRadius = 16;
export const likeActive = "#ef4444";
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd landing && npx tsc --noEmit`
Expected: no errors mentioning `theme.ts` (pre-existing unrelated errors, if any, are not introduced by this file — this file has zero imports and only literal exports, so it cannot itself fail).

- [ ] **Step 3: Commit**

```bash
cd landing
git add app/community/theme.ts
git commit -m "feat: add shared color tokens for Community section redesign"
```

---

### Task 2: Apply color tokens to `page.tsx`

**Files:**
- Modify: `landing/app/community/page.tsx`

**Interfaces:**
- Consumes: `theme.ts` exports from Task 1.

- [ ] **Step 1: Add the import**

Add near the top of the file, right after the existing `import { DmsTab } from "./DmsTab";` line:

```ts
import { bg, bgList, accent, text, textSecondary, border, chipBg, cardShadow, cardRadius, likeActive } from "./theme";
```

- [ ] **Step 2: Replace the Avatar gradient with a solid accent circle**

Find (in the `Avatar` component):

```ts
background: "linear-gradient(135deg,#38BDF8,#0EA5E9)",
```

Replace with:

```ts
background: accent,
```

- [ ] **Step 3: Apply the token substitution table across the whole file**

Using the Edit tool with `replace_all: true`, apply each row below **in `page.tsx` only**. Where a hex code is used in more than one CSS-property role, follow the role-specific rule noted in parentheses — do not blindly replace_all the strings marked "role-specific."

| Old literal | New expression | Notes |
|---|---|---|
| `"#0EA5E9"` | `accent` | button backgrounds, active states, etc. — safe to replace_all |
| `"#0C4A6E"` | `text` | headings (h1, UsernameModal h2) — safe to replace_all |
| `"#075985"` | `textSecondary` | subtitle/back-link text — safe to replace_all |
| `"#0369A1"` | `accent` | button/badge label text on light bg — safe to replace_all |
| `"#64748b"` | `textSecondary` | timestamps, footer icon default — safe to replace_all |
| `"#94a3b8"` | `textSecondary` | ellipsis/close icons, empty-state text — safe to replace_all |
| `"#1e293b"` | `text` | post/comment body text — safe to replace_all |
| `"#334155"` | `text` | comment bubble text in modal — safe to replace_all |
| `"#f1f5f9"` | `border` | modal dividers — safe to replace_all |
| `"#e2e8f0"` | `border` | input/card borders — safe to replace_all |
| `"#f8fafc"` | `bgList` | input backgrounds — safe to replace_all |
| `"#E0F2FE"` | `chipBg` | DM-button/avatar-chip background — safe to replace_all |
| `"#F0F9FF"` | `bgList` | page background — safe to replace_all |
| `"#BAE6FD"` (role: `border:` property) | `border` | e.g. `border: "1.5px solid #BAE6FD"` → `border: \`1.5px solid ${border}\`` |
| `"#BAE6FD"` (role: `background`/color property, e.g. disabled button bg, inactive sort-toggle bg/border) | `chipBg` | e.g. `background: sort === s ? accent : "#BAE6FD"` → `background: sort === s ? accent : chipBg` |

Leave untouched: `"#ef4444"` (this **is** `likeActive` already — you may optionally replace it with the `likeActive` import for consistency, but it's not required since the value is identical), `"#FEF2F2"`, `"#FECACA"`, `"#DC2626"` (error states, out of scope), plain `"white"` / `"#FFFFFF"` used as literal white (leave as `"white"` or `bg` — either is fine since both equal `#FFFFFF`; prefer `bg` where you're already touching the line for another reason, don't do a blanket replace of the word `"white"` since it also appears in unrelated contexts like `color: "white"` on buttons sitting on the accent background, which is correct as-is and not part of this palette).

- [ ] **Step 4: Verify no old literals remain**

Run:
```bash
cd landing
grep -nE '#0EA5E9|#0C4A6E|#075985|#0369A1|#38BDF8|#64748b|#94a3b8|#1e293b|#334155|#f1f5f9|#e2e8f0|#f8fafc|#E0F2FE|#F0F9FF|#BAE6FD' app/community/page.tsx
```
Expected: no output (empty).

- [ ] **Step 5: Manual check**

Run: `cd landing && npm run dev`, open `http://localhost:3000/community`, confirm the page still renders (feed loads, no console errors) and looks the same structurally, just recolored (blue accent now `#1565C0` instead of `#0EA5E9`).

- [ ] **Step 6: Commit**

```bash
git add app/community/page.tsx
git commit -m "refactor: apply Clean Blue color tokens to community page.tsx"
```

---

### Task 3: Apply color tokens to `ChatTab.tsx`

**Files:**
- Modify: `landing/app/community/ChatTab.tsx`

**Interfaces:**
- Consumes: `theme.ts` exports from Task 1.

- [ ] **Step 1: Add the import**

After `import { createClient } from "../../lib/supabase";`:

```ts
import { accent, text, textSecondary, border, bgList, chipBg } from "./theme";
```

- [ ] **Step 2: Apply the token substitution table**

| Old literal | New expression |
|---|---|
| `"#E0F2FE"` | `chipBg` |
| `"#0369A1"` | `accent` |
| `"#0EA5E9"` | `accent` |
| `"#F0F9FF"` | `bgList` |
| `"#BAE6FD"` (border role, e.g. `border: "1px dashed #BAE6FD"`) | `border` |

Also replace the existing CSS-variable references (this file already uses some, inconsistently, alongside literals):
| Old | New |
|---|---|
| `var(--textSecondary)` | `textSecondary` |
| `var(--textMuted)` | `textSecondary` |
| `var(--accent)` | `accent` |
| `var(--text)` | `text` |
| `var(--border)` | `border` |

- [ ] **Step 3: Verify no old literals/vars remain**

Run:
```bash
cd landing
grep -nE '#E0F2FE|#0369A1|#0EA5E9|#F0F9FF|#BAE6FD|var\(--' app/community/ChatTab.tsx
```
Expected: no output.

- [ ] **Step 4: Manual check**

With `npm run dev` still running, open `/community`, click the "Общий чат" tab, confirm messages render with the new palette (own messages on accent-blue bubbles, others on white bubbles with the new border color) and sending a message still works.

- [ ] **Step 5: Commit**

```bash
git add app/community/ChatTab.tsx
git commit -m "refactor: apply Clean Blue color tokens to ChatTab"
```

---

### Task 4: Apply color tokens to `DmsTab.tsx`

**Files:**
- Modify: `landing/app/community/DmsTab.tsx`

**Interfaces:**
- Consumes: `theme.ts` exports from Task 1.

- [ ] **Step 1: Add the import**

After `import { createClient } from "../../lib/supabase";`:

```ts
import { accent, text, textSecondary, border, bgList, chipBg } from "./theme";
```

- [ ] **Step 2: Apply the token substitution table**

| Old literal | New expression |
|---|---|
| `"#E0F2FE"` | `chipBg` |
| `"#0369A1"` | `accent` |
| `"#0EA5E9"` | `accent` |
| `"#FFFFFF"` (card/list-item background — e.g. the conversation-row button background) | leave as `"#FFFFFF"` or use `bg` if importing it; not required |

Also replace CSS-variable references present in this file:
| Old | New |
|---|---|
| `var(--textSecondary)` | `textSecondary` |
| `var(--textMuted)` | `textSecondary` |
| `var(--accent)` | `accent` |
| `var(--text)` | `text` |
| `var(--border)` | `border` |

- [ ] **Step 3: Verify no old literals/vars remain**

Run:
```bash
cd landing
grep -nE '#E0F2FE|#0369A1|#0EA5E9|var\(--' app/community/DmsTab.tsx
```
Expected: no output.

- [ ] **Step 4: Manual check**

Open the "Сообщения" tab (must be logged in — log in with a test account first), confirm conversation list and thread view render with the new palette.

- [ ] **Step 5: Commit**

```bash
git add app/community/DmsTab.tsx
git commit -m "refactor: apply Clean Blue color tokens to DmsTab"
```

---

### Task 5: Replace header + horizontal tabs with left rail (desktop) / bottom bar (mobile)

**Files:**
- Modify: `landing/app/community/page.tsx`

**Interfaces:**
- Produces: renders `<nav className="community-rail">` and `<nav className="community-bottombar">`, both driven by the existing `TABS` array and `activeTab`/`setActiveTab` state (unchanged names). Task 9 will add a badge into these nav items — it will look for `community-rail-item` buttons keyed by `tab.id === "dms"`.

- [ ] **Step 1: Remove the old header block**

Find this block (the `<h1>Community</h1>` header + username/post-button row):

```tsx
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: text }}>Community</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: textSecondary }}>
              {userName ? `Привет, ${userName} 👋` : "Общайтесь с сообществом Hearless"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {userName && (
              <button onClick={() => setShowUsernameModal(true)} style={{ background: "none", border: `1px solid ${border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: accent, cursor: "pointer" }}>
                ✏️ {userName}
              </button>
            )}
            {token ? (
              <button onClick={() => setShowCreate(true)} style={{ background: accent, color: "white", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                + Пост
              </button>
            ) : (
              <Link href="/login" style={{ background: accent, color: "white", textDecoration: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 14 }}>Войти</Link>
            )}
          </div>
        </div>
```

(Exact colors above assume Task 2 already ran; match against whatever the equivalent block looks like in your working copy — it's the `<h1>Community</h1>` block regardless of exact token names.)

Replace it with just the lightweight greeting/username-edit strip (post button moves to the rail):

```tsx
        {userName && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setShowUsernameModal(true)} style={{ background: "none", border: `1px solid ${border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: accent, cursor: "pointer" }}>
              ✏️ {userName}
            </button>
          </div>
        )}
```

- [ ] **Step 2: Remove the old horizontal tab-pill bar**

Find:

```tsx
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "white", padding: 4, borderRadius: 14, border: `1px solid ${border}` }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 10, border: "none",
                background: activeTab === tab.id ? accent : "transparent",
                color: activeTab === tab.id ? "white" : accent,
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
```

Delete this block entirely (the rail/bottom-bar added in Step 4 replaces it).

- [ ] **Step 3: Remove the old top-of-page "← На главную" link block**

Find (near the top of the returned JSX, before the header):

```tsx
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 12px" }}>
        <Link href="/" style={{ color: textSecondary, textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>← На главную</Link>
      </div>
```

Delete it (the rail's "← На сайт" link, added in Step 4, replaces it).

- [ ] **Step 4: Wrap the page in the rail/main shell**

Find the outermost returned element:

```tsx
    <div style={{ minHeight: "100vh", background: bgList, paddingTop: 80 }}>
```

and its matching closing `</div>` right before `{selectedPost && (` — instead, restructure so the rail sits alongside a `<main>` wrapper. Change the return statement's top-level structure to:

```tsx
    <div style={{ minHeight: "100vh", background: bgList }}>
      <nav className="community-rail">
        <div className="community-rail-top">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`community-rail-item${activeTab === tab.id ? " active" : ""}`}
            >
              <span className="community-rail-icon">{tab.icon}</span>
              <span className="community-rail-label">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="community-rail-bottom">
          {token ? (
            <button onClick={() => setShowCreate(true)} className="community-rail-post-btn">+ Пост</button>
          ) : (
            <Link href="/login" className="community-rail-post-btn">Войти</Link>
          )}
          <Link href="/" className="community-rail-home-link">← На сайт</Link>
        </div>
      </nav>

      <nav className="community-bottombar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`community-rail-item${activeTab === tab.id ? " active" : ""}`}
          >
            <span className="community-rail-icon">{tab.icon}</span>
            <span className="community-rail-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {activeTab === "feed" && (
        <button
          className="community-fab"
          onClick={() => (token ? setShowCreate(true) : (window.location.href = "/login"))}
          aria-label="Новый пост"
        >
          +
        </button>
      )}

      <main className="community-main" style={{ paddingTop: 24 }}>
        {showUsernameModal && (
          <UsernameModal onSave={(n) => { setUserName(n); setShowUsernameModal(false); }} />
        )}

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 60px" }}>
          {/* ... everything from the old username-edit strip (Step 1's replacement) down through
                 the feed/chat/dms tab content stays here, unchanged ... */}
        </div>
      </main>

      {selectedPost && (
```

Keep everything from `{selectedPost && (` to the end of the component (the `PostModal`/`CreatePostModal` renders and the closing `<style>` tag) exactly as it is today, just make sure the final `</div>` that used to close the single outer wrapper now correctly closes `<main>` before `{selectedPost && (` and the component's true outermost `<div>` closes after the `<style>` tag, matching the new nesting.

- [ ] **Step 5: Add the rail/bottombar/FAB styles to the existing scoped `<style>` block**

Find the existing style tag at the bottom of the component:

```tsx
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
```

Replace with:

```tsx
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }

        .community-rail {
          position: fixed; top: 0; left: 0; bottom: 0; width: 88px;
          background: #FFFFFF; border-right: 1px solid ${border};
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 24px 8px; z-index: 50;
        }
        .community-rail-top { display: flex; flex-direction: column; gap: 8px; }
        .community-rail-item {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: none; border: none; cursor: pointer; padding: 10px 4px; border-radius: 14px;
          position: relative;
        }
        .community-rail-item.active { background: ${chipBg}; }
        .community-rail-icon { font-size: 22px; }
        .community-rail-label { font-size: 11px; font-weight: 600; color: ${textSecondary}; }
        .community-rail-item.active .community-rail-label { color: ${accent}; }
        .community-rail-post-btn {
          display: block; text-align: center; background: ${accent}; color: white; text-decoration: none;
          border: none; border-radius: 12px; padding: 10px 6px; font-weight: 700; font-size: 12px;
          cursor: pointer; margin-bottom: 12px; width: 100%;
        }
        .community-rail-home-link { display: block; text-align: center; color: ${textSecondary}; text-decoration: none; font-size: 11px; }
        .community-main { margin-left: 88px; }
        .community-bottombar { display: none; }
        .community-fab { display: none; }

        @media (max-width: 768px) {
          .community-rail { display: none; }
          .community-main { margin-left: 0; padding-bottom: 76px; }
          .community-bottombar {
            display: flex; position: fixed; left: 0; right: 0; bottom: 0; height: 60px;
            background: #FFFFFF; border-top: 1px solid ${border}; z-index: 50;
          }
          .community-bottombar .community-rail-item { flex: 1; padding: 6px 4px; border-radius: 0; }
          .community-fab {
            display: flex; position: fixed; right: 20px; bottom: 76px; width: 52px; height: 52px;
            border-radius: 26px; background: ${accent}; color: white; border: none; font-size: 26px;
            align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 51; cursor: pointer;
          }
        }
      ` }} />
```

- [ ] **Step 6: Manual check — desktop**

Run `npm run dev`, open `/community` at a viewport `≥768px` wide. Confirm: left rail visible with 3 items (Лента/Общий чат/Сообщения) plus a "+ Пост" (or "Войти") button and "← На сайт" link at the bottom; clicking each rail item switches the main content exactly like the old tabs did; no horizontal tab bar or `<h1>Community</h1>` remains; the feed column is centered with `max-width: 600px`.

- [ ] **Step 7: Manual check — mobile**

Resize the browser (or use dev tools device toolbar) to `<768px`. Confirm: the left rail disappears, a bottom tab bar with the same 3 items appears, and (while on the "Лента" tab) a round "+" floating button appears above the bottom bar; tapping it opens the create-post modal (or navigates to `/login` if logged out).

- [ ] **Step 8: Commit**

```bash
git add app/community/page.tsx
git commit -m "feat: replace Community header/tabs with Threads-style rail and bottom bar"
```

---

### Task 6: Skeleton loaders for initial feed load

**Files:**
- Modify: `landing/app/community/page.tsx`

**Interfaces:**
- Consumes: `border`, `bgList` from `theme.ts` (already imported in Task 2).
- Produces: a `PostSkeleton` component, used only within this file.

- [ ] **Step 1: Add the `PostSkeleton` component**

Add it directly above the `export default function CommunityPage()` line:

```tsx
function PostSkeleton() {
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${border}`, borderRadius: cardRadius, padding: "20px 24px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="community-skeleton-bar" style={{ width: 40, height: 40, borderRadius: 20 }} />
        <div style={{ flex: 1 }}>
          <div className="community-skeleton-bar" style={{ width: "40%", height: 12, marginBottom: 6 }} />
          <div className="community-skeleton-bar" style={{ width: "25%", height: 10 }} />
        </div>
      </div>
      <div className="community-skeleton-bar" style={{ width: "90%", height: 14, marginTop: 14 }} />
      <div className="community-skeleton-bar" style={{ width: "60%", height: 14, marginTop: 8 }} />
    </div>
  );
}
```

- [ ] **Step 2: Replace the initial-loading spinner**

Find:

```tsx
            ) : loading && posts.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 60 }}>
                <div style={{ width: 44, height: 44, border: "4px solid rgba(14,165,233,0.2)", borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ color: textSecondary, fontSize: 14 }}>Загрузка постов...</p>
              </div>
            ) : posts.length === 0 ? (
```

Replace with:

```tsx
            ) : loading && posts.length === 0 ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length === 0 ? (
```

- [ ] **Step 3: Add the shimmer keyframe and skeleton-bar class**

In the scoped `<style>` block (the one Task 5 expanded), add after the `@keyframes spin` line:

```css
@keyframes community-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
.community-skeleton-bar {
  background: linear-gradient(90deg, ${bgList} 25%, ${border} 37%, ${bgList} 63%);
  background-size: 400% 100%;
  animation: community-shimmer 1.4s ease infinite;
  border-radius: 6px;
}
```

- [ ] **Step 4: Manual check**

In dev tools, throttle network to "Slow 3G", reload `/community`. Confirm 4 shimmering skeleton cards appear briefly before real posts replace them.

- [ ] **Step 5: Commit**

```bash
git add app/community/page.tsx
git commit -m "feat: add skeleton loaders for initial Community feed load"
```

---

### Task 7: Infinite scroll instead of "Показать ещё" button

**Files:**
- Modify: `landing/app/community/page.tsx`

**Interfaces:**
- Consumes: existing `hasMore`, `loading`, `sort`, `offset`, `fetchPosts`, `activeTab`, `loadingRef` state/refs — no signature changes to any of them.
- Produces: a new `sentinelRef` ref, used only within this file.

- [ ] **Step 1: Add the sentinel ref and observer effect**

Add alongside the existing `const loadingRef = useRef(false);` / `const abortRef = useRef<AbortController | null>(null);` lines:

```tsx
  const sentinelRef = useRef<HTMLDivElement>(null);
```

Add a new effect after the existing `useEffect(() => { setPosts([]); setOffset(0); fetchPosts(sort, 0, false); }, [sort, fetchPosts]);` block:

```tsx
  useEffect(() => {
    if (activeTab !== "feed" || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          fetchPosts(sort, offset, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, hasMore, sort, offset, fetchPosts]);
```

- [ ] **Step 2: Replace the "Показать ещё" button with the sentinel**

Find:

```tsx
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <button onClick={() => fetchPosts(sort, offset, true)} disabled={loading} style={{ padding: "12px 32px", borderRadius: 12, border: `1.5px solid ${border}`, background: "white", color: accent, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      {loading ? "Загрузка..." : "Показать ещё"}
                    </button>
                  </div>
                )}
```

Replace with:

```tsx
                {hasMore && (
                  <div ref={sentinelRef} style={{ textAlign: "center", padding: "20px 0" }}>
                    {loading && (
                      <div style={{ width: 28, height: 28, border: "3px solid rgba(21,101,192,0.15)", borderTopColor: accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
                    )}
                  </div>
                )}
```

(Note: `(loading ? "Загрузка..." : "Показать ещё")`'s exact literal text may differ slightly depending on Task 2's substitutions — match structurally on "the `hasMore &&` block containing a button that calls `fetchPosts(sort, offset, true)`".)

- [ ] **Step 3: Manual check**

Seed at least 25 posts (or use an existing account with that many), open `/community`, scroll down. Confirm the next page of posts loads automatically when the bottom of the list nears the viewport, with a small spinner shown briefly and no button to click.

- [ ] **Step 4: Commit**

```bash
git add app/community/page.tsx
git commit -m "feat: replace manual pagination button with infinite scroll"
```

---

### Task 8: Like tap animation

**Files:**
- Modify: `landing/app/community/page.tsx`

**Interfaces:**
- Produces: `PostCard` and `PostModal` both gain a new prop `likingId: string | null` (the id of the post currently mid-animation). `CommunityPage` gains state `likingId` and a helper `triggerLikePop(postId: string)`.

- [ ] **Step 1: Add `likingId` state and the trigger helper**

Add alongside `const [selectedPost, setSelectedPost] = useState<Post | null>(null);`:

```tsx
  const [likingId, setLikingId] = useState<string | null>(null);
```

Add near `handleLike`'s definition (after it):

```tsx
  function triggerLikePop(postId: string) {
    setLikingId(postId);
    setTimeout(() => setLikingId((cur) => (cur === postId ? null : cur)), 250);
  }
```

- [ ] **Step 2: Wire it into the `PostCard` and `PostModal` call sites**

Find where `<PostCard ... onLike={handleLike} ... />` is rendered in the feed `.map`, and change to:

```tsx
<PostCard key={post.id} post={post} currentUserId={currentUserId} token={token} likingId={likingId} onLike={(id) => { triggerLikePop(id); handleLike(id); }} onDelete={handleDelete} onOpen={setSelectedPost} onDm={handleDm} />
```

Find the `<PostModal ... onLike={handleLike} ... />` render and change similarly:

```tsx
<PostModal post={selectedPost} token={token} currentUserId={currentUserId} likingId={likingId} onClose={() => setSelectedPost(null)} onLike={(id) => { triggerLikePop(id); handleLike(id); }} onDelete={handleDelete} />
```

- [ ] **Step 3: Add the `likingId` prop to `PostCard` and apply the animation class**

In `PostCard`'s props type, add `likingId: string | null;` next to the other props. In its JSX, find the like button's heart `<span>`:

```tsx
          <span style={{ fontSize: 18 }}>{post.liked_by_me ? "♥" : "♡"}</span>{post.likes_count}
```

Change to:

```tsx
          <span className={likingId === post.id ? "community-like-pop" : undefined} style={{ fontSize: 18 }}>{post.liked_by_me ? "♥" : "♡"}</span>{post.likes_count}
```

- [ ] **Step 4: Same for `PostModal`**

Add `likingId: string | null;` to its props type. Find its like button's heart `<span>` (inside the post-detail section, not the comment list) and apply the same `className={likingId === post.id ? "community-like-pop" : undefined}` change.

- [ ] **Step 5: Add the animation CSS**

In the scoped `<style>` block, add:

```css
@keyframes community-like-pop { 0% { display: inline-block; transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
.community-like-pop { display: inline-block; animation: community-like-pop 0.25s ease; }
```

- [ ] **Step 6: Manual check**

Log in, open `/community`, click a post's heart. Confirm it briefly scales up then back down, and the like count/color still toggles correctly (this behavior is unchanged from before — only the visual pop is new).

- [ ] **Step 7: Commit**

```bash
git add app/community/page.tsx
git commit -m "feat: add tap animation to the Community like button"
```

---

### Task 9: DM unread badge on the rail

**Files:**
- Modify: `landing/app/community/DmsTab.tsx`
- Modify: `landing/app/community/page.tsx`

**Interfaces:**
- `DmsTab` gains an optional prop `onUnreadChange?: (count: number) => void`, called whenever its internal `conversations` state changes, with the sum of all `conversation.unread` values.
- `CommunityPage` gains state `dmUnreadCount: number`, passed as `onUnreadChange={setDmUnreadCount}` to `<DmsTab />`, and rendered as a badge on the "Сообщения" rail/bottombar item.

- [ ] **Step 1: Add the prop and effect to `DmsTab`**

In the `Props` interface, add:

```ts
  onUnreadChange?: (count: number) => void;
```

Inside the component, after the existing conversations-related `useEffect`s, add:

```tsx
  useEffect(() => {
    onUnreadChange?.(conversations.reduce((sum, c) => sum + c.unread, 0));
  }, [conversations, onUnreadChange]);
```

- [ ] **Step 2: Add `dmUnreadCount` state in `page.tsx` and pass the callback**

Add alongside `const [dmWith, setDmWith] = useState<{ id: string; name: string } | null>(null);`:

```tsx
  const [dmUnreadCount, setDmUnreadCount] = useState(0);
```

Find where `<DmsTab userId={currentUserId} userName={userName} openDmWith={dmWith} onClearDmWith={() => setDmWith(null)} />` is rendered, and add the new prop:

```tsx
<DmsTab userId={currentUserId} userName={userName} openDmWith={dmWith} onClearDmWith={() => setDmWith(null)} onUnreadChange={setDmUnreadCount} />
```

- [ ] **Step 3: Render the badge on both the rail and the bottom bar**

In both `TABS.map(...)` blocks added in Task 5 (the `.community-rail-top` one and the `.community-bottombar` one), change the button body from:

```tsx
              <span className="community-rail-icon">{tab.icon}</span>
              <span className="community-rail-label">{tab.label}</span>
```

to:

```tsx
              <span className="community-rail-icon">{tab.icon}</span>
              <span className="community-rail-label">{tab.label}</span>
              {tab.id === "dms" && dmUnreadCount > 0 && (
                <span className="community-rail-badge">{dmUnreadCount > 9 ? "9+" : dmUnreadCount}</span>
              )}
```

(Do this in both nav blocks — they render the same `TABS` array independently.)

- [ ] **Step 4: Add the badge CSS**

In the scoped `<style>` block, add:

```css
.community-rail-badge {
  position: absolute; top: 2px; right: 12px; min-width: 16px; height: 16px; border-radius: 8px;
  background: ${likeActive}; color: white; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; padding: 0 3px;
}
```

- [ ] **Step 5: Manual check**

From a second browser/incognito session logged in as a different user, send a DM to your test account. Confirm a red badge with the unread count appears on the "Сообщения" rail item (and bottom-bar item on mobile width) without needing to open the DMs tab; confirm it disappears after opening the conversation (existing `markRead` logic already handles marking messages read, which updates `conversations` and re-triggers `onUnreadChange`).

- [ ] **Step 6: Commit**

```bash
git add app/community/DmsTab.tsx app/community/page.tsx
git commit -m "feat: show unread DM count badge on Community rail"
```

---

## Plan Self-Review Notes

- **Spec coverage:** rail+bottombar layout (Task 5), Clean Blue tokens (Tasks 1–4), infinite scroll (Task 7), skeleton loaders (Task 6), like animation (Task 8) — all spec sections covered. DM unread badge (Task 9) was called out explicitly in the spec's rail description and had no task until added here.
- **Non-goals respected:** no task touches the backend, `globals.css`, notifications, or search — matches the spec's explicit exclusions.
- **Type consistency:** `likingId: string | null` is threaded identically through `CommunityPage`, `PostCard`, and `PostModal`; `onUnreadChange?: (count: number) => void` matches the `setDmUnreadCount` dispatch passed to it.
