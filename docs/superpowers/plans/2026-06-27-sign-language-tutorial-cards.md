# Sign Language Tutorial Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expandable inline tutorial panels to gesture cards in `/dashboard/learn` showing SVG hand illustration, step-by-step instructions, and a tip.

**Architecture:** Extract the existing `HandSign` SVG component into a shared file, create a tutorial data dictionary keyed by gesture name, then wire both into the dashboard learn page — cards get a 📖 toggle button that expands/collapses the tutorial inline.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS. No test framework — verification is TypeScript build + visual browser check.

## Global Constraints

- Always commit and push to `origin master` — never `main`
- All new files under `landing/`
- Follow existing Tailwind class style in `dashboard/learn/page.tsx`
- No new npm packages required

---

### Task 1: Create shared HandSign component

**Files:**
- Create: `landing/components/HandSign.tsx`
- (No modification to sign-language/page.tsx yet — that comes in Task 4)

**Interfaces:**
- Produces: `HandSign` (default export), `Fingers` (named type export)

- [ ] **Step 1: Create `landing/components/HandSign.tsx`**

```tsx
"use client";

export type Fingers = {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  shape?: "o" | "default";
};

export function HandSign({
  fingers,
  size = 120,
  color = "#0EA5E9",
}: {
  fingers: Fingers;
  size?: number;
  color?: string;
}) {
  const { thumb, index, middle, ring, pinky, shape } = fingers;
  const gray = "#CBD5E1";
  const palm = "#E2E8F0";

  if (shape === "o") {
    return (
      <svg width={size} height={size} viewBox="0 0 80 100" style={{ display: "block", margin: "0 auto" }}>
        <rect x="5" y="60" width="70" height="36" rx="12" fill={palm} stroke="#D1D5DB" strokeWidth="1" />
        {[7, 23, 39, 55].map((x, i) => (
          <rect key={i} x={x} y="44" width="14" height="18" rx="6" fill={gray} />
        ))}
        <circle cx="40" cy="34" r="17" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <path d="M 14 62 Q 8 46 22 34" fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    );
  }

  const cols = [
    { key: "pinky",  x: 7,  ext: !!pinky  },
    { key: "ring",   x: 23, ext: !!ring   },
    { key: "middle", x: 39, ext: !!middle },
    { key: "index",  x: 55, ext: !!index  },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 80 100" style={{ display: "block", margin: "0 auto" }}>
      {cols.map(({ key, x, ext }) => (
        <rect key={key} x={x} y={ext ? 2 : 44} width={14} height={ext ? 58 : 17} rx={6} fill={ext ? color : gray} />
      ))}
      <rect x="5" y="58" width="70" height="38" rx="12" fill={palm} stroke="#D1D5DB" strokeWidth="1" />
      <rect
        x="-6"
        y={thumb ? -25 : -11}
        width="13"
        height={thumb ? 27 : 13}
        rx="5"
        fill={thumb ? color : gray}
        transform="translate(16, 72) rotate(-40)"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd landing && npx tsc --noEmit
```
Expected: no errors related to `HandSign.tsx`

- [ ] **Step 3: Commit**

```bash
git add landing/components/HandSign.tsx
git commit -m "feat: extract HandSign SVG to shared component"
git push origin master
```

---

### Task 2: Create gesture tutorial data

**Files:**
- Create: `landing/lib/gesturesTutorial.ts`

**Interfaces:**
- Consumes: `Fingers` from `landing/components/HandSign.tsx`
- Produces: `GESTURE_TUTORIALS: Record<string, GestureTutorial>`, `GestureTutorial` type

- [ ] **Step 1: Create `landing/lib/gesturesTutorial.ts`**

```ts
import type { Fingers } from "../components/HandSign";

export interface GestureTutorial {
  fingers: Fingers;
  steps: string[];
  tip: string;
}

export const GESTURE_TUTORIALS: Record<string, GestureTutorial> = {
  "Здравствуйте": {
    fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true },
    steps: [
      "Поднимите открытую ладонь на уровень лица, пальцами вверх",
      "Слегка покачайте кистью вправо-влево 2–3 раза",
    ],
    tip: "Движение лёгкое и расслабленное — как обычное приветствие.",
  },
  "Спасибо": {
    fingers: { thumb: true, index: false, middle: false, ring: false, pinky: false },
    steps: [
      "Сожмите кулак, поднимите большой палец вверх",
      "Поднесите кулак к подбородку тыльной стороной",
      "Плавно отведите руку вперёд от лица",
    ],
    tip: "Движение идёт от подбородка вперёд — как «бросить» благодарность.",
  },
  "До свидания": {
    fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true },
    steps: [
      "Поднимите открытую ладонь на уровень плеча",
      "Покачайте кистью вправо-влево — прощальный жест",
    ],
    tip: "Похож на «Здравствуйте», но обычно чуть ниже и медленнее.",
  },
  "Пожалуйста": {
    fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    steps: [
      "Прижмите плоскую ладонь (пальцами вместе) к груди",
      "Плавно поведите ладонь вперёд, как будто «преподносите» просьбу",
    ],
    tip: "Жест мягкий и плавный — передаёт вежливость.",
  },
  "Да": {
    fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    steps: [
      "Сожмите кулак",
      "Дважды опустите кулак вниз и поднимите — как кивок рукой",
    ],
    tip: "Движение небольшое и чёткое — имитирует кивок головой.",
  },
  "Нет": {
    fingers: { thumb: false, index: true, middle: true, ring: false, pinky: false },
    steps: [
      "Поднимите указательный и средний пальцы вместе",
      "Покачайте ими вправо-влево, как знак «нет»",
    ],
    tip: "Пальцы вместе — не разведены. Движение горизонтальное.",
  },
  "Мама": {
    fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true },
    steps: [
      "Раскройте ладонь, пальцы разведены",
      "Коснитесь подбородка большим пальцем",
      "Дважды коснитесь подбородка",
    ],
    tip: "Большой палец касается подбородка — запомните: мама «внизу».",
  },
  "Папа": {
    fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true },
    steps: [
      "Раскройте ладонь, пальцы разведены",
      "Коснитесь лба большим пальцем",
      "Дважды коснитесь лба",
    ],
    tip: "Большой палец касается лба — запомните: папа «вверху».",
  },
  "Брат": {
    fingers: { thumb: true, index: true, middle: false, ring: false, pinky: false },
    steps: [
      "Поднимите указательный палец вертикально вверх",
      "Отведите большой палец в сторону",
      "Покачайте кистью немного вниз",
    ],
    tip: "Указательный и большой — Г-образный жест на уровне груди.",
  },
  "Сестра": {
    fingers: { thumb: true, index: false, middle: false, ring: false, pinky: true },
    steps: [
      "Выпрямите большой палец и мизинец, остальные сожмите",
      "Держите ладонь горизонтально",
      "Слегка покачайте кистью",
    ],
    tip: "Большой и мизинец — как «рожки» или знак ILY.",
  },
  "Еда": {
    fingers: { thumb: false, index: true, middle: true, ring: true, pinky: true },
    steps: [
      "Сожмите четыре пальца вместе (большой — в кулак)",
      "Поднесите кончики пальцев ко рту",
      "Дважды коснитесь губ кончиками пальцев",
    ],
    tip: "Жест имитирует движение «класть еду в рот».",
  },
  "Вода": {
    fingers: { thumb: false, index: true, middle: true, ring: false, pinky: false },
    steps: [
      "Поднимите указательный и средний пальцы (форма V)",
      "Поднесите их к губам и дважды коснитесь",
    ],
    tip: "Два пальца у губ — как «пить» двумя пальцами.",
  },
  "Вкусно": {
    fingers: { shape: "o" },
    steps: [
      "Соедините все кончики пальцев с кончиком большого — форма О",
      "Поднесите «кольцо» к губам и поцелуйте кончики",
    ],
    tip: "Итальянский жест «отлично» — в контексте еды означает «вкусно».",
  },
  "Радость": {
    fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true },
    steps: [
      "Поднимите обе открытые ладони на уровень груди",
      "Делайте круговые движения ладонями по направлению к себе",
    ],
    tip: "Круговые движения у груди передают ощущение тепла и радости.",
  },
  "Грусть": {
    fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    steps: [
      "Поднесите кулаки к глазам",
      "Медленно опустите кулаки вниз по щекам — имитация слёз",
    ],
    tip: "Медленное движение вниз передаёт печаль.",
  },
  "Любовь": {
    fingers: { thumb: true, index: false, middle: false, ring: false, pinky: true },
    steps: [
      "Выпрямите большой палец и мизинец, сожмите остальные",
      "Прижмите кулак к груди в районе сердца",
    ],
    tip: "Большой + мизинец = знак ILY (I Love You) у груди.",
  },
  "Один": {
    fingers: { thumb: false, index: true, middle: false, ring: false, pinky: false },
    steps: [
      "Сожмите все пальцы в кулак",
      "Поднимите только указательный палец строго вертикально вверх",
    ],
    tip: "Один палец = единица. Самый простой счётный жест.",
  },
  "Два": {
    fingers: { thumb: false, index: true, middle: true, ring: false, pinky: false },
    steps: [
      "Поднимите указательный и средний пальцы вверх",
      "Раздвиньте их — форма V",
    ],
    tip: "Два пальца = двойка. Тот же жест, что «победа» или «мир».",
  },
  "Три": {
    fingers: { thumb: false, index: true, middle: true, ring: true, pinky: false },
    steps: [
      "Поднимите указательный, средний и безымянный пальцы вверх",
      "Мизинец и большой прижаты к ладони",
    ],
    tip: "Три средних пальца — безымянный включён, мизинец нет.",
  },
  "Сто": {
    fingers: { shape: "o" },
    steps: [
      "Сложите пальцы в форму кольца О",
      "Поднимите руку на уровень груди",
      "Затем раскройте ладонь резким движением",
    ],
    tip: "Кольцо раскрывается — символизирует «много» или «сто».",
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd landing && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add landing/lib/gesturesTutorial.ts
git commit -m "feat: add gesture tutorial data dictionary"
git push origin master
```

---

### Task 3: Wire tutorial cards into dashboard/learn

**Files:**
- Modify: `landing/app/dashboard/learn/page.tsx`

**Interfaces:**
- Consumes: `HandSign`, `Fingers` from `landing/components/HandSign.tsx`
- Consumes: `GESTURE_TUTORIALS`, `GestureTutorial` from `landing/lib/gesturesTutorial.ts`

- [ ] **Step 1: Add imports to the top of `landing/app/dashboard/learn/page.tsx`**

After the existing imports (after line 5 `import type { User } from "@supabase/supabase-js";`), add:

```tsx
import { HandSign } from "../../../components/HandSign";
import { GESTURE_TUTORIALS } from "../../../lib/gesturesTutorial";
```

- [ ] **Step 2: Add `expandedId` state**

Inside `LearnSignLanguagePage`, after the existing `const [verifyError, setVerifyError] = useState("");` line, add:

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null);
```

- [ ] **Step 3: Replace the gesture card in the grid**

Find this block (inside the `.map((item) => {` in the Right Side grid):

```tsx
<div
  key={item.id}
  onClick={() => setSelectedGesture(item)}
  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-4 ${
    isSelected
      ? "bg-white/70 border-accent shadow-md scale-[1.02]"
      : "bg-white/40 border-white/60 hover:bg-white/50 hover:border-slate-300 shadow-sm"
  }`}
>
  <div className="text-2xl p-2 bg-white/80 border border-slate-100 shadow-sm rounded-lg">
    {translateNameToEmoji(item.name)}
  </div>
  <div className="flex-1 min-w-0">
    <h4 className="font-syne font-bold text-sm text-slate-800 truncate">{item.name}</h4>
    <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
      Попыток: {hasProgress?.attempts || 0}
    </p>
  </div>
  {hasProgress?.learned && (
    <span className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 text-[10px] font-bold">
      ✓
    </span>
  )}
</div>
```

Replace with:

```tsx
<div
  key={item.id}
  className={`rounded-xl border text-left transition-all ${
    isSelected
      ? "bg-white/70 border-accent shadow-md"
      : "bg-white/40 border-white/60 hover:bg-white/50 hover:border-slate-300 shadow-sm"
  }`}
>
  {/* Card header row — clicking here selects the gesture */}
  <div
    onClick={() => setSelectedGesture(item)}
    className="p-4 flex items-center gap-4 cursor-pointer"
  >
    <div className="text-2xl p-2 bg-white/80 border border-slate-100 shadow-sm rounded-lg">
      {translateNameToEmoji(item.name)}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-syne font-bold text-sm text-slate-800 truncate">{item.name}</h4>
      <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
        Попыток: {hasProgress?.attempts || 0}
      </p>
    </div>
    {hasProgress?.learned && (
      <span className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 text-[10px] font-bold shrink-0">
        ✓
      </span>
    )}
    {GESTURE_TUTORIALS[item.name] && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpandedId(expandedId === item.id ? null : item.id);
        }}
        className="shrink-0 w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-xs text-sky-600 hover:bg-sky-100 transition-colors"
        title="Как делать этот жест"
      >
        {expandedId === item.id ? "✕" : "📖"}
      </button>
    )}
  </div>

  {/* Expandable tutorial panel */}
  {expandedId === item.id && GESTURE_TUTORIALS[item.name] && (() => {
    const tutorial = GESTURE_TUTORIALS[item.name];
    return (
      <div className="px-4 pb-4 border-t border-slate-100">
        <div className="flex gap-4 pt-4">
          {/* SVG hand */}
          <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-100 flex items-center justify-center">
            <HandSign fingers={tutorial.fingers} size={64} color="#0EA5E9" />
          </div>
          {/* Steps */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {tutorial.steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="shrink-0 w-4 h-4 rounded-full bg-sky-100 border border-sky-200 text-[9px] font-bold text-sky-600 flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[11px] text-slate-600 leading-tight">{step}</p>
              </div>
            ))}
          </div>
        </div>
        {tutorial.tip && (
          <div className="mt-3 flex gap-2 items-start bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <span className="text-xs shrink-0">💡</span>
            <p className="text-[11px] text-amber-700 leading-tight">{tutorial.tip}</p>
          </div>
        )}
      </div>
    );
  })()}
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd landing && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Start dev server and visually verify**

```bash
cd landing && npm run dev
```

Open `http://localhost:3000/dashboard/learn` (log in first).  
Check:
- Each gesture card with a tutorial shows 📖 button
- Clicking 📖 expands the tutorial panel inline with SVG hand + steps + tip
- Clicking ✕ collapses it
- Only one card expanded at a time (clicking another 📖 closes the previous)
- Clicking the card body still selects the gesture in the left panel
- Cards without tutorial data show no 📖 button

- [ ] **Step 6: Commit**

```bash
git add landing/app/dashboard/learn/page.tsx
git commit -m "feat: add expandable tutorial panels to gesture cards"
git push origin master
```

---

### Task 4: Clean up sign-language/page.tsx to use shared HandSign

**Files:**
- Modify: `landing/app/sign-language/page.tsx`

**Interfaces:**
- Consumes: `HandSign`, `Fingers` from `landing/components/HandSign.tsx`

- [ ] **Step 1: Remove the local `HandSign` definition from `sign-language/page.tsx`**

Delete this entire block (lines 6–70 approximately):

```tsx
// ── Hand SVG component ────────────────────────────────────────────────────────
type Fingers = {
  thumb?: boolean;
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  shape?: "o" | "default";
};

function HandSign({ fingers, size = 120, color = "#0EA5E9" }: { fingers: Fingers; size?: number; color?: string }) {
  // ... full function body
}
```

- [ ] **Step 2: Add import at top of `sign-language/page.tsx`**

After `import { useState } from "react";`, add:

```tsx
import { HandSign } from "../../components/HandSign";
import type { Fingers } from "../../components/HandSign";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd landing && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Visual check — open `/sign-language`**

Open `http://localhost:3000/sign-language`.  
Verify gesture cards and the main lesson SVG hand still render correctly.

- [ ] **Step 5: Commit**

```bash
git add landing/app/sign-language/page.tsx
git commit -m "refactor: sign-language page imports HandSign from shared component"
git push origin master
```
