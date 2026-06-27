# Design: Sign Language Tutorial Cards

**Date:** 2026-06-27  
**Scope:** `landing/app/dashboard/learn/page.tsx`, new shared files

---

## Problem

The gesture catalog in `/dashboard/learn` shows cards with emoji, name, and attempt count — but no instruction on HOW to perform each gesture. Users have no guidance without leaving the page.

## Goal

Each gesture card in the catalog expands inline to show a step-by-step tutorial: SVG hand illustration, numbered steps, and a tip — without leaving the page or opening a modal.

---

## Architecture

### New files

**`landing/components/HandSign.tsx`**  
Extracted from `/sign-language/page.tsx`. SVG component rendering a hand shape based on which fingers are extended. Props: `fingers`, `size`, `color`.

```ts
type Fingers = {
  thumb?: boolean; index?: boolean; middle?: boolean;
  ring?: boolean; pinky?: boolean; shape?: "o" | "default";
};
```

**`landing/lib/gesturesTutorial.ts`**  
Dictionary keyed by gesture name (matching Supabase `gestures.name`). Each entry has:

```ts
interface GestureTutorial {
  fingers: Fingers;
  steps: string[];
  tip: string;
}

const GESTURE_TUTORIALS: Record<string, GestureTutorial> = {
  "Здравствуйте": { fingers: { ... }, steps: [...], tip: "..." },
  // ... all known gestures
}
```

Covers: Здравствуйте, Спасибо, До свидания, Пожалуйста, Да, Нет, Мама, Папа, Брат, Сестра, Еда, Вода, Вкусно, Радость, Грусть, Любовь, Один, Два, Три, Сто.

### Modified file

**`landing/app/dashboard/learn/page.tsx`**

Each card in the gesture grid gains:
- A `📖` icon button (top-right of card)
- Local state `expandedId: string | null` — tracks which card is open
- When expanded: card grows to show `HandSign` + steps + tip below existing info
- Cards without a matching entry in `GESTURE_TUTORIALS` simply hide the `📖` button

---

## UI Behaviour

```
Collapsed (default):
┌─────────────────────────────────────┐
│ 👋  Здравствуйте          ✓   [📖] │
│     Попыток: 3                      │
└─────────────────────────────────────┘

Expanded (after clicking 📖):
┌─────────────────────────────────────┐
│ 👋  Здравствуйте          ✓   [✕]  │
│     Попыток: 3                      │
├─────────────────────────────────────┤
│  [SVG hand]   1. Поднимите ладонь   │
│               2. Покачайте кистью   │
│               💡 Движение лёгкое    │
└─────────────────────────────────────┘
```

- Only one card expanded at a time (clicking a new `📖` closes the previous)
- Expanding a card does NOT change the selected gesture in the left panel
- The existing "click card to select" behaviour is preserved — click on the card body selects, click `📖` only toggles tutorial

---

## Data

`/sign-language/page.tsx` already has finger configs + steps for ~15 gestures across alphabet, numbers, greetings, emotions. We reuse this data in `gesturesTutorial.ts` and remove the duplication from `sign-language/page.tsx` (import from shared file instead).

---

## Out of scope

- Adding new gestures to the DB
- Animated GIFs or video
- SignalR / real-time connections (not needed for static tutorial content)
