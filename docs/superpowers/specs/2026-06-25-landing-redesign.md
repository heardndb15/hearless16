# Landing Redesign — Soft & Airy

**Date:** 2026-06-25
**Scope:** Landing site only (`landing/`) — mobile app unchanged

## Goal

Shift the overall feel from cold/techy (dark glassmorphism) to warm and human (light, airy, friendly) while keeping the light blue and white palette.

---

## Design Tokens

### Colors

| Token | Old | New |
|-------|-----|-----|
| `--bg` | `#E3F2FD` | `#F0F9FF` |
| `--accent` | `#0288D1` | `#0EA5E9` |
| `--text` | `#0D47A1` | `#0C4A6E` |
| `--textSecondary` | `#1E6FA8` | `#075985` |
| `--textMuted` | `#1565C0` | `#0369A1` |
| `--border` | `rgba(255,255,255,0.6)` | `rgba(14,165,233,0.12)` |
| `--shadow` | `0 16px 48px rgba(2,136,209,0.12)` | `0 2px 16px rgba(14,165,233,0.07)` |
| `--shadowHover` | — | `0 8px 32px rgba(14,165,233,0.12)` |
| `--bgCard` | `rgba(255,255,255,0.72)` | `#FFFFFF` |
| `--bgLight` | — | `#F0F9FF` (alternating section bg) |

### Typography

Replace `Syne` + `DM Sans` with **Plus Jakarta Sans** (single family, weights 400–800).

```
font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
```

- Headings: weight 700–800
- Body: weight 400–500, line-height 1.7
- Remove most `text-transform: uppercase` and tight `letter-spacing`
- Section labels: keep uppercase but softer weight (600, not 700)

### Spacing & Radius

| Token | Old | New |
|-------|-----|-----|
| `--radius` | `16px` | `20px` |
| `--radiusSm` | `10px` | `12px` |
| `--radiusXl` | — | `28px` (hero cards, feature cards) |

### Background

Replace fixed dark gradient with soft light gradient:

```css
body {
  background: linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 60%, #F0F9FF 100%);
  background-attachment: fixed;
}
```

---

## Components

### Header

- Background: `rgba(255,255,255,0.92)` + `backdrop-filter: blur(16px)`
- Logo text: `#0C4A6E`
- Nav links: `#075985`, hover `#0EA5E9`
- "Войти" button: white bg, border `rgba(14,165,233,0.3)`, text `#0369A1`
- "Регистрация" button: `#0EA5E9` bg, white text, radius `12px`

### Cards (feature cards, community posts, history items)

- Background: `#FFFFFF`
- Border: `1px solid rgba(14,165,233,0.12)`
- Shadow: `0 2px 16px rgba(14,165,233,0.07)`
- Hover shadow: `0 8px 32px rgba(14,165,233,0.12)`, `translateY(-3px)`
- Border radius: `20px`
- Icon: wrapped in `#E0F2FE` circle, no emoji directly on white

### Buttons

- **Primary:** bg `#0EA5E9`, text white, radius `12px`, no pill shape
- **Secondary:** bg white, border `1.5px solid #BAE6FD`, text `#0369A1`
- **Hover:** primary darkens to `#0284C7`, no aggressive `translateY`

### Sections

- Alternate between `#FFFFFF` and `#F0F9FF` backgrounds
- Remove `background: transparent !important` override — each section owns its bg
- Section titles: `#0C4A6E` (dark, not white on dark)
- Section labels: `#0EA5E9`

### Hero

- Background: white/very light — text is dark on light (reversal from current)
- H1: `#0C4A6E`, weight 800
- Subtitle text: `#075985`
- Subtitle animation card: white bg, `#E0F2FE` border, text `#0369A1`
- CTA buttons follow button spec above

### Dashboard Sidebar

- Background: `#FFFFFF`, right border `1px solid rgba(14,165,233,0.1)`
- Active item: bg `#E0F2FE`, text `#0369A1`, border `1px solid rgba(14,165,233,0.2)`
- Inactive item: text `#075985`, hover bg `#F0F9FF`
- Page bg: `#F0F9FF`

---

## Implementation Order

1. `landing/app/globals.css` — tokens, font import, body background, utility classes
2. `landing/components/Header.tsx` — white header
3. `landing/components/Hero.tsx` — light hero, dark text
4. `landing/components/Features.tsx` — white cards, icon circles
5. `landing/components/Footer.tsx` — light footer
6. `landing/components/CTASection.tsx`, `SubtitleDemo.tsx`, `SoundIndicators.tsx`, `GamificationSection.tsx`, `LanguageSection.tsx`
7. `landing/app/dashboard/layout.tsx` — sidebar tokens
8. `landing/app/community/page.tsx` — card and modal styles
9. All feature pages (`/subtitles`, `/alerts`, `/sign-language`, etc.)

## What Does NOT Change

- Page structure and layout
- Mobile app (`mobile/`)
- All content and copy
- Functionality and routes
- Backend (`backend/`)
