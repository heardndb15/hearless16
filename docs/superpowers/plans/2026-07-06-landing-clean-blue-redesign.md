# Landing Site Clean Blue Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the web landing site's remaining old sky-blue palette (`#0EA5E9` family, glow/gradient effects) to the "Clean Blue" design system already used by the mobile app and the Community section.

**Architecture:** Update `landing/app/globals.css`'s `:root` tokens and utility classes to Clean Blue values (Task 1), fix the ~16 hardcoded `linear-gradient` usages that a bulk find/replace can't safely handle (Task 2), clean up `Hero.tsx`'s unique pulsing-ring decoration (Task 3), then two bulk `sed` passes across every in-scope `.tsx` file — one for solid hex literals (Task 4), one for blue-tinted `rgba()` shadows/borders (Task 5) — followed by full verification (Task 6). Community section files are excluded throughout (already migrated).

**Tech Stack:** Next.js 14 (App Router), CSS custom properties (`var(--x)`) — not a JS constants module like Community's `theme.ts`, since the rest of the landing already partially uses CSS vars and this keeps the change minimal.

## Global Constraints

- Scope: everything under `landing/app/**/*.tsx` and `landing/components/*.tsx` EXCEPT `landing/app/community/*` (already migrated, out of scope).
- No test framework exists in `landing/` — verification is `npx tsc --noEmit` + `grep` checks + manual visual check, consistent with prior specs in this repo.
- No layout/copy/functional changes — this is a palette/shadow/radius/decoration swap only.
- Token values (from the approved spec, `docs/superpowers/specs/2026-07-06-landing-clean-blue-redesign-design.md`): `--bg: #F4F7FB`, `--accent: #1565C0`, `--text: #1A1A2E`, `--textSecondary: #9CA3AF` (also replaces `--textMuted`), `--border: #E8EDF5`, `--radius: 16px`, `--shadow: 0 2px 12px rgba(0,0,0,0.07)`. A new `--chipBg: #EBF3FF` token is added (not in the original CSS, needed for `#E0F2FE` chip-background replacements).
- Gap found during planning (not in the original spec's literal substitution table, but required by its "flatten decorative effects" goal): shadows/borders/glows expressed as `rgba(14,165,233,X)` / `rgba(2,132,199,X)` / `rgba(56,189,248,X)` (blue-tinted, at varying opacities) are as much a part of the old palette as the solid hex values, and must also be neutralized to `rgba(0,0,0,X)` (same alpha, no color tint). Tasks 5 and 6 cover this.
- `landing/app/sign-language/practice/page.tsx` (built in an unrelated recent feature) has one gradient using old-accent-family hex values for a *functional* two-state indicator (green = gesture matched, blue = still tracking) — not part of the marketing palette. Task 2 flattens it to `var(--success)` / `var(--accent)` (preserving the semantic meaning, just removing the gradient and updating the "tracking" color to the new accent) rather than leaving it untouched or blindly bulk-replacing it.
- `landing/app/camera-to-text/page.tsx:38`'s `repeating-linear-gradient` uses an unrelated teal color (`rgba(43,191,207,...)`), not the old accent family — explicitly out of scope, do not touch.
- `components/SubtitleDemo.tsx:139`'s shimmer-line gradient already references `var(--accent)` (not a hardcoded literal) — explicitly out of scope, do not touch.

---

### Task 1: Update `globals.css` design tokens and remove decorative CSS

**Files:**
- Modify: `landing/app/globals.css`

**Interfaces:**
- Produces: updated CSS custom properties consumed by every component via `var(--x)`; a new `--chipBg` token; removal of `--accentGlow`, `--purple`, `--purpleGlow`, `--gradient`, `--shadowHover`, `--shadowPhone` and their associated keyframes/classes, consumed (as "must no longer exist") by Task 6's verification.

- [ ] **Step 1: Replace the `:root` token block**

Find:
```css
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
```

Replace with:
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
  --shadow: 0 2px 12px rgba(0,0,0,0.07);
}
```

- [ ] **Step 2: Flatten the body background**

Find:
```css
body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 50%, #F0F9FF 100%);
  background-attachment: fixed;
  color: #0C4A6E;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
```

Replace with:
```css
body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Flatten the alternating section backgrounds**

Find:
```css
section:nth-child(even) {
  background: #F0F9FF;
}

section:nth-child(odd) {
  background: #FFFFFF;
}
```

Replace with:
```css
section:nth-child(even) {
  background: var(--bg);
}

section:nth-child(odd) {
  background: #FFFFFF;
}
```

- [ ] **Step 4: Remove the glow/pulse keyframes**

Find (three separate keyframe blocks — delete all three, keep everything else in the `@keyframes` list as-is):
```css
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
```
Delete this block entirely.

Find:
```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px var(--accentGlow); }
  50% { box-shadow: 0 0 40px var(--accentGlow); }
}

```
Delete this block entirely (including the trailing blank line).

- [ ] **Step 5: Remove the pulse-ring utility classes**

Find:
```css
.pulse-ring {
  animation: pulse-ring 3s ease-in-out infinite;
}

.pulse-ring-delayed {
  animation: pulse-ring-delayed 3s ease-in-out infinite 0.5s;
}

```
Delete this block entirely (including the trailing blank line).

- [ ] **Step 6: Flatten `.gradient-text`**

Find:
```css
.gradient-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Replace with:
```css
.gradient-text {
  color: var(--accent);
}
```

- [ ] **Step 7: Flatten `.btn-primary`'s glow shadows**

Find:
```css
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
```

Replace with:
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

- [ ] **Step 8: Update `.btn-outline`, `.glass-card`, `.glass-card-dark`**

Find:
```css
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
```

Replace with:
```css
.btn-outline {
  background: white;
  color: var(--accent);
  border: 1.5px solid var(--border);
}

.btn-outline:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.glass-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.glass-card-dark {
  background: var(--bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
```

- [ ] **Step 9: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output (CSS-only change, but confirms nothing else broke).

- [ ] **Step 10: Verify no reference to the removed tokens/classes remains in this file**

```bash
cd landing
grep -nE "\-\-accentGlow|\-\-purple\b|\-\-purpleGlow|\-\-gradient\b|\-\-shadowHover|\-\-shadowPhone|pulse-ring|glow-pulse" app/globals.css
```
Expected: no output.

- [ ] **Step 11: Commit**

```bash
cd landing
git add app/globals.css
git commit -m "feat: migrate globals.css tokens to Clean Blue, remove glow/gradient decoration"
```

---

### Task 2: Fix hardcoded `linear-gradient` usages

**Files:**
- Modify: `landing/app/error.tsx`
- Modify: `landing/app/not-found.tsx`
- Modify: `landing/app/pricing/page.tsx`
- Modify: `landing/app/sign-language/page.tsx`
- Modify: `landing/app/sign-language/practice/page.tsx`
- Modify: `landing/components/CTASection.tsx`
- Modify: `landing/components/Features.tsx`
- Modify: `landing/components/GamificationSection.tsx`
- Modify: `landing/components/LanguageSection.tsx`
- Modify: `landing/components/SubtitleDemo.tsx`
- Modify: `landing/components/PricingSection.tsx`

**Interfaces:**
- Consumes: `var(--accent)`, `var(--bg)`, `var(--success)` from Task 1's updated `globals.css`.

Every `linear-gradient` using old-palette colors gets flattened to a single flat color per the spec's "remove gradients" direction — a naive bulk find/replace on the bare hex codes would corrupt these (e.g. turn a two-stop gradient into two identical stops instead of removing it), so each is fixed explicitly here, before Tasks 4/5's bulk passes run.

- [ ] **Step 1: `app/error.tsx`**

Find:
```tsx
      background: "linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 50%, #F0F9FF 100%)",
```

Replace with:
```tsx
      background: "var(--bg)",
```

- [ ] **Step 2: `app/not-found.tsx`**

Find:
```tsx
      background: "linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 50%, #F0F9FF 100%)",
```

Replace with:
```tsx
      background: "var(--bg)",
```

- [ ] **Step 3: `app/pricing/page.tsx` — plan data background (line 37)**

Find:
```tsx
    bg: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
```

Replace with:
```tsx
    bg: "var(--accent)",
```

- [ ] **Step 4: `app/pricing/page.tsx` — logo mark (line 110)**

Find:
```tsx
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "white" }}>H</div>
```

Replace with:
```tsx
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "white" }}>H</div>
```

- [ ] **Step 5: `app/pricing/page.tsx` — gradient text "цены" (line 127)**

Find:
```tsx
            <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>цены</span>
```

Replace with:
```tsx
            <span style={{ color: "var(--accent)" }}>цены</span>
```

- [ ] **Step 6: `app/pricing/page.tsx` — CTA section background (line 321)**

Find:
```tsx
        <div style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)", padding: "64px 24px", textAlign: "center" }}>
```

Replace with:
```tsx
        <div style={{ background: "var(--accent)", padding: "64px 24px", textAlign: "center" }}>
```

- [ ] **Step 7: `app/sign-language/page.tsx` — two card background gradients (lines 333, 386)**

Find:
```tsx
                    background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
```

Replace with:
```tsx
                    background: "var(--bg)",
```

Find:
```tsx
                    background: "linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%)",
```

Replace with:
```tsx
                    background: "var(--bg)",
```

- [ ] **Step 8: `app/sign-language/practice/page.tsx` — similarity meter fill (line 493)**

Find:
```tsx
                    background: isMatched ? "linear-gradient(90deg, #4ade80 0%, #22c55e 100%)" : "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
```

Replace with:
```tsx
                    background: isMatched ? "var(--success)" : "var(--accent)",
```

Note: this preserves the functional meaning (green = matched, blue = tracking) from the MediaPipe hand-tracking feature — only the gradient and the "tracking" color are changed, not the matched/unmatched semantics.

- [ ] **Step 9: The five identical "gradient text" components**

The same construct appears in five files, each wrapping one highlighted word/phrase. In each file, find the line containing `background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"` and replace `background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"` with `color: "var(--accent)"` — keeping everything else on the line (the surrounding `<span style={{ ... }}>` and its content) unchanged.

`components/CTASection.tsx:43`:
Find:
```tsx
          <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{t.cta.titleHighlight}</span>?
```
Replace with:
```tsx
          <span style={{ color: "var(--accent)" }}>{t.cta.titleHighlight}</span>?
```

`components/Features.tsx:16`:
Find:
```tsx
            <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{t.features.titleHighlight}</span>
```
Replace with:
```tsx
            <span style={{ color: "var(--accent)" }}>{t.features.titleHighlight}</span>
```

`components/GamificationSection.tsx:17`:
Find:
```tsx
            Учись, играя. <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Прогресс</span> — это XP.
```
Replace with:
```tsx
            Учись, играя. <span style={{ color: "var(--accent)" }}>Прогресс</span> — это XP.
```

`components/LanguageSection.tsx:34`:
Find:
```tsx
            Три языка. Один <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>голос</span>.
```
Replace with:
```tsx
            Три языка. Один <span style={{ color: "var(--accent)" }}>голос</span>.
```

`components/SubtitleDemo.tsx:60`:
Find:
```tsx
            Живые <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI-субтитры</span>
```
Replace with:
```tsx
            Живые <span style={{ color: "var(--accent)" }}>AI-субтитры</span>
```

- [ ] **Step 10: `components/PricingSection.tsx` — highlighted plan background (line 92)**

Find:
```tsx
                  ? "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)"
```

Replace with:
```tsx
                  ? "var(--accent)"
```

- [ ] **Step 11: `components/Hero.tsx` — waveform bar (line 267)**

Find:
```tsx
                      background: "linear-gradient(to top, #0EA5E9, #0369A1)",
```

Replace with:
```tsx
                      background: "var(--accent)",
```

- [ ] **Step 12: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 13: Verify no `linear-gradient` using old-palette colors remains (excluding the two explicitly out-of-scope lines)**

```bash
cd landing
grep -rnE "linear-gradient\([^)]*#(0EA5E9|0C4A6E|075985|0369A1|38BDF8|BAE6FD|E0F2FE|F0F9FF|0284C7|4ade80|22c55e|38bdf8|0284c7)" app components --include="*.tsx" | grep -v "app/community" | grep -v "camera-to-text/page.tsx:38"
```
Expected: no output. (The `camera-to-text` exclusion is intentional — that line's `repeating-linear-gradient` uses an unrelated teal color, out of scope per Global Constraints.)

- [ ] **Step 14: Commit**

```bash
cd landing
git add app/error.tsx app/not-found.tsx app/pricing/page.tsx app/sign-language/page.tsx app/sign-language/practice/page.tsx components/CTASection.tsx components/Features.tsx components/GamificationSection.tsx components/LanguageSection.tsx components/SubtitleDemo.tsx components/PricingSection.tsx
git commit -m "fix: flatten old-palette linear-gradient usages to flat Clean Blue colors"
```

---

### Task 3: Remove Hero.tsx's pulsing-ring decoration

**Files:**
- Modify: `landing/components/Hero.tsx`

**Interfaces:**
- Consumes: `var(--shadow)` from Task 1.

- [ ] **Step 1: Remove the three pulse-ring `<div>` elements**

Find:
```tsx
          {/* Pulsing rings */}
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              width: 440,
              height: 440,
              borderRadius: "50%",
              border: "1px solid var(--accent)",
              opacity: 0.2,
            }}
          />
          <div
            className="pulse-ring-delayed"
            style={{
              position: "absolute",
              width: 360,
              height: 360,
              borderRadius: "50%",
              border: "1px solid var(--purple)",
              opacity: 0.15,
            }}
          />
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: "50%",
              border: "1px solid var(--accent)",
              opacity: 0.1,
            }}
          />

          {/* Phone mockup */}
```

Replace with:
```tsx
          {/* Phone mockup */}
```

- [ ] **Step 2: Simplify the phone mockup's glow shadow**

Find:
```tsx
              boxShadow: "0 24px 80px rgba(14,165,233,0.18), 0 0 40px rgba(14,165,233,0.1)",
```

Replace with:
```tsx
              boxShadow: "var(--shadow)",
```

- [ ] **Step 3: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Verify the removed identifiers are gone**

```bash
cd landing
grep -nE "pulse-ring|var\(--purple\)" components/Hero.tsx
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd landing
git add components/Hero.tsx
git commit -m "feat: remove pulsing-ring decoration and glow shadow from Hero"
```

---

### Task 4: Bulk-replace solid hex literals with Clean Blue tokens

**Files:**
- Modify: every `*.tsx` file under `landing/app` (excluding `landing/app/community`) and `landing/components`

**Interfaces:**
- Consumes: `var(--accent)`, `var(--text)`, `var(--textSecondary)`, `var(--border)`, `var(--chipBg)`, `var(--bg)` from Task 1.

This is a single mechanical, deterministic substitution — safe as a bulk pass because Task 2 already removed every gradient construct that used these same hex codes (so there's no risk of corrupting a gradient by replacing only one of its stops).

- [ ] **Step 1: Run the bulk replacement**

```bash
cd landing
find app components -name "*.tsx" | grep -v "app/community" | xargs sed -i \
  -e 's/#0EA5E9/var(--accent)/g' \
  -e 's/#0C4A6E/var(--text)/g' \
  -e 's/#075985/var(--textSecondary)/g' \
  -e 's/#0369A1/var(--accent)/g' \
  -e 's/#38BDF8/var(--accent)/g' \
  -e 's/#BAE6FD/var(--border)/g' \
  -e 's/#E0F2FE/var(--chipBg)/g' \
  -e 's/#F0F9FF/var(--bg)/g' \
  -e 's/#0284C7/var(--accent)/g'
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Verify no occurrences of these hex codes remain**

```bash
cd landing
grep -rlE "#(0EA5E9|0C4A6E|075985|0369A1|38BDF8|BAE6FD|E0F2FE|F0F9FF|0284C7)" app components --include="*.tsx" | grep -v "app/community"
```
Expected: no output.

- [ ] **Step 4: Sanity-check the diff size**

```bash
cd landing
git diff --stat
```
Expected: roughly 20 files changed (matches the pre-planning survey — 20 files contained `#0EA5E9`, the most common of these patterns). If it's wildly different (e.g. 2 files or 100 files), stop and investigate before committing.

- [ ] **Step 5: Commit**

```bash
cd landing
git add -A
git commit -m "refactor: bulk-replace old-palette hex literals with Clean Blue CSS vars"
```

---

### Task 5: Bulk-neutralize blue-tinted `rgba()` shadows and borders

**Files:**
- Modify: every `*.tsx` file under `landing/app` (excluding `landing/app/community`) and `landing/components`

**Interfaces:**
- Produces: no more blue-tinted `rgba(14,165,233,*)` / `rgba(2,132,199,*)` / `rgba(56,189,248,*)` anywhere in scope — consumed by Task 6's verification.

Shadows, borders, and hover backgrounds frequently hardcode the old accent as `rgba(...)` at varying opacities (for transparency) rather than as solid hex — these aren't caught by Task 4's hex-only patterns. Neutralizing the color channels to `0, 0, 0` while keeping each occurrence's original alpha value flattens these to neutral gray/black shadows, matching Clean Blue's flat, non-tinted shadow style, without needing to hand-pick a replacement for each of the ~17 files this touches.

- [ ] **Step 1: Run the bulk neutralization**

```bash
cd landing
find app components -name "*.tsx" | grep -v "app/community" | xargs sed -i -E \
  -e 's/rgba\([[:space:]]*14,[[:space:]]*165,[[:space:]]*233,/rgba(0, 0, 0,/g' \
  -e 's/rgba\([[:space:]]*2,[[:space:]]*132,[[:space:]]*199,/rgba(0, 0, 0,/g' \
  -e 's/rgba\([[:space:]]*56,[[:space:]]*189,[[:space:]]*248,/rgba(0, 0, 0,/g'
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Verify no blue-tinted rgba() remains**

```bash
cd landing
grep -rlE "rgba\([[:space:]]*(14,[[:space:]]*165,[[:space:]]*233|2,[[:space:]]*132,[[:space:]]*199|56,[[:space:]]*189,[[:space:]]*248)" app components --include="*.tsx" | grep -v "app/community"
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd landing
git add -A
git commit -m "refactor: neutralize blue-tinted rgba shadows/borders to flat black-alpha"
```

---

### Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 2: Comprehensive grep for every old-palette pattern**

```bash
cd landing
grep -rlE "#(0EA5E9|0C4A6E|075985|0369A1|38BDF8|BAE6FD|E0F2FE|F0F9FF|0284C7)|rgba\([[:space:]]*(14,[[:space:]]*165,[[:space:]]*233|2,[[:space:]]*132,[[:space:]]*199|56,[[:space:]]*189,[[:space:]]*248)|var\(--purple\)|var\(--gradient\)|var\(--accentGlow\)|var\(--purpleGlow\)|var\(--shadowHover\)|var\(--shadowPhone\)|pulse-ring" app components --include="*.tsx" --include="*.css" | grep -v "app/community"
```
Expected: no output.

- [ ] **Step 3: Start the dev server**

```bash
cd landing
npm run dev
```
Expected: `Ready` within a few seconds. Leave running for the next step.

- [ ] **Step 4: Verify representative pages render**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/about
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
```
Expected: `200` for `/`, `/about`, `/login`. `/dashboard` may redirect (307/302) to `/login` if not authenticated in this environment — either is fine, a 500 is not.

- [ ] **Step 5: Human visual verification (not agent-executable)**

With the dev server running, open these pages in a real browser and confirm they render with the flat Clean Blue palette (dark navy `#1A1A2E` text, `#1565C0` accent, neutral gray borders/secondary text, no visible gradients or glowing shadows) and no visual breakage (missing colors showing as black/transparent, broken layout):
1. `/` — home page, especially the Hero phone mockup (no pulsing rings should be visible) and any section with a "highlighted word" (should be flat accent-colored text, not a gradient).
2. `/pricing` — the highlighted plan card (should have a flat accent background, not a gradient).
3. `/about`, `/dashboard`, `/login` — general layout/color check.
4. `/sign-language/practice` — confirm the gesture-matching similarity meter still shows green when matched and blue while tracking (functional colors preserved from the unrelated MediaPipe feature).

No commit for this step — it's a verification gate. If any check fails, stop and report back before considering this plan complete.
