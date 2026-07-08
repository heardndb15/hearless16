# Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every still-broken page in `landing/` (Next.js 14 app) lay out correctly on phone widths, using the site's existing "named CSS class + `@media`" convention instead of inline fixed-px grids.

**Architecture:** All new responsive rules go into `landing/app/globals.css`, in the existing `/* ===== Responsive Layout Classes ===== */` section (base rules) and the existing `@media (max-width: 768px)` block (mobile overrides) — the same place `.hero-grid`/`.features-grid`/`.pricing-grid` already live. Each page swaps a layout-only inline `style` object for a `className` reference to one of these new classes. One exception: `app/subtitles/transcript/page.tsx` currently picks its grid at render time from JS state via inline style, which no CSS media query can ever override (inline `style` always wins over any class rule, regardless of specificity or `@media`) — that one switches to a conditional `className` instead so the media query can actually take effect.

**Tech Stack:** Next.js 14 (App Router), plain CSS in `globals.css` (Tailwind is present but not used for layout in most of these files — stay consistent with each file's existing convention).

## Global Constraints

- Breakpoints: only `max-width: 768px` and `max-width: 480px` — these are the two already used everywhere in `globals.css`. Do not invent new breakpoints.
- Only touch layout properties: `grid-template-columns`, fixed pixel `width`/`min-width` on layout containers, `overflow-x` for the one tabular case. Do not change colors, fonts, spacing values, or animations.
- Follow each file's existing styling convention: files that are 100% inline-`style` (all files in this plan except pricing's already-partial Tailwind class) get a plain CSS class; don't introduce Tailwind classes into files that don't already use Tailwind for layout.
- No visible or headless browser verification by default (standing project preference). Verify with `npm run build` (from `landing/`) and `grep`, not a browser.
- Out of scope, do not touch: `app/page.tsx` and its components (`Hero`, `Header`, `Features`, `Footer`, `PricingSection`, `LanguageSection`, `GamificationSection`, `Stats`, `Download`, `CTASection`, `FounderStory`), `app/register`, `app/login`, `app/reset-password`, `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `app/dashboard/profile/page.tsx`, `app/dashboard/learn/page.tsx`, `app/profile/page.tsx`, `app/about`, `app/features`, `app/blog/*`, `app/contact`, `app/terms`, `app/community/page.tsx` — all confirmed already responsive or trivially fine at any width. Also out of scope: `mobile/` (React Native/Expo app) and `backend/`.
- Spec: `docs/superpowers/specs/2026-07-08-mobile-responsive-design.md`.

All file paths below are relative to `C:\Users\111\Desktop\hearless\hearless16\landing\`.

---

### Task 1: Add new responsive layout classes to `globals.css`

**Files:**
- Modify: `app/globals.css:266-289`

**Interfaces:**
- Produces these CSS classes, consumed by Tasks 2–10: `.pricing-compare-grid`, `.pricing-compare-scroll`, `.ai-tutor-grid`, `.gamification-stats-grid`, `.camera-grid`, `.text-to-sign-steps-grid`, `.sign-language-layout`, `.sign-language-lesson-grid`, `.subtitles-layout`, `.transcript-layout`, `.transcript-layout--split`, `.practice-layout`.

- [ ] **Step 1: Confirm current file state**

Run: `grep -n "pricing-grid {" app/globals.css`
Expected: one match at line 266, followed by the mobile block ending at line 289 — confirms line numbers below are still accurate before editing.

- [ ] **Step 2: Add the base (desktop) rules and mobile overrides**

Edit `app/globals.css`, replacing:

```css
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: stretch;
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  section { padding: 60px 0; }
  .container { padding: 0 16px; }

  .nav-desktop { display: none !important; }
  .nav-mobile-btn { display: flex !important; }

  .hero-grid { grid-template-columns: 1fr; gap: 32px; }
  .hero-phone-col { display: none !important; }

  .features-grid { grid-template-columns: 1fr 1fr; }
  .lang-grid { grid-template-columns: 1fr; gap: 14px; }
  .gamification-grid { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .pricing-grid { grid-template-columns: 1fr; }
}
```

with:

```css
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: stretch;
}

.pricing-compare-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
}

.pricing-compare-scroll {}

.ai-tutor-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  margin-top: 40px;
}

.gamification-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.camera-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 40px;
}

.text-to-sign-steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.sign-language-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  margin-top: 40px;
  align-items: start;
}

.sign-language-lesson-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px;
}

.subtitles-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
  align-items: start;
}

.transcript-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}

.transcript-layout--split {
  grid-template-columns: 1fr 320px;
}

.practice-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  section { padding: 60px 0; }
  .container { padding: 0 16px; }

  .nav-desktop { display: none !important; }
  .nav-mobile-btn { display: flex !important; }

  .hero-grid { grid-template-columns: 1fr; gap: 32px; }
  .hero-phone-col { display: none !important; }

  .features-grid { grid-template-columns: 1fr 1fr; }
  .lang-grid { grid-template-columns: 1fr; gap: 14px; }
  .gamification-grid { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .pricing-grid { grid-template-columns: 1fr; }

  .pricing-compare-scroll { overflow-x: auto; }
  .pricing-compare-grid { min-width: 560px; }
  .ai-tutor-grid { grid-template-columns: 1fr; }
  .gamification-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .camera-grid { grid-template-columns: 1fr; }
  .text-to-sign-steps-grid { grid-template-columns: 1fr; }
  .sign-language-layout { grid-template-columns: 1fr; }
  .sign-language-lesson-grid { grid-template-columns: 1fr; }
  .subtitles-layout { grid-template-columns: 1fr; }
  .transcript-layout--split { grid-template-columns: 1fr; }
  .practice-layout { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Verify the file is still valid CSS**

Run: `grep -c "^}" app/globals.css` and `grep -c "{" app/globals.css`
Expected: both commands run without error (sanity check only — brace-matching is fully confirmed by Task 11's `npm run build`, since Next.js processes this file through its CSS pipeline).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: add responsive layout classes for inner app pages"
```

---

### Task 2: `app/pricing/page.tsx` — plans grid + compare table

**Files:**
- Modify: `app/pricing/page.tsx:136`, `app/pricing/page.tsx:253-293`, `app/pricing/page.tsx:272`

**Interfaces:**
- Consumes: `.pricing-grid` (already existed), `.pricing-compare-grid`, `.pricing-compare-scroll` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'gridTemplateColumns: "repeat(3, 1fr)"' app/pricing/page.tsx`
Expected: one match at line 136 — this is the bug: the plans grid already has `className="pricing-grid"` AND a conflicting inline `gridTemplateColumns`, so the CSS class's mobile override never fires (inline style always wins over a class rule).

- [ ] **Step 2: Fix the plans grid — drop the conflicting inline style**

Replace:

```tsx
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "stretch" }} className="pricing-grid">
```

with:

```tsx
          <div className="pricing-grid">
```

- [ ] **Step 3: Wrap the compare table in a horizontal-scroll container and class the two grid rows**

Replace:

```tsx
          <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0, 0, 0,0.12)", overflow: "hidden", boxShadow: "0 4px 24px rgba(0, 0, 0,0.07)" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--bg)", borderBottom: "1px solid rgba(0, 0, 0,0.1)", padding: "16px 24px" }}>
```

with:

```tsx
          <div className="pricing-compare-scroll">
          <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(0, 0, 0,0.12)", overflow: "hidden", boxShadow: "0 4px 24px rgba(0, 0, 0,0.07)" }}>
            {/* Header row */}
            <div className="pricing-compare-grid" style={{ background: "var(--bg)", borderBottom: "1px solid rgba(0, 0, 0,0.1)", padding: "16px 24px" }}>
```

Then replace:

```tsx
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "14px 24px", borderBottom: i < 7 ? "1px solid rgba(0, 0, 0,0.07)" : "none", background: i % 2 === 0 ? "white" : "#FAFEFF" }}>
```

with:

```tsx
              <div key={row.label} className="pricing-compare-grid" style={{ padding: "14px 24px", borderBottom: i < 7 ? "1px solid rgba(0, 0, 0,0.07)" : "none", background: i % 2 === 0 ? "white" : "#FAFEFF" }}>
```

Then close the new wrapper div — replace:

```tsx
          </div>
        </div>

        {/* FAQ */}
```

with:

```tsx
          </div>
          </div>
        </div>

        {/* FAQ */}
```

- [ ] **Step 4: Build**

Run: `npm run build` (from `landing/`)
Expected: build succeeds, no TypeScript/JSX errors.

- [ ] **Step 5: Verify**

Run: `grep -n 'gridTemplateColumns' app/pricing/page.tsx`
Expected: no matches remain in this file (all three fixed-grid inline styles are gone, replaced by classes).

- [ ] **Step 6: Commit**

```bash
git add app/pricing/page.tsx
git commit -m "fix: make pricing plans grid and compare table responsive on mobile"
```

---

### Task 3: `app/ai-tutor/page.tsx`

**Files:**
- Modify: `app/ai-tutor/page.tsx:30`

**Interfaces:**
- Consumes: `.ai-tutor-grid` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'gridTemplateColumns: "1.2fr 1fr"' app/ai-tutor/page.tsx`
Expected: one match at line 30.

- [ ] **Step 2: Apply the class**

Replace:

```tsx
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginTop: 40 }}>
```

with:

```tsx
        <div className="ai-tutor-grid">
```

Note: the 2-column stat mini-grid at line 71 (`gridTemplateColumns: "repeat(2, 1fr)"`, two small number/label boxes) is left unchanged — two narrow stat cells stay readable at any phone width, so it doesn't need a breakpoint per the spec's "keep two columns when there's a specific reason" rule.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'className="ai-tutor-grid"' app/ai-tutor/page.tsx`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add app/ai-tutor/page.tsx
git commit -m "fix: make AI tutor chat/video layout responsive on mobile"
```

---

### Task 4: `app/gamification/page.tsx`

**Files:**
- Modify: `app/gamification/page.tsx:68`

**Interfaces:**
- Consumes: `.gamification-stats-grid` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'gridTemplateColumns: "repeat(4, 1fr)"' app/gamification/page.tsx`
Expected: one match at line 68.

- [ ] **Step 2: Apply the class**

Replace:

```tsx
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
```

with:

```tsx
          <div className="gamification-stats-grid">
```

Note: the `repeat(auto-fit, minmax(...))` grids at lines 81 and 116 are already self-responsive (auto-fit collapses columns on its own as the container shrinks) and are left unchanged.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'className="gamification-stats-grid"' app/gamification/page.tsx`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add app/gamification/page.tsx
git commit -m "fix: collapse gamification 4-stat row to 2 columns on mobile"
```

---

### Task 5: `app/camera-to-text/page.tsx`

**Files:**
- Modify: `app/camera-to-text/page.tsx:31`

**Interfaces:**
- Consumes: `.camera-grid` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'gridTemplateColumns: "1fr 1fr"' app/camera-to-text/page.tsx`
Expected: one match at line 31.

- [ ] **Step 2: Apply the class**

Replace:

```tsx
        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
```

with:

```tsx
        <div className="camera-grid">
```

Note: the `repeat(auto-fit, minmax(220px, 1fr))` "Details" grid at line 80 is already self-responsive and left unchanged.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'className="camera-grid"' app/camera-to-text/page.tsx`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add app/camera-to-text/page.tsx
git commit -m "fix: stack camera preview and results list on mobile"
```

---

### Task 6: `app/text-to-sign/page.tsx`

**Files:**
- Modify: `app/text-to-sign/page.tsx:67`

**Interfaces:**
- Consumes: `.text-to-sign-steps-grid` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'gridTemplateColumns: "repeat(3, 1fr)"' app/text-to-sign/page.tsx`
Expected: one match at line 67.

- [ ] **Step 2: Apply the class**

Replace:

```tsx
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
```

with:

```tsx
          <div className="text-to-sign-steps-grid">
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'className="text-to-sign-steps-grid"' app/text-to-sign/page.tsx`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add app/text-to-sign/page.tsx
git commit -m "fix: stack text-to-sign explainer steps on mobile"
```

---

### Task 7: `app/sign-language/page.tsx`

**Files:**
- Modify: `app/sign-language/page.tsx:233`, `app/sign-language/page.tsx:325`

**Interfaces:**
- Consumes: `.sign-language-layout`, `.sign-language-lesson-grid` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'gridTemplateColumns' app/sign-language/page.tsx`
Expected: two matches — line 233 (`"240px 1fr"`) and line 325 (`"1fr 1fr"`).

- [ ] **Step 2: Apply the classes**

Replace:

```tsx
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, marginTop: 40, alignItems: "start" }}>
```

with:

```tsx
        <div className="sign-language-layout">
```

Then replace:

```tsx
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
```

with:

```tsx
              <div className="sign-language-lesson-grid">
```

Note: the horizontal gesture-thumbnail strip (`overflowX: "auto"`, around line 280) is an intentional horizontal scroller, not a grid — leave it untouched.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'gridTemplateColumns' app/sign-language/page.tsx`
Expected: no matches remain.

- [ ] **Step 5: Commit**

```bash
git add app/sign-language/page.tsx
git commit -m "fix: stack sign-language sidebar and lesson split on mobile"
```

---

### Task 8: `app/subtitles/page.tsx` — fix the dead Tailwind-class bug

**Files:**
- Modify: `app/subtitles/page.tsx:1188`

**Interfaces:**
- Consumes: `.subtitles-layout` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'grid-cols-1 lg:grid-cols' app/subtitles/page.tsx`
Expected: one match at line 1188. This line has both an inline `gridTemplateColumns: "1fr 280px"` and a Tailwind class `lg:grid-cols-[1fr_280px]` — the inline style always wins, so the Tailwind responsive class currently does nothing at any viewport width.

- [ ] **Step 2: Replace both with the new class**

Replace:

```tsx
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }} className="grid-cols-1 lg:grid-cols-[1fr_280px]">
```

with:

```tsx
        <div className="subtitles-layout">
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'gridTemplateColumns: "1fr 280px"\|grid-cols-\[1fr_280px\]' app/subtitles/page.tsx`
Expected: no matches remain.

- [ ] **Step 5: Commit**

```bash
git add app/subtitles/page.tsx
git commit -m "fix: replace dead inline-vs-Tailwind grid conflict on subtitles page with working responsive class"
```

---

### Task 9: `app/subtitles/transcript/page.tsx`

**Files:**
- Modify: `app/subtitles/transcript/page.tsx:470`

**Interfaces:**
- Consumes: `.transcript-layout`, `.transcript-layout--split` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'aiSummary || aiResponse' app/subtitles/transcript/page.tsx`
Expected: a match at line 470 showing the grid's `gridTemplateColumns` is computed inline from JS state (`(aiSummary || aiResponse) ? "1fr 320px" : "1fr"`). This must become a conditional `className`, not an inline value, because an inline `style` always overrides a CSS class's `@media` rule — a class-based override could never win against this even if added alongside it.

- [ ] **Step 2: Replace the inline conditional style with a conditional className**

Replace:

```tsx
        <div style={{ display: "grid", gridTemplateColumns: (aiSummary || aiResponse) ? "1fr 320px" : "1fr", gap: 24, alignItems: "start" }}>
```

with:

```tsx
        <div className={`transcript-layout ${(aiSummary || aiResponse) ? "transcript-layout--split" : ""}`}>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'transcript-layout' app/subtitles/transcript/page.tsx`
Expected: one match, using the conditional `className` form above; no `gridTemplateColumns` computed from `aiSummary`/`aiResponse` remains.

- [ ] **Step 5: Commit**

```bash
git add app/subtitles/transcript/page.tsx
git commit -m "fix: drive transcript two-column layout from a class so mobile can override it"
```

---

### Task 10: `app/sign-language/practice/page.tsx`

**Files:**
- Modify: `app/sign-language/practice/page.tsx:351`

**Interfaces:**
- Consumes: `.practice-layout` (from Task 1).

- [ ] **Step 1: Confirm current state**

Run: `grep -n 'gridTemplateColumns: "1fr 1fr"' app/sign-language/practice/page.tsx`
Expected: one match at line 351 — the page's core camera-column / controls-column split. Also run: `grep -c "@media" app/sign-language/practice/page.tsx` — expect `0` (confirms this file has no responsive handling at all yet, despite one `<style>` block existing for a `@keyframes spin` animation only).

- [ ] **Step 2: Apply the class**

Replace:

```tsx
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
```

with:

```tsx
        <div className="practice-layout">
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Verify**

Run: `grep -n 'className="practice-layout"' app/sign-language/practice/page.tsx`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add app/sign-language/practice/page.tsx
git commit -m "fix: stack webcam camera column and controls column on mobile"
```

---

### Task 11: Final full-site verification sweep

**Files:**
- None modified — read-only verification across all of Tasks 1–10's changes plus the files that were audited and confirmed to need no changes.

**Interfaces:**
- None — this task only verifies.

- [ ] **Step 1: Full production build**

Run: `npm run build` (from `landing/`)
Expected: build succeeds with no errors across the whole `app/` directory.

- [ ] **Step 2: Sweep for any remaining unhandled fixed multi-column grids**

Run:
```bash
grep -rn 'gridTemplateColumns: "[0-9]\|gridTemplateColumns: "repeat([2-9]' app --include=*.tsx
```
Expected: no matches outside of `repeat(auto-fit, minmax(...))` patterns (those are self-responsive and intentionally left alone — e.g. `app/gamification/page.tsx:81,116`, `app/camera-to-text/page.tsx:80`, `app/subtitles/page.tsx:1884`, `app/subtitles/transcript/page.tsx:328`) and the two small button grids intentionally left as-is (`app/subtitles/page.tsx:1805` 4-col font-size picker, `:1818` 2-col color picker, `app/subtitles/transcript/page.tsx:573` `100px 1fr` timeline row, `app/ai-tutor/page.tsx:71` 2-stat mini-grid). If any *other* fixed multi-column grid turns up, it was missed by the audit — open a follow-up task for it rather than expanding this one silently.

- [ ] **Step 3: Confirm all new classes are defined and referenced**

Run:
```bash
for c in pricing-compare-grid ai-tutor-grid gamification-stats-grid camera-grid text-to-sign-steps-grid sign-language-layout sign-language-lesson-grid subtitles-layout transcript-layout practice-layout; do
  echo "$c: defined=$(grep -c "\.$c {" app/globals.css) used=$(grep -rl "className=\"$c\"\|className={\`$c" app --include=*.tsx | wc -l)"
done
```
Expected: every class shows `defined=1` (or `1` plus the `--split`/media-query override lines) and `used=1`.

- [ ] **Step 4: No commit needed**

This task is verification-only; if Step 2 or Step 3 surfaces a gap, fix it under the relevant task above and re-run this sweep before considering the plan complete.
