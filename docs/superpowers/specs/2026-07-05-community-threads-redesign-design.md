# Community Section Redesign — Phase 1: Layout & Visual (Design Spec)

**Date:** 2026-07-05
**Scope:** `landing/app/community/page.tsx`, `landing/app/community/ChatTab.tsx`, `landing/app/community/DmsTab.tsx`

## Goal

Redesign the web Community section (feed, general chat, direct messages) to feel like Threads (Meta): a left icon-rail navigation instead of horizontal tabs, a single centered feed column, infinite scroll with skeleton loaders, and a visual system aligned with the mobile app's existing "Clean Blue" redesign (see `docs/superpowers/specs/2026-06-28-redesign-design.md`).

This is Phase 1 of a larger effort. **Out of scope for this phase** (tracked as future phases, each with its own spec): notifications/activity feed, people search. No backend changes in this phase — same API endpoints, same Supabase tables, same auth flow.

## Why

The web Community page currently uses the site's original sky-blue palette (`#0EA5E9`/`#0C4A6E`, inline styles, horizontal tab pills) which predates the mobile app's "Clean Blue" redesign. The user wants the web Community section modeled on Threads' actual UX (icon rail, centered single-column feed, infinite scroll, minimal chrome) and visually consistent with the newer mobile design system.

## Non-Goals

- No new backend endpoints, tables, or Supabase schema changes
- No changes to `globals.css` or any other page on the site — new color tokens are scoped to the Community section's own files only
- No reactions beyond the existing like (Threads itself only has a single like/heart reaction)
- No notifications bell or people-search icon in the rail yet — adding disabled placeholders for unbuilt features is not worth the churn; these get added when Phases 2/3 land

## Design Tokens (scoped to Community files only)

Define as local constants (not CSS custom properties, not added to `globals.css`):

```ts
const bg = "#FFFFFF";
const bgList = "#F4F7FB";
const accent = "#1565C0";
const text = "#1A1A2E";
const textSecondary = "#9CA3AF";
const border = "#E8EDF5";
const cardShadow = "0 2px 12px rgba(0,0,0,0.07)";
const cardRadius = 16;
const likeActive = "#ef4444"; // unchanged
```

These replace every occurrence of `#0EA5E9`, `#0C4A6E`, `#075985`, `#0369A1`, `#BAE6FD`, `var(--accent)`, `var(--text)`, `var(--textSecondary)`, `var(--textMuted)`, `var(--border)` within the three Community files. No other files are touched.

## Layout

**Desktop (`≥768px`):**
- Fixed-position left icon rail, width ~72px, background `#FFFFFF`, right border `1px solid #E8EDF5`
- Rail items (top to bottom): Лента (feed icon), Общий чат (chat icon), Сообщения (mail icon, with unread-count badge sourced from `DmsTab`'s existing conversation-unread logic), spacer, "+ Пост" button, "← На сайт" link at the very bottom
- Each rail item: icon + tiny label underneath (12px), active item gets `background: #EBF3FF` pill behind the icon (same treatment as the mobile tab bar's active state) and `color: accent`
- Main content area: single column, `max-width: 600px`, centered in remaining viewport width, own vertical scroll
- No second/right column — matches actual Threads web layout (rail + one centered column), not a literal two-pane split

**Mobile (`<768px`):**
- Rail collapses into a bottom tab bar (same 3 items: Лента / Чат / Сообщения), fixed to viewport bottom, `#FFFFFF` background, top border `1px solid #E8EDF5`
- "+ Пост" becomes a floating action button (bottom-right, above the tab bar) instead of a rail button
- Content column becomes full-width with side padding, same as today

**Implementation note:** since the file uses inline styles throughout, the rail/bottom-bar responsive switch needs real CSS (inline styles can't media-query). Add one scoped `<style>` block (same pattern already used for the `@keyframes spin` rule at the bottom of `page.tsx`) defining two classes, e.g. `.community-rail` / `.community-bottombar`, toggled via `display: none` at the `768px` breakpoint. Component logic (which tab is active) stays in React state exactly as today — only the chrome around it changes.

## Component Changes

**`page.tsx`:**
- Remove the current `<h1>Community</h1>` header block and the horizontal `TABS` pill row — replaced by the rail/bottom-bar described above
- `activeTab` state and its three render branches (`feed` / `chat` / `dms`) stay as-is; only what triggers the switch changes (rail click instead of tab-pill click)
- `PostCard`, `PostModal`, `CreatePostModal`, `UsernameModal`: swap hardcoded colors for the new tokens; no structural/prop changes
- Feed pagination: replace the "Показать ещё" button block with an `IntersectionObserver` sentinel `<div>` placed after the last post; when it intersects, call the existing `fetchPosts(sort, offset, true)`. Keep `hasMore` gating. Show a small centered spinner (not a button) while `loading && posts.length > 0`
- Initial load (`loading && posts.length === 0`): replace the current spinner with 4 skeleton post-cards (gray rounded rectangles: avatar circle, two text-line bars, image-placeholder bar) using a CSS shimmer keyframe added to the same scoped `<style>` block
- Like button: on click, toggle a `liking` class for ~200ms that applies a `scale(1.3) → scale(1)` keyframe to the heart glyph

**`ChatTab.tsx` / `DmsTab.tsx`:**
- Same token swap only (message bubbles, avatars, input, badges) — no changes to the Supabase realtime subscriptions, conversation logic, or read-tracking

## Testing / Verification

- Manual: run `landing` dev server, open `/community`, verify rail (desktop) and bottom bar (mobile viewport) both switch between Лента/Чат/Сообщения correctly, verify infinite scroll loads more posts near the bottom of the feed, verify skeleton shows on first load and like animates on click
- No automated test suite currently covers this page (confirm during planning whether one should be added — likely out of scope for a visual-only phase)

## Follow-up Phases (not designed here)

- **Phase 2 — Notifications:** activity feed (likes/comments on your posts), new `notifications` table, rail icon with unread badge
- **Phase 3 — People search:** search endpoint over `users`, rail icon, results list linking to DM
