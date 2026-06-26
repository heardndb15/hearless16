# Landing Redesign — Soft & Airy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the landing site from cold glassmorphism to warm, airy, human-feeling UI while keeping the light-blue/white palette.

**Architecture:** All changes are purely visual — no routing, data, or logic changes. Foundation first (`globals.css`), then shared components (Header, Footer), then homepage sections, then dashboard, then feature pages. Each task is independently deployable.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS (utility classes in dashboard), inline styles (in landing pages), Plus Jakarta Sans (Google Fonts)

## Global Constraints

- Palette: light blue (`#0EA5E9`, `#BAE6FD`, `#E0F2FE`, `#F0F9FF`) and white only — no dark backgrounds
- Font: `Plus Jakarta Sans` replaces `Syne` + `DM Sans` everywhere in landing
- No changes to mobile app (`mobile/`), backend (`backend/`), or any logic/routing
- No new npm packages — font loaded via Google Fonts CDN in globals.css
- All inline-style colors must use new token values, not CSS vars referencing old values

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `landing/app/globals.css` | Modify | CSS tokens, font import, body bg, utility classes |
| `landing/components/Header.tsx` | Modify | White sticky header |
| `landing/components/Hero.tsx` | Modify | Light hero with dark text |
| `landing/components/Features.tsx` | Modify | White cards, icon circles |
| `landing/components/Footer.tsx` | Modify | Light footer |
| `landing/components/CTASection.tsx` | Modify | Light CTA block |
| `landing/components/SubtitleDemo.tsx` | Modify | Demo card on light bg |
| `landing/components/SoundIndicators.tsx` | Modify | Sound bars on light bg |
| `landing/components/GamificationSection.tsx` | Modify | Achievement cards on light bg |
| `landing/components/LanguageSection.tsx` | Modify | Language cards on light bg |
| `landing/app/dashboard/layout.tsx` | Modify | Sidebar white, page bg `#F0F9FF` |
| `landing/app/community/page.tsx` | Modify | Light community page |
| `landing/app/alerts/page.tsx` | Modify | Feature page tokens |
| `landing/app/subtitles/page.tsx` | Modify | Feature page tokens |
| `landing/app/sign-language/page.tsx` | Modify | Feature page tokens |
| `landing/app/ai-tutor/page.tsx` | Modify | Feature page tokens |
| `landing/app/camera-to-text/page.tsx` | Modify | Feature page tokens |
| `landing/app/text-to-sign/page.tsx` | Modify | Feature page tokens |
| `landing/app/gamification/page.tsx` | Modify | Feature page tokens |
| `landing/app/sos/page.tsx` | Modify | Feature page tokens |
| `landing/app/about/page.tsx` | Modify | Feature page tokens |
| `landing/app/contact/page.tsx` | Modify | Feature page tokens |
| `landing/app/blog/page.tsx` | Modify | Feature page tokens |

---

## Task 1: Foundation — globals.css

**Files:**
- Modify: `landing/app/globals.css`

**What changes:**
- Font import: replace Syne+DM Sans with Plus Jakarta Sans
- CSS tokens: update all color, shadow, radius vars
- Body background: light gradient instead of dark
- Section backgrounds alternate white / `#F0F9FF`
- `.glass-card` becomes plain white card
- `.btn-primary` / `.btn-outline` updated

- [ ] **Step 1: Replace font import and CSS tokens**

Replace the entire `globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #F0F9FF;
  --bgCard: #FFFFFF;
  --bgCardHover: #F0F9FF;
  --bgLight: #F0F9FF;
  --accent: #0EA5E9;
  --accentGlow: rgba(14, 165, 233, 0.15);
  --purple: #38BDF8;
  --purpleGlow: rgba(56, 189, 248, 0.15);
  --text: #0C4A6E;
  --textSecondary: #075985;
  --textMuted: #0369A1;
  --border: rgba(14, 165, 233, 0.12);
  --borderLight: rgba(14, 165, 233, 0.08);
  --sos: #EF4444;
  --background: var(--bg);
  --white: #FFFFFF;
  --card: #FFFFFF;
  --heading: #0C4A6E;
  --button: #0EA5E9;
  --dark: #0C4A6E;
  --success: #22C55E;
  --gradient: linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%);
  --radius: 20px;
  --radiusSm: 12px;
  --radiusXl: 28px;
  --headerBg: rgba(255, 255, 255, 0.92);
  --shadow: 0 2px 16px rgba(14, 165, 233, 0.07);
  --shadowHover: 0 8px 32px rgba(14, 165, 233, 0.12);
  --shadowPhone: 0 24px 80px rgba(14, 165, 233, 0.18), 0 0 40px rgba(14,165,233,0.1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 50%, #F0F9FF 100%);
  background-attachment: fixed;
  color: #0C4A6E;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 5;
}

section {
  padding: 100px 0;
  position: relative;
}

section:nth-child(even) {
  background: #F0F9FF;
}

section:nth-child(odd) {
  background: #FFFFFF;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.08); opacity: 0.1; }
  100% { transform: scale(1); opacity: 0.4; }
}

@keyframes pulse-ring-delayed {
  0% { transform: scale(1); opacity: 0.25; }
  50% { transform: scale(1.12); opacity: 0.08; }
  100% { transform: scale(1); opacity: 0.25; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes subtitle-slide {
  0% { transform: translateY(8px); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-4px); opacity: 0.6; }
}

@keyframes wave-move {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px var(--accentGlow); }
  50% { box-shadow: 0 0 40px var(--accentGlow); }
}

@keyframes xp-fill {
  from { width: 0%; }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sound-pulse {
  0%, 100% { height: 4px; }
  50% { height: 20px; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pulse-ring {
  animation: pulse-ring 3s ease-in-out infinite;
}

.pulse-ring-delayed {
  animation: pulse-ring-delayed 3s ease-in-out infinite 0.5s;
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--accent);
  margin-bottom: 16px;
}

.section-label::before {
  content: '';
  width: 20px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
}

.section-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: clamp(28px, 5vw, 48px);
  color: var(--text);
  line-height: 1.15;
  margin-bottom: 20px;
}

.section-subtitle {
  font-size: 16px;
  color: var(--textSecondary);
  max-width: 560px;
  line-height: 1.75;
}

.gradient-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #0EA5E9;
  color: white;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.25);
}

.btn-primary:hover {
  background: #0284C7;
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.3);
  transform: translateY(-1px);
}

.btn-outline {
  background: white;
  color: #0369A1;
  border: 1.5px solid #BAE6FD;
}

.btn-outline:hover {
  border-color: #0EA5E9;
  color: #0EA5E9;
  transform: translateY(-1px);
}

.glass-card {
  background: #FFFFFF;
  border: 1px solid rgba(14, 165, 233, 0.12);
  box-shadow: 0 2px 16px rgba(14, 165, 233, 0.07);
}

.glass-card-dark {
  background: #EFF8FF;
  border: 1px solid rgba(14, 165, 233, 0.15);
  box-shadow: 0 2px 16px rgba(14, 165, 233, 0.07);
}

@media (max-width: 768px) {
  section { padding: 60px 0; }
}
```

- [ ] **Step 2: Verify font loads**

Start dev server: `cd landing && npm run dev`
Open `http://localhost:3000` — body text should be rounded/friendly (Plus Jakarta Sans), not geometric (Syne). Background should be near-white, not dark blue.

- [ ] **Step 3: Commit**

```bash
git add landing/app/globals.css
git commit -m "design: replace dark glassmorphism tokens with soft airy palette"
```

---

## Task 2: Header

**Files:**
- Modify: `landing/components/Header.tsx`

**What changes:** White/frosted background, dark text links, updated button styles.

- [ ] **Step 1: Update header background and nav colors**

In `Header.tsx`, find the `<header>` style and replace:
```js
// OLD
background: "rgba(255,255,255,0.15)",
backdropFilter: "blur(20px)",
WebkitBackdropFilter: "blur(20px)",
borderBottom: "1px solid rgba(255,255,255,0.2)",

// NEW
background: "rgba(255,255,255,0.92)",
backdropFilter: "blur(20px)",
WebkitBackdropFilter: "blur(20px)",
borderBottom: "1px solid rgba(14,165,233,0.1)",
boxShadow: "0 2px 16px rgba(14,165,233,0.06)",
```

- [ ] **Step 2: Update logo text color**

Find the logo `<span>` with `color: "#ffffff"` → change to `color: "#0C4A6E"`.

- [ ] **Step 3: Update nav links**

Find the nav links for "О проекте" and "Блог":
```js
// OLD: color: "rgba(255,255,255,0.8)"  onMouseEnter → "#ffffff"
// NEW:
style={{ color: "#075985", ... }}
onMouseEnter={e => e.currentTarget.style.color = "#0EA5E9"}
onMouseLeave={e => e.currentTarget.style.color = "#075985"}
```

- [ ] **Step 4: Update dropdown trigger button**

```js
// OLD: color: dropdown ? "#ffffff" : "rgba(255,255,255,0.8)"
// NEW: color: dropdown ? "#0EA5E9" : "#075985"
```

- [ ] **Step 5: Update dropdown panel**

```js
// OLD: background: "rgba(255,255,255,0.72)"
// NEW: background: "#FFFFFF", border: "1px solid rgba(14,165,233,0.12)", boxShadow: "0 8px 24px rgba(14,165,233,0.1)"
```

Dropdown link colors:
```js
// OLD: color: "#1E6FA8"
// NEW: color: "#075985"
onMouseEnter → background: "#F0F9FF", color: "#0EA5E9"
onMouseLeave → background: "transparent", color: "#075985"
```

- [ ] **Step 6: Update "Войти" button**

```js
// OLD: background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.4)"
// NEW: background: "white", color: "#0369A1", border: "1.5px solid #BAE6FD"
```

- [ ] **Step 7: Update "Регистрация" button**

```js
// OLD: background: "#0277BD", color: "#ffffff", border: "none"
// NEW: background: "#0EA5E9", color: "white", border: "none", borderRadius: 12
```

- [ ] **Step 8: Verify and commit**

Check `http://localhost:3000` — header should be white/frosted, all text dark blue, links highlight in `#0EA5E9` on hover.

```bash
git add landing/components/Header.tsx
git commit -m "design: white header with dark blue nav links"
```

---

## Task 3: Hero Section

**Files:**
- Modify: `landing/components/Hero.tsx`

**What changes:** Light background, dark text H1, updated CTA buttons, subtitle animation card becomes white with blue border.

- [ ] **Step 1: Update section and H1 styles**

Find the `<section>` opening style — remove any dark bg overrides. It will inherit light bg from `globals.css`.

Find H1:
```js
// OLD: color: "#ffffff"
// NEW: color: "#0C4A6E"
```

Find the paragraph/description text:
```js
// OLD: color: "rgba(255,255,255,0.85)"
// NEW: color: "#075985"
```

Find `.section-label`:
```js
// OLD: style={{ color: "rgba(255,255,255,0.9)" }}
// NEW: remove the override (use default --accent from globals)
```

- [ ] **Step 2: Update CTA buttons**

Find the download/CTA buttons in Hero. Apply `.btn .btn-primary` and `.btn .btn-outline` classes instead of inline dark styles. If inline:
```js
// Primary button inline:
background: "#0EA5E9", color: "white", borderRadius: 12, padding: "12px 28px"

// Secondary button inline:
background: "white", color: "#0369A1", border: "1.5px solid #BAE6FD", borderRadius: 12, padding: "12px 28px"
```

- [ ] **Step 3: Update subtitle animation card**

Find the card that displays the typing animation text:
```js
// OLD: dark glass card styles
// NEW:
background: "#FFFFFF",
border: "1.5px solid #BAE6FD",
borderRadius: 16,
boxShadow: "0 4px 20px rgba(14,165,233,0.08)",
color: "#0369A1",
```

- [ ] **Step 4: Update phone/mockup shadow if present**

```js
// OLD: boxShadow with dark blue tones
// NEW: boxShadow: "0 24px 80px rgba(14,165,233,0.18), 0 0 40px rgba(14,165,233,0.1)"
```

- [ ] **Step 5: Verify and commit**

`http://localhost:3000` — Hero should be on white/light bg, H1 is dark blue, readable without needing to squint. Typing animation card is white.

```bash
git add landing/components/Hero.tsx
git commit -m "design: light hero section with dark text"
```

---

## Task 4: Features Section

**Files:**
- Modify: `landing/components/Features.tsx`

**What changes:** White cards with subtle border, icon gets `#E0F2FE` background circle, section title/subtitle go dark.

- [ ] **Step 1: Update section heading colors**

```js
// Section label — remove white override, use default
// H2: color: "#0C4A6E"  (remove white override)
// Subtitle: color: "#075985"  (remove white override)
// gradient span: keep gradient-text class
```

- [ ] **Step 2: Update each feature card style**

Find the `<Link>` card style block and replace:
```js
// OLD
background: "rgba(255,255,255,0.72)",
backdropFilter: "blur(16px)",
WebkitBackdropFilter: "blur(16px)",
border: "1.5px solid rgba(255,255,255,0.6)",
boxShadow: "0 8px 20px rgba(2,136,209,0.18)",

// NEW
background: "#FFFFFF",
border: "1px solid rgba(14,165,233,0.12)",
boxShadow: "0 2px 16px rgba(14,165,233,0.07)",
```

- [ ] **Step 3: Update card hover**

```js
onMouseEnter={(e) => {
  e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)";
  e.currentTarget.style.boxShadow = "0 8px 32px rgba(14,165,233,0.12)";
  e.currentTarget.style.transform = "translateY(-3px)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.borderColor = "rgba(14,165,233,0.12)";
  e.currentTarget.style.boxShadow = "0 2px 16px rgba(14,165,233,0.07)";
  e.currentTarget.style.transform = "translateY(0)";
}}
```

- [ ] **Step 4: Add icon circle background**

Inside each card, find the icon `<span>` or `<div>`. Wrap or update to:
```jsx
<div style={{
  width: 48, height: 48, borderRadius: 14,
  background: "#E0F2FE",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 22, marginBottom: 16,
}}>
  {feat.icon}
</div>
```

- [ ] **Step 5: Update card text colors**

Feature title: `color: "#0C4A6E"`, fontWeight: 700
Feature description: `color: "#075985"`

- [ ] **Step 6: Verify and commit**

Cards should be bright white on the section background, icons in soft blue circles, text clearly readable.

```bash
git add landing/components/Features.tsx
git commit -m "design: white feature cards with icon circles"
```

---

## Task 5: Remaining Homepage Components

**Files:**
- Modify: `landing/components/Footer.tsx`
- Modify: `landing/components/CTASection.tsx`
- Modify: `landing/components/SubtitleDemo.tsx`
- Modify: `landing/components/SoundIndicators.tsx`
- Modify: `landing/components/GamificationSection.tsx`
- Modify: `landing/components/LanguageSection.tsx`

**Pattern to apply to every component:**
1. Remove `color: "rgba(255,255,255,X)"` from text → use `#0C4A6E` or `#075985`
2. Remove `color: "#ffffff"` from headings → use `#0C4A6E`
3. Remove white-on-dark section label overrides → use default CSS var
4. Dark card backgrounds (`rgba(21,101,192,0.X)`) → `#FFFFFF` or `#EFF8FF`
5. Glass borders `rgba(255,255,255,0.X)` → `rgba(14,165,233,0.12)`
6. Shadows with `rgba(2,136,209,X)` → `rgba(14,165,233,X)` and lower opacity

- [ ] **Step 1: Footer.tsx**

```js
// <footer> style:
background: "#F0F9FF",
borderTop: "1px solid rgba(14,165,233,0.12)",
// Remove backdropFilter

// Brand text: color: "#0C4A6E"
// All white link colors → "#075985", hover → "#0EA5E9"
// Copyright text: "#0369A1"
// Footer logo "H" div: keep gradient background
```

- [ ] **Step 2: CTASection.tsx**

```js
// Section background: "#E0F2FE" (soft blue, not dark)
// Heading: color: "#0C4A6E"
// Subtext: color: "#075985"
// Background glow: rgba(14,165,233,0.12) — much softer
// Buttons: use .btn .btn-primary / .btn .btn-outline classes
```

- [ ] **Step 3: SubtitleDemo.tsx**

```js
// Container card: background: "#FFFFFF", border: "1px solid rgba(14,165,233,0.12)"
// Subtitle display area: background: "#F0F9FF"
// Text inside demo: color: "#0C4A6E"
// Active/highlighted text: color: "#0EA5E9"
// All white text → corresponding dark blue tokens
```

- [ ] **Step 4: SoundIndicators.tsx**

```js
// Section heading + subtitle: remove white overrides → inherit dark from CSS
// Sound bar cards: background: "#FFFFFF", border: "1px solid rgba(14,165,233,0.12)"
// Bar color: "#0EA5E9" or "#38BDF8"
// Labels: color: "#075985"
```

- [ ] **Step 5: GamificationSection.tsx**

```js
// Section heading: remove color: "#ffffff" → inherit #0C4A6E
// Gradient span in title: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)"
// Achievement cards: background: "#FFFFFF", border: "1px solid rgba(14,165,233,0.12)"
// Achievement label text: color: "#0C4A6E"
// XP bar: background track #E0F2FE, fill #0EA5E9
```

- [ ] **Step 6: LanguageSection.tsx**

```js
// Section heading: remove white overrides
// Language cards: background: "#FFFFFF", border: "1px solid rgba(14,165,233,0.12)"
// Language code badge: background: "#E0F2FE", color: "#0369A1"
// Stat numbers: color: "#0EA5E9"
// Stat labels: color: "#075985"
// Card body text: color: "#075985"
```

- [ ] **Step 7: Verify all homepage components**

Scroll through `http://localhost:3000` — every section should have light bg, dark readable text, white or `#F0F9FF` cards.

- [ ] **Step 8: Commit**

```bash
git add landing/components/Footer.tsx landing/components/CTASection.tsx \
  landing/components/SubtitleDemo.tsx landing/components/SoundIndicators.tsx \
  landing/components/GamificationSection.tsx landing/components/LanguageSection.tsx
git commit -m "design: update all homepage components to soft airy palette"
```

---

## Task 6: Dashboard Layout

**Files:**
- Modify: `landing/app/dashboard/layout.tsx`

**What changes:** Sidebar becomes white, active state uses `#E0F2FE`, page background `#F0F9FF`.

- [ ] **Step 1: Update sidebar background**

Find `<aside>` class string. Replace Tailwind classes:
```
// OLD: "bg-white/40 backdrop-blur-xl border-r border-white/60"
// NEW: "bg-white border-r border-sky-100"
```

- [ ] **Step 2: Update active nav item**

In the `menuItems.map()` link className:
```
// OLD active: "bg-accent/10 border border-accent/20 text-accent shadow-sm"
// NEW active: "bg-sky-100 border border-sky-200 text-sky-700 shadow-none"
```

Inactive:
```
// OLD: "text-slate-500 hover:bg-slate-200/50 hover:text-slate-800"
// NEW: "text-sky-800 hover:bg-sky-50 hover:text-sky-900"
```

- [ ] **Step 3: Update main content area background**

Find the outer `<div className="min-h-screen ...">`:
```
// OLD: "bg-[url('/bg-main.png')] bg-cover bg-no-repeat bg-center bg-fixed"
// NEW: "bg-[#F0F9FF]"
```

- [ ] **Step 4: Update loading state**

```
// OLD: "min-h-screen flex items-center justify-center bg-slate-50 text-slate-800"
// NEW: "min-h-screen flex items-center justify-center bg-[#F0F9FF] text-sky-900"
```

- [ ] **Step 5: Update mobile header**

```
// OLD: "bg-white/40 backdrop-blur-lg border-b border-white/60"
// NEW: "bg-white border-b border-sky-100"
```

- [ ] **Step 6: Update user card in sidebar**

```
// OLD: "bg-white/60 border border-white/80"
// NEW: "bg-sky-50 border border-sky-100"
```

- [ ] **Step 7: Verify and commit**

Go to `/dashboard` — sidebar should be clean white, active item soft blue, page bg light blue-grey.

```bash
git add landing/app/dashboard/layout.tsx
git commit -m "design: white dashboard sidebar with sky-100 active states"
```

---

## Task 7: Community Page

**Files:**
- Modify: `landing/app/community/page.tsx`

**What changes:** Page background switches from dark blue gradient to light. Cards already white — keep them. Update header text, sort tabs, buttons.

- [ ] **Step 1: Update page background**

Find the outer `<div>` with `background: "linear-gradient(160deg,#0D47A1..."`:
```js
// NEW:
background: "#F0F9FF",
paddingTop: 80,
minHeight: "100vh",
```

- [ ] **Step 2: Update page header text**

```js
// H1: color: "#0C4A6E"  (was "white")
// Subtitle p: color: "#075985"  (was "rgba(255,255,255,0.75)")
```

- [ ] **Step 3: Update "Новый пост" button**

```js
// OLD: background: "white", color: "#0277BD"
// NEW: background: "#0EA5E9", color: "white", border: "none", borderRadius: 12
```

"Войти" link button same treatment.

- [ ] **Step 4: Update sort tabs**

```js
// Active:
background: "#0EA5E9", color: "white", border: "1.5px solid #0EA5E9"

// Inactive:
background: "white", color: "#0369A1", border: "1.5px solid #BAE6FD"
```

Remove `backdropFilter` from tabs.

- [ ] **Step 5: Update "Загрузить ещё" button**

```js
// NEW:
background: "white", color: "#0369A1", border: "1.5px solid #BAE6FD", borderRadius: 50
```

- [ ] **Step 6: Verify and commit**

`http://localhost:3000/community` — light bg, dark title, white post cards, blue sort tabs.

```bash
git add landing/app/community/page.tsx
git commit -m "design: light community page"
```

---

## Task 8: Feature Pages

**Files:**
- Modify: `landing/app/alerts/page.tsx`
- Modify: `landing/app/subtitles/page.tsx`
- Modify: `landing/app/sign-language/page.tsx`
- Modify: `landing/app/ai-tutor/page.tsx`
- Modify: `landing/app/camera-to-text/page.tsx`
- Modify: `landing/app/text-to-sign/page.tsx`
- Modify: `landing/app/gamification/page.tsx`
- Modify: `landing/app/sos/page.tsx`
- Modify: `landing/app/about/page.tsx`
- Modify: `landing/app/contact/page.tsx`
- Modify: `landing/app/blog/page.tsx`

**Pattern for all feature pages** (apply identically to each):

- [ ] **Step 1: Update page wrapper**

Every feature page has an outer `<div style={{ minHeight: "100vh", background: "var(--bg)" }}>`.
`var(--bg)` now resolves to `#F0F9FF` ✓ — no change needed here since the CSS var is updated.

Check for any pages with hardcoded dark bg overrides like `background: "#0D47A1"` or dark gradients — replace with `background: "#F0F9FF"`.

- [ ] **Step 2: Update inline heading colors**

Search each file for `color: "#ffffff"` or `color: "rgba(255,255,255"` in headings/text:
```js
// H1, H2 with white color → "#0C4A6E"
// Paragraph/desc text with white → "#075985"
// .section-label with white override → remove override
```

- [ ] **Step 3: Update cards in each page**

Cards with `rgba(255,255,255,0.72)` glass:
```js
// NEW: background: "#FFFFFF", border: "1px solid rgba(14,165,233,0.12)", boxShadow: "0 2px 16px rgba(14,165,233,0.07)"
```

Cards with dark glass `rgba(21,101,192,0.X)`:
```js
// NEW: background: "#EFF8FF", border: "1px solid rgba(14,165,233,0.15)"
```

- [ ] **Step 4: Update back-link colors**

Each page has `← На главную` link:
```js
// OLD: color: "var(--accent)"  ← already ok with new token
// Check any that hardcode "rgba(255,255,255,0.75)" → "#075985"
```

- [ ] **Step 5: Apply to each file**

Work through each file in order:
1. `alerts/page.tsx` — sound cards go white
2. `subtitles/page.tsx` — demo cards go white, white text on dark demo → invert to dark on light
3. `sign-language/page.tsx` — gesture cards go white
4. `ai-tutor/page.tsx` — tutor chat cards go white
5. `camera-to-text/page.tsx` — camera demo card bg
6. `text-to-sign/page.tsx` — text input and avatar area bg
7. `gamification/page.tsx` — leaderboard and achievement cards
8. `sos/page.tsx` — alert cards bg
9. `about/page.tsx` — team/story cards
10. `contact/page.tsx` — form bg and card
11. `blog/page.tsx` — post cards

- [ ] **Step 6: Verify all feature pages**

Visit each route: `/alerts`, `/subtitles`, `/sign-language`, `/ai-tutor`, `/camera-to-text`, `/text-to-sign`, `/gamification`, `/sos`, `/about`, `/contact`, `/blog`

Each should have: light background, dark readable text, white content cards.

- [ ] **Step 7: Commit**

```bash
git add landing/app/alerts/page.tsx landing/app/subtitles/page.tsx \
  landing/app/sign-language/page.tsx landing/app/ai-tutor/page.tsx \
  landing/app/camera-to-text/page.tsx landing/app/text-to-sign/page.tsx \
  landing/app/gamification/page.tsx landing/app/sos/page.tsx \
  landing/app/about/page.tsx landing/app/contact/page.tsx landing/app/blog/page.tsx
git commit -m "design: update all feature pages to soft airy palette"
```

---

## Task 9: Final Check & Push

- [ ] **Step 1: Full site walkthrough**

Visit every route and verify:
- [ ] `/` — light hero, white cards, alternating section bgs
- [ ] `/community` — light bg, white post cards
- [ ] `/dashboard` — white sidebar, `#F0F9FF` page bg
- [ ] `/alerts`, `/subtitles`, `/sign-language`, `/ai-tutor` — light pages
- [ ] `/camera-to-text`, `/text-to-sign`, `/gamification`, `/sos` — light pages
- [ ] `/about`, `/contact`, `/blog` — light pages
- [ ] Header on every page: white, dark nav links
- [ ] No white text on white/light backgrounds anywhere
- [ ] No dark blue gradient backgrounds remaining

- [ ] **Step 2: Push to remote**

```bash
git push origin master
```

Vercel auto-deploys in ~1-2 min after push.
