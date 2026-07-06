# MediaPipe Hands Web Practice Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy CDN-script `@mediapipe/hands` engine on `/sign-language/practice` with the npm `@mediapipe/tasks-vision` `HandLandmarker` API (main thread, no Worker), and expand gesture coverage from 5 hardcoded dactyl letters to those 5 plus all 20 catalog gestures.

**Architecture:** One new data file (`landing/app/sign-language/practice/gestureDefs.ts`) holds all `GestureDef` entries (25 total: 5 existing dactyl letters with real calibrated vectors + 20 new catalog gestures with placeholder vectors pending human calibration). `page.tsx` is modified in place: CDN `<Script>` tags and the legacy `Hands`/`Camera` globals are replaced with `HandLandmarker.createFromOptions` + a `requestAnimationFrame` loop calling `detectForVideo`, and the hand-rolled skeleton-drawing code is replaced with the library's own `DrawingUtils`.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, `@mediapipe/tasks-vision@0.10.35` (npm, confirmed installable and its exact API verified against the installed package's `vision.d.ts` during planning).

## Global Constraints

- No test framework exists in `landing/` (confirmed: no jest/vitest/testing-library in `package.json`) — verification is `tsc --noEmit` + `curl`/`grep` checks + manual browser check, consistent with how this codebase's other features are verified.
- No Web Worker — HandLandmarker runs on the main thread via `requestAnimationFrame`, per the approved design spec (`docs/superpowers/specs/2026-07-06-mediapipe-hands-practice-design.md`).
- The 20 new gesture entries' `features`/`referenceLandmarks` are placeholders (reusing gesture "B"'s real calibrated values) until a human uses the in-app "Калибровка" panel to record the real ones — this plan does not attempt to generate real reference data for them.
- Do not change anything in `backend/` or `mobile/` — those are separate, later specs.
- Confidence thresholds stay identical to the legacy config: `numHands: 1`, `minHandDetectionConfidence: 0.6`, `minHandPresenceConfidence: 0.6`, `minTrackingConfidence: 0.6`.

---

### Task 1: Install `@mediapipe/tasks-vision`

**Files:**
- Modify: `landing/package.json`

**Interfaces:**
- Produces: `@mediapipe/tasks-vision` importable from `landing/` (used by Tasks 4-6).

- [ ] **Step 1: Install the package**

```bash
cd landing
npm install @mediapipe/tasks-vision@0.10.35
```

- [ ] **Step 2: Verify it installed**

```bash
cd landing
node -e "console.log(require('./node_modules/@mediapipe/tasks-vision/package.json').version)"
```
Expected: `0.10.35`

- [ ] **Step 3: Commit**

```bash
cd landing
git add package.json package-lock.json
git commit -m "feat: add @mediapipe/tasks-vision dependency"
```

---

### Task 2: Create `gestureDefs.ts` with 25 gesture entries

**Files:**
- Create: `landing/app/sign-language/practice/gestureDefs.ts`

**Interfaces:**
- Produces: `GestureDef` interface, `CONNECTIONS` (hand-skeleton topology for the illustrative SVG), `GESTURE_DEFS: Record<string, GestureDef>` — 25 keys: `A`, `B`, `G`, `V`, `O` (existing dactyl letters, real calibrated data, unchanged from today) plus `hello`, `thanks`, `bye`, `please`, `yes`, `no`, `mom`, `dad`, `brother`, `sister`, `food`, `water`, `tasty`, `joy`, `sadness`, `love`, `one`, `two`, `three`, `hundred` (20 new catalog gestures, placeholder data). Task 3 imports all three.

- [ ] **Step 1: Write the file**

```ts
export interface GestureDef {
  name: string;
  shortLabel: string;
  description: string;
  emoji: string;
  motionBased: boolean;
  features: Record<string, number>;
  referenceLandmarks: { x: number; y: number }[];
  checkRules: (features: Record<string, number>, states: Record<string, boolean>) => string[];
}

export const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Большой палец
  [0, 5], [5, 6], [6, 7], [7, 8], // Указательный палец
  [0, 9], [9, 10], [10, 11], [11, 12], // Средний палец
  [0, 13], [13, 14], [14, 15], [15, 16], // Безымянный палец
  [0, 17], [17, 18], [18, 19], [19, 20], // Мизинец
  [5, 9], [9, 13], [13, 17], // Ладонь
];

// Shared placeholder for the 20 new catalog gestures below, reusing gesture
// "B"'s real calibrated values, until a human records the real ones via the
// in-app "Калибровка" panel (see docs/superpowers/specs/2026-07-06-mediapipe-hands-practice-design.md).
const PLACEHOLDER_FEATURES: Record<string, number> = {
  thumb_extension: 1.25,
  index_extension: 1.85,
  middle_extension: 2.05,
  ring_extension: 1.85,
  pinky_extension: 1.62,
  thumb_wrist: 1.95,
  index_wrist: 2.35,
  middle_wrist: 2.55,
  ring_wrist: 2.35,
  pinky_wrist: 1.98,
  thumb_index: 0.82,
  index_middle: 0.35,
  middle_ring: 0.35,
  ring_pinky: 0.35,
};

const PLACEHOLDER_LANDMARKS: { x: number; y: number }[] = [
  { x: 50, y: 90 },
  { x: 32, y: 80 }, { x: 24, y: 70 }, { x: 20, y: 60 }, { x: 16, y: 50 },
  { x: 36, y: 52 }, { x: 34, y: 38 }, { x: 32, y: 26 }, { x: 30, y: 14 },
  { x: 48, y: 50 }, { x: 48, y: 34 }, { x: 48, y: 21 }, { x: 48, y: 8 },
  { x: 60, y: 52 }, { x: 62, y: 38 }, { x: 63, y: 26 }, { x: 64, y: 14 },
  { x: 72, y: 56 }, { x: 75, y: 44 }, { x: 77, y: 34 }, { x: 79, y: 24 },
];

// PLACEHOLDER — needs real calibration via the in-app tool. Returns no hints
// since there's no real rule logic to check against yet.
function placeholderCheckRules(): string[] {
  return [];
}

export const GESTURE_DEFS: Record<string, GestureDef> = {
  A: {
    name: "Буква А (Дактиль)",
    shortLabel: "А",
    description: "Кулак со сжатыми четырьмя пальцами и отведенным в сторону большим пальцем. Стандартная первая буква алфавита.",
    emoji: "✊",
    motionBased: false,
    features: {
      thumb_extension: 1.0,
      index_extension: 0.52,
      middle_extension: 0.52,
      ring_extension: 0.51,
      pinky_extension: 0.51,
      thumb_wrist: 1.25,
      index_wrist: 1.15,
      middle_wrist: 1.15,
      ring_wrist: 1.15,
      pinky_wrist: 1.15,
      thumb_index: 0.85,
      index_middle: 0.22,
      middle_ring: 0.22,
      ring_pinky: 0.22,
    },
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 36, y: 82 }, { x: 28, y: 72 }, { x: 23, y: 62 }, { x: 18, y: 50 },
      { x: 35, y: 55 }, { x: 34, y: 64 }, { x: 35, y: 70 }, { x: 38, y: 74 },
      { x: 48, y: 53 }, { x: 48, y: 62 }, { x: 48, y: 68 }, { x: 48, y: 72 },
      { x: 62, y: 55 }, { x: 62, y: 64 }, { x: 61, y: 70 }, { x: 60, y: 74 },
      { x: 73, y: 60 }, { x: 75, y: 68 }, { x: 74, y: 74 }, { x: 72, y: 78 },
    ],
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (states.index) hints.push("Сожмите указательный палец");
      if (states.middle) hints.push("Сожмите средний палец");
      if (states.ring) hints.push("Сожмите безымянный палец");
      if (states.pinky) hints.push("Сожмите мизинец");
      if (features.thumb_extension < 0.75) hints.push("Отведите большой палец сбоку наружу");
      return hints;
    },
  },
  B: {
    name: "Буква В (Дактиль)",
    shortLabel: "В",
    description: "Открытая прямая ладонь, направленная пальцами вверх. Все пять пальцев полностью выпрямлены и сомкнуты.",
    emoji: "🖐️",
    motionBased: false,
    features: {
      thumb_extension: 1.25,
      index_extension: 1.85,
      middle_extension: 2.05,
      ring_extension: 1.85,
      pinky_extension: 1.62,
      thumb_wrist: 1.95,
      index_wrist: 2.35,
      middle_wrist: 2.55,
      ring_wrist: 2.35,
      pinky_wrist: 1.98,
      thumb_index: 0.82,
      index_middle: 0.35,
      middle_ring: 0.35,
      ring_pinky: 0.35,
    },
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 32, y: 80 }, { x: 24, y: 70 }, { x: 20, y: 60 }, { x: 16, y: 50 },
      { x: 36, y: 52 }, { x: 34, y: 38 }, { x: 32, y: 26 }, { x: 30, y: 14 },
      { x: 48, y: 50 }, { x: 48, y: 34 }, { x: 48, y: 21 }, { x: 48, y: 8 },
      { x: 60, y: 52 }, { x: 62, y: 38 }, { x: 63, y: 26 }, { x: 64, y: 14 },
      { x: 72, y: 56 }, { x: 75, y: 44 }, { x: 77, y: 34 }, { x: 79, y: 24 },
    ],
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Выпрямите указательный палец");
      if (!states.middle) hints.push("Выпрямите средний палец");
      if (!states.ring) hints.push("Выпрямите безымянный палец");
      if (!states.pinky) hints.push("Выпрямите мизинец");
      if (features.index_middle > 0.55 || features.middle_ring > 0.55 || features.ring_pinky > 0.55) {
        hints.push("Сомкните пальцы плотнее друг к другу");
      }
      return hints;
    },
  },
  G: {
    name: "Буква Г (Дактиль)",
    shortLabel: "Г",
    description: "Указательный палец поднят вверх, большой палец отведен вбок под углом 90 градусов. Остальные пальцы сжаты.",
    emoji: "👈",
    motionBased: false,
    features: {
      thumb_extension: 1.30,
      index_extension: 1.82,
      middle_extension: 0.55,
      ring_extension: 0.54,
      pinky_extension: 0.52,
      thumb_wrist: 1.92,
      index_wrist: 2.32,
      middle_wrist: 1.15,
      ring_wrist: 1.15,
      pinky_wrist: 1.15,
      thumb_index: 1.75,
      index_middle: 1.45,
      middle_ring: 0.22,
      ring_pinky: 0.22,
    },
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 34, y: 80 }, { x: 22, y: 74 }, { x: 14, y: 70 }, { x: 6, y: 66 },
      { x: 36, y: 52 }, { x: 34, y: 38 }, { x: 32, y: 26 }, { x: 30, y: 14 },
      { x: 48, y: 53 }, { x: 48, y: 62 }, { x: 48, y: 68 }, { x: 48, y: 72 },
      { x: 62, y: 55 }, { x: 62, y: 64 }, { x: 61, y: 70 }, { x: 60, y: 74 },
      { x: 73, y: 60 }, { x: 75, y: 68 }, { x: 74, y: 74 }, { x: 72, y: 78 },
    ],
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Поднимите указательный палец вверх");
      if (features.thumb_extension < 0.9) hints.push("Отведите большой палец сильнее в сторону");
      if (states.middle) hints.push("Сожмите средний палец в кулак");
      if (states.ring) hints.push("Сожмите безымянный палец в кулак");
      if (states.pinky) hints.push("Сожмите мизинец в кулак");
      return hints;
    },
  },
  V: {
    name: "Жест Победа (V)",
    shortLabel: "V",
    description: "Указательный и средний пальцы подняты вверх и разведены в стороны. Остальные пальцы сжаты к ладони.",
    emoji: "✌️",
    motionBased: false,
    features: {
      thumb_extension: 0.72,
      index_extension: 1.82,
      middle_extension: 1.82,
      ring_extension: 0.52,
      pinky_extension: 0.51,
      thumb_wrist: 1.22,
      index_wrist: 2.32,
      middle_wrist: 2.32,
      ring_wrist: 1.15,
      pinky_wrist: 1.15,
      thumb_index: 1.05,
      index_middle: 0.88,
      middle_ring: 1.45,
      ring_pinky: 0.22,
    },
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 38, y: 80 }, { x: 32, y: 73 }, { x: 28, y: 68 }, { x: 25, y: 62 },
      { x: 36, y: 52 }, { x: 30, y: 38 }, { x: 24, y: 24 }, { x: 18, y: 12 },
      { x: 48, y: 50 }, { x: 50, y: 35 }, { x: 52, y: 22 }, { x: 54, y: 9 },
      { x: 62, y: 55 }, { x: 62, y: 64 }, { x: 61, y: 70 }, { x: 60, y: 74 },
      { x: 73, y: 60 }, { x: 75, y: 68 }, { x: 74, y: 74 }, { x: 72, y: 78 },
    ],
    checkRules: (features, states) => {
      const hints: string[] = [];
      if (!states.index) hints.push("Поднимите указательный палец");
      if (!states.middle) hints.push("Поднимите средний палец");
      if (states.ring) hints.push("Сожмите безымянный палец");
      if (states.pinky) hints.push("Сожмите мизинец");
      if (features.index_middle < 0.6) hints.push("Раздвиньте указательный и средний пальцы шире");
      return hints;
    },
  },
  O: {
    name: "Буква О (Дактиль)",
    shortLabel: "О",
    description: "Пальцы округлены и их кончики соприкасаются с большим пальцем, образуя форму кольца (буквы О).",
    emoji: "👌",
    motionBased: false,
    features: {
      thumb_extension: 0.82,
      index_extension: 0.85,
      middle_extension: 0.85,
      ring_extension: 0.85,
      pinky_extension: 0.85,
      thumb_wrist: 1.25,
      index_wrist: 1.25,
      middle_wrist: 1.25,
      ring_wrist: 1.25,
      pinky_wrist: 1.25,
      thumb_index: 0.22,
      index_middle: 0.32,
      middle_ring: 0.32,
      ring_pinky: 0.32,
    },
    referenceLandmarks: [
      { x: 50, y: 90 },
      { x: 42, y: 80 }, { x: 35, y: 70 }, { x: 34, y: 62 }, { x: 35, y: 52 },
      { x: 45, y: 55 }, { x: 38, y: 44 }, { x: 36, y: 47 }, { x: 35, y: 51 },
      { x: 48, y: 53 }, { x: 46, y: 42 }, { x: 43, y: 46 }, { x: 40, y: 51 },
      { x: 55, y: 55 }, { x: 53, y: 45 }, { x: 49, y: 49 }, { x: 45, y: 52 },
      { x: 60, y: 58 }, { x: 58, y: 48 }, { x: 54, y: 52 }, { x: 50, y: 55 },
    ],
    checkRules: (features) => {
      const hints: string[] = [];
      if (features.thumb_index > 0.42) {
        hints.push("Соедините кончики большого и указательного пальцев в кольцо");
      }
      if (features.index_extension > 1.35) hints.push("Округлите указательный палец");
      if (features.middle_extension > 1.35) hints.push("Округлите средний палец");
      if (features.ring_extension > 1.35) hints.push("Округлите безымянный палец");
      return hints;
    },
  },

  // 20 catalog gestures (backend/supabase/migration.sql). All placeholder
  // data pending human calibration via the in-app "Калибровка" panel.
  hello: {
    name: "Здравствуйте", shortLabel: "Здравствуйте", emoji: "👋", motionBased: true,
    description: "Приветственный жест: открытая ладонь поднимается от груди вперёд-вверх.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  thanks: {
    name: "Спасибо", shortLabel: "Спасибо", emoji: "🙏", motionBased: true,
    description: "Ладонь прикладывается к груди и слегка наклоняется вперёд в знак благодарности.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  bye: {
    name: "До свидания", shortLabel: "До свидания", emoji: "🖐️", motionBased: true,
    description: "Открытая ладонь покачивается из стороны в сторону на уровне плеча.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  please: {
    name: "Пожалуйста", shortLabel: "Пожалуйста", emoji: "🤲", motionBased: true,
    description: "Раскрытая ладонь совершает круговое движение у груди.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  yes: {
    name: "Да", shortLabel: "Да", emoji: "👍", motionBased: true,
    description: "Кулак несколько раз кивает вверх-вниз, как кивок головой.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  no: {
    name: "Нет", shortLabel: "Нет", emoji: "👎", motionBased: true,
    description: "Указательный и средний пальцы смыкаются с большим пальцем и покачиваются из стороны в сторону.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  mom: {
    name: "Мама", shortLabel: "Мама", emoji: "👩", motionBased: true,
    description: "Большой палец раскрытой ладони несколько раз касается щеки.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  dad: {
    name: "Папа", shortLabel: "Папа", emoji: "👨", motionBased: true,
    description: "Большой палец раскрытой ладони несколько раз касается лба.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  brother: {
    name: "Брат", shortLabel: "Брат", emoji: "👦", motionBased: true,
    description: "Указательные пальцы обеих рук соединяются и слегка постукивают друг о друга.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  sister: {
    name: "Сестра", shortLabel: "Сестра", emoji: "👧", motionBased: true,
    description: "Мизинцы обеих рук соединяются и слегка постукивают друг о друга.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  food: {
    name: "Еда", shortLabel: "Еда", emoji: "🍽️", motionBased: true,
    description: "Пальцы, собранные в щепоть, несколько раз подносятся ко рту.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  water: {
    name: "Вода", shortLabel: "Вода", emoji: "💧", motionBased: true,
    description: "Указательный палец несколько раз касается подбородка.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  tasty: {
    name: "Вкусно", shortLabel: "Вкусно", emoji: "😋", motionBased: true,
    description: "Ладонь описывает круговое движение у щеки.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  joy: {
    name: "Радость", shortLabel: "Радость", emoji: "😊", motionBased: true,
    description: "Обе ладони поднимаются вверх от груди.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  sadness: {
    name: "Грусть", shortLabel: "Грусть", emoji: "😢", motionBased: true,
    description: "Пальцы, сложенные вместе, медленно опускаются вниз от глаз.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  love: {
    name: "Любовь", shortLabel: "Любовь", emoji: "❤️", motionBased: true,
    description: "Скрещенные руки прикладываются к груди в области сердца.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  one: {
    name: "Один", shortLabel: "Один", emoji: "1️⃣", motionBased: false,
    description: "Один выпрямленный указательный палец, остальные пальцы сжаты в кулак.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  two: {
    name: "Два", shortLabel: "Два", emoji: "2️⃣", motionBased: false,
    description: "Указательный и средний пальцы выпрямлены и разведены, остальные сжаты.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  three: {
    name: "Три", shortLabel: "Три", emoji: "3️⃣", motionBased: false,
    description: "Три пальца — большой, указательный и средний — выпрямлены и разведены.",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
  hundred: {
    name: "Сто", shortLabel: "Сто", emoji: "💯", motionBased: false,
    description: "Числовой жест «сто».",
    features: PLACEHOLDER_FEATURES, referenceLandmarks: PLACEHOLDER_LANDMARKS, checkRules: placeholderCheckRules,
  },
};
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no errors mentioning `gestureDefs.ts` (this file has no external imports, so it cannot itself introduce type errors).

- [ ] **Step 3: Commit**

```bash
cd landing
git add app/sign-language/practice/gestureDefs.ts
git commit -m "feat: add gestureDefs data file with all 20 catalog gestures"
```

---

### Task 3: Wire `page.tsx` to import from `gestureDefs.ts`, fix picker labels

**Files:**
- Modify: `landing/app/sign-language/practice/page.tsx`

**Interfaces:**
- Consumes: `GestureDef`, `CONNECTIONS`, `GESTURE_DEFS` from `./gestureDefs` (Task 2).

- [ ] **Step 1: Remove the inline `GestureDef` interface, `GESTURE_DEFS`, `REFERENCE_LANDMARKS`, and `CONNECTIONS` definitions**

Delete every line starting with the line `interface GestureDef {` (currently line 11, right after the `// 1. ОПРЕДЕЛЕНИЕ ЭТАЛОННЫХ ЖЕСТОВ И ИХ ПРАВИЛ` comment) up to and including the closing `];` of the `const CONNECTIONS = [ ... ];` array (currently lines 221-228) — i.e. everything up to, but not including, the blank line before `function GesturePracticeContent() {` (currently line 230). Confirm before deleting:

```bash
cd landing
grep -n "^interface GestureDef\|^const CONNECTIONS\|^function GesturePracticeContent" app/sign-language/practice/page.tsx
```
Expected: `11:interface GestureDef {`, `221:const CONNECTIONS = [`, `230:function GesturePracticeContent() {` — delete lines 11 through 228 inclusive (everything between and including those first two matches, stopping right before line 230).

- [ ] **Step 2: Add the import**

Find:
```tsx
import Script from "next/script";
```

Replace with:
```tsx
import { GESTURE_DEFS, CONNECTIONS } from "./gestureDefs";
```

- [ ] **Step 3: Fix the picker button label (breaks for single-word gesture names)**

Find:
```tsx
                      <span style={{ fontSize: 16 }}>{g.emoji}</span>
                      <span>{g.name.split(" ")[1]}</span>
```

Replace with:
```tsx
                      <span style={{ fontSize: 16 }}>{g.emoji}</span>
                      <span>{g.shortLabel}</span>
```

- [ ] **Step 4: Fix the `REFERENCE_LANDMARKS[activeGesture]` references in the illustrative SVG**

Find (two occurrences in the SVG reference-diagram block):
```tsx
                      {CONNECTIONS.map(([from, to], idx) => {
                        const pt1 = REFERENCE_LANDMARKS[activeGesture][from];
                        const pt2 = REFERENCE_LANDMARKS[activeGesture][to];
```

Replace with:
```tsx
                      {CONNECTIONS.map(([from, to], idx) => {
                        const pt1 = GESTURE_DEFS[activeGesture].referenceLandmarks[from];
                        const pt2 = GESTURE_DEFS[activeGesture].referenceLandmarks[to];
```

Find:
```tsx
                      {REFERENCE_LANDMARKS[activeGesture].map((pt, idx) => (
```

Replace with:
```tsx
                      {GESTURE_DEFS[activeGesture].referenceLandmarks.map((pt, idx) => (
```

- [ ] **Step 5: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output. (The legacy `Hands`/`Camera`/`Script` engine code further down the file is untouched by this task and does not reference `GESTURE_DEFS`/`REFERENCE_LANDMARKS`/`CONNECTIONS`, so it does not affect this check — it's replaced in Task 4, not fixed here.)

- [ ] **Step 6: Commit**

```bash
cd landing
git add app/sign-language/practice/page.tsx
git commit -m "refactor: import gesture data from gestureDefs.ts, fix picker labels"
```

---

### Task 4: Replace legacy `Hands`/`Camera` engine with `HandLandmarker`

**Files:**
- Modify: `landing/app/sign-language/practice/page.tsx`

**Interfaces:**
- Consumes: `@mediapipe/tasks-vision` (Task 1).
- Produces: `handLandmarkerRef: React.MutableRefObject<HandLandmarker | null>`, `mediaStreamRef: React.MutableRefObject<MediaStream | null>` — used by Task 6's cleanup and Task 5's result handling.

- [ ] **Step 1: Add the import**

Find:
```tsx
import { GESTURE_DEFS, CONNECTIONS } from "./gestureDefs";
```

Replace with:
```tsx
import { GESTURE_DEFS, CONNECTIONS } from "./gestureDefs";
import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
```

- [ ] **Step 2: Remove the CDN `<Script>` tags**

Find:
```tsx
      {/* Загрузка скриптов MediaPipe через Next.js Script */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        strategy="afterInteractive"
        onLoad={() => handleScriptLoad("camera")}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        strategy="afterInteractive"
        onLoad={() => handleScriptLoad("hands")}
      />

      <div style={{ padding: "100px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>
```

Replace with:
```tsx
      <div style={{ padding: "100px 24px 60px", maxWidth: 1100, margin: "0 auto" }}>
```

- [ ] **Step 3: Replace `scriptsLoaded` state and refs with `HandLandmarker`/media-stream refs**

Find:
```tsx
  // Статусы камеры и скриптов
  const [scriptsLoaded, setScriptsLoaded] = useState({ camera: false, hands: false });
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handsTrackingActive, setHandsTrackingActive] = useState<boolean>(false);
  
  // Режим калибровки (для разработчика)
  const [calibrationMode, setCalibrationMode] = useState<boolean>(false);
  const [calibratedFeatures, setCalibratedFeatures] = useState<string | null>(null);

  // Референсы элементов DOM и MediaPipe
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
```

Replace with:
```tsx
  // Статусы камеры и модели
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handsTrackingActive, setHandsTrackingActive] = useState<boolean>(false);
  
  // Режим калибровки (для разработчика)
  const [calibrationMode, setCalibrationMode] = useState<boolean>(false);
  const [calibratedFeatures, setCalibratedFeatures] = useState<string | null>(null);

  // Референсы элементов DOM и MediaPipe
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
```

- [ ] **Step 4: Replace `initMediaPipe`**

Find:
```tsx
  // Инициализация MediaPipe Hands
  const initMediaPipe = () => {
    if (typeof window === "undefined" || !videoRef.current || !canvasRef.current) return;
    
    setCameraError(null);
    setIsModelLoading(true);

    try {
      const Hands = (window as any).Hands;
      const Camera = (window as any).Camera;

      if (!Hands || !Camera) {
        throw new Error("Библиотеки MediaPipe не найдены в глобальной области видимости.");
      }

      // Создаем экземпляр детектора рук
      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      hands.onResults(handleTrackingResults);
      handsInstanceRef.current = hands;

      // Создаем обертку для веб-камеры
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      cameraInstanceRef.current = camera;
      camera.start()
        .then(() => {
          setIsCameraActive(true);
          setIsModelLoading(false);
          setHandsTrackingActive(true);
        })
        .catch((err: any) => {
          console.error("Ошибка запуска камеры: ", err);
          setCameraError("Не удалось получить доступ к веб-камере. Пожалуйста, проверьте разрешения в настройках браузера.");
          setIsModelLoading(false);
        });

    } catch (err: any) {
      console.error("Ошибка инициализации MediaPipe: ", err);
      setCameraError(`Критическая ошибка инициализации трекера: ${err.message}`);
      setIsModelLoading(false);
    }
  };
```

Replace with:
```tsx
  // Инициализация MediaPipe HandLandmarker
  const initMediaPipe = async () => {
    if (typeof window === "undefined" || !videoRef.current || !canvasRef.current) return;

    setCameraError(null);
    setIsModelLoading(true);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      handLandmarkerRef.current = handLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      if (!videoRef.current) return;
      mediaStreamRef.current = stream;
      videoRef.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (!videoRef.current) return resolve();
        videoRef.current.onloadeddata = () => resolve();
      });

      await videoRef.current.play();

      setIsCameraActive(true);
      setIsModelLoading(false);
      setHandsTrackingActive(true);

      const predictLoop = () => {
        if (!videoRef.current || !handLandmarkerRef.current) return;
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        handleTrackingResults(results);
        animationFrameIdRef.current = requestAnimationFrame(predictLoop);
      };
      predictLoop();
    } catch (err: any) {
      console.error("Ошибка инициализации MediaPipe: ", err);
      setCameraError(`Не удалось получить доступ к веб-камере или инициализировать трекер: ${err.message}`);
      setIsModelLoading(false);
    }
  };
```

- [ ] **Step 5: Replace `handleScriptLoad` and the mount/cleanup effect**

Find:
```tsx
  // Обработка загрузки сторонних скриптов MediaPipe
  const handleScriptLoad = (type: "camera" | "hands") => {
    setScriptsLoaded(prev => {
      const updated = { ...prev, [type]: true };
      if (updated.camera && updated.hands) {
        // Ожидаем отрисовку элементов DOM
        setTimeout(() => {
          initMediaPipe();
        }, 100);
      }
      return updated;
    });
  };

  // Переключение активного жеста
```

Replace with:
```tsx
  // Переключение активного жеста
```

Find:
```tsx
  // Очистка веб-камеры и детектора при размонтировании
  useEffect(() => {
    // При монтировании проверяем, не загружены ли скрипты уже в глобальный контекст (для переходов без перезагрузки)
    if (typeof window !== "undefined") {
      const hasCamera = !!(window as any).Camera;
      const hasHands = !!(window as any).Hands;
      if (hasCamera && hasHands) {
        setScriptsLoaded({ camera: true, hands: true });
        setIsModelLoading(true);
        const timer = setTimeout(() => {
          initMediaPipe();
        }, 500);
        
        return () => {
          clearTimeout(timer);
          // Полное освобождение камеры
          if (cameraInstanceRef.current) {
            cameraInstanceRef.current.stop();
          }
          if (handsInstanceRef.current) {
            handsInstanceRef.current.close();
          }
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
          }
        };
      }
    }

    return () => {
      // Полное освобождение камеры при обычном выходе
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
      }
      if (handsInstanceRef.current) {
        handsInstanceRef.current.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);
```

Replace with:
```tsx
  // Инициализация трекера при монтировании, очистка при размонтировании
  useEffect(() => {
    initMediaPipe();

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 6: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output. Note this is not a functional guarantee: `handleTrackingResults`'s `results` parameter and `drawHandSkeleton`'s `landmarks` parameter are still typed `any`/`any[]` at this point, so TypeScript will not flag that `results.multiHandLandmarks` no longer matches the new API's `results.landmarks` shape — that's a runtime bug until Task 5 fixes it, invisible to this typecheck. Confirm via `grep -n "multiHandLandmarks" app/sign-language/practice/page.tsx` that the stale field name is still there (expected at this stage — Task 5 removes it) rather than relying on tsc to catch it.

- [ ] **Step 7: Commit**

```bash
cd landing
git add app/sign-language/practice/page.tsx
git commit -m "feat: replace legacy Hands/Camera engine with HandLandmarker"
```

---

### Task 5: Update `handleTrackingResults` for the new result shape

**Files:**
- Modify: `landing/app/sign-language/practice/page.tsx`

**Interfaces:**
- Consumes: `HandLandmarkerResult` (from Task 4's `detectForVideo` call) — shape `{ landmarks: NormalizedLandmark[][], worldLandmarks, handedness }`, where `NormalizedLandmark = { x: number, y: number, z: number, visibility: number }`. Confirmed against the installed package's `vision.d.ts`.

- [ ] **Step 1: Update the result-shape checks**

Find:
```tsx
  // Обработчик результатов трекинга от MediaPipe
  const handleTrackingResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очищаем canvas перед новым кадром
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Если рука найдена в кадре
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
```

Replace with:
```tsx
  // Обработчик результатов трекинга от MediaPipe
  const handleTrackingResults = (results: HandLandmarkerResult) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очищаем canvas перед новым кадром
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Если рука найдена в кадре
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
```

- [ ] **Step 2: Add the `HandLandmarkerResult` type import**

Find:
```tsx
import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
```

Replace with:
```tsx
import { FilesetResolver, HandLandmarker, DrawingUtils, HandLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";
```

- [ ] **Step 3: Type the `getDistance3D` helper's parameters (currently `any`)**

Find:
```tsx
  // Математическая функция расчета евклидова расстояния
  const getDistance3D = (pt1: any, pt2: any) => {
```

Replace with:
```tsx
  // Математическая функция расчета евклидова расстояния
  const getDistance3D = (pt1: NormalizedLandmark, pt2: NormalizedLandmark) => {
```

- [ ] **Step 4: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output. (`drawHandSkeleton`'s `landmarks` parameter is still typed `any[]` at this point, so passing it the now-`NormalizedLandmark[]`-typed `landmarks` value from `handleTrackingResults` won't error either way — tightened in Task 6, not required for a clean typecheck here.)

- [ ] **Step 5: Commit**

```bash
cd landing
git add app/sign-language/practice/page.tsx
git commit -m "fix: read HandLandmarkerResult.landmarks instead of legacy multiHandLandmarks"
```

---

### Task 6: Replace `drawHandSkeleton` with `DrawingUtils`

**Files:**
- Modify: `landing/app/sign-language/practice/page.tsx`

**Interfaces:**
- Consumes: `DrawingUtils`, `HandLandmarker.HAND_CONNECTIONS` (from `@mediapipe/tasks-vision`, confirmed shape `{ start: number; end: number }[]` in the installed package's `vision.d.ts`), `drawingUtilsRef` (from Task 4).

- [ ] **Step 1: Replace the function body**

Find:
```tsx
  // Рисование скелета руки поверх видео
  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], success: boolean) => {
    const isDark = true;
    const accentColor = success ? "#22C55E" : "#38bdf8"; // Зеленый при успехе, ярко-голубой при трекинге
    const pointColor = "#ffffff";

    // 1. Отрисовка костей
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.shadowBlur = success ? 15 : 6;
    ctx.shadowColor = accentColor;

    CONNECTIONS.forEach(([from, to]) => {
      const pt1 = landmarks[from];
      const pt2 = landmarks[to];
      if (pt1 && pt2) {
        ctx.beginPath();
        ctx.moveTo(pt1.x * ctx.canvas.width, pt1.y * ctx.canvas.height);
        ctx.lineTo(pt2.x * ctx.canvas.width, pt2.y * ctx.canvas.height);
        ctx.stroke();
      }
    });

    // Сбрасываем тень для суставов
    ctx.shadowBlur = 0;

    // 2. Отрисовка суставов (точек)
    landmarks.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * ctx.canvas.width, pt.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = pointColor;
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };
```

Replace with:
```tsx
  // Рисование скелета руки поверх видео
  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], success: boolean) => {
    const accentColor = success ? "#22C55E" : "#38bdf8"; // Зеленый при успехе, ярко-голубой при трекинге

    if (!drawingUtilsRef.current) {
      drawingUtilsRef.current = new DrawingUtils(ctx);
    }
    const drawingUtils = drawingUtilsRef.current;

    ctx.shadowBlur = success ? 15 : 6;
    ctx.shadowColor = accentColor;
    drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
      color: accentColor,
      lineWidth: 4,
    });

    ctx.shadowBlur = 0;
    drawingUtils.drawLandmarks(landmarks, {
      color: accentColor,
      fillColor: "#ffffff",
      lineWidth: 2,
      radius: 5,
    });
  };
```

- [ ] **Step 2: Verify it type-checks (should now be clean)**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output (no errors).

- [ ] **Step 3: Verify no references to the legacy engine remain**

```bash
cd landing
grep -nE "window\.Hands|window\.Camera|multiHandLandmarks|next/script|scriptsLoaded|handsInstanceRef|cameraInstanceRef" app/sign-language/practice/page.tsx
```
Expected: no output (empty).

- [ ] **Step 4: Commit**

```bash
cd landing
git add app/sign-language/practice/page.tsx
git commit -m "refactor: draw hand skeleton with DrawingUtils instead of hand-rolled canvas code"
```

---

### Task 7: Add the `motionBased` disclaimer badge

**Files:**
- Modify: `landing/app/sign-language/practice/page.tsx`

**Interfaces:**
- Consumes: `GESTURE_DEFS[activeGesture].motionBased: boolean` (Task 2).

- [ ] **Step 1: Add the badge next to the similarity meter**

Find:
```tsx
              {/* Точность распознавания с градиентом */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Точность совпадения:</span>
                  <span style={{ 
                    fontFamily: "'Plus Jakarta Sans', sans-serif", 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: isMatched ? "var(--success)" : "var(--accent)"
                  }}>
                    {similarity}%
                  </span>
                </div>
```

Replace with:
```tsx
              {/* Точность распознавания с градиентом */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Точность совпадения:</span>
                  <span style={{ 
                    fontFamily: "'Plus Jakarta Sans', sans-serif", 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: isMatched ? "var(--success)" : "var(--accent)"
                  }}>
                    {similarity}%
                  </span>
                </div>
                {GESTURE_DEFS[activeGesture]?.motionBased && (
                  <div style={{ fontSize: 12, color: "#eab308", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>⚠</span>
                    <span>Упрощённая проверка: сравниваем финальную позу руки, точность ниже для жестов с движением</span>
                  </div>
                )}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd landing
git add app/sign-language/practice/page.tsx
git commit -m "feat: show disclaimer badge for motion-based gestures"
```

---

### Task 8: Extend the calibration panel to capture `referenceLandmarks` too

**Files:**
- Modify: `landing/app/sign-language/practice/page.tsx`

**Interfaces:**
- Consumes: `activeFeatures` (existing state) and the current frame's raw landmarks — requires storing the latest raw landmarks in a ref during `handleTrackingResults` so `handleCalibrate` can read them.
- Produces: calibration output JSON now has shape `{ features: {...}, referenceLandmarks: [{x,y}, ...] }` instead of just the features object.

- [ ] **Step 1: Add a ref to store the latest raw landmarks**

Find:
```tsx
  const [activeFeatures, setActiveFeatures] = useState<Record<string, number> | null>(null);
```

Replace with:
```tsx
  const [activeFeatures, setActiveFeatures] = useState<Record<string, number> | null>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
```

- [ ] **Step 2: Store the raw landmarks each frame**

Find:
```tsx
      setActiveFeatures(currentFeatures);
```

Replace with:
```tsx
      setActiveFeatures(currentFeatures);
      latestLandmarksRef.current = landmarks;
```

- [ ] **Step 3: Update `handleCalibrate` to output both features and rescaled reference landmarks**

Find:
```tsx
  // Режим калибровки (сохранение текущих координат пользователя как эталонных)
  const handleCalibrate = () => {
    if (!activeFeatures) {
      alert("Сначала покажите руку камере, чтобы зафиксировать координаты.");
      return;
    }
    const formatted = JSON.stringify(activeFeatures, null, 2);
    setCalibratedFeatures(formatted);
    console.log("Калибровочные данные для жеста:", formatted);
  };
```

Replace with:
```tsx
  // Режим калибровки (сохранение текущих координат пользователя как эталонных)
  const handleCalibrate = () => {
    if (!activeFeatures || !latestLandmarksRef.current) {
      alert("Сначала покажите руку камере, чтобы зафиксировать координаты.");
      return;
    }
    // Пересчитываем 21 координату руки в 0-100 viewBox, как у REFERENCE_LANDMARKS
    const referenceLandmarks = latestLandmarksRef.current.map((pt) => ({
      x: Math.round(pt.x * 100),
      y: Math.round(pt.y * 100),
    }));
    const formatted = JSON.stringify({ features: activeFeatures, referenceLandmarks }, null, 2);
    setCalibratedFeatures(formatted);
    console.log("Калибровочные данные для жеста:", formatted);
  };
```

- [ ] **Step 4: Verify it type-checks**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd landing
git add app/sign-language/practice/page.tsx
git commit -m "feat: capture reference landmarks alongside feature vector in calibration panel"
```

---

### Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

```bash
cd landing
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 2: Start the dev server**

```bash
cd landing
npm run dev
```
Expected: `Ready` within a few seconds. Leave running for the next steps.

- [ ] **Step 3: Verify the route renders**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sign-language/practice
```
Expected: `200`

- [ ] **Step 4: Verify no legacy CDN/engine references remain anywhere in the file**

```bash
cd landing
grep -nE "cdn.jsdelivr.net/npm/@mediapipe/(hands|camera_utils)|window\.Hands|window\.Camera|multiHandLandmarks|scriptsLoaded" app/sign-language/practice/page.tsx
```
Expected: no output.

- [ ] **Step 5: Verify all 25 gesture keys are present**

```bash
cd landing
grep -cE "^  (A|B|G|V|O|hello|thanks|bye|please|yes|no|mom|dad|brother|sister|food|water|tasty|joy|sadness|love|one|two|three|hundred): \{" app/sign-language/practice/gestureDefs.ts
```
Expected: `25`

- [ ] **Step 6: Human verification (not agent-executable)**

With the dev server running, open `http://localhost:3000/sign-language/practice` in a real browser:
1. Confirm the camera permission prompt appears and, once granted, the video feed shows with a live green/blue hand-skeleton overlay tracking your hand.
2. Cycle through a few gesture picker buttons (both dactyl letters and new catalog words) — confirm the illustrative reference diagram updates for each, and the "⚠ Упрощённая проверка" badge appears only for the motion-based ones (not for А/В/Г/V/О or Один/Два/Три/Сто).
3. Perform gesture "B" (open flat palm) and confirm the similarity percentage still climbs into the 80s/90s and marks it matched — this is the regression check that the engine swap didn't change real behavior for the one gesture with genuine calibrated data you can easily reproduce.
4. Open the "Калибровка" panel, show any hand pose, click "Записать эталон", and confirm the JSON output now contains both a `features` object and a `referenceLandmarks` array of 21 `{x, y}` points.

No commit for this step — it's a verification gate. If any check fails, stop and report back before considering this plan complete.
