# Redesign: Clean Blue — Hearless Mobile

**Date:** 2026-06-28
**Scope:** Full redesign of all screens + tab bar

## Goal

Remove the generic glassmorphism-on-gradient look and give the app a clean, airy personality with warmth and a sense of community. Blue stays as the brand color but is used selectively, not everywhere.

## Color System

| Token | Old | New |
|---|---|---|
| Screen background | Blue gradient | `#FFFFFF` |
| Header background | Gradient continuation | `#1565C0` |
| Card background | `rgba(255,255,255,0.72)` glass | `#FFFFFF` opaque |
| List background (between cards) | Gradient | `#F4F7FB` |
| Card shadow | `rgba(2,136,209,0.18)` | `rgba(0,0,0,0.07)` |
| Card border | `rgba(255,255,255,0.6)` | `#E8EDF5` |
| Primary text | `#0D47A1` | `#1A1A2E` |
| Secondary text | `#1E6FA8` | `#9CA3AF` |
| Accent / buttons | `#0277BD` | `#1565C0` |

## Theme Changes (`theme.ts`)

Remove `GlassCard`. Add `Card`:
```ts
export const Card = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 3,
}

export const Colors = {
  background: '#FFFFFF',
  listBackground: '#F4F7FB',
  card: '#FFFFFF',
  border: '#E8EDF5',
  accent: '#1565C0',
  button: '#1565C0',
  heading: '#1A1A2E',
  secondary: '#9CA3AF',
  dark: '#1A1A2E',
  sos: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  textPrimary: '#1A1A2E',
  textSecondary: '#9CA3AF',
}
```

## Tab Bar

- Background: `#FFFFFF` opaque
- Top border: `1px solid #E8EDF5`
- Shadow: `rgba(0,0,0,0.06)` top-down
- Height: `64px`
- Active tab: icon in `#EBF3FF` pill (48×32px, borderRadius 16), label `#1565C0` semibold
- Inactive tab: icon as-is, label `#9CA3AF` medium

## Screen Headers

All tabs with a title get a uniform header:
- Background: `#1565C0`
- Title: white, 22px bold
- Icons/actions: white
- Height: `~56px` + SafeAreaView top inset
- Bottom shadow: `rgba(21,101,192,0.15)` height 4

Screens without title content (Субтитры — full-screen recorder): no header, white background.

## Cards

Applied across Community, Study, Gestures:
- Background: `#FFFFFF`
- `borderRadius: 16`
- Shadow: `rgba(0,0,0,0.07)` blur 12
- Horizontal margin: `16px`
- Vertical gap between cards: `10px`
- List background between cards: `#F4F7FB`

Card content colors:
- Author name / titles: `#1A1A2E`
- Timestamps / secondary labels: `#9CA3AF`
- Footer icons (like, comment): `#9CA3AF` default, `#ef4444` for active like, `#1565C0` for comment

## LinearGradient

All `LinearGradient` wrappers are replaced with plain `View` with `backgroundColor: '#FFFFFF'` (or `#F4F7FB` for list screens). The gradient is removed entirely from every screen.

## Screen-by-screen summary

| Screen | Change |
|---|---|
| SubtitlesScreen | White bg, no header, controls stay |
| GesturesScreen | White bg, blue header, cards updated |
| StudyScreen | White bg, blue header, cards updated |
| ProfileScreen | White bg, blue header, form fields updated |
| CommunityFeedScreen | White bg, blue header, cards + list bg updated |
| TabNavigator | Pill active state, white bar |
