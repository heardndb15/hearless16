# Sitewide Dark-Mode Safety Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site-wide light/dark theme toggle safe everywhere by replacing hardcoded background/text/border color literals with CSS variables (no visual change in light mode), so text never sits on a background that fails to flip with it.

**Architecture:** A `ThemeContext` (mirrors the existing `LanguageContext` pattern) plus a blocking inline script in `layout.tsx` set `data-theme` on `<html>` before first paint. `globals.css` gets a `[data-theme="dark"]` override block for every existing CSS variable. Then, file by file, hardcoded color literals that form a background/text/border pair get replaced with the matching variable — never with a new literal.

**Tech Stack:** Next.js 14 (App Router), plain inline `style={{}}` objects (no CSS-in-JS library, no Tailwind for colors), CSS custom properties in `globals.css`.

## Global Constraints

- Light theme must render **pixel-identical** to today after every task — this is a safety refactor, not a redesign. If a step would change a light-mode color, stop and re-check against this plan.
- Never delete or rename an existing CSS variable (`--chipBg`, `--textMuted`, `--white`, `--card`, `--heading`, `--button`, `--dark`, `--background`, `--radiusXl`, etc.) — pages outside this plan's file list depend on them.
- `--dark` stays **constant** (`#1A1A2E`) in both themes — do not alias it to `--text`. (`Download.tsx` pairs `var(--dark)` background with `var(--white)` text as a permanently-dark surface; flipping `--dark` would make that button's text disappear in dark mode — the exact bug class this plan fixes.)
- `box-shadow` values (inline `boxShadow` props and the `.btn-primary`/`.glass-card` etc. shadow rules) are **out of scope** — do not touch them, in any task. They're decorative, not a text/background pair, and touching them risks changing shadow weight in light mode.
- Only `background`, `color`, `border`/`borderColor`/`borderBottom`/`borderTop`, and SVG `fill`/`stroke` are in scope.
- No test framework exists in `landing/` — verification is `npx tsc --noEmit`, `npm run build`, and grep, plus manual visual checks. Run both commands from the `landing/` directory.
- Master substitution table (applies to every task below unless a task says otherwise):

  | Literal | Role | Replace with |
  |---|---|---|
  | `"#FFFFFF"` / `"white"` | Card/section/dropdown background | `"var(--bgCard)"` |
  | `"#FFFFFF"` / `"white"` | Text/icon color sitting on an accent/gradient-colored background | `"var(--white)"` |
  | `rgba(0, 0, 0,0.06..0.2)` used as a border/borderColor/borderBottom/borderTop | Border | `"var(--border)"` |
  | `#94a3b8` | Muted/inactive text | `"var(--textMuted)"` |
  | `#DC2626` | Error text | `"var(--danger)"` |
  | `rgba(12,74,110,0.35)` | Backdrop behind a mobile menu/modal | `"var(--overlay)"` |
  | `rgba(255,255,255,0.1..0.35)` sitting **on top of** a `var(--accent)`/`var(--gradient-accent)` background | Translucent border/fill on an accent surface | leave unchanged (accent never inverts to near-white/near-black, so this is already safe) |
  | Any color inside a self-contained media overlay (video caption/controls rendered on top of arbitrary video content, e.g. `VideoWithSubtitles.tsx`) | Not tied to page theme | leave unchanged |

---

### Task 1: Theme context and anti-FOUC bootstrap

**Files:**
- Create: `landing/lib/ThemeContext.tsx`
- Modify: `landing/components/Providers.tsx`
- Modify: `landing/app/layout.tsx`

**Interfaces:**
- Produces: `useTheme()` hook returning `{ theme: "light" | "dark", setTheme: (t: "light" | "dark") => void }`, and the `ThemeProvider` component. Task 3 (Header) consumes both.

- [ ] **Step 1: Create the theme context**

`landing/lib/ThemeContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setThemeState(current);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("hearless-theme", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

The blocking script in Step 3 sets `data-theme` on `<html>` directly (before React hydrates), so `ThemeProvider`'s initial render always starts at `"light"` and corrects itself from the DOM attribute in `useEffect` on mount — this avoids a hydration mismatch (React never renders `data-theme` itself, only reads it back).

- [ ] **Step 2: Wire `ThemeProvider` into `Providers.tsx`**

`landing/components/Providers.tsx` — full file:

```tsx
"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "../lib/LanguageContext";
import { ThemeProvider } from "../lib/ThemeContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Add the blocking anti-FOUC script to `layout.tsx`**

`landing/app/layout.tsx` — full file:

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

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("hearless-theme");var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd landing && npx tsc --noEmit`
Expected: no errors.

Run: `cd landing && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual check**

Run `npm run dev` in `landing/`, open `http://localhost:3000` in a browser, open devtools console:
- Run `document.documentElement.getAttribute("data-theme")` — expect `"light"` or `"dark"` (matches system preference), not `null`.
- Run `localStorage.setItem("hearless-theme", "dark")` then reload — page should have `data-theme="dark"` immediately on load (no flash of light theme first).
- Confirm no hydration-mismatch warning in the console.

- [ ] **Step 6: Commit**

```bash
git add landing/lib/ThemeContext.tsx landing/components/Providers.tsx landing/app/layout.tsx
git commit -m "Add theme context and anti-FOUC bootstrap for site-wide dark mode"
```

---

### Task 2: Dark-theme token values in `globals.css`

**Files:**
- Modify: `landing/app/globals.css:7-34` (the `:root` block)

**Interfaces:**
- Produces: `[data-theme="dark"]` CSS override block. Every subsequent task relies on these values existing before its own light-mode-identical token substitutions have any visible dark-mode effect.

- [ ] **Step 1: Replace the `:root` block and add the dark override**

Replace lines 7-34 of `landing/app/globals.css` (the existing `:root { ... }` block) with:

```css
:root {
  --bg: #F4F7FB;
  --bgCard: #FFFFFF;
  --bgCardHover: #F4F7FB;
  --bgLight: #F4F7FB;
  --accent: #1565C0;
  --chipBg: #EBF3FF;
  --text: #1A1A2E;
  --textSecondary: #9CA3AF;
  --textMuted: #9CA3AF;
  --border: #E8EDF5;
  --borderLight: #E8EDF5;
  --sos: #ef4444;
  --danger: #DC2626;
  --background: var(--bg);
  --white: #FFFFFF;
  --card: #FFFFFF;
  --heading: #1A1A2E;
  --button: #1565C0;
  --dark: #1A1A2E;
  --success: #22C55E;
  --radius: 16px;
  --radiusSm: 12px;
  --radiusXl: 16px;
  --headerBg: rgba(255, 255, 255, 0.92);
  --overlay: rgba(12, 74, 110, 0.35);
  --shadow: 0 2px 12px rgba(0,0,0,0.07);
  --shadowStrong: 0 16px 48px rgba(0,0,0,0.28);
  --gradient-accent: linear-gradient(135deg, #1565C0, #22C1C3);
  --gradient-soft: linear-gradient(135deg, #CFE4FF, #FFFFFF);
}

[data-theme="dark"] {
  --bg: #0A0A0B;
  --bgCard: #131316;
  --bgCardHover: #1A1A1D;
  --bgLight: #0A0A0B;
  --accent: #4C8DDB;
  --chipBg: rgba(76, 141, 219, 0.15);
  --text: #F5F5F7;
  --textSecondary: #9A9AA2;
  --textMuted: #9A9AA2;
  --border: rgba(255, 255, 255, 0.08);
  --borderLight: rgba(255, 255, 255, 0.08);
  --danger: #F87171;
  --card: #131316;
  --heading: #F5F5F7;
  --button: #4C8DDB;
  --headerBg: rgba(10, 10, 11, 0.85);
  --overlay: rgba(0, 0, 0, 0.6);
  --shadow: 0 2px 12px rgba(0,0,0,0.4);
  --shadowStrong: 0 16px 48px rgba(0,0,0,0.5);
  --gradient-accent: linear-gradient(135deg, #4C8DDB, #22C1C3);
  --gradient-soft: linear-gradient(135deg, #0F1720, #0A0A0B);
}
```

Note what's deliberately *not* overridden in `[data-theme="dark"]`: `--sos`, `--white`, `--dark`, `--success`, `--radius`/`--radiusSm`/`--radiusXl` — these stay constant across both themes (see Global Constraints for why `--dark` specifically must not flip).

`--gradient-soft` **must** get a dark override even though nothing in this plan's scope directly restyles it — `body`'s background (`globals.css`, the `body { background: var(--gradient-soft); ... }` rule a few lines below `:root`) uses it, so without a dark value the entire page background would stay light regardless of every other fix in this plan.

- [ ] **Step 2: Update `.btn-outline` and `.glass-card` to use tokens instead of literals**

In the same file, find:

```css
.btn-outline {
  background: white;
  color: var(--accent);
  border: 1.5px solid var(--border);
}
```

Replace `background: white;` with `background: var(--bgCard);`.

Find:

```css
.glass-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
```

Replace `background: #FFFFFF;` with `background: var(--bgCard);`.

- [ ] **Step 3: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors (CSS changes don't affect TypeScript, this just confirms nothing else broke).

Open the site in a browser with dark mode off — every page should look pixel-identical to before this change (all `:root` values are unchanged from today).

- [ ] **Step 4: Commit**

```bash
git add landing/app/globals.css
git commit -m "Add dark-theme token overrides to globals.css"
```

---

### Task 3: Header — theme toggle + token migration

**Files:**
- Modify: `landing/components/Header.tsx`

**Interfaces:**
- Consumes: `useTheme()` from `landing/lib/ThemeContext.tsx` (Task 1).

- [ ] **Step 1: Replace literal colors with tokens**

In `landing/components/Header.tsx`, apply these exact replacements (line numbers refer to the file's current state):

1. Header bar style (around line 60): `background: "rgba(255,255,255,0.95)"` → `background: "var(--headerBg)"`; `borderBottom: "1px solid rgba(0, 0, 0,0.1)"` → `borderBottom: "1px solid var(--border)"`. Leave `boxShadow` untouched.
2. Dropdown panel (around line 76): `background: "#FFFFFF"` → `background: "var(--bgCard)"`; `border: "1px solid rgba(0, 0, 0,0.12)"` → `border: "1px solid var(--border)"`. Leave `boxShadow` untouched.
3. Language-switcher wrapper (around line 92): `border: "1px solid rgba(0, 0, 0,0.15)"` → `border: "1px solid var(--border)"` (its `background: "var(--bg)"` is already a token, leave it).
4. Hamburger button (around line 136): `border: "1px solid rgba(0, 0, 0,0.2)"` → `border: "1px solid var(--border)"`.
5. Mobile drawer backdrop (around line 149): `background: "rgba(12,74,110,0.35)"` → `background: "var(--overlay)"`.
6. Mobile drawer panel (around line 152): `background: "white"` → `background: "var(--bgCard)"`. Leave `boxShadow` untouched.
7. Mobile feature-link cards (around lines 157, 169, 170): `background: "#F8FBFF"` → `background: "var(--chipBg)"`; `border: "1px solid rgba(0, 0, 0,0.08)"` → `border: "1px solid var(--border)"`.
8. Mobile pricing link (around line 171): `border: "1px solid rgba(0, 0, 0,0.15)"` → `border: "1px solid var(--border)"` (its `background: "var(--chipBg)"` is already a token, leave it).

**Corrected 2026-07-14 after Task 3's first implementation pass:** the file scan that produced items 1-8 above missed the following. These are real gaps (found by the implementer's own grep verification in Step 3, which correctly did not match the brief's "expected" claim) — apply them too:

9. Language-switcher active-tab text (around line 104): `color: lang === l ? "#ffffff" : "var(--textSecondary)"` → replace `"#ffffff"` with `"var(--white)"` (text sitting on the accent-colored active tab — safe either way since accent never inverts, but the master table's rule for "text on accent background" calls for `var(--white)` explicitly).
10. Dashboard link text (around line 142): `color: "#ffffff"` → `color: "var(--white)"` (same on-accent-background role as item 9). Leave the avatar-badge `background: "rgba(255,255,255,0.25)"` on the same line unchanged — translucent white on an accent surface, already safe per the master table.
11. Desktop login link (around line 148): `background: "white"` → `background: "var(--bgCard)"` (a real gap — this is a neutral button surface, not an on-accent case).
12. Desktop register link (around line 149): `color: "#ffffff"` → `color: "var(--white)"` (on-accent text, same role as item 9).
13. Mobile drawer divider (around line 188): `borderTop: "1px solid rgba(0, 0, 0,0.1)"` → `borderTop: "1px solid var(--border)"`.
14. Mobile language-switcher inactive-tab state (around lines 207-208, the sibling of item 3's active-tab styling — same ternary, different branch): `border: lang === l ? "1.5px solid var(--accent)" : "1px solid rgba(0, 0, 0,0.15)"` → replace the inactive branch with `"1px solid var(--border)"`; `background: lang === l ? "var(--chipBg)" : "#F8FBFF"` → replace `"#F8FBFF"` with `"var(--chipBg)"`.
15. Mobile dashboard/register links (around lines 246, 252): `color: "white"` → `color: "var(--white)"` in both (on-accent text, same role as item 9).

- [ ] **Step 2: Add the theme toggle**

Add the import at the top of the file, alongside the existing `useLanguage` import:

```tsx
import { useTheme } from "../lib/ThemeContext";
```

Inside the `Header` function body, alongside the existing `const { lang, setLang, t } = useLanguage();` line, add:

```tsx
const { theme, setTheme } = useTheme();
```

In the desktop nav (`<nav className="nav-desktop" ...>`), immediately after the language-switcher `<div>` (the one mapping over `["ru", "en", "kz"]`) and before the `{!authChecked ? ... }` block, add:

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

In the mobile drawer, immediately after the "Mobile language switcher" `<div>` block and before the "Auth buttons" `<div>`, add:

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

- [ ] **Step 3: Verify no literals remain (except box-shadow)**

Run: `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" components/Header.tsx`
Expected: only matches inside `boxShadow:` lines remain.

- [ ] **Step 4: Build check**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 5: Manual check**

`npm run dev`, open the home page, click the new toggle button (desktop and, via a narrow viewport, mobile) — header, dropdown, mobile drawer all switch between light and dark colors with no invisible text or invisible borders.

- [ ] **Step 6: Commit**

```bash
git add landing/components/Header.tsx
git commit -m "Add theme toggle to Header and migrate its literals to CSS tokens"
```

---

### Task 4: Hero — token migration

**Files:**
- Modify: `landing/components/Hero.tsx`

The right-column phone mockup (everything inside the `<div className="hero-phone-col" ...>` block, roughly lines 110-243) is excluded from this task — the next spec (`landing-premium-redesign`) removes that entire block, so it's not worth tokenizing colors that are about to be deleted.

- [ ] **Step 1: Replace literal colors in the left column**

In `landing/components/Hero.tsx`, apply these exact replacements:

1. Primary CTA link (`href="/register"`, around line 74): `color: "white"` → `color: "var(--white)"`.
2. Secondary CTA link (`href="/features"`, around line 78): `background: "white"` → `background: "var(--bgCard)"`.

- [ ] **Step 2: Verify**

Run: `cd landing && rg "\"white\"|\"#FFFFFF\"" components/Hero.tsx`
Expected: no matches outside the (untouched, out-of-scope) phone mockup block.

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/components/Hero.tsx
git commit -m "Migrate Hero left-column literals to CSS tokens"
```

---

### Task 5: Features — token migration

**Files:**
- Modify: `landing/components/Features.tsx`

- [ ] **Step 1: Replace literal colors**

In `landing/components/Features.tsx`, in the `<Link>` card style object:
- `background: "#FFFFFF"` → `background: "var(--bgCard)"`
- `border: "1px solid rgba(0, 0, 0,0.12)"` → `border: "1px solid var(--border)"`

In the `onMouseEnter` handler:
- `e.currentTarget.style.borderColor = "rgba(0, 0, 0,0.3)"` → `e.currentTarget.style.borderColor = "var(--accent)"` (an accent-colored hover border is guaranteed visible in both themes; the original neutral dark-gray border would nearly vanish against the dark-theme card background)
- `e.currentTarget.style.background = "var(--bg)"` — already a token, leave unchanged.

In the `onMouseLeave` handler:
- `e.currentTarget.style.borderColor = "rgba(0, 0, 0,0.12)"` → `e.currentTarget.style.borderColor = "var(--border)"`
- `e.currentTarget.style.background = "#FFFFFF"` → `e.currentTarget.style.background = "var(--bgCard)"`

Leave the icon chip (`background: "var(--chipBg)"`) unchanged — it's already a token; this plan's job is safety, not the chip-removal redesign the next spec does.

- [ ] **Step 2: Verify**

Run: `cd landing && rg "\"white\"|\"#FFFFFF\"|rgba\(0, 0, 0," components/Features.tsx`
Expected: no matches.

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/components/Features.tsx
git commit -m "Migrate Features literals to CSS tokens"
```

---

### Task 6: SubtitleDemo — token migration

**Files:**
- Modify: `landing/components/SubtitleDemo.tsx`

- [ ] **Step 1: Replace literal colors**

1. Lang-switcher button (the ternary background): `background: lang === l ? "var(--accent)" : "white"` → replace `"white"` with `"var(--bgCard)"`.
2. Subtitle display box: `background: "#FFFFFF"` → `background: "var(--bgCard)"`; `border: "1px solid rgba(0, 0, 0,0.12)"` → `border: "1px solid var(--border)"`.
3. Textarea: `border: "1px solid rgba(0, 0, 0,0.12)"` → `border: "1px solid var(--border)"`.
4. Language pill (`<span>` showing `lang`, around line 187): `background: "rgba(0, 0, 0,0.1)"` → `background: "var(--chipBg)"`.
5. "AI" pill (around line 201): `background: "rgba(123, 94, 234, 0.1)"` → `background: "var(--chipBg)"`.
6. History items: `background: "#FFFFFF"` → `background: "var(--bgCard)"`; `border: "1px solid rgba(0, 0, 0,0.12)"` → `border: "1px solid var(--border)"`.

- [ ] **Step 2: Verify**

Run: `cd landing && rg "\"white\"|\"#FFFFFF\"|rgba\(0, 0, 0,|rgba\(123, 94, 234" components/SubtitleDemo.tsx`
Expected: no matches.

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/components/SubtitleDemo.tsx
git commit -m "Migrate SubtitleDemo literals to CSS tokens"
```

---

### Task 7: PricingSection — token migration

**Files:**
- Modify: `landing/components/PricingSection.tsx`

- [ ] **Step 1: Replace literal colors in the `Check` SVG component**

```tsx
function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="var(--border)" />
      <path d="M5 8l2 2 4-4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="var(--border)" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="var(--textMuted)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
```

(Both circle fills — originally `rgba(0, 0, 0,0.12)` and `rgba(148,163,184,0.1)` — collapse to the same `var(--border)`, and the "not ok" stroke — originally `#94a3b8` — becomes `var(--textMuted)`.)

- [ ] **Step 2: Replace literal colors in the plan cards**

In the `plans.map((plan) => ...)` block:

1. Card background: `background: plan.highlight ? "var(--gradient-accent)" : "#FFFFFF"` → replace `"#FFFFFF"` with `"var(--bgCard)"`.
2. Card border: `border: plan.highlight ? "none" : "1px solid rgba(0, 0, 0,0.15)"` → replace `"1px solid rgba(0, 0, 0,0.15)"` with `"1px solid var(--border)"`.
3. Badge text color: `color: "white"` (inside the `plan.badge &&` block) → `color: "var(--white)"`.
4. Plan name color: `color: plan.highlight ? "#FFFFFF" : "var(--text)"` → replace `"#FFFFFF"` with `"var(--white)"`.
5. Price color: `color: plan.highlight ? "#FFFFFF" : "var(--text)"` (the `<span>` with the price number) → replace `"#FFFFFF"` with `"var(--white)"`.
6. Missing-feature text: `color: plan.highlight ? "rgba(255,255,255,0.45)" : "#94a3b8"` → replace `"#94a3b8"` with `"var(--textMuted)"`.
7. CTA link text color: `color: "#FFFFFF"` (the `<Link>` at the bottom of each card) → `color: "var(--white)"`.

Leave every `rgba(255,255,255,...)` value that sits inside the `plan.highlight ?` branch (badge-free translucent overlays on the gradient-accent card) unchanged — those are on-accent surfaces, already safe (see Global Constraints table).

- [ ] **Step 3: Verify**

Run: `cd landing && rg "\"#FFFFFF\"|\"white\"|rgba\(0, 0, 0,|#94a3b8|rgba\(148,163,184" components/PricingSection.tsx`
Expected: no matches outside the `plan.highlight ?` on-accent branches (translucent white-on-gradient values), which are intentionally left as-is.

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add landing/components/PricingSection.tsx
git commit -m "Migrate PricingSection literals to CSS tokens"
```

---

### Task 8: CTASection — token migration

**Files:**
- Modify: `landing/components/CTASection.tsx`

- [ ] **Step 1: Replace literal colors**

1. Primary CTA link: `color: "white"` → `color: "var(--white)"`.
2. Secondary CTA link: `background: "white"` → `background: "var(--bgCard)"`.
3. Download-store links: `background: "#FFFFFF"` → `background: "var(--bgCard)"`; `border: "1.5px solid rgba(0, 0, 0,0.12)"` → `border: "1.5px solid var(--border)"`.
4. Download-store `onMouseEnter`/`onMouseLeave` handlers: `e.currentTarget.style.background = "var(--bg)"` (enter) — already a token, leave; `e.currentTarget.style.borderColor = "rgba(0, 0, 0,0.12)"` (leave-handler) → `"var(--border)"`; `e.currentTarget.style.background = "#FFFFFF"` (leave-handler) → `"var(--bgCard)"`.

Leave the background glow (`radial-gradient(circle, rgba(0, 0, 0,0.08) 0%, transparent 70%)`) and the section background (`var(--chipBg)`, already a token) unchanged — the glow is decorative atmosphere, not a text/background pair.

- [ ] **Step 2: Verify**

Run: `cd landing && rg "\"white\"|\"#FFFFFF\"|rgba\(0, 0, 0,0\.12" components/CTASection.tsx`
Expected: no matches.

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/components/CTASection.tsx
git commit -m "Migrate CTASection literals to CSS tokens"
```

---

### Task 9: Footer and Download — token migration

**Files:**
- Modify: `landing/components/Footer.tsx`
- Modify: `landing/components/Download.tsx`

- [ ] **Step 1: Footer**

In `landing/components/Footer.tsx`:
1. `<footer>` style: `borderTop: "1px solid rgba(0, 0, 0,0.12)"` → `borderTop: "1px solid var(--border)"`.
2. Bottom row style: `borderTop: "1px solid rgba(0, 0, 0,0.12)"` → `borderTop: "1px solid var(--border)"`.

(The logo box's `background: "var(--accent)"` / `color: "white"` — replace `"white"` with `"var(--white)"`.)

- [ ] **Step 2: Download**

In `landing/components/Download.tsx`:
- Paragraph text: `color: "#5a7a8f"` → `color: "var(--textSecondary)"`.

(`background: "var(--dark)"` / `color: "var(--white)"` on the two store-link `<a>` tags are already tokens and safe per Global Constraints — `--dark` stays constant.)

- [ ] **Step 3: Verify**

Run: `cd landing && rg "\"white\"|rgba\(0, 0, 0,|#5a7a8f" components/Footer.tsx components/Download.tsx`
Expected: no matches.

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add landing/components/Footer.tsx landing/components/Download.tsx
git commit -m "Migrate Footer and Download literals to CSS tokens"
```

---

### Task 10: `pricing/page.tsx` — token migration (confirms the original bug is fixed)

**Files:**
- Modify: `landing/app/pricing/page.tsx`

This is the file where the invisible-text bug was originally found (`var(--text)` sitting on a hardcoded `"white"` background at what are currently lines 259 and 309). Fixing the background literals those lines sit on resolves it.

- [ ] **Step 1: Replace the known literals**

1. Compare-table wrapper (currently around line 254): `background: "white"` → `background: "var(--bgCard)"`; `border: "1px solid rgba(0, 0, 0,0.12)"` → `border: "1px solid var(--border)"`.
2. Compare-table header row (currently around line 256): `borderBottom: "1px solid rgba(0, 0, 0,0.1)"` → `borderBottom: "1px solid var(--border)"` (its `background: "var(--bg)"` is already a token, leave it).
3. FAQ item wrapper (currently around line 304): `background: "white"` → `background: "var(--bgCard)"`; `border: "1px solid rgba(0, 0, 0,0.12)"` → `border: "1px solid var(--border)"`.
4. "Start free" link (currently around line 329): `background: "white"` → `background: "var(--bgCard)"` (its `color: "var(--accent)"` is already a token, leave it).
5. Contact link (currently around line 332, `background: "rgba(255,255,255,0.15)"`, `border: "1.5px solid rgba(255,255,255,0.35)"`) — before changing, check what this link's parent container's background is. If the parent is an accent/gradient-colored surface (e.g. `var(--gradient-accent)` or `var(--accent)`), leave this line unchanged (on-accent case, already safe). If the parent is a neutral/page background, replace `background: "rgba(255,255,255,0.15)"` with `"var(--bgCard)"` and `color: "white"` with `"var(--white)"`.

- [ ] **Step 2: Find and fix any remaining literals in the rest of the file**

Run: `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/pricing/page.tsx`

For every match that is a `background`, `color`, `border`/`borderColor`/`borderBottom`/`borderTop`, or SVG `fill`/`stroke` (not a `boxShadow`), apply the master substitution table from Global Constraints. Common patterns in this file: card/section backgrounds → `var(--bgCard)`; neutral borders → `var(--border)`; any `#94a3b8`-style muted text → `var(--textMuted)`.

- [ ] **Step 3: Verify the original bug is gone**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

Manually: `npm run dev`, open `/pricing`, toggle to dark theme, scroll to the plan-comparison table and the FAQ section — plan names and FAQ question text must be visible (not white-on-white).

- [ ] **Step 4: Commit**

```bash
git add landing/app/pricing/page.tsx
git commit -m "Fix invisible-text bug on /pricing compare table and FAQ; migrate remaining literals"
```

---

### Task 11: Static/error pages — token migration

**Files:**
- Modify: `landing/app/error.tsx`
- Modify: `landing/app/global-error.tsx`
- Modify: `landing/app/not-found.tsx`

- [ ] **Step 1: Sweep each file**

For each of the three files: run `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/error.tsx app/global-error.tsx app/not-found.tsx`, then apply the master substitution table (Global Constraints) to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/app/error.tsx landing/app/global-error.tsx landing/app/not-found.tsx
git commit -m "Migrate error/not-found page literals to CSS tokens"
```

---

### Task 12: Auth pages — token migration

**Files:**
- Modify: `landing/app/login/page.tsx`
- Modify: `landing/app/register/page.tsx`
- Modify: `landing/app/reset-password/page.tsx`

- [ ] **Step 1: Sweep each file**

For each file: run `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/login/page.tsx app/register/page.tsx app/reset-password/page.tsx`, then apply the master substitution table to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

Manually load `/login`, `/register`, `/reset-password` in dark mode — form fields, card backgrounds, and labels all readable.

- [ ] **Step 3: Commit**

```bash
git add landing/app/login/page.tsx landing/app/register/page.tsx landing/app/reset-password/page.tsx
git commit -m "Migrate auth page literals to CSS tokens"
```

---

### Task 13: `features/page.tsx` — token migration

**Files:**
- Modify: `landing/app/features/page.tsx`

- [ ] **Step 1: Sweep the file**

Run: `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/features/page.tsx`, then apply the master substitution table to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

Manually load `/features` in dark mode — every feature card and heading readable.

- [ ] **Step 3: Commit**

```bash
git add landing/app/features/page.tsx
git commit -m "Migrate /features literals to CSS tokens"
```

---

### Task 14: Learning-feature pages — token migration

**Files:**
- Modify: `landing/app/gamification/page.tsx`
- Modify: `landing/app/ai-tutor/page.tsx`
- Modify: `landing/app/text-to-speech/page.tsx`

- [ ] **Step 1: Sweep each file**

For each file: run `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/gamification/page.tsx app/ai-tutor/page.tsx app/text-to-speech/page.tsx`, then apply the master substitution table to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/app/gamification/page.tsx landing/app/ai-tutor/page.tsx landing/app/text-to-speech/page.tsx
git commit -m "Migrate gamification/ai-tutor/text-to-speech page literals to CSS tokens"
```

---

### Task 15: Subtitles and sign-language pages — token migration

**Files:**
- Modify: `landing/app/subtitles/page.tsx`
- Modify: `landing/app/subtitles/transcript/page.tsx`
- Modify: `landing/app/sign-language/page.tsx`

`landing/app/sign-language/practice/page.tsx` is explicitly **excluded** — it's a canvas hand-tracking view with its own fixed dark theme (`#090d16`), unrelated to the site theme (already noted as out of scope by the 2026-07-12 gradient-accents spec).

- [ ] **Step 1: Sweep each file**

For each file: run `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/subtitles/page.tsx app/subtitles/transcript/page.tsx app/sign-language/page.tsx`, then apply the master substitution table to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/app/subtitles/page.tsx landing/app/subtitles/transcript/page.tsx landing/app/sign-language/page.tsx
git commit -m "Migrate subtitles/sign-language page literals to CSS tokens"
```

---

### Task 16: Content pages — token migration

**Files:**
- Modify: `landing/app/blog/page.tsx`
- Modify: `landing/app/blog/[slug]/page.tsx`
- Modify: `landing/app/contact/page.tsx`
- Modify: `landing/app/about/page.tsx`

- [ ] **Step 1: Sweep each file**

For each file: run `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" "app/blog/page.tsx" "app/blog/[slug]/page.tsx" app/contact/page.tsx app/about/page.tsx`, then apply the master substitution table to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/app/blog/page.tsx "landing/app/blog/[slug]/page.tsx" landing/app/contact/page.tsx landing/app/about/page.tsx
git commit -m "Migrate blog/contact/about page literals to CSS tokens"
```

---

### Task 17: Dashboard pages — token migration

**Files:**
- Modify: `landing/app/dashboard/page.tsx`
- Modify: `landing/app/dashboard/learn/page.tsx`
- Modify: `landing/app/dashboard/sign-language-reader/page.tsx`

- [ ] **Step 1: Sweep each file**

For each file: run `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/dashboard/page.tsx app/dashboard/learn/page.tsx app/dashboard/sign-language-reader/page.tsx`, then apply the master substitution table to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

Manually load `/dashboard` in dark mode (requires a logged-in session, or check via component inspection) — cards, nav, and stats readable.

- [ ] **Step 3: Commit**

```bash
git add landing/app/dashboard/page.tsx landing/app/dashboard/learn/page.tsx landing/app/dashboard/sign-language-reader/page.tsx
git commit -m "Migrate dashboard page literals to CSS tokens"
```

---

### Task 18: Remaining feature pages — token migration

**Files:**
- Modify: `landing/app/camera-to-text/page.tsx`
- Modify: `landing/app/alerts/page.tsx`
- Modify: `landing/app/text-to-sign/page.tsx`

- [ ] **Step 1: Sweep each file**

For each file: run `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app/camera-to-text/page.tsx app/alerts/page.tsx app/text-to-sign/page.tsx`, then apply the master substitution table to every match that isn't a `boxShadow`.

- [ ] **Step 2: Verify**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add landing/app/camera-to-text/page.tsx landing/app/alerts/page.tsx landing/app/text-to-sign/page.tsx
git commit -m "Migrate camera-to-text/alerts/text-to-sign page literals to CSS tokens"
```

---

### Task 19: Final sitewide verification

**Files:** none (verification only)

- [ ] **Step 1: Full-site grep for stray literals**

Run: `cd landing && rg "#[0-9A-Fa-f]{6}|rgba\(0, 0, 0,|rgba\(255,255,255,|\"white\"|\"#FFFFFF\"" app components --glob '*.tsx'`

Expected remaining matches, all acceptable:
- Anything inside a `boxShadow:` line (explicitly out of scope).
- `app/community/**` (already on its own migrated Clean Blue theme).
- `app/sign-language/practice/page.tsx` (fixed dark canvas theme).
- `components/HandSign.tsx` (decorative SVG fills, no text/background pairing).
- `components/VideoWithSubtitles.tsx` (video-overlay chrome, not page-theme-linked).
- `components/TextToSpeechSection.tsx`, `LanguageSection.tsx`, `GamificationSection.tsx` (unused outside `app/page.tsx`, deleted by the next spec).
- On-accent translucent-white values inside `plan.highlight ?` branches in `PricingSection.tsx` and similar accent-surface cases noted per-task above.

Anything else in this list is a miss — go back and fix it using the master substitution table.

- [ ] **Step 2: Full build**

Run: `cd landing && npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Manual walkthrough**

`npm run dev`. On `/`, toggle to dark theme. With the preference now saved in `localStorage`, visit each of: `/pricing` (compare table + FAQ — the original bug location), `/about`, `/features`, `/login`, `/dashboard`, `/gamification`, `/sign-language`. Confirm on each: no invisible text (same color as its background), no invisible borders swallowing a whole card into the page background, header/footer chrome consistently dark. Then toggle back to light and spot-check 2-3 of the same pages — confirm they look exactly as they did before this plan (pixel-identical light theme, per Global Constraints).

- [ ] **Step 4: Commit (if Step 1 required fixes)**

If Step 1 found and fixed anything:

```bash
git add -A
git commit -m "Fix remaining stray color literals found in final sweep verification"
```
