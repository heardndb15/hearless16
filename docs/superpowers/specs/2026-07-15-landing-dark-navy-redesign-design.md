# Landing Dark Navy Redesign — Design

## Problem

The current landing (`landing/`) uses a light, blue-accented design (`--bg: #F4F7FB`, `--accent: #1565C0`, soft gradients). The product owner doesn't like the visual style — it feels generic ("как у всех") — and wants a minimalist, dark navy look inspired by a reference image (a dark swirling navy-blue smoke/marble texture with scattered 4-point star sparkles). This is a **visual-only** redesign: content, copy, section order, and page structure stay unchanged.

## Scope

- **In scope:** `landing/` only — Home (`/`), Pricing (`/pricing`), About (`/about`) get full visual attention (palette + starfield background + contrast polish). All other already-migrated pages (see below) inherit the new palette automatically via CSS variables, without bespoke per-page polish this round.
- **Out of scope:** mobile app (Expo), backend, dashboard behavior, page structure/copy/section order, the `kk`/`ru` language switcher logic, payment flow.
- **No light/dark toggle.** The site becomes dark-only — there is exactly one theme.

## Reuse: `sitewide-dark-mode-sweep` branch

An existing unmerged branch/worktree (`worktree-sitewide-dark-mode-sweep`, plan at `docs/superpowers/plans/2026-07-14-sitewide-dark-mode-safety-sweep.md`) already did the hard part: it replaced hardcoded color literals (backgrounds, text, borders, SVG fill/stroke) with CSS custom properties across nearly every page and component, added a `ThemeContext` + `[data-theme="dark"]` CSS variable block, and verified light mode stays pixel-identical via `tsc`/`build` per task. This redesign **merges that branch first**, then reskins on top of it rather than re-doing the same literal-to-token migration from scratch.

Two deviations from that branch's original intent:

1. Its dark palette is neutral gray-black (`--bg: #0A0A0B`). This design replaces those dark values with a navy palette (see below).
2. It built the dark theme as a **toggle** (light stays default, dark is opt-in via a Header button). This design removes the toggle — dark becomes the only theme (the `[data-theme="dark"]` block's values move into `:root`, the light block is deleted, and the Header toggle button is removed).

## Palette

Applied directly in `landing/app/globals.css` `:root` (replacing current light values, no `[data-theme]` split needed since there is only one theme):

| Token | Old (light) | New (only theme) |
|---|---|---|
| `--bg` | `#F4F7FB` | `#0A0E1A` |
| `--bgCard` | `#FFFFFF` | `#12182A` |
| `--bgCardHover` | `#F4F7FB` | `#1A2138` |
| `--bgLight` | `#F4F7FB` | `#0A0E1A` |
| `--text` | `#1A1A2E` | `#F5F6F8` |
| `--textSecondary` / `--textMuted` | `#9CA3AF` | `#9AA5BD` |
| `--accent` / `--button` | `#1565C0` | `#4C8DDB` |
| `--chipBg` | `#EBF3FF` | `rgba(76, 141, 219, 0.15)` |
| `--border` / `--borderLight` | `#E8EDF5` | `rgba(255, 255, 255, 0.08)` |
| `--headerBg` | `rgba(255,255,255,0.92)` | `rgba(10, 14, 26, 0.85)` |
| `--gradient-accent` | `#1565C0 → #22C1C3` | `#4C8DDB → #22C1C3` |
| `--gradient-soft` | `#CFE4FF → #FFFFFF` | superseded by the starfield background layer (see below); can stay defined as a dark fallback (`#0F1720 → #0A0E1A`) for any component that still references it directly |
| `--danger` | `#DC2626` | `#F87171` |
| `--shadow` / `--shadowStrong` | light gray shadows | `0 2px 12px rgba(0,0,0,0.4)` / `0 16px 48px rgba(0,0,0,0.5)` |
| `--dark` | `#1A1A2E` (kept constant per the branch's own rule — permanently-dark surfaces like `Download.tsx` pair it with `--white` text) | unchanged — still `#1A1A2E`, still paired with `--white` text |

These are the exact values the `sitewide-dark-mode-sweep` branch already validated for its `[data-theme="dark"]` block, with `--bg`, `--bgCard`, `--bgCardHover`, `--bgLight`, `--accent`, `--button`, `--chipBg`, `--headerBg`, and `--gradient-accent` shifted toward navy instead of neutral gray.

## Starfield background

New component: `landing/components/StarfieldBackground.tsx`.

- Rendered once in `landing/app/layout.tsx`, behind all page content: `position: fixed; inset: 0; z-index: 0; pointer-events: none;`.
- Texture: 3–4 overlapping `radial-gradient` blobs in shades of navy over the base `--bg`, approximating the swirling smoke look of the reference image (no external image asset — avoids unknown-license Pinterest image, keeps it lightweight and exactly on-brand).
- Stars: ~15–20 small 4-point star SVGs (`<path d="M12 0l2 10 10 2-10 2-2 10-2-10L0 12l10-2z"/>`), fixed (not randomized-per-render) positions expressed in `%`/`vw`/`vh` so they scale with viewport, varying size (8–18px) and opacity (0.4–0.8), color `#AFC6EA`.
- Page content (Header, cards, sections) sits above it (`z-index: 1+`) on `--bg`/`--bgCard`; the texture reads most clearly in the Hero (which has no opaque background of its own) and wherever sections use transparent/low-opacity surfaces.

## Section-by-section changes

- **Hero:** no structural or copy changes. The animated subtitle-demo card's background is checked and pinned to `--bgCard` if it isn't already token-driven, so it doesn't remain a light patch. Everything else (heading, `.gradient-text` accent, label) already reads off `var(--text)`/tokens and repaints automatically.
- **Features, SubtitleDemo, TextToSpeechSection, LanguageSection, GamificationSection, PricingSection, CTASection, Footer:** repaint automatically via tokens (post-merge). Manual follow-up pass specifically for: (a) any icon/checkmark `stroke`/`fill` hardcoded to a light-only color instead of a token, (b) `box-shadow` values, which the source branch explicitly left untouched and are still tuned for light backgrounds — these get adjusted to `--shadow`/`--shadowStrong` or removed where they'd be invisible on dark.
- **Pricing page:** cards, compare table, FAQ accordion already migrated to tokens (branch commits `7e67701`, `070792c` specifically fixed contrast bugs here). The "★ Популярный" badge (`background: var(--text)`) becomes a light plaque with dark text on the new palette — kept as-is, reads as an intentional accent.
- **About page:** already fully token-driven (`var(--gradient-soft)`, `var(--accent)`, `var(--heading)`, `var(--textSecondary)` — no hardcoded literals, so it wasn't part of the source branch's migration commits but needs none); inherits palette, spot-checked for contrast.
- **Header:** remove the light/dark toggle button added by the source branch (dark is now the only theme, so there's nothing to toggle). Keep everything else (nav links, language switcher, auth buttons).
- **Rest of the site** (features, blog, contact, gamification, ai-tutor, text-to-speech, sign-language, subtitles, login, register, reset-password, error/not-found — all already migrated by the source branch): inherit the new navy palette automatically. No bespoke polish pass on these pages in this round; obvious contrast breakage gets fixed opportunistically but they don't get the starfield treatment beyond what the sitewide background layer already provides.

## Explicitly out of scope

- Mobile app (Expo), backend, dashboard — untouched.
- Content, copy, section order, page structure — untouched.
- Language switcher (`ru`/`kk`) logic — untouched.
- Payment flow — untouched.
- Any bespoke redesign of pages outside Home/Pricing/About beyond automatic token inheritance.

## Verification

- `npx tsc --noEmit` and `npm run build` from `landing/` after the merge and after the reskin (matches the source branch's own verification bar).
- Manual visual pass on Home, Pricing, About via dev server — check text contrast against the new navy background and confirm the starfield renders correctly behind real content (not just the mockup).
- Confirm existing functionality (language switcher, checkout buttons, contact form) is unaffected — this is a color-only change layered on already-migrated components.
