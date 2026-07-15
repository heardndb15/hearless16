# Landing Dark Navy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Hearless landing site into a single dark-navy theme (no light/dark toggle) with a starfield/texture background, reusing the already-verified `sitewide-dark-mode-sweep` branch's CSS-variable migration instead of redoing it.

**Architecture:** Merge the `worktree-sitewide-dark-mode-sweep` branch into `master` (it already turned every in-scope hardcoded color into a CSS variable and added a `[data-theme="dark"]` block). Collapse that into a single navy `:root` palette, delete the now-unused light/dark toggle machinery, add one new `StarfieldBackground` component rendered once in the root layout, and clean up the handful of literals the source branch deliberately left untouched (box-shadows) or that don't exist in it (`about/page.tsx` needed no changes — already token-driven).

**Tech Stack:** Next.js 14 (App Router), plain inline `style={{}}` objects (no CSS-in-JS, no Tailwind for colors), CSS custom properties in `globals.css`. No test framework exists in `landing/` — verification is `npx tsc --noEmit`, `npm run build`, `git grep`, and manual visual checks via the dev server, run from the `landing/` directory.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-landing-dark-navy-redesign-design.md`.
- Scope is `landing/` only. Do not touch the mobile app (Expo), backend, or dashboard behavior.
- Do not change page structure, copy, section order, or the `ru`/`en`/`kz` language switcher logic — this is a color-only redesign.
- There is exactly one theme. No `[data-theme]` toggle, no theme-switch button, no `localStorage` theme persistence.
- `--dark` stays constant at `#1A1A2E` in the new palette too (per the source branch's own rule: `Download.tsx` pairs `var(--dark)` background with `var(--white)` text as a permanently-dark surface, outside this plan's file list — do not touch it).
- Every color value used in a task below is copied verbatim from the design spec or from direct inspection of the source branch — do not invent new hex values.

---

### Task 1: Merge `sitewide-dark-mode-sweep` into master

**Files:**
- Merge commit touching ~29 files (see `git diff master worktree-sitewide-dark-mode-sweep --stat`).

**Interfaces:**
- Produces: every file in `landing/` on a CSS-variable-driven color system (`var(--bg)`, `var(--bgCard)`, `var(--text)`, etc.), a `ThemeContext`/`ThemeProvider` at `landing/lib/ThemeContext.tsx`, and a theme-toggle button in `landing/components/Header.tsx`. Later tasks in this plan remove the toggle and reskin the palette.

- [ ] **Step 1: Confirm the merge is clean**

```bash
git merge-base master worktree-sitewide-dark-mode-sweep
git merge-tree $(git merge-base master worktree-sitewide-dark-mode-sweep) master worktree-sitewide-dark-mode-sweep
```

Expected: the `merge-tree` output contains no `<<<<<<<` conflict markers (confirmed clean during planning — master and the branch only share one unrelated commit ahead on each side).

- [ ] **Step 2: Merge**

```bash
git merge worktree-sitewide-dark-mode-sweep -m "Merge sitewide-dark-mode-sweep into master

Brings in the CSS-variable color migration and light/dark toggle
infra that the dark navy landing redesign builds on top of."
```

- [ ] **Step 3: Verify the build still passes post-merge**

```bash
cd landing
npx tsc --noEmit
npm run build
```

Expected: both commands exit 0 (the source branch's own plan required this after every task, so a clean merge should already pass).

---

### Task 2: Collapse the palette to a single navy dark theme

**Files:**
- Modify: `landing/app/globals.css:7-58`

**Interfaces:**
- Produces: every CSS variable consumed by the rest of the codebase (`--bg`, `--bgCard`, `--bgCardHover`, `--bgLight`, `--accent`, `--chipBg`, `--text`, `--textSecondary`, `--textMuted`, `--border`, `--borderLight`, `--sos`, `--danger`, `--background`, `--white`, `--card`, `--heading`, `--button`, `--dark`, `--success`, `--radius`, `--radiusSm`, `--radiusXl`, `--headerBg`, `--overlay`, `--shadow`, `--shadowStrong`, `--gradient-accent`, `--gradient-soft`) now resolve to the navy values below, defined once in `:root` (no `[data-theme="dark"]` block).

- [ ] **Step 1: Replace the `:root` block and delete the `[data-theme="dark"]` block**

After the merge, `landing/app/globals.css` has a `:root { ... }` block followed by a `[data-theme="dark"] { ... }` block (lines 7–58). Replace both with this single block:

```css
:root {
  --bg: #0A0E1A;
  --bgCard: #12182A;
  --bgCardHover: #1A2138;
  --bgLight: #0A0E1A;
  --accent: #4C8DDB;
  --chipBg: rgba(76, 141, 219, 0.15);
  --text: #F5F5F7;
  --textSecondary: #9AA5BD;
  --textMuted: #9AA5BD;
  --border: rgba(255, 255, 255, 0.08);
  --borderLight: rgba(255, 255, 255, 0.08);
  --sos: #ef4444;
  --danger: #F87171;
  --background: var(--bg);
  --white: #FFFFFF;
  --card: #12182A;
  --heading: #F5F5F7;
  --button: #4C8DDB;
  --dark: #1A1A2E;
  --success: #22C55E;
  --radius: 16px;
  --radiusSm: 12px;
  --radiusXl: 16px;
  --headerBg: rgba(10, 14, 26, 0.85);
  --overlay: rgba(0, 0, 0, 0.6);
  --shadow: 0 2px 12px rgba(0,0,0,0.4);
  --shadowStrong: 0 16px 48px rgba(0,0,0,0.5);
  --gradient-accent: linear-gradient(135deg, #4C8DDB, #22C1C3);
  --gradient-soft: linear-gradient(135deg, #0F1720, #0A0E1A);
}
```

(`--card`, `--heading`, `--button` mirror `--bgCard`/`--text`/`--accent` respectively — the same duplication pattern the original light-mode `:root` already used, kept for consistency rather than introduced fresh.)

- [ ] **Step 2: Verify no `[data-theme]` selector remains**

```bash
cd landing
grep -rn "data-theme" app/globals.css
```

Expected: no output.

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Collapse landing palette to a single navy dark theme"
```

---

### Task 3: Remove the light/dark toggle

**Files:**
- Delete: `landing/lib/ThemeContext.tsx`
- Modify: `landing/components/Providers.tsx` (full file)
- Modify: `landing/app/layout.tsx` (full file)
- Modify: `landing/components/Header.tsx:1-16,110-140,215-245`

**Interfaces:**
- Consumes: nothing from Task 2.
- Produces: `Header.tsx` no longer imports or calls `useTheme`. No component in the codebase does after this task (verified in Step 5).

- [ ] **Step 1: Delete the theme context**

```bash
cd landing
rm lib/ThemeContext.tsx
```

- [ ] **Step 2: Revert `Providers.tsx`**

Full file, `landing/components/Providers.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "../lib/LanguageContext";

export default function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
```

- [ ] **Step 3: Remove the anti-FOUC theme script from `layout.tsx`**

Full file, `landing/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "../components/Providers";

export const metadata: Metadata = {
  title: "Hearless — AI-платформа для глухих и слабослышащих",
  description:
    "Hearless переводит речь в текст, распознаёт звуки, учит жестовому языку с помощью ИИ. Первая AI-платформа в Казахстане и Центральной Азии.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

(Task 4 adds one more line here for `StarfieldBackground` — don't worry about that yet.)

- [ ] **Step 4: Strip the toggle out of `Header.tsx`**

Remove the import (near the top of the file):

```tsx
import { useTheme } from "../lib/ThemeContext";
```

Remove the hook call inside `Header()`:

```tsx
  const { theme, setTheme } = useTheme();
```

Remove the desktop toggle button (sits between the language-switcher `<div>` and the `authChecked` auth-buttons block):

```tsx
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={theme === "light" ? "Тёмная тема" : "Светлая тема"}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bgCard)",
                color: "var(--textSecondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

```

Remove the mobile-drawer toggle button (sits between the mobile language switcher and the mobile auth-buttons block):

```tsx
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={theme === "light" ? "Тёмная тема" : "Светлая тема"}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--chipBg)",
                color: "var(--textSecondary)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                marginBottom: 10,
              }}
            >
              {theme === "light" ? "🌙 Тёмная тема" : "☀️ Светлая тема"}
            </button>

```

- [ ] **Step 5: Verify nothing else references the removed theme APIs**

```bash
cd landing
grep -rn "useTheme\|ThemeProvider\|ThemeContext\|hearless-theme" --include="*.tsx" --include="*.ts" .
```

Expected: no output.

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove light/dark theme toggle — site is dark-only now"
```

---

### Task 4: Add the sitewide starfield background

**Files:**
- Create: `landing/components/StarfieldBackground.tsx`
- Modify: `landing/app/layout.tsx:12-20` (the `<body>` from Task 3)

**Interfaces:**
- Produces: `StarfieldBackground` — a default-exported, prop-less React component, rendered once, that paints a fixed full-viewport decorative layer behind all page content.

- [ ] **Step 1: Create the component**

`landing/components/StarfieldBackground.tsx`:

```tsx
const STARS: { top: string; left: string; size: number; opacity: number }[] = [
  { top: "8%", left: "12%", size: 14, opacity: 0.7 },
  { top: "14%", left: "82%", size: 10, opacity: 0.5 },
  { top: "22%", left: "45%", size: 16, opacity: 0.6 },
  { top: "30%", left: "68%", size: 8, opacity: 0.45 },
  { top: "38%", left: "20%", size: 12, opacity: 0.55 },
  { top: "46%", left: "90%", size: 10, opacity: 0.5 },
  { top: "52%", left: "8%", size: 18, opacity: 0.65 },
  { top: "58%", left: "55%", size: 9, opacity: 0.4 },
  { top: "64%", left: "35%", size: 13, opacity: 0.5 },
  { top: "70%", left: "78%", size: 11, opacity: 0.55 },
  { top: "76%", left: "15%", size: 15, opacity: 0.6 },
  { top: "82%", left: "60%", size: 8, opacity: 0.4 },
  { top: "88%", left: "40%", size: 12, opacity: 0.5 },
  { top: "93%", left: "85%", size: 10, opacity: 0.45 },
  { top: "97%", left: "25%", size: 14, opacity: 0.55 },
];

export default function StarfieldBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse 120% 80% at 20% 10%, #1A2440 0%, transparent 55%)," +
          "radial-gradient(ellipse 100% 70% at 80% 25%, #131C33 0%, transparent 60%)," +
          "radial-gradient(ellipse 90% 90% at 50% 95%, #0C1120 0%, transparent 70%)," +
          "linear-gradient(160deg, #0A0E1A 0%, #10182C 50%, #0A0E1A 100%)",
      }}
    >
      {STARS.map((s, i) => (
        <svg
          key={i}
          width={s.size}
          height={s.size}
          viewBox="0 0 24 24"
          fill="#AFC6EA"
          style={{ position: "absolute", top: s.top, left: s.left, opacity: s.opacity }}
        >
          <path d="M12 0l2 10 10 2-10 2-2 10-2-10L0 12l10-2z" />
        </svg>
      ))}
    </div>
  );
}
```

No `"use client"` needed — it's static markup, so it can render as a server component.

- [ ] **Step 2: Render it in the root layout**

In `landing/app/layout.tsx`, add the import and render `<StarfieldBackground />` as the first child of `<body>`, before `<Providers>`:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "../components/Providers";
import StarfieldBackground from "../components/StarfieldBackground";

export const metadata: Metadata = {
  title: "Hearless — AI-платформа для глухих и слабослышащих",
  description:
    "Hearless переводит речь в текст, распознаёт звуки, учит жестовому языку с помощью ИИ. Первая AI-платформа в Казахстане и Центральной Азии.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <StarfieldBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

This works because `landing/app/globals.css` already sets `.container { position: relative; z-index: 5; }` and `section { position: relative; }` — real content stacks above the `z-index: 0` starfield without any further changes.

- [ ] **Step 3: Build check**

```bash
cd landing
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 4: Visual check**

```bash
npm run dev
```

Open `http://localhost:3000/` — expect a dark navy background with faint star sparkles visible behind the Hero section (where there's no opaque card covering the full width).

- [ ] **Step 5: Commit**

```bash
git add components/StarfieldBackground.tsx app/layout.tsx
git commit -m "Add sitewide starfield background"
```

---

### Task 5: Fix leftover light-mode shadows — Features, SubtitleDemo, CTASection

**Files:**
- Modify: `landing/components/Features.tsx:32,41,47`
- Modify: `landing/components/SubtitleDemo.tsx:110`
- Modify: `landing/components/CTASection.tsx:92`

**Interfaces:**
- Consumes: `--shadow` / `--shadowStrong` from Task 2.

These three files already use `var(--bgCard)`/`var(--border)` for backgrounds and borders (migrated by the source branch) — only their `boxShadow` values are still light-mode literals (the source branch's plan explicitly left `box-shadow` out of scope). `CTASection.tsx:27`'s decorative `radial-gradient(circle, rgba(0, 0, 0,0.08)...)` blob is a standalone decoration, not a background/text pair — leave it unchanged.

- [ ] **Step 1: `Features.tsx` — three `boxShadow` sites**

```tsx
// Line 32 (card style):
boxShadow: "0 2px 16px rgba(0, 0, 0,0.07)",
// becomes:
boxShadow: "var(--shadow)",

// Line 41 (onMouseEnter):
e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0,0.12)";
// becomes:
e.currentTarget.style.boxShadow = "var(--shadowStrong)";

// Line 47 (onMouseLeave):
e.currentTarget.style.boxShadow = "0 2px 16px rgba(0, 0, 0,0.07)";
// becomes:
e.currentTarget.style.boxShadow = "var(--shadow)";
```

- [ ] **Step 2: `SubtitleDemo.tsx` — one `boxShadow` site**

```tsx
// Line 110:
boxShadow: "0 8px 20px rgba(0, 0, 0,0.07)",
// becomes:
boxShadow: "var(--shadow)",
```

- [ ] **Step 3: `CTASection.tsx` — one `boxShadow` site**

```tsx
// Line 92:
boxShadow: "0 8px 20px rgba(0, 0, 0,0.07)",
// becomes:
boxShadow: "var(--shadow)",
```

- [ ] **Step 4: Verify no `rgba(0, 0, 0` boxShadow literals remain in these three files**

```bash
cd landing
grep -n "rgba(0, 0, 0" components/Features.tsx components/SubtitleDemo.tsx components/CTASection.tsx
```

Expected: only the `CTASection.tsx:27` decorative radial-gradient line remains (that one is intentionally left as-is per this task's description).

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/Features.tsx components/SubtitleDemo.tsx components/CTASection.tsx
git commit -m "Adapt Features/SubtitleDemo/CTASection shadows to dark theme tokens"
```

---

### Task 6: Fix leftover literals — GamificationSection.tsx

**Files:**
- Modify: `landing/components/GamificationSection.tsx:27,30,31,54,223,226,227,236,271`

**Interfaces:**
- Consumes: `--bgCard`, `--border`, `--shadow`, `--white` from Task 2.

- [ ] **Step 1: User-card background/border/shadow (lines 27, 30, 31)**

```tsx
// Before:
style={{
  background: "#FFFFFF",
  borderRadius: "var(--radius)",
  padding: "32px 28px",
  border: "1px solid rgba(0, 0, 0,0.12)",
  boxShadow: "0 2px 16px rgba(0, 0, 0,0.07)",
}}
// After:
style={{
  background: "var(--bgCard)",
  borderRadius: "var(--radius)",
  padding: "32px 28px",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
}}
```

- [ ] **Step 2: Avatar-circle text color (line 54)**

```tsx
// Before:
color: "white",
// After (this is text on a `var(--accent)` circle):
color: "var(--white)",
```

- [ ] **Step 3: Achievement stat tiles (lines 136, 162) — border only**

Both sites look like:

```tsx
// Before:
background: "var(--bg)",
border: "1px solid rgba(0, 0, 0,0.12)",
// After:
background: "var(--bg)",
border: "1px solid var(--border)",
```

- [ ] **Step 4: Achievement card background/border/shadow (lines 223, 226, 227)**

```tsx
// Before:
style={{
  background: "#FFFFFF",
  borderRadius: "var(--radius)",
  padding: "24px 20px",
  border: "1px solid rgba(0, 0, 0,0.12)",
  boxShadow: "0 2px 16px rgba(0, 0, 0,0.07)",
  textAlign: "center",
  transition: "all 0.3s ease",
}}
// After:
style={{
  background: "var(--bgCard)",
  borderRadius: "var(--radius)",
  padding: "24px 20px",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  textAlign: "center",
  transition: "all 0.3s ease",
}}
```

- [ ] **Step 5: Achievement card `onMouseLeave` border restore (line 236)**

```tsx
// Before:
onMouseLeave={(e) => {
  e.currentTarget.style.borderColor = "rgba(0, 0, 0,0.12)";
  e.currentTarget.style.transform = "translateY(0)";
}}
// After:
onMouseLeave={(e) => {
  e.currentTarget.style.borderColor = "var(--border)";
  e.currentTarget.style.transform = "translateY(0)";
}}
```

- [ ] **Step 6: CTA-mini text color (line 271)**

```tsx
// Before:
color: "white",
// After (text on the `var(--accent)` CTA-mini background):
color: "var(--white)",
```

- [ ] **Step 7: Verify no light-mode literals remain**

```bash
cd landing
grep -n '"#FFFFFF"\|rgba(0, 0, 0\|: "white"' components/GamificationSection.tsx
```

Expected: no output.

- [ ] **Step 8: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add components/GamificationSection.tsx
git commit -m "Adapt GamificationSection to dark theme tokens"
```

---

### Task 7: Fix leftover literals — TextToSpeechSection.tsx

**Files:**
- Modify: `landing/components/TextToSpeechSection.tsx:84,100,103,104,116,136,157`

**Interfaces:**
- Consumes: `--bgCard`, `--border`, `--shadow`, `--white`, `--danger` from Task 2.

- [ ] **Step 1: Language pills (line 84)**

```tsx
// Before:
background: lang === l.key ? "var(--accent)" : "white",
color: lang === l.key ? "white" : "var(--textSecondary)",
// After:
background: lang === l.key ? "var(--accent)" : "var(--bgCard)",
color: lang === l.key ? "var(--white)" : "var(--textSecondary)",
```

- [ ] **Step 2: Card background/border/shadow (lines 100, 103, 104)**

```tsx
// Before:
style={{
  background: "#FFFFFF",
  borderRadius: "var(--radius)",
  padding: "28px 24px",
  border: "1px solid rgba(0, 0, 0,0.12)",
  boxShadow: "0 8px 20px rgba(0, 0, 0,0.07)",
}}
// After:
style={{
  background: "var(--bgCard)",
  borderRadius: "var(--radius)",
  padding: "28px 24px",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
}}
```

- [ ] **Step 3: Textarea border (line 116)**

```tsx
// Before:
border: "1px solid rgba(0, 0, 0,0.12)",
// After:
border: "1px solid var(--border)",
```

(this is the `<textarea>`'s own style block — same literal, different element than Step 2)

- [ ] **Step 4: Demo-phrase pill border (line 136)**

```tsx
// Before:
border: "1px solid rgba(0, 0, 0,0.12)",
// After:
border: "1px solid var(--border)",
```

- [ ] **Step 5: Error text color (line 157)**

```tsx
// Before:
{error && <div style={{ marginTop: 16, color: "#DC2626", fontSize: 13 }}>{error}</div>}
// After:
{error && <div style={{ marginTop: 16, color: "var(--danger)", fontSize: 13 }}>{error}</div>}
```

- [ ] **Step 6: Verify no light-mode literals remain**

```bash
cd landing
grep -n '"#FFFFFF"\|rgba(0, 0, 0\|: "white"\|#DC2626' components/TextToSpeechSection.tsx
```

Expected: no output.

- [ ] **Step 7: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add components/TextToSpeechSection.tsx
git commit -m "Adapt TextToSpeechSection to dark theme tokens"
```

---

### Task 8: Fix leftover literals — LanguageSection.tsx

**Files:**
- Modify: `landing/components/LanguageSection.tsx:49,52,53`

**Interfaces:**
- Consumes: `--bgCard`, `--border`, `--shadow` from Task 2.

- [ ] **Step 1: Language card background/border/shadow**

```tsx
// Before:
style={{
  background: "#FFFFFF",
  borderRadius: "var(--radius)",
  padding: "32px 28px",
  border: "1px solid rgba(0, 0, 0,0.12)",
  boxShadow: "0 2px 16px rgba(0, 0, 0,0.07)",
  position: "relative",
  overflow: "hidden",
}}
// After:
style={{
  background: "var(--bgCard)",
  borderRadius: "var(--radius)",
  padding: "32px 28px",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  position: "relative",
  overflow: "hidden",
}}
```

- [ ] **Step 2: Verify no light-mode literals remain**

```bash
cd landing
grep -n '"#FFFFFF"\|rgba(0, 0, 0' components/LanguageSection.tsx
```

Expected: no output.

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/LanguageSection.tsx
git commit -m "Adapt LanguageSection to dark theme tokens"
```

---

### Task 9: Fix leftover shadows — Header.tsx

**Files:**
- Modify: `landing/components/Header.tsx:62,78,175` (line numbers as of pre-Task-3 file; re-locate by content after Task 3's edits)

**Interfaces:**
- Consumes: `--shadow`, `--shadowStrong` from Task 2.

- [ ] **Step 1: Header bar shadow**

```tsx
// Before (in the outer <header> style):
boxShadow: "0 2px 16px rgba(0, 0, 0,0.06)",
// After:
boxShadow: "var(--shadow)",
```

- [ ] **Step 2: Desktop nav dropdown shadow**

```tsx
// Before:
boxShadow: "0 8px 24px rgba(0, 0, 0,0.1)",
// After:
boxShadow: "var(--shadowStrong)",
```

- [ ] **Step 3: Mobile drawer panel shadow**

```tsx
// Before:
boxShadow: "0 16px 40px rgba(0, 0, 0,0.15)",
// After:
boxShadow: "var(--shadowStrong)",
```

- [ ] **Step 4: Verify no `rgba(0, 0, 0` boxShadow literals remain**

```bash
cd landing
grep -n "rgba(0, 0, 0" components/Header.tsx
```

Expected: no output.

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/Header.tsx
git commit -m "Adapt Header shadows to dark theme tokens"
```

---

### Task 10: Fix leftover shadows — PricingSection.tsx and pricing/page.tsx

**Files:**
- Modify: `landing/components/PricingSection.tsx:54-55`
- Modify: `landing/app/pricing/page.tsx:147-149,254,304`

**Interfaces:**
- Consumes: `--shadow`, `--shadowStrong` from Task 2.

- [ ] **Step 1: `PricingSection.tsx` highlighted/regular plan shadow**

```tsx
// Before:
boxShadow: plan.highlight
  ? "0 16px 48px rgba(0, 0, 0,0.28)"
  : "0 2px 16px rgba(0, 0, 0,0.07)",
// After:
boxShadow: plan.highlight
  ? "var(--shadowStrong)"
  : "var(--shadow)",
```

- [ ] **Step 2: `pricing/page.tsx` plan-card shadow (lines 147-149)**

```tsx
// Before:
boxShadow: plan.highlight
  ? "0 20px 60px rgba(0, 0, 0,0.3)"
  : "0 2px 20px rgba(0, 0, 0,0.07)",
// After:
boxShadow: plan.highlight
  ? "var(--shadowStrong)"
  : "var(--shadow)",
```

- [ ] **Step 3: `pricing/page.tsx` compare-table shadow (line 254)**

```tsx
// Before:
<div style={{ background: "var(--bgCard)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 4px 24px rgba(0, 0, 0,0.07)" }}>
// After:
<div style={{ background: "var(--bgCard)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow)" }}>
```

- [ ] **Step 4: `pricing/page.tsx` FAQ item shadow (line 304)**

```tsx
// Before:
<div key={i} style={{ background: "var(--bgCard)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 12px rgba(0, 0, 0,0.05)" }}>
// After:
<div key={i} style={{ background: "var(--bgCard)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow)" }}>
```

- [ ] **Step 5: Verify no `rgba(0, 0, 0` boxShadow literals remain in either file**

```bash
cd landing
grep -n "rgba(0, 0, 0" components/PricingSection.tsx app/pricing/page.tsx
```

Expected: no output.

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add components/PricingSection.tsx app/pricing/page.tsx
git commit -m "Adapt PricingSection and pricing page shadows to dark theme tokens"
```

---

### Task 11: Final verification pass

**Files:** none (verification only).

**Interfaces:** none.

Notes for this task:
- `Hero.tsx` and `about/page.tsx` need **no** edits in this plan. `Hero.tsx`'s remaining `rgba(0,0,0`/hardcoded-hex literals (`#64748b`, `#4ade80`, the `#FFFFFF` subtitle card, its `rgba(0, 0, 0,0.08)` shadow) all live inside the phone-mockup illustration, which renders its own self-contained "app screenshot" look (dark phone frame image + a white in-app subtitle card) independent of the page theme — repainting them would make the mockup look broken, not fixed. `about/page.tsx` was already fully token-driven before this plan started (`var(--gradient-soft)`, `var(--accent)`, `var(--heading)`, `var(--textSecondary)`), so it inherits the new palette with zero code changes.

- [ ] **Step 1: Full build check**

```bash
cd landing
npx tsc --noEmit
npm run build
```

Expected: both exit 0.

- [ ] **Step 2: Repo-wide literal sweep on the in-scope files**

```bash
grep -rn '"#FFFFFF"\|: "white"\|rgba(0, 0, 0' \
  app/page.tsx app/pricing/page.tsx app/about/page.tsx \
  components/Hero.tsx components/Features.tsx components/SubtitleDemo.tsx \
  components/TextToSpeechSection.tsx components/LanguageSection.tsx \
  components/GamificationSection.tsx components/PricingSection.tsx \
  components/CTASection.tsx components/Footer.tsx components/Header.tsx
```

Expected: only the two intentionally-untouched sites remain — `CTASection.tsx:27`'s decorative radial-gradient blob, and the phone-mockup literals in `Hero.tsx` described above.

- [ ] **Step 3: Manual visual pass**

```bash
npm run dev
```

Open `http://localhost:3000/`, `/pricing`, and `/about`. For each page, confirm:
- Background is dark navy with the starfield visible where sections don't have an opaque card.
- No text is invisible or low-contrast against its background (this is the exact bug class the source branch fixed for the toggle — recheck it here since dark is now the *only* state, not an opt-in one).
- Hero's phone mockup still looks like a normal "app screenshot" (light subtitle card inside a dark phone frame) rather than an all-dark, contrast-less block.
- The Header's theme-toggle button is gone; the language switcher (RU/ENG/ҚАЗ) still works.
- Pricing page: plan cards, compare table, and FAQ accordion are all legible; the "★ Популярный" badge is still a clear plaque.

- [ ] **Step 4: Report back**

Note in the PR/commit description any spot that failed the manual visual pass so it can be fixed before merging — do not silently patch and re-verify without recording what broke.

---
