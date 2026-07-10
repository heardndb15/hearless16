# Read Sign Language Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Read Sign Language" tab to the Hearless mobile app that continuously recognizes hand signs through the camera and builds a sentence on screen in near-real-time.

**Architecture:** Reuse the existing `POST /gestures/recognize` backend endpoint (MediaPipe hand landmarks + rule-based classifier) via a polling capture loop (proven pattern already used by `GesturePracticeScreen`), add client-side temporal smoothing (`GestureRecognizer`) and dedup/sentence-building (`TextComposer`) as pure, independently-testable TypeScript modules, then wire them into a new screen through a `useSignLanguageReader` orchestrator hook. Backend gains 5 new gesture-classification rules and a higher rate limit.

**Tech Stack:** Expo SDK 51 (managed workflow), React Native 0.74, TypeScript, `expo-camera`, `expo-blur`, `expo-speech`, `expo-clipboard`, FastAPI, MediaPipe Tasks `HandLandmarker`.

**Reference spec:** `docs/superpowers/specs/2026-07-10-sign-language-reader-design.md`

## Global Constraints

- Expo managed workflow only — no `expo prebuild`/eject, no native module additions beyond standard Expo SDK packages.
- Poll interval: 350ms, with an in-flight guard (skip a tick if the previous request hasn't resolved) — same backpressure pattern as `GesturePracticeScreen.tsx:89-124`.
- Per-sample confirmation confidence threshold: 60. Quality-indicator bands: <45 low (red), 45–70 medium (yellow), ≥70 high (green), no-hand/none = gray.
- Confirmation window: majority (≥2) of the last 3 samples.
- Backend rate limit on `/gestures/recognize`: raise from `60/minute` to `120/minute`.
- New npm dependencies limited to: `expo-speech`, `expo-clipboard`, `expo-blur`.
- Colors/spacing from `mobile/src/constants/theme.ts` (`Colors.accent = "#1565C0"`, etc.) — no new theme file.
- No new test framework. Pure-logic modules (`GestureRecognizer`, `TextComposer`, backend `_classify`) get standalone verify scripts run directly (`npx tsx`, `python`) — matches this repo's existing convention of zero Jest/pytest infra.
- Animations use core `Animated` from `"react-native"` (`Animated.Value`, `.timing`, `.spring`, `useNativeDriver: true`), matching the pattern already proven in `GesturePracticeScreen.tsx`. `react-native-reanimated` is installed but has zero actual usage anywhere in the codebase today, so this plan doesn't introduce its first usage — this is a deliberate refinement of the design spec's mention of Reanimated, verified compile-clean during planning.

---

### Task 1: Backend — add 5 new gesture-classification rules

**Files:**
- Modify: `backend/app/signflow_model.py:81-116` (`_classify` function) and `:189-197` (`GESTURE_COMPONENTS` dict)
- Test: `backend/verify_signflow_gestures.py` (new, standalone script — not pytest, matches repo's no-test-infra convention)

**Interfaces:**
- Produces: `_classify(fingers: dict) -> tuple[str, float]` now additionally returns `"Пожалуйста"`, `"Хорошо"`, `"Плохо"`, `"Помощь"`, `"Стоп"` for 5 specific finger-extension patterns, with no change to its existing return values for any previously-supported pattern.

- [ ] **Step 1: Write the failing verify script**

Create `backend/verify_signflow_gestures.py`:

```python
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.signflow_model import _classify

NEW_CASES = {
    (0, 0, 0, 0, 1): "Пожалуйста",  # pinky only
    (0, 0, 1, 0, 0): "Хорошо",      # middle only
    (0, 0, 0, 1, 0): "Плохо",       # ring only
    (1, 0, 0, 0, 1): "Помощь",      # thumb + pinky
    (1, 0, 0, 1, 0): "Стоп",        # thumb + ring
}

EXISTING_CASES = {
    (1, 0, 0, 0, 0): "Да",
    (0, 1, 0, 0, 0): "Нет",
    (1, 1, 1, 1, 1): "Здравствуйте",
    (0, 1, 1, 1, 0): "Вода",
    (0, 1, 1, 0, 0): "Еда",
    (0, 0, 0, 0, 0): "Спасибо",
    (1, 1, 0, 0, 0): "Один",
    (1, 1, 1, 0, 0): "Два",
    (1, 1, 1, 1, 0): "Три",
    (0, 1, 1, 1, 1): "Четыре",
}


def check(pattern, expected):
    t, i, m, r, p = pattern
    fingers = {"thumb": bool(t), "index": bool(i), "middle": bool(m), "ring": bool(r), "pinky": bool(p)}
    got, _ = _classify(fingers)
    status = "PASS" if got == expected else "FAIL"
    print(f"{status}: pattern={pattern} -> {got!r} (want {expected!r})")
    assert got == expected, f"pattern {pattern} classified as {got!r}, expected {expected!r}"


for pattern, expected in NEW_CASES.items():
    check(pattern, expected)

for pattern, expected in EXISTING_CASES.items():
    check(pattern, expected)

print("All gesture classification checks passed")
```

- [ ] **Step 2: Run it to verify it fails**

Run (from repo root):
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" backend/verify_signflow_gestures.py
```
Expected: the 5 `NEW_CASES` assertions raise `AssertionError` (each currently falls through to `"Неизвестно"` since the new rules don't exist yet). If `numpy`/`Pillow` aren't installed for that interpreter, first run:
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" -m pip install --quiet numpy Pillow
```

- [ ] **Step 3: Add the 5 new rules to `_classify`**

In `backend/app/signflow_model.py`, insert the new rules right after the existing `"Спасибо"` rule (after line 107, before the `"Один"` numeric rule):

```python
    # Спасибо — closed fist = approximate
    if non_thumb == 0 and not t:
        return "Спасибо", 0.75
    # Пожалуйста — pinky only
    if not t and not i and not m and not r and p:
        return "Пожалуйста", 0.80
    # Хорошо — middle only
    if not t and not i and m and not r and not p:
        return "Хорошо", 0.78
    # Плохо — ring only
    if not t and not i and not m and r and not p:
        return "Плохо", 0.78
    # Помощь — thumb + pinky ("hang loose")
    if t and not i and not m and not r and p:
        return "Помощь", 0.82
    # Стоп — thumb + ring
    if t and not i and not m and r and not p:
        return "Стоп", 0.80
    # Numbers by non-thumb finger count
    if non_thumb == 1 and i:
        return "Один", 0.90
```

(The last line above — `if non_thumb == 1 and i:` — already exists; it's shown only to anchor where the new block ends, directly above it.)

- [ ] **Step 4: Add matching `GESTURE_COMPONENTS` entries**

In `backend/app/signflow_model.py`, add to the `GESTURE_COMPONENTS` dict (after the existing `"Еда"` entry, before the closing `}`):

```python
GESTURE_COMPONENTS = {
    "Здравствуйте": {"hand_shape": 92, "position": 88, "movement": 85},
    "Спасибо":      {"hand_shape": 85, "position": 80, "movement": 78},
    "Да":           {"hand_shape": 95, "position": 90, "movement": 88},
    "Нет":          {"hand_shape": 82, "position": 85, "movement": 80},
    "Помогите":     {"hand_shape": 78, "position": 75, "movement": 72},
    "Вода":         {"hand_shape": 88, "position": 82, "movement": 80},
    "Еда":          {"hand_shape": 80, "position": 78, "movement": 75},
    "Пожалуйста":   {"hand_shape": 80, "position": 78, "movement": 75},
    "Хорошо":       {"hand_shape": 78, "position": 76, "movement": 74},
    "Плохо":        {"hand_shape": 78, "position": 75, "movement": 73},
    "Помощь":       {"hand_shape": 82, "position": 80, "movement": 77},
    "Стоп":         {"hand_shape": 80, "position": 79, "movement": 76},
}
```

- [ ] **Step 5: Run the verify script again to confirm it passes**

Run:
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" backend/verify_signflow_gestures.py
```
Expected: all 15 lines print `PASS`, final line `All gesture classification checks passed`, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add backend/app/signflow_model.py backend/verify_signflow_gestures.py
git commit -m "Add Пожалуйста/Хорошо/Плохо/Помощь/Стоп gesture rules to the classifier"
```

---

### Task 2: Backend — raise the recognize endpoint's rate limit

**Files:**
- Modify: `backend/app/routes/gestures.py:33`

**Interfaces:**
- Produces: `/gestures/recognize` now allows 120 requests/minute per client instead of 60, giving headroom for the 350ms continuous-polling reader without changing the request/response shape.

- [ ] **Step 1: Change the limit**

In `backend/app/routes/gestures.py`, change:
```python
@router.post("/recognize")
@limiter.limit("60/minute")
async def recognize(request: Request, data: GestureRecognizeRequest):
```
to:
```python
@router.post("/recognize")
@limiter.limit("120/minute")
async def recognize(request: Request, data: GestureRecognizeRequest):
```

- [ ] **Step 2: Verify the file still imports/parses**

Run:
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" -c "import sys, os; sys.path.insert(0, 'backend'); import ast; ast.parse(open('backend/app/routes/gestures.py', encoding='utf-8').read())"
```
Expected: no output, exit code 0 (confirms valid Python syntax; full FastAPI app import isn't required for this check since `mediapipe`/`supabase` aren't installed locally).

- [ ] **Step 3: Commit**

```bash
git add backend/app/routes/gestures.py
git commit -m "Raise /gestures/recognize rate limit to 120/minute for continuous polling"
```

---

### Task 3: Mobile — install new dependencies

**Files:**
- Modify: `mobile/package.json`, `mobile/package-lock.json`

**Interfaces:**
- Produces: `expo-speech`, `expo-clipboard`, `expo-blur` become available as imports for later tasks.

- [ ] **Step 1: Install via the Expo CLI (picks SDK-51-compatible versions)**

Run (from `mobile/`):
```bash
npx expo install expo-speech expo-clipboard expo-blur
```
Expected: `package.json` gains three new entries under `dependencies`; command exits 0.

- [ ] **Step 2: Confirm the app still typechecks**

Run:
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0 (same as the pre-change baseline).

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "Add expo-speech, expo-clipboard, expo-blur for the sign language reader"
```

---

### Task 4: Mobile — `GestureRecognizer.ts` (confirmation/debounce logic)

**Files:**
- Create: `mobile/src/components/signLanguageReader/GestureRecognizer.ts`
- Test: `mobile/src/components/signLanguageReader/GestureRecognizer.verify.ts`

**Interfaces:**
- Produces:
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
  export class GestureRecognizer {
    pushSample(sample: RawSample): RecognitionState;
    reset(): void;
  }
  ```

- [ ] **Step 1: Write the failing verify script**

Create `mobile/src/components/signLanguageReader/GestureRecognizer.verify.ts`:

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

- [ ] **Step 2: Run it to verify it fails**

Run (from `mobile/`):
```bash
npx tsx src/components/signLanguageReader/GestureRecognizer.verify.ts
```
Expected: fails with a module-not-found error for `./GestureRecognizer` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `mobile/src/components/signLanguageReader/GestureRecognizer.ts`:

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
    for (const [word, count] of counts) {
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

- [ ] **Step 4: Run the verify script again to confirm it passes**

Run:
```bash
npx tsx src/components/signLanguageReader/GestureRecognizer.verify.ts
```
Expected: 9 `PASS` lines, then `All GestureRecognizer tests passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/signLanguageReader/GestureRecognizer.ts mobile/src/components/signLanguageReader/GestureRecognizer.verify.ts
git commit -m "Add GestureRecognizer: temporal smoothing for raw gesture samples"
```

---

### Task 5: Mobile — `TextComposer.ts` (sentence building/dedup)

**Files:**
- Create: `mobile/src/components/signLanguageReader/TextComposer.ts`
- Test: `mobile/src/components/signLanguageReader/TextComposer.verify.ts`

**Interfaces:**
- Consumes: nothing from other tasks (pure, standalone).
- Produces:
  ```ts
  export class TextComposer {
    onConfirmedChange(confirmed: string | null): void;
    get sentence(): string;
    clear(): void;
  }
  ```

- [ ] **Step 1: Write the failing verify script**

Create `mobile/src/components/signLanguageReader/TextComposer.verify.ts`:

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

- [ ] **Step 2: Run it to verify it fails**

Run (from `mobile/`):
```bash
npx tsx src/components/signLanguageReader/TextComposer.verify.ts
```
Expected: fails with a module-not-found error for `./TextComposer`.

- [ ] **Step 3: Write the implementation**

Create `mobile/src/components/signLanguageReader/TextComposer.ts`:

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

- [ ] **Step 4: Run the verify script again to confirm it passes**

Run:
```bash
npx tsx src/components/signLanguageReader/TextComposer.verify.ts
```
Expected: 5 `PASS` lines, then `All TextComposer tests passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/signLanguageReader/TextComposer.ts mobile/src/components/signLanguageReader/TextComposer.verify.ts
git commit -m "Add TextComposer: builds the recognized sentence from confirmed gestures"
```

---

### Task 6: Mobile — `useHandTracker.ts` (capture loop hook)

**Files:**
- Create: `mobile/src/components/signLanguageReader/useHandTracker.ts`

**Interfaces:**
- Consumes: `RawSample` type from `./GestureRecognizer` (Task 4).
- Produces:
  ```ts
  export function useHandTracker(
    cameraRef: React.RefObject<ExpoCameraView>,
    onSample: (sample: RawSample) => void
  ): { start: () => void; stop: () => void };
  ```

- [ ] **Step 1: Write the implementation**

Create `mobile/src/components/signLanguageReader/useHandTracker.ts`:

```ts
import { useCallback, useRef } from "react";
import type { CameraView as ExpoCameraView } from "expo-camera";
import axios from "axios";
import type { RawSample } from "./GestureRecognizer";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const POLL_INTERVAL_MS = 350;

/**
 * Owns the continuous capture-and-recognize loop: every POLL_INTERVAL_MS,
 * grabs a still frame from the camera and posts it to the backend, skipping
 * a tick if the previous request hasn't resolved yet (same backpressure
 * pattern as GesturePracticeScreen.tsx).
 */
export function useHandTracker(
  cameraRef: React.RefObject<ExpoCameraView>,
  onSample: (sample: RawSample) => void
) {
  const inFlightRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
        if (!photo?.base64) return;
        const response = await axios.post(`${API_URL}/gestures/recognize`, {
          image: photo.base64,
        });
        onSample({
          gesture: response.data.gesture,
          confidence: response.data.confidence ?? 0,
          error: response.data.error,
        });
      } catch {
        // Transient network/API error — skip this tick, loop continues.
      } finally {
        inFlightRef.current = false;
      }
    }, POLL_INTERVAL_MS);
  }, [cameraRef, onSample]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { start, stop };
}
```

- [ ] **Step 2: Typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/signLanguageReader/useHandTracker.ts
git commit -m "Add useHandTracker: continuous camera-capture polling loop"
```

---

### Task 7: Mobile — `useSignLanguageReader.ts` (orchestrator hook)

**Files:**
- Create: `mobile/src/hooks/useSignLanguageReader.ts`

**Interfaces:**
- Consumes: `GestureRecognizer` (Task 4), `TextComposer` (Task 5), `useHandTracker` + `RawSample` (Task 6).
- Produces:
  ```ts
  export type Quality = "none" | "low" | "medium" | "high";
  export function useSignLanguageReader(): {
    cameraRef: React.RefObject<ExpoCameraView>;
    facing: CameraType;
    toggleFacing: () => void;
    sentence: string;
    liveGuess: string | null;
    liveConfidence: number;
    quality: Quality;
    clear: () => void;
    copyToClipboard: () => Promise<void>;
    speak: () => void;
  };
  ```

- [ ] **Step 1: Write the implementation**

Create `mobile/src/hooks/useSignLanguageReader.ts`:

```ts
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import type { CameraView as ExpoCameraView, CameraType } from "expo-camera";
import { GestureRecognizer } from "../components/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../components/signLanguageReader/TextComposer";
import { useHandTracker } from "../components/signLanguageReader/useHandTracker";
import type { RawSample } from "../components/signLanguageReader/GestureRecognizer";

export type Quality = "none" | "low" | "medium" | "high";

function qualityFor(sample: RawSample | null): Quality {
  if (!sample || sample.error === "no_hand_detected") return "none";
  if (sample.confidence < 45) return "low";
  if (sample.confidence < 70) return "medium";
  return "high";
}

export function useSignLanguageReader() {
  const cameraRef = useRef<ExpoCameraView>(null);
  const recognizerRef = useRef(new GestureRecognizer());
  const composerRef = useRef(new TextComposer());

  const [facing, setFacing] = useState<CameraType>("front");
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

  const { start, stop } = useHandTracker(cameraRef, handleSample);

  useFocusEffect(
    useCallback(() => {
      start();
      return () => stop();
    }, [start, stop])
  );

  const clear = useCallback(() => {
    composerRef.current.clear();
    recognizerRef.current.reset();
    setSentence("");
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!sentence) return;
    await Clipboard.setStringAsync(sentence);
  }, [sentence]);

  const speak = useCallback(() => {
    if (!sentence) return;
    Speech.speak(sentence, { language: "ru-RU" });
  }, [sentence]);

  const toggleFacing = useCallback(() => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  return {
    cameraRef,
    facing,
    toggleFacing,
    sentence,
    liveGuess: liveSample?.gesture ?? null,
    liveConfidence: liveSample?.confidence ?? 0,
    quality: qualityFor(liveSample),
    clear,
    copyToClipboard,
    speak,
  };
}
```

- [ ] **Step 2: Typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useSignLanguageReader.ts
git commit -m "Add useSignLanguageReader: wires capture, recognition, and text composition"
```

---

### Task 8: Mobile — `CameraView.tsx` (camera + permission UI)

**Files:**
- Create: `mobile/src/components/signLanguageReader/CameraView.tsx`

**Interfaces:**
- Consumes: `Colors`, `Spacing`, `FontSize` from `../../constants/theme`.
- Produces:
  ```ts
  interface Props {
    cameraRef: React.RefObject<ExpoCameraView>;
    facing: CameraType;
    onToggleFacing: () => void;
    children?: React.ReactNode;
  }
  export default function CameraView(props: Props): JSX.Element;
  ```

- [ ] **Step 1: Write the implementation**

Create `mobile/src/components/signLanguageReader/CameraView.tsx`:

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView as ExpoCameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { BlurView } from "expo-blur";
import { Colors, Spacing, FontSize } from "../../constants/theme";

interface Props {
  cameraRef: React.RefObject<ExpoCameraView>;
  facing: CameraType;
  onToggleFacing: () => void;
  children?: React.ReactNode;
}

export default function CameraView({ cameraRef, facing, onToggleFacing, children }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <BlurView intensity={40} tint="light" style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Нет доступа к камере</Text>
          <Text style={styles.permissionText}>
            Разрешите доступ к камере, чтобы распознавать жесты
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Разрешить доступ к камере</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView ref={cameraRef} style={styles.camera} facing={facing} />
      <TouchableOpacity style={styles.flipButton} onPress={onToggleFacing}>
        <Text style={styles.flipButtonText}>🔄</Text>
      </TouchableOpacity>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colors.listBackground,
  },
  camera: {
    flex: 1,
  },
  flipButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipButtonText: {
    fontSize: 18,
  },
  permissionCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  permissionTitle: {
    fontSize: FontSize.title,
    fontWeight: "bold",
    color: Colors.heading,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionButtonText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: FontSize.body,
  },
});
```

- [ ] **Step 2: Typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/signLanguageReader/CameraView.tsx
git commit -m "Add CameraView: camera preview with permission prompt and facing toggle"
```

---

### Task 9: Mobile — `RecognitionOverlay.tsx` (live guess overlay)

**Files:**
- Create: `mobile/src/components/signLanguageReader/RecognitionOverlay.tsx`

**Interfaces:**
- Consumes: `Quality` type from `../../hooks/useSignLanguageReader` (Task 7).
- Produces:
  ```ts
  interface Props {
    liveGuess: string | null;
    liveConfidence: number;
    quality: Quality;
  }
  export default function RecognitionOverlay(props: Props): JSX.Element;
  ```

- [ ] **Step 1: Write the implementation**

Create `mobile/src/components/signLanguageReader/RecognitionOverlay.tsx`:

```tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { BlurView } from "expo-blur";
import { Colors, FontSize } from "../../constants/theme";
import type { Quality } from "../../hooks/useSignLanguageReader";

const QUALITY_COLOR: Record<Quality, string> = {
  none: "#9CA3AF",
  low: "#ef4444",
  medium: "#F5A623",
  high: "#22c55e",
};

interface Props {
  liveGuess: string | null;
  liveConfidence: number;
  quality: Quality;
}

export default function RecognitionOverlay({ liveGuess, liveConfidence, quality }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!liveGuess) return;
    pulse.setValue(0.85);
    Animated.spring(pulse, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [liveGuess, pulse]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <BlurView intensity={50} tint="light" style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: QUALITY_COLOR[quality] }]} />
          <Text style={styles.text}>{liveGuess ? liveGuess : "Покажите жест"}</Text>
          {liveGuess && <Text style={styles.confidence}>{Math.round(liveConfidence)}%</Text>}
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    overflow: "hidden",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: FontSize.subtitle,
    fontWeight: "700",
    color: Colors.heading,
  },
  confidence: {
    fontSize: FontSize.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
```

- [ ] **Step 2: Typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/signLanguageReader/RecognitionOverlay.tsx
git commit -m "Add RecognitionOverlay: live glass badge showing the current guess"
```

---

### Task 10: Mobile — `ResultPanel.tsx` (sentence card + actions)

**Files:**
- Create: `mobile/src/components/signLanguageReader/ResultPanel.tsx`

**Interfaces:**
- Consumes: `Quality` type from `../../hooks/useSignLanguageReader` (Task 7).
- Produces:
  ```ts
  interface Props {
    sentence: string;
    quality: Quality;
    onClear: () => void;
    onCopy: () => void;
    onSpeak: () => void;
  }
  export default function ResultPanel(props: Props): JSX.Element;
  ```

- [ ] **Step 1: Write the implementation**

Create `mobile/src/components/signLanguageReader/ResultPanel.tsx`:

```tsx
import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from "react-native";
import { Colors, Spacing, FontSize } from "../../constants/theme";
import type { Quality } from "../../hooks/useSignLanguageReader";

const QUALITY_LABEL: Record<Quality, string> = {
  none: "Наведите камеру на руки",
  low: "Низкое качество",
  medium: "Среднее качество",
  high: "Хорошее качество",
};

const QUALITY_COLOR: Record<Quality, string> = {
  none: "#9CA3AF",
  low: "#ef4444",
  medium: "#F5A623",
  high: "#22c55e",
};

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.timing(scale, { toValue: 0.92, duration: 100, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={[styles.actionBtn, disabled && styles.actionBtnDisabled, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.actionBtnInner}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
      >
        <Text style={styles.actionIcon}>{icon}</Text>
        <Text style={styles.actionLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  sentence: string;
  quality: Quality;
  onClear: () => void;
  onCopy: () => void;
  onSpeak: () => void;
}

export default function ResultPanel({ sentence, quality, onClear, onCopy, onSpeak }: Props) {
  const hasText = sentence.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.qualityRow}>
        <View style={[styles.qualityDot, { backgroundColor: QUALITY_COLOR[quality] }]} />
        <Text style={styles.qualityLabel}>{QUALITY_LABEL[quality]}</Text>
      </View>

      <ScrollView style={styles.textBox} contentContainerStyle={styles.textBoxContent}>
        <Text style={hasText ? styles.sentenceText : styles.placeholderText}>
          {hasText ? sentence : "Распознанный текст появится здесь"}
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <ActionButton icon="🗑️" label="Очистить" onPress={onClear} disabled={!hasText} />
        <ActionButton icon="📋" label="Копировать" onPress={onCopy} disabled={!hasText} />
        <ActionButton icon="🔊" label="Озвучить" onPress={onSpeak} disabled={!hasText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: Spacing.lg,
    margin: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  qualityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  qualityLabel: {
    fontSize: FontSize.body,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  textBox: {
    minHeight: 80,
    maxHeight: 160,
    marginBottom: Spacing.lg,
  },
  textBoxContent: {
    paddingVertical: Spacing.sm,
  },
  sentenceText: {
    fontSize: FontSize.heading,
    fontWeight: "700",
    color: Colors.heading,
    lineHeight: 34,
  },
  placeholderText: {
    fontSize: FontSize.subtitle,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnInner: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.listBackground,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: FontSize.caption,
    fontWeight: "600",
    color: Colors.heading,
  },
});
```

- [ ] **Step 2: Typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/signLanguageReader/ResultPanel.tsx
git commit -m "Add ResultPanel: sentence card with quality indicator and actions"
```

---

### Task 11: Mobile — `SignLanguageReaderScreen.tsx`

**Files:**
- Create: `mobile/src/screens/SignLanguageReaderScreen.tsx`

**Interfaces:**
- Consumes: `useSignLanguageReader` (Task 7), `CameraView` (Task 8), `RecognitionOverlay` (Task 9), `ResultPanel` (Task 10).
- Produces: `export default function SignLanguageReaderScreen(): JSX.Element` — a screen component with no props, ready to register as a tab screen.

- [ ] **Step 1: Write the implementation**

Create `mobile/src/screens/SignLanguageReaderScreen.tsx`:

```tsx
import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import CameraView from "../components/signLanguageReader/CameraView";
import RecognitionOverlay from "../components/signLanguageReader/RecognitionOverlay";
import ResultPanel from "../components/signLanguageReader/ResultPanel";
import { useSignLanguageReader } from "../hooks/useSignLanguageReader";

export default function SignLanguageReaderScreen() {
  const {
    cameraRef,
    facing,
    toggleFacing,
    sentence,
    liveGuess,
    liveConfidence,
    quality,
    clear,
    copyToClipboard,
    speak,
  } = useSignLanguageReader();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraWrap}>
          <CameraView cameraRef={cameraRef} facing={facing} onToggleFacing={toggleFacing}>
            <RecognitionOverlay
              liveGuess={liveGuess}
              liveConfidence={liveConfidence}
              quality={quality}
            />
          </CameraView>
        </View>
        <ResultPanel
          sentence={sentence}
          quality={quality}
          onClear={clear}
          onCopy={copyToClipboard}
          onSpeak={speak}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraWrap: {
    flex: 1,
    margin: 16,
    marginBottom: 0,
  },
});
```

- [ ] **Step 2: Typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/SignLanguageReaderScreen.tsx
git commit -m "Add SignLanguageReaderScreen: composes camera, overlay, and result panel"
```

---

### Task 12: Mobile — wire up the "Перевод" tab

**Files:**
- Modify: `shared/types.ts` (`RootTabParamList`)
- Modify: `mobile/src/navigation/TabNavigator.tsx`

**Interfaces:**
- Consumes: `SignLanguageReaderScreen` (Task 11).
- Produces: a `Translate` tab reachable from the bottom tab bar, positioned between "Жесты" and "Учеба".

- [ ] **Step 1: Add the route to `RootTabParamList`**

In `shared/types.ts`, change:
```ts
export type RootTabParamList = {
  Subtitles: undefined;
  Gestures: undefined;
  Study: undefined;
  Profile: undefined;
  Community: undefined;
};
```
to:
```ts
export type RootTabParamList = {
  Subtitles: undefined;
  Gestures: undefined;
  Translate: undefined;
  Study: undefined;
  Profile: undefined;
  Community: undefined;
};
```

- [ ] **Step 2: Register the tab in `TabNavigator.tsx`**

In `mobile/src/navigation/TabNavigator.tsx`, add the import:
```ts
import SignLanguageReaderScreen from "../screens/SignLanguageReaderScreen";
```

Add `"Перевод": "👋"` to the `icons` map inside `TabIcon`:
```ts
  const icons: Record<string, string> = {
    Субтитры: "💬",
    Жесты: "🤟",
    Перевод: "👋",
    Учеба: "🎓",
    Профиль: "👤",
    Комьюнити: "👥",
  };
```

Add the new `Tab.Screen` between the `"Gestures"` and `"Study"` screens:
```tsx
      <Tab.Screen
        name="Gestures"
        component={GesturesScreen}
        options={{
          tabBarLabel: "Жесты",
          tabBarIcon: ({ focused }) => <TabIcon label="Жесты" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Translate"
        component={SignLanguageReaderScreen}
        options={{
          tabBarLabel: "Перевод",
          tabBarIcon: ({ focused }) => <TabIcon label="Перевод" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Study"
        component={StudyScreen}
        options={{
          tabBarLabel: "Учеба",
          tabBarIcon: ({ focused }) => <TabIcon label="Учеба" focused={focused} />,
        }}
      />
```

- [ ] **Step 3: Typecheck the whole mobile app**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add shared/types.ts mobile/src/navigation/TabNavigator.tsx
git commit -m "Wire up the Перевод tab for the sign language reader screen"
```

---

### Task 13: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full mobile typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 2: Re-run both pure-logic verify scripts**

Run (from `mobile/`):
```bash
npx tsx src/components/signLanguageReader/GestureRecognizer.verify.ts
npx tsx src/components/signLanguageReader/TextComposer.verify.ts
```
Expected: both print their final "All ... tests passed" line, exit code 0.

- [ ] **Step 3: Re-run the backend gesture classification check**

Run (from repo root):
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" backend/verify_signflow_gestures.py
```
Expected: `All gesture classification checks passed`, exit code 0.

- [ ] **Step 4: Confirm the deployed/local backend still responds correctly**

Run:
```bash
curl -s -X POST https://hearless16-1.onrender.com/gestures/recognize -H "Content-Type: application/json" -d '{"image":""}'
```
Expected: a JSON response with a `gesture`/`confidence`/`error` shape (an empty `image` should produce `{"error":"invalid_image", ...}` or similar) — confirms the route is up and the response shape didn't change after the rate-limit edit.

- [ ] **Step 5: Human verification checklist (not agent-executable)**

Record that the following still need a person with a physical device, per the design spec's "Not agent-executable" section:
- Point a real phone camera at a hand performing each of the 11 supported words (Да, Нет, Здравствуйте, Вода, Еда, Спасибо, Пожалуйста, Хорошо, Плохо, Помощь, Стоп) and confirm each is recognized and appended to the sentence.
- Confirm the 350ms poll interval feels responsive on a real device, without visible UI lag.
- Confirm "Озвучить" audibly speaks the sentence in Russian, and "Копировать" pastes correctly into another app.
- Confirm the front/back camera toggle works, and the camera permission prompt/retry flow works when permission is initially denied.
- Confirm the "Перевод" tab icon (👋) doesn't look confusingly similar to the "Жесты" tab icon (🤟) on a real device screen.

- [ ] **Step 6: Final commit (if the checklist above surfaced no code changes, this step is a no-op — skip it)**
