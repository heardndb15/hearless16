# Web Dashboard Sign Language Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the "read sign language into a sentence" feature to the web dashboard, using the browser's real on-device MediaPipe hand tracking (true real-time, no backend round-trip) instead of mobile's REST-polling architecture.

**Architecture:** Relocate the platform-agnostic `GestureRecognizer`/`TextComposer` logic from `mobile/` into `shared/signLanguageReader/` so both apps use identical smoothing/sentence-building code. Add a new `classifyGesture.ts` in the same shared folder — a TypeScript port of the backend's rule-based finger-extension classifier, so the web page never needs a network call to classify a pose. A new dashboard page runs `@mediapipe/tasks-vision`'s `HandLandmarker` client-side (same proven pattern as `/sign-language/practice/page.tsx`), throttles sampling into the shared recognizer, and renders results in the dashboard's own Tailwind design system.

**Tech Stack:** Next.js App Router (`landing/`), `@mediapipe/tasks-vision` (already installed, `0.10.35`), TypeScript, Tailwind CSS, browser-native `SpeechSynthesis` and `Clipboard` APIs (no new npm dependencies).

**Reference spec:** `docs/superpowers/specs/2026-07-10-web-sign-language-reader-design.md`

## Global Constraints

- No new npm dependencies — `@mediapipe/tasks-vision` is already installed in `landing/`; TTS/clipboard use browser-native `window.speechSynthesis`/`navigator.clipboard`, not npm packages.
- `shared/signLanguageReader/*.ts` files must have **zero npm package imports** — this repo has no root-level `node_modules`, so a file under `shared/` cannot resolve any package's types (confirmed during planning: `@mediapipe/tasks-vision` types fail to resolve from `shared/` with `TS2307`). Use local structural types instead (see Task 2).
- `landing/tsconfig.json` targets `es5` — any `for...of` over a `Map`/`Set` in shared code must use `Array.from(x.entries())` (or similar) to avoid `TS2802` (confirmed during planning by actually compiling `GestureRecognizer.ts` into `landing/`).
- Sample confirmation confidence threshold: 60 (same as mobile). Quality-indicator bands: <45 low (red), 45–70 medium (yellow), ≥70 high (green), no-hand/error = gray "none" — same as mobile.
- Sampling cadence fed into `GestureRecognizer`: throttled to ~300ms even though `HandLandmarker.detectForVideo` runs every `requestAnimationFrame` (~60fps) — feeding every frame would collapse the 3-sample majority window's debounce to ~50ms.
- 16-word vocabulary, identical to mobile/backend: Да, Нет, Здравствуйте, Вода, Еда, Спасибо, Пожалуйста, Хорошо, Плохо, Помощь, Стоп, Один, Два, Три, Четыре (+ "Неизвестно" fallback).
- Dashboard page styling uses Tailwind utility classes matching `/dashboard/text-to-speech` and `/dashboard/learn` (`font-syne`, `bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl`, `slate-*`/`sky-*` palette, `accent`/`successBrand` Tailwind color tokens) — **not** `/sign-language/practice`'s `var(--accent)` CSS-custom-property styling, which is a standalone-page-only convention.
- No backend (`backend/`) changes — this feature is fully client-side.

---

### Task 1: Relocate `GestureRecognizer`/`TextComposer` from mobile into `shared/`

**Files:**
- Create: `shared/signLanguageReader/GestureRecognizer.ts`
- Create: `shared/signLanguageReader/GestureRecognizer.verify.ts`
- Create: `shared/signLanguageReader/TextComposer.ts`
- Create: `shared/signLanguageReader/TextComposer.verify.ts`
- Delete: `mobile/src/components/signLanguageReader/GestureRecognizer.ts`
- Delete: `mobile/src/components/signLanguageReader/GestureRecognizer.verify.ts`
- Delete: `mobile/src/components/signLanguageReader/TextComposer.ts`
- Delete: `mobile/src/components/signLanguageReader/TextComposer.verify.ts`
- Modify: `mobile/src/components/signLanguageReader/useHandTracker.ts`
- Modify: `mobile/src/hooks/useSignLanguageReader.ts`

**Interfaces:**
- Produces: `shared/signLanguageReader/GestureRecognizer.ts` exports `RawSample`, `RecognitionState`, `GestureRecognizer` (same public API as before — `pushSample(sample: RawSample): RecognitionState`, `reset(): void`). `shared/signLanguageReader/TextComposer.ts` exports `TextComposer` (`onConfirmedChange`, `sentence` getter, `clear`) — unchanged.

- [ ] **Step 1: Create the relocated `GestureRecognizer.ts` with the ES5-safe fix**

Create `shared/signLanguageReader/GestureRecognizer.ts`:

```ts
export interface RawSample {
  gesture: string | null;
  confidence: number;
  error?: "no_hand_detected" | "invalid_image" | "processing_error";
}

export interface RecognitionState {
  confirmed: string | null;
  changed: boolean;
}

const CONFIDENCE_THRESHOLD = 60;
const WINDOW_SIZE = 3;
const MIN_VOTES = 2;

/**
 * Smooths raw per-frame recognition samples into a stable "confirmed" gesture,
 * filtering single-frame misreads and low-confidence noise. A gesture only
 * counts as confirmed once it wins a majority of the last WINDOW_SIZE samples.
 */
export class GestureRecognizer {
  private window: (string | null)[] = [];
  private lastConfirmed: string | null = null;

  pushSample(sample: RawSample): RecognitionState {
    if (sample.error === "no_hand_detected") {
      this.window = [];
    } else {
      const candidate = sample.confidence >= CONFIDENCE_THRESHOLD ? sample.gesture : null;
      this.window.push(candidate);
      if (this.window.length > WINDOW_SIZE) this.window.shift();
    }

    const counts = new Map<string, number>();
    for (const c of this.window) {
      if (c === null) continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }

    let majority: string | null = null;
    for (const [word, count] of Array.from(counts.entries())) {
      if (count >= MIN_VOTES) {
        majority = word;
        break;
      }
    }

    const changed = majority !== this.lastConfirmed;
    this.lastConfirmed = majority;

    return { confirmed: majority, changed };
  }

  reset(): void {
    this.window = [];
    this.lastConfirmed = null;
  }
}
```

(This differs from the mobile original only in one line — `Array.from(counts.entries())` instead of iterating `counts` directly — required because `landing/tsconfig.json` targets `es5`; verified by compiling this exact file into `landing/` during planning.)

- [ ] **Step 2: Create the relocated verify script**

Create `shared/signLanguageReader/GestureRecognizer.verify.ts`:

```ts
import { GestureRecognizer } from "./GestureRecognizer";

function assertEqual<T>(actual: T, expected: T, label: string) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    throw new Error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  console.log(`PASS ${label}`);
}

// Two consecutive high-confidence samples confirm the gesture
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  const state = r.pushSample({ gesture: "Да", confidence: 90 });
  assertEqual(state.confirmed, "Да", "confirms after 2 matching samples");
  assertEqual(state.changed, true, "changed flag true on first confirmation");
}

// A single misread frame among steady samples doesn't break confirmation
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  r.pushSample({ gesture: "Нет", confidence: 90 });
  const state = r.pushSample({ gesture: "Да", confidence: 90 });
  assertEqual(state.confirmed, "Да", "majority vote survives one misread");
}

// Low-confidence samples never confirm a gesture
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 40 });
  r.pushSample({ gesture: "Да", confidence: 40 });
  const state = r.pushSample({ gesture: "Да", confidence: 40 });
  assertEqual(state.confirmed, null, "low confidence never confirms");
}

// no_hand_detected resets the rolling window
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  r.pushSample({ gesture: "Да", confidence: 90 });
  const reset = r.pushSample({ gesture: null, confidence: 0, error: "no_hand_detected" });
  assertEqual(reset.confirmed, null, "no_hand_detected clears confirmation");
  assertEqual(reset.changed, true, "changed flag fires on the reset");

  r.pushSample({ gesture: "Нет", confidence: 90 });
  const reconfirmed = r.pushSample({ gesture: "Нет", confidence: 90 });
  assertEqual(reconfirmed.confirmed, "Нет", "a new gesture confirms after the reset");
  assertEqual(reconfirmed.changed, true, "changed flag fires for the new confirmation");
}

// Holding the same gesture steadily doesn't keep re-firing "changed"
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  r.pushSample({ gesture: "Да", confidence: 90 });
  const held = r.pushSample({ gesture: "Да", confidence: 90 });
  assertEqual(held.changed, false, "changed flag stays false while gesture is held");
}

console.log("All GestureRecognizer tests passed");
```

- [ ] **Step 3: Create the relocated `TextComposer.ts` (unchanged content)**

Create `shared/signLanguageReader/TextComposer.ts`:

```ts
/**
 * Builds the recognized sentence from a stream of confirmed gestures.
 * Relies on the caller (GestureRecognizer's `changed` flag) to only invoke
 * onConfirmedChange on an actual transition, so holding one sign steadily
 * doesn't spam the sentence with repeats — no separate cooldown timer needed.
 */
export class TextComposer {
  private words: string[] = [];

  onConfirmedChange(confirmed: string | null): void {
    if (confirmed === null) return;
    this.words.push(confirmed);
  }

  get sentence(): string {
    if (this.words.length === 0) return "";
    const joined = this.words.join(" ");
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }

  clear(): void {
    this.words = [];
  }
}
```

- [ ] **Step 4: Create the relocated `TextComposer.verify.ts` (unchanged content)**

Create `shared/signLanguageReader/TextComposer.verify.ts`:

```ts
import { TextComposer } from "./TextComposer";

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL ${label}: expected "${expected}", got "${actual}"`);
  }
  console.log(`PASS ${label}`);
}

// Confirmed words append in order, space-separated
{
  const c = new TextComposer();
  c.onConfirmedChange("Да");
  c.onConfirmedChange("Нет");
  c.onConfirmedChange("Спасибо");
  assertEqual(c.sentence, "Да Нет Спасибо", "words append in order");
}

// null (no confirmed gesture) is a no-op
{
  const c = new TextComposer();
  c.onConfirmedChange("Да");
  c.onConfirmedChange(null);
  c.onConfirmedChange("Нет");
  assertEqual(c.sentence, "Да Нет", "null confirmations are ignored");
}

// Empty composer produces an empty sentence
{
  const c = new TextComposer();
  assertEqual(c.sentence, "", "empty composer has empty sentence");
}

// clear() resets the sentence
{
  const c = new TextComposer();
  c.onConfirmedChange("Да");
  c.clear();
  assertEqual(c.sentence, "", "clear resets the sentence");
  c.onConfirmedChange("Нет");
  assertEqual(c.sentence, "Нет", "composer works again after clear");
}

console.log("All TextComposer tests passed");
```

- [ ] **Step 5: Run both new verify scripts to confirm the move preserved behavior**

Run (from the repo root, `C:\Users\111\Desktop\hearless\hearless16`):
```bash
npx tsx shared/signLanguageReader/GestureRecognizer.verify.ts
npx tsx shared/signLanguageReader/TextComposer.verify.ts
```
Expected: both print their `PASS` lines and a final "All ... tests passed" line, exit code 0.

- [ ] **Step 6: Delete the old mobile-local files**

Delete these four files:
- `mobile/src/components/signLanguageReader/GestureRecognizer.ts`
- `mobile/src/components/signLanguageReader/GestureRecognizer.verify.ts`
- `mobile/src/components/signLanguageReader/TextComposer.ts`
- `mobile/src/components/signLanguageReader/TextComposer.verify.ts`

- [ ] **Step 7: Update `useHandTracker.ts`'s import**

In `mobile/src/components/signLanguageReader/useHandTracker.ts`, change:
```ts
import type { RawSample } from "./GestureRecognizer";
```
to:
```ts
import type { RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";
```
(No other line in this file changes.)

- [ ] **Step 8: Update `useSignLanguageReader.ts`'s imports**

In `mobile/src/hooks/useSignLanguageReader.ts`, change:
```ts
import { GestureRecognizer } from "../components/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../components/signLanguageReader/TextComposer";
import { useHandTracker } from "../components/signLanguageReader/useHandTracker";
import type { RawSample } from "../components/signLanguageReader/GestureRecognizer";
```
to:
```ts
import { GestureRecognizer } from "../../../shared/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../../../shared/signLanguageReader/TextComposer";
import { useHandTracker } from "../components/signLanguageReader/useHandTracker";
import type { RawSample } from "../../../shared/signLanguageReader/GestureRecognizer";
```
(The `useHandTracker` import is unchanged — that hook still lives in `mobile/`. No other line in this file changes.)

- [ ] **Step 9: Typecheck mobile**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 10: Commit**

```bash
git add shared/signLanguageReader mobile/src/components/signLanguageReader mobile/src/hooks/useSignLanguageReader.ts
git commit -m "Relocate GestureRecognizer/TextComposer from mobile into shared/"
```

---

### Task 2: Create `classifyGesture.ts` (TypeScript port of the backend classifier)

**Files:**
- Create: `shared/signLanguageReader/classifyGesture.ts`
- Create: `shared/signLanguageReader/classifyGesture.verify.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ClassifiedGesture {
    gesture: string;
    confidence: number; // 0-100
  }
  export interface HandLandmarkPoint {
    x: number;
    y: number;
    z: number;
  }
  export function classifyGesture(landmarks: HandLandmarkPoint[], handednessScore: number): ClassifiedGesture;
  ```

- [ ] **Step 1: Write the failing verify script**

Create `shared/signLanguageReader/classifyGesture.verify.ts`:

```ts
import { classifyGesture, type HandLandmarkPoint } from "./classifyGesture";

type Fingers = { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean };

function makeLandmarks(fingers: Fingers): HandLandmarkPoint[] {
  const lm: HandLandmarkPoint[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0.5, z: 0 }));
  const set = (tip: number, joint: number, extended: boolean) => {
    lm[tip] = { x: 0, y: extended ? 0.3 : 0.6, z: 0 };
    lm[joint] = { x: 0, y: extended ? 0.6 : 0.3, z: 0 };
  };
  set(4, 2, fingers.thumb);
  set(8, 6, fingers.index);
  set(12, 10, fingers.middle);
  set(16, 14, fingers.ring);
  set(20, 18, fingers.pinky);
  return lm;
}

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL ${label}: expected "${expected}", got "${actual}"`);
  }
  console.log(`PASS ${label}`);
}

const NEW_CASES: [Fingers, string][] = [
  [{ thumb: false, index: false, middle: false, ring: false, pinky: true }, "Пожалуйста"],
  [{ thumb: false, index: false, middle: true, ring: false, pinky: false }, "Хорошо"],
  [{ thumb: false, index: false, middle: false, ring: true, pinky: false }, "Плохо"],
  [{ thumb: true, index: false, middle: false, ring: false, pinky: true }, "Помощь"],
  [{ thumb: true, index: false, middle: false, ring: true, pinky: false }, "Стоп"],
];

const EXISTING_CASES: [Fingers, string][] = [
  [{ thumb: true, index: false, middle: false, ring: false, pinky: false }, "Да"],
  [{ thumb: false, index: true, middle: false, ring: false, pinky: false }, "Нет"],
  [{ thumb: true, index: true, middle: true, ring: true, pinky: true }, "Здравствуйте"],
  [{ thumb: false, index: true, middle: true, ring: true, pinky: false }, "Вода"],
  [{ thumb: false, index: true, middle: true, ring: false, pinky: false }, "Еда"],
  [{ thumb: false, index: false, middle: false, ring: false, pinky: false }, "Спасибо"],
  [{ thumb: true, index: true, middle: false, ring: false, pinky: false }, "Один"],
  [{ thumb: true, index: true, middle: true, ring: false, pinky: false }, "Два"],
  [{ thumb: true, index: true, middle: true, ring: true, pinky: false }, "Три"],
  [{ thumb: false, index: true, middle: true, ring: true, pinky: true }, "Четыре"],
];

for (const [fingers, expected] of [...NEW_CASES, ...EXISTING_CASES]) {
  const { gesture } = classifyGesture(makeLandmarks(fingers), 1.0);
  assertEqual(gesture, expected, `${JSON.stringify(fingers)} -> ${expected}`);
}

console.log("All classifyGesture checks passed");
```

- [ ] **Step 2: Run it to verify it fails**

Run (from the repo root):
```bash
npx tsx shared/signLanguageReader/classifyGesture.verify.ts
```
Expected: fails with a module-not-found error for `./classifyGesture` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `shared/signLanguageReader/classifyGesture.ts`:

```ts
export interface ClassifiedGesture {
  gesture: string;
  confidence: number;
}

/**
 * Structurally compatible with @mediapipe/tasks-vision's NormalizedLandmark
 * (same x/y/z shape) without importing that package's types directly —
 * shared/ has no node_modules of its own to resolve them from (no
 * root-level package.json in this repo), and real NormalizedLandmark[]
 * values satisfy this type structurally.
 */
export interface HandLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

function fingerStates(lm: HandLandmarkPoint[]): FingerStates {
  return {
    thumb: lm[4].y < lm[2].y,
    index: lm[8].y < lm[6].y,
    middle: lm[12].y < lm[10].y,
    ring: lm[16].y < lm[14].y,
    pinky: lm[20].y < lm[18].y,
  };
}

function classify(fingers: FingerStates): { gesture: string; baseConfidence: number } {
  const { thumb: t, index: i, middle: m, ring: r, pinky: p } = fingers;
  const nonThumb = [i, m, r, p].filter(Boolean).length;

  if (t && !i && !m && !r && !p) return { gesture: "Да", baseConfidence: 0.92 };
  if (!t && i && !m && !r && !p) return { gesture: "Нет", baseConfidence: 0.88 };
  if (t && i && m && r && p) return { gesture: "Здравствуйте", baseConfidence: 0.90 };
  if (!t && i && m && r && !p) return { gesture: "Вода", baseConfidence: 0.85 };
  if (!t && i && m && !r && !p) return { gesture: "Еда", baseConfidence: 0.82 };
  if (nonThumb === 0 && !t) return { gesture: "Спасибо", baseConfidence: 0.75 };
  if (!t && !i && !m && !r && p) return { gesture: "Пожалуйста", baseConfidence: 0.80 };
  if (!t && !i && m && !r && !p) return { gesture: "Хорошо", baseConfidence: 0.78 };
  if (!t && !i && !m && r && !p) return { gesture: "Плохо", baseConfidence: 0.78 };
  if (t && !i && !m && !r && p) return { gesture: "Помощь", baseConfidence: 0.82 };
  if (t && !i && !m && r && !p) return { gesture: "Стоп", baseConfidence: 0.80 };
  if (nonThumb === 1 && i) return { gesture: "Один", baseConfidence: 0.90 };
  if (nonThumb === 2 && i && m) return { gesture: "Два", baseConfidence: 0.88 };
  if (nonThumb === 3 && i && m && r) return { gesture: "Три", baseConfidence: 0.85 };
  if (nonThumb === 4) return { gesture: "Четыре", baseConfidence: 0.83 };
  return { gesture: "Неизвестно", baseConfidence: 0.20 };
}

/**
 * TypeScript port of backend/app/signflow_model.py's _finger_states()/_classify().
 * Keep both in sync if the vocabulary changes.
 */
export function classifyGesture(landmarks: HandLandmarkPoint[], handednessScore: number): ClassifiedGesture {
  const { gesture, baseConfidence } = classify(fingerStates(landmarks));
  const confidence = Math.round(Math.min(100, baseConfidence * handednessScore * 100) * 10) / 10;
  return { gesture, confidence };
}
```

- [ ] **Step 4: Run the verify script again to confirm it passes**

Run:
```bash
npx tsx shared/signLanguageReader/classifyGesture.verify.ts
```
Expected: 15 `PASS` lines, then `All classifyGesture checks passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add shared/signLanguageReader/classifyGesture.ts shared/signLanguageReader/classifyGesture.verify.ts
git commit -m "Add classifyGesture: TypeScript port of the backend gesture classifier"
```

---

### Task 3: Create the web dashboard page

**Files:**
- Create: `landing/app/dashboard/sign-language-reader/page.tsx`

**Interfaces:**
- Consumes: `GestureRecognizer`, `RawSample` (Task 1), `TextComposer` (Task 1), `classifyGesture` (Task 2).
- Produces: `export default function SignLanguageReaderPage(): JSX.Element` — a Next.js page component with no props, ready to be linked from the dashboard nav.

- [ ] **Step 1: Write the implementation**

Create `landing/app/dashboard/sign-language-reader/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, DrawingUtils, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { GestureRecognizer, type RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../../../../shared/signLanguageReader/TextComposer";
import { classifyGesture } from "../../../../shared/signLanguageReader/classifyGesture";

const SAMPLE_INTERVAL_MS = 300;

type Quality = "none" | "low" | "medium" | "high";

const QUALITY_LABEL: Record<Quality, string> = {
  none: "Наведите камеру на руки",
  low: "Низкое качество",
  medium: "Среднее качество",
  high: "Хорошее качество",
};

const QUALITY_COLOR: Record<Quality, string> = {
  none: "#94A3B8",
  low: "#EF4444",
  medium: "#F59E0B",
  high: "#22C55E",
};

function qualityFor(sample: RawSample | null): Quality {
  if (!sample || sample.error) return "none";
  if (sample.confidence < 45) return "low";
  if (sample.confidence < 70) return "medium";
  return "high";
}

export default function SignLanguageReaderPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const lastSampleAtRef = useRef(0);

  const recognizerRef = useRef(new GestureRecognizer());
  const composerRef = useRef(new TextComposer());

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");
  const [liveSample, setLiveSample] = useState<RawSample | null>(null);

  const handleSample = useCallback((sample: RawSample) => {
    setLiveSample(sample);
    const state = recognizerRef.current.pushSample(sample);
    if (state.changed) {
      composerRef.current.onConfirmedChange(state.confirmed);
      setSentence(composerRef.current.sentence);
    }
  }, []);

  const handleTrackingResults = useCallback(
    (results: HandLandmarkerResult) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      const shouldSample = now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS;

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const handednessScore = results.handedness?.[0]?.[0]?.score ?? 1;

        if (!drawingUtilsRef.current) drawingUtilsRef.current = new DrawingUtils(ctx);
        drawingUtilsRef.current.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
          color: "#0066FF",
          lineWidth: 4,
        });
        drawingUtilsRef.current.drawLandmarks(landmarks, {
          color: "#0066FF",
          fillColor: "#ffffff",
          lineWidth: 2,
          radius: 5,
        });

        if (shouldSample) {
          lastSampleAtRef.current = now;
          const { gesture, confidence } = classifyGesture(landmarks, handednessScore);
          handleSample({ gesture, confidence });
        }
      } else if (shouldSample) {
        lastSampleAtRef.current = now;
        handleSample({ gesture: null, confidence: 0, error: "no_hand_detected" });
      }
    },
    [handleSample]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!videoRef.current || !canvasRef.current) return;
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

        if (cancelled) {
          handLandmarker.close();
          return;
        }
        handLandmarkerRef.current = handLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadeddata = () => resolve();
        });
        await videoRef.current.play();

        setIsModelLoading(false);

        const loop = () => {
          if (!videoRef.current || !handLandmarkerRef.current) return;
          const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
          handleTrackingResults(results);
          animationFrameIdRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setCameraError(`Не удалось получить доступ к веб-камере или инициализировать трекер: ${message}`);
        setIsModelLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quality = qualityFor(liveSample);
  const hasText = sentence.length > 0;

  function handleClear() {
    composerRef.current.clear();
    recognizerRef.current.reset();
    setSentence("");
  }

  async function handleCopy() {
    if (!sentence) return;
    await navigator.clipboard.writeText(sentence);
  }

  function handleSpeak() {
    if (!sentence) return;
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "ru-RU";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Перевод жестов</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Покажите жест перед камерой — приложение распознает его и добавит слово в предложение.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6">
          <div className="relative aspect-video w-full rounded-2xl border-2 border-slate-300 bg-slate-950 overflow-hidden flex items-center justify-center shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {isModelLoading && !cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-4">
                <div className="w-11 h-11 border-4 border-white/15 border-t-accent rounded-full animate-spin" />
                <span className="text-xs text-white/80 font-syne tracking-wide">Инициализация трекера рук...</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <h3 className="text-sm font-bold text-red-400">Не удалось запустить камеру</h3>
                <p className="text-xs text-white/70">{cameraError}</p>
                <button
                  className="px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold"
                  onClick={() => window.location.reload()}
                >
                  Повторить попытку
                </button>
              </div>
            )}

            {!isModelLoading && !cameraError && (
              <div className="absolute bottom-4 left-4 right-4 py-2 px-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-sm flex justify-between items-center text-white text-[11px] font-bold">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: QUALITY_COLOR[quality] }} />
                  {liveSample?.gesture ?? "Покажите жест"}
                </span>
                {liveSample?.gesture && <span>{Math.round(liveSample.confidence)}%</span>}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUALITY_COLOR[quality] }} />
            <span className="text-xs font-bold text-slate-500">{QUALITY_LABEL[quality]}</span>
          </div>

          <div className="min-h-[100px] max-h-[220px] overflow-y-auto rounded-xl bg-slate-50/80 border border-slate-100 p-4">
            <p className={hasText ? "text-2xl font-bold text-slate-800 leading-snug" : "text-sm text-slate-400"}>
              {hasText ? sentence : "Распознанный текст появится здесь"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleClear}
              disabled={!hasText}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs"
            >
              <span className="text-lg">🗑️</span>
              Очистить
            </button>
            <button
              onClick={handleCopy}
              disabled={!hasText}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs"
            >
              <span className="text-lg">📋</span>
              Копировать
            </button>
            <button
              onClick={handleSpeak}
              disabled={!hasText}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold text-xs"
            >
              <span className="text-lg">🔊</span>
              Озвучить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run (from `landing/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0. (This exact page + shared modules combination was verified compile-clean during planning.)

- [ ] **Step 3: Commit**

```bash
git add landing/app/dashboard/sign-language-reader/page.tsx
git commit -m "Add the web dashboard sign language reader page"
```

---

### Task 4: Add the dashboard nav entry

**Files:**
- Modify: `landing/app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `SignLanguageReaderPage` (Task 3) via its route path `/dashboard/sign-language-reader`.

- [ ] **Step 1: Add the menu item**

In `landing/app/dashboard/layout.tsx`'s `menuItems` array, insert a new `"Перевод жестов"` entry directly after the existing `"Изучение жестов"` entry and before the existing `"Текст → Речь"` entry:

```tsx
    {
      name: "Изучение жестов",
      path: "/dashboard/learn",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      name: "Перевод жестов",
      path: "/dashboard/sign-language-reader",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V6a1.5 1.5 0 013 0v4m0-5a1.5 1.5 0 013 0v5m0-4a1.5 1.5 0 013 0v5m0-2.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a5 5 0 01-4-2l-2-3a1.5 1.5 0 012.4-1.8L7 15" />
        </svg>
      ),
    },
    {
      name: "Текст → Речь",
      path: "/dashboard/text-to-speech",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a9 9 0 010 12.73" />
        </svg>
      ),
    },
```

(Only the new `"Перевод жестов"` block is new; the `"Изучение жестов"` and `"Текст → Речь"` blocks are shown for exact insertion placement and must remain byte-identical to their current content.)

- [ ] **Step 2: Typecheck**

Run (from `landing/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add landing/app/dashboard/layout.tsx
git commit -m "Add Перевод жестов to the dashboard nav"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck of both apps**

Run:
```bash
cd mobile && npx tsc --noEmit
cd ../landing && npx tsc --noEmit
```
Expected: both clean, no output, exit code 0.

- [ ] **Step 2: Re-run all three shared verify scripts**

Run (from the repo root):
```bash
npx tsx shared/signLanguageReader/GestureRecognizer.verify.ts
npx tsx shared/signLanguageReader/TextComposer.verify.ts
npx tsx shared/signLanguageReader/classifyGesture.verify.ts
```
Expected: all three print their final "All ... passed" line, exit code 0.

- [ ] **Step 3: Confirm mobile's existing feature still works unchanged**

Run:
```bash
grep -r "components/signLanguageReader/GestureRecognizer\|components/signLanguageReader/TextComposer" mobile/src
```
Expected: no matches (confirms no stale references to the deleted mobile-local files remain).

- [ ] **Step 4: Human verification checklist (not agent-executable)**

Record that the following need a person with a real browser + webcam, per the design spec's "Not agent-executable" section:
- Open `/dashboard/sign-language-reader`, grant camera permission, and confirm each of the 16 supported words is recognized correctly when signed in front of a real webcam.
- Confirm the ~300ms sampling throttle feels similarly responsive/debounced to the mobile feature (not spammy, not sluggish).
- Confirm "Озвучить" audibly speaks the sentence in Russian via the browser's TTS voice, and "Копировать" pastes correctly into another app.
- Confirm the new "Перевод жестов" nav icon doesn't visually collide with "Изучение жестов"'s icon in the sidebar.

- [ ] **Step 5: Final commit (only if the checklist above surfaced code changes — otherwise this step is a no-op, skip it)**
