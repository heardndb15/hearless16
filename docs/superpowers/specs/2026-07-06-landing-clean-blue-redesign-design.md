# Landing Site Clean Blue Redesign (Design Spec)

**Date:** 2026-07-06
**Scope:** `landing/app/globals.css`, `landing/components/*.tsx`, and all ~24 page files under `landing/app/**/page.tsx` (excluding `landing/app/community/*`, which is already migrated)

## Goal

Bring the rest of the web landing site (currently a bright cyan/sky-blue "SaaS marketing" palette) into visual consistency with the "Clean Blue" design system already established in `mobile/src/constants/theme.ts` and already applied to the web's Community section (`landing/app/community/theme.ts`). This is a visual-only migration — no functional, layout-structure, or content changes.

## Why

The project currently has two competing visual identities live at once: the original landing palette (`--accent: #0EA5E9`, blue-tinted grays, 20px radii, gradient buttons, glow/pulse animations) defined in `globals.css`, and the newer, more neutral "Clean Blue" identity (`#1565C0` accent, true neutral grays, 16px radii, flat shadows, no glow) that the mobile app has always used and that Community adopted in a prior redesign. The user wants the whole project on one consistent identity, confirmed Community's current look is the right target, and wants the landing's decorative glow/gradient flourish removed entirely in favor of Community's flatter style — not just recolored in place.

This is step 1 of a larger effort (web landing → mobile app, tracked separately) to unify the whole project on Clean Blue. The mobile app already mostly matches; this pass is scoped to the web landing only.

## Non-goals

- No changes to `landing/app/community/*` — already on Clean Blue, out of scope.
- No changes to the mobile app (`mobile/`) — separate, later effort.
- No layout, copy, or functional changes — this is a palette/shadow/radius/decoration swap only. If a page's existing layout genuinely doesn't work with the new flatter style (rare edge case), flag it during planning rather than silently redesigning structure.
- No new design tokens beyond what Clean Blue already defines — reuse `mobile/src/constants/theme.ts`'s values exactly, don't invent new colors.

## Design Tokens (`landing/app/globals.css`)

Replace the existing `:root` block's values:

| Token | Old value | New value | Notes |
|---|---|---|---|
| `--bg` | `#F0F9FF` | `#F4F7FB` | Clean Blue's `listBackground` |
| `--bgCard` | `#FFFFFF` | `#FFFFFF` | unchanged |
| `--bgCardHover` | `#F0F9FF` | `#F4F7FB` | matches `--bg` |
| `--bgLight` | `#F0F9FF` | `#F4F7FB` | matches `--bg` |
| `--accent` | `#0EA5E9` | `#1565C0` | Clean Blue accent |
| `--text` | `#0C4A6E` | `#1A1A2E` | Clean Blue heading/text |
| `--textSecondary` | `#075985` | `#9CA3AF` | Clean Blue secondary |
| `--textMuted` | `#0369A1` | `#9CA3AF` | folded into textSecondary — Clean Blue has no third gray tier |
| `--border` | `rgba(14,165,233,0.12)` | `#E8EDF5` | Clean Blue border |
| `--borderLight` | `rgba(14,165,233,0.08)` | `#E8EDF5` | same as `--border` — Clean Blue doesn't distinguish a lighter variant |
| `--sos` | `#EF4444` | `#ef4444` | unchanged (case only) |
| `--heading` | `#0C4A6E` | `#1A1A2E` | matches `--text` |
| `--button` | `#0EA5E9` | `#1565C0` | matches `--accent` |
| `--dark` | `#0C4A6E` | `#1A1A2E` | matches `--text` |
| `--success` | `#22C55E` | `#22C55E` | unchanged |
| `--radius` | `20px` | `16px` | Clean Blue `cardRadius` |
| `--radiusSm` | `12px` | `12px` | unchanged |
| `--radiusXl` | `28px` | `16px` | no separate "extra large" tier in Clean Blue — collapse into `--radius` |
| `--headerBg` | `rgba(255,255,255,0.92)` | `rgba(255,255,255,0.92)` | unchanged |
| `--shadow` | `0 2px 16px rgba(14,165,233,0.07)` | `0 2px 12px rgba(0,0,0,0.07)` | Clean Blue `cardShadow`, neutral (not blue-tinted) |

Removed entirely (no replacement — decorative/gradient-only, see Section 3): `--accentGlow`, `--purple`, `--purpleGlow`, `--gradient`, `--shadowHover`, `--shadowPhone`.

`body`'s background changes from the three-stop blue gradient (`linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 50%, #F0F9FF 100%)`) to a flat `var(--bg)` (`#F4F7FB`), matching Community's flat single-color page background. The `section:nth-child(even/odd)` alternating-background rule keeps its structure but uses `var(--bg)` / `#FFFFFF` instead of the old blue-tinted values.

## Component/Page Sweep

Same mechanical approach used for the Community redesign: grep every file under `landing/app/**/*.tsx` (excluding `community/`) and `landing/components/*.tsx` for hardcoded hex literals from the old palette, and replace each with the corresponding CSS var — not a new hardcoded literal — so the mapping stays centralized in `globals.css`.

Substitution table (old literal → CSS var):

| Old literal | Replace with |
|---|---|
| `#0EA5E9` | `var(--accent)` |
| `#0C4A6E` | `var(--text)` |
| `#075985` | `var(--textSecondary)` |
| `#0369A1` | `var(--accent)` or `var(--textSecondary)` — role-specific, follow the same judgment call used in the Community migration (button/label text on light bg → accent; subtitle/muted text → textSecondary) |
| `#38BDF8` | `var(--accent)` (was the gradient's lighter stop; with gradients removed, collapses to flat accent) |
| `#BAE6FD` | `var(--border)` (borders) or `var(--bgCard)`/chip backgrounds — role-specific, same pattern as Community |
| `#E0F2FE` | a Clean-Blue-equivalent chip background; if no existing token fits, use `#EBF3FF` (Community's `chipBg`, add it as a new `--chipBg` CSS var alongside the others above) |
| `#F0F9FF` | `var(--bg)` |
| `white` / `#FFFFFF` used as literal white | leave as-is (still correct under Clean Blue) |

Pages/components in scope for this sweep: `Header.tsx`, `Hero.tsx`, `Footer.tsx`, `Features.tsx`, `SubtitleDemo.tsx`, `LanguageSection.tsx`, `GamificationSection.tsx`, `PricingSection.tsx`, `CTASection.tsx`, and all page files listed by the Scope section at the top (about, ai-tutor, alerts, blog + `[slug]`, camera-to-text, contact, dashboard + learn + profile, features, gamification, login, home (`app/page.tsx`), pricing, profile, register, reset-password, sign-language + practice, subtitles + transcript, terms, text-to-sign).

## Flatten Decorative Effects

- Remove the hero phone mockup's pulsing-ring animation (`.pulse-ring`, `.pulse-ring-delayed`, `@keyframes pulse-ring`, `@keyframes pulse-ring-delayed`) and the ring `<div>` elements in `Hero.tsx` that use them.
- Remove `@keyframes glow-pulse` and any element using it as a box-shadow animation.
- Replace any `background: var(--gradient)` or literal `linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)` usage with a flat `var(--accent)` background.
- `.btn-primary` loses its glow box-shadow (`box-shadow: 0 4px 16px rgba(14,165,233,0.25)` and the hover glow) — replaced with `var(--shadow)`, matching Community's flat button/card shadow treatment. The `translateY(-1px)` hover lift can stay (it's a subtle interaction cue, not a glow effect).
- `.gradient-text` utility class (used for gradient-filled heading text) either gets removed (if headings should just use flat `var(--text)`/`var(--accent)`) or redefined without a gradient — decide per-usage during planning since some headings may currently rely on it for emphasis; default to removing the gradient and using flat `var(--accent)` color for whatever text used `.gradient-text`, unless a specific instance clearly needs different handling.
- Other animations not tied to the old glow aesthetic (`float`, `cursor-blink`, `subtitle-slide`, `wave-move`, `xp-fill`, `fade-up`, `sound-pulse`, `spin`, `slide-up`, `pulse-soft`) are unrelated to the color/glow migration and stay as-is.

## Testing / Verification

- No test framework exists in `landing/` (confirmed in prior specs) — verification is `npx tsc --noEmit` (styling changes shouldn't introduce type errors, but confirms nothing broke), plus a grep pass confirming no old-palette hex literals (`#0EA5E9`, `#0C4A6E`, `#075985`, `#0369A1`, `#38BDF8`, `#BAE6FD`, `#E0F2FE`, `#F0F9FF`) remain anywhere under `landing/app` (excluding `community/`) or `landing/components`.
- Manual visual check across a representative sample of pages after the sweep: home (`/`), one static content page (e.g. `/about`), one dashboard page (`/dashboard`), one auth page (`/login`) — confirming flat Clean Blue styling renders correctly and no layout breakage. This is inherently a visual change no automated check can fully validate.

## Follow-up (tracked separately, not designed here)

- **Mobile app**: audit whether any mobile screens have drifted from `mobile/src/constants/theme.ts`'s Clean Blue values and need their own consistency pass.
