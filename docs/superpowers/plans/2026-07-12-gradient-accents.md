# Gradient Accents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat single-color accent (`--accent: #1565C0`) with a soft blue→teal gradient in the highest-visibility spots — primary buttons, hero, and a couple of highlighted blocks — across the `landing/` app, without touching page backgrounds or regular cards.

**Architecture:** Two new CSS custom properties (`--gradient-accent`, `--gradient-soft`) added to `landing/app/globals.css`, then applied at specific existing style declarations (mostly one-line swaps of `var(--accent)` → `var(--gradient-accent)` or a background value). No new components, no new files besides the tokens.

**Tech Stack:** Next.js 14 App Router, plain CSS custom properties (no Tailwind for the marketing pages; the dashboard sidebar uses Tailwind utility classes instead, handled as an inline-style override in Task 5).

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-12-gradient-accents-design.md` — read it before starting; every task below implements exactly one numbered item from its "Точки изменения" section.
- `--gradient-accent: linear-gradient(135deg, #1565C0, #22C1C3)` — exact value, used everywhere a gradient accent is needed.
- `--gradient-soft: linear-gradient(135deg, #EAF4FF, #D9F5F0)` — exact value, used for soft background panels only.
- Do NOT change `--accent` itself (used as a solid color for text/icons/borders throughout the codebase — replacing it with a gradient value would break every `color: var(--accent)` usage).
- Do NOT touch page backgrounds (`--bg`), regular cards (`--bgCard`), or any file not listed in a task below.
- After every task: `cd landing && npx tsc --noEmit -p tsconfig.json` must produce no output, and `npm run build` must succeed.

---

### Task 1: Add gradient tokens and apply to `.btn-primary` / `.gradient-text`

**Files:**
- Modify: `landing/app/globals.css:1-31` (tokens), `landing/app/globals.css:174-203` (`.gradient-text`, `.btn-primary`, `.btn-primary:hover`)

**Interfaces:**
- Produces: CSS custom properties `--gradient-accent` and `--gradient-soft`, usable by `var(--gradient-accent)` / `var(--gradient-soft)` in any file under `landing/`. Produces updated `.btn-primary` (used by 9 existing files: `app/ai-tutor/page.tsx`, `app/camera-to-text/page.tsx`, `app/sign-language/practice/page.tsx`, `app/subtitles/page.tsx`, `app/text-to-sign/page.tsx`, `app/text-to-speech/page.tsx`, `components/Register.tsx`, `components/SubtitleDemo.tsx`, `components/TextToSpeechSection.tsx`) and `.gradient-text` (used by `Hero.tsx`, `PricingSection.tsx`, and others).

- [ ] **Step 1: Add the two new tokens**

In `landing/app/globals.css`, inside the existing `:root { ... }` block (right after line 31, `--shadow: 0 2px 12px rgba(0,0,0,0.07);`), add:

```css
  --gradient-accent: linear-gradient(135deg, #1565C0, #22C1C3);
  --gradient-soft: linear-gradient(135deg, #EAF4FF, #D9F5F0);
```

- [ ] **Step 2: Make `.gradient-text` a real gradient**

Replace:

```css
.gradient-text {
  color: var(--accent);
}
```

with:

```css
.gradient-text {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

- [ ] **Step 3: Apply the gradient to `.btn-primary`**

Replace:

```css
.btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: var(--shadow);
}

.btn-primary:hover {
  background: var(--accent);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}
```

with:

```css
.btn-primary {
  background: var(--gradient-accent);
  color: white;
  box-shadow: var(--shadow);
}

.btn-primary:hover {
  background: var(--gradient-accent);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}
```

- [ ] **Step 4: Verify build**

Run: `cd landing && npx tsc --noEmit -p tsconfig.json`
Expected: no output.

Run: `npm run build`
Expected: `✓ Compiled successfully`, no errors.

- [ ] **Step 5: Manual visual check**

Run `npm run dev`, open `/register` (uses `Register.tsx`, has a `.btn-primary` submit button) and `/` (Hero uses `.gradient-text` on the second line of the H1). Confirm: submit button shows a blue→teal diagonal gradient instead of flat blue; the highlighted headline word shows the same gradient as text color instead of flat blue. Stop the dev server after checking.

- [ ] **Step 6: Commit**

```bash
git add landing/app/globals.css
git commit -m "Add gradient-accent/gradient-soft tokens, apply to .btn-primary and .gradient-text"
```

---

### Task 2: Hero CTA button gradient

**Files:**
- Modify: `landing/components/Hero.tsx:74`

**Interfaces:**
- Consumes: `--gradient-accent` token from Task 1.

- [ ] **Step 1: Swap the background**

In `landing/components/Hero.tsx`, line 74, inside the `<a href="/register" ...>` primary CTA, change:

```tsx
background: "var(--accent)", color: "white", border: "none",
```

to:

```tsx
background: "var(--gradient-accent)", color: "white", border: "none",
```

(Leave the rest of the inline style object — `fontSize`, `padding`, etc. — unchanged. Only this one `background` value changes.)

- [ ] **Step 2: Verify build**

Run: `cd landing && npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add landing/components/Hero.tsx
git commit -m "Apply gradient accent to Hero primary CTA button"
```

---

### Task 3: CTASection button gradient

**Files:**
- Modify: `landing/components/CTASection.tsx:54`

**Interfaces:**
- Consumes: `--gradient-accent` token from Task 1.

- [ ] **Step 1: Swap the background**

In `landing/components/CTASection.tsx`, line 54, inside the `<a href="/register" ...>` primary CTA, change:

```tsx
background: "var(--accent)", color: "white", border: "none", transition: "all 0.3s ease" }}
```

to:

```tsx
background: "var(--gradient-accent)", color: "white", border: "none", transition: "all 0.3s ease" }}
```

- [ ] **Step 2: Verify build**

Run: `cd landing && npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add landing/components/CTASection.tsx
git commit -m "Apply gradient accent to bottom CTA button"
```

---

### Task 4: Pricing — highlight the Pro plan card with the gradient

**Files:**
- Modify: `landing/components/PricingSection.tsx:43-45`

**Interfaces:**
- Consumes: `--gradient-accent` token from Task 1.

- [ ] **Step 1: Swap the highlighted card's background**

In `landing/components/PricingSection.tsx`, lines 43-45, change:

```tsx
background: plan.highlight
  ? "var(--accent)"
  : "#FFFFFF",
```

to:

```tsx
background: plan.highlight
  ? "var(--gradient-accent)"
  : "#FFFFFF",
```

Non-highlighted plan cards (background stays `"#FFFFFF"`) and the CTA link inside each card (`plan.highlight ? "rgba(255,255,255,0.18)" : "var(--accent)"` at line 136) are unchanged — only the card's own background gets the gradient.

- [ ] **Step 2: Verify build**

Run: `cd landing && npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, open `/pricing` (or scroll to the pricing section on `/`). Confirm the middle (Pro) plan card shows the blue→teal gradient instead of flat blue, other cards are unchanged white. Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add landing/components/PricingSection.tsx
git commit -m "Highlight the recommended pricing plan with the gradient accent"
```

---

### Task 5: Dashboard — active nav item gets the soft gradient

**Files:**
- Modify: `landing/app/dashboard/layout.tsx:189-193`

**Interfaces:**
- Consumes: `--gradient-soft` token from Task 1.

- [ ] **Step 1: Add an inline background override for the active state**

In `landing/app/dashboard/layout.tsx`, the active sidebar nav link currently gets its background from a Tailwind class (`bg-sky-100`) inside this block (lines 186-199):

```tsx
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-syne font-bold text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-sky-100 border border-sky-200 text-sky-700 shadow-sm"
                    : "border border-transparent text-sky-800 hover:bg-sky-50 hover:text-sky-900"
                }`}
              >
```

Change it to drop `bg-sky-100` from the active className (keep `border-sky-200 text-sky-700 shadow-sm`) and set the background inline instead, since Tailwind utility classes can't express our gradient token:

```tsx
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-syne font-bold text-sm transition-all duration-200 group ${
                  isActive
                    ? "border border-sky-200 text-sky-700 shadow-sm"
                    : "border border-transparent text-sky-800 hover:bg-sky-50 hover:text-sky-900"
                }`}
                style={isActive ? { background: "var(--gradient-soft)" } : undefined}
              >
```

- [ ] **Step 2: Verify build**

Run: `cd landing && npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, log in, open any dashboard page (e.g. `/dashboard/sign-language-reader`). Confirm the active sidebar item shows a soft blue→mint gradient background instead of flat `sky-100`, text stays legible (dark slate/sky-700 on light gradient). Stop the dev server after checking.

- [ ] **Step 4: Commit**

```bash
git add landing/app/dashboard/layout.tsx
git commit -m "Give the active dashboard nav item a soft gradient background"
```

---

### Task 6: Full build/typecheck pass and push

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd landing && npx tsc --noEmit -p tsconfig.json`
Expected: no output.

- [ ] **Step 2: Full production build**

Run: `cd landing && npm run build`
Expected: `✓ Compiled successfully`, all routes listed, no errors.

- [ ] **Step 3: Revert the build-cache artifact**

The build regenerates `landing/tsconfig.tsbuildinfo`; it's not part of this change.

```bash
git checkout -- landing/tsconfig.tsbuildinfo
```

- [ ] **Step 4: Confirm git status is clean except intended commits**

```bash
git status --short
git log origin/master..master --oneline
```

Expected: working tree clean, and the log shows exactly the 5 commits from Tasks 1-5 (plus this plan/spec doc commits) ahead of `origin/master`.

- [ ] **Step 5: Push (only if the user asked for it)**

```bash
git push origin master
```
