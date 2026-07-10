# Russian Sign Language (SLOVO) Mode + Language Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second, SLOVO-referenced Russian Sign Language recognition vocabulary to the existing live sign-language reader (mobile `SignLanguageReaderScreen` + web `/dashboard/sign-language-reader`), with a persisted per-device toggle between it and today's existing vocabulary.

**Architecture:** The reader's rule-based finger-extension classifier exists in two parallel implementations that must stay in sync — `backend/app/signflow_model.py` (Python, used by mobile via REST) and `shared/signLanguageReader/classifyGesture.ts` (TypeScript, used client-side by web). Both get a `language: "kz" | "ru"` parameter and an internal dispatch between today's rules (renamed `_classify_kz`/`classifyKz`, unchanged) and a new `_classify_ru`/`classifyRu` (12-word SLOVO-referenced vocabulary). A new tiny shared module, `shared/signLanguageReader/languages.ts`, holds the `SignLanguage` type plus toggle labels/default/storage-key so both platforms' UI stays in sync. Each platform gets a small toggle component wired to `localStorage` (web) / `AsyncStorage` (mobile), defaulting to `"ru"`, that resets the in-progress recognized sentence on switch.

**Tech Stack:** FastAPI + Pydantic (`backend/`), Next.js App Router + `@mediapipe/tasks-vision` (`landing/`), React Native/Expo + `@react-native-async-storage/async-storage` (already installed) (`mobile/`), TypeScript throughout `shared/`.

**Reference spec:** `docs/superpowers/specs/2026-07-10-russian-sign-language-switcher-design.md`

## Global Constraints

- Scope is the live reader only (mobile `SignLanguageReaderScreen` + web `/dashboard/sign-language-reader`). Do not touch `/sign-language` tutorial pages or `/sign-language/practice` (`gestureDefs.ts`).
- No new npm/pip dependencies. `@react-native-async-storage/async-storage` is already in `mobile/package.json` (`^3.1.1`); web uses browser-native `localStorage`.
- `"kz"` vocabulary and its rules are unchanged — every existing `_classify_kz`/`classifyKz` test case must keep passing byte-for-byte.
- `"ru"` vocabulary (12 words, each cited to a real SLOVO `constants.py` class id): Да (900), Один (555), Два (621), Три (707), Четыре (737), Привет! (476), Хорошо (540), Плохо (766), Вода (662), Еда (549), Помочь (933), Остановить (795).
- `shared/signLanguageReader/*.ts` files must have zero npm package imports (no root-level `node_modules` in this repo to resolve them from) — `languages.ts` and the `classifyGesture.ts` edits only use plain TypeScript, no new imports needed.
- Default language on first use (no stored preference yet): `"ru"`.
- Switching language mid-session must reset the in-progress recognizer window and composed sentence on both platforms (same two calls: `recognizerRef.current.reset()` + `composerRef.current.clear()` + clear the displayed sentence) — otherwise a sentence could mix words from both vocabularies.
- Storage key, identical on both platforms: `"hearless.signLanguage"`.

---

### Task 1: Backend — `"ru"` ruleset, `language` request field, per-language mock fallback

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/signflow_model.py`
- Modify: `backend/app/routes/gestures.py`
- Modify: `backend/verify_signflow_gestures.py`

**Interfaces:**
- Produces: `_classify(fingers: dict, language: str = "kz") -> tuple[str, float]` (backend/app/signflow_model.py), `recognize_gesture(frame_data: bytes, target_gesture: str | None = None, language: str = "kz") -> dict`, `recognize_emulate(target_gesture: str | None = None, language: str = "kz") -> dict`. `GestureRecognizeRequest.language: Literal["kz", "ru"] = "kz"` (backend/app/models.py).

- [ ] **Step 1: Write the failing verify script**

Replace the full contents of `backend/verify_signflow_gestures.py` with:

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

# "ru" vocabulary: 12 words, each cited to a real SLOVO constants.py class id
# (see docs/superpowers/specs/2026-07-10-russian-sign-language-switcher-design.md).
RU_CASES = {
    (0, 0, 0, 0, 0): "Да",           # id 900
    (0, 1, 0, 0, 0): "Один",         # id 555
    (0, 1, 1, 0, 0): "Два",          # id 621
    (1, 1, 1, 0, 0): "Три",          # id 707
    (0, 1, 1, 1, 1): "Четыре",       # id 737
    (1, 1, 1, 1, 1): "Привет!",      # id 476
    (1, 0, 0, 0, 0): "Хорошо",       # id 540
    (0, 0, 0, 1, 0): "Плохо",        # id 766
    (0, 1, 1, 1, 0): "Вода",         # id 662
    (0, 0, 1, 0, 0): "Еда",          # id 549
    (0, 0, 0, 0, 1): "Помочь",       # id 933
    (1, 0, 0, 0, 1): "Остановить",   # id 795
}


def check(pattern, expected, language="kz"):
    t, i, m, r, p = pattern
    fingers = {"thumb": bool(t), "index": bool(i), "middle": bool(m), "ring": bool(r), "pinky": bool(p)}
    got, _ = _classify(fingers, language)
    status = "PASS" if got == expected else "FAIL"
    print(f"{status}: language={language} pattern={pattern} -> {got!r} (want {expected!r})")
    assert got == expected, f"pattern {pattern} classified as {got!r}, expected {expected!r} (language={language})"


for pattern, expected in NEW_CASES.items():
    check(pattern, expected, "kz")

for pattern, expected in EXISTING_CASES.items():
    check(pattern, expected, "kz")

for pattern, expected in RU_CASES.items():
    check(pattern, expected, "ru")

print("All gesture classification checks passed")
```

(Only the `check()` signature, the `for` loops at the bottom, and the new `RU_CASES` dict are new — `NEW_CASES`/`EXISTING_CASES` are unchanged from today.)

- [ ] **Step 2: Run it to verify it fails**

Run (from repo root, `C:\Users\111\Desktop\hearless\hearless16`):
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" backend/verify_signflow_gestures.py
```
Expected: `TypeError: _classify() takes 1 positional argument but 2 were given` — today's `_classify(fingers)` doesn't accept a `language` argument yet.

- [ ] **Step 3: Implement the `"ru"` ruleset and `language` dispatch**

In `backend/app/signflow_model.py`, replace the existing `_classify` function (today's lines 81–131, from `def _classify(fingers: dict) -> tuple[str, float]:` through its closing `return "Неизвестно", 0.20`) with:

```python
def _classify_kz(fingers: dict) -> tuple[str, float]:
    """Rule-based classifier for the original (kz) vocabulary. Returns (gesture_name, confidence_0_to_1)."""
    t = fingers["thumb"]
    i = fingers["index"]
    m = fingers["middle"]
    r = fingers["ring"]
    p = fingers["pinky"]
    non_thumb = sum([i, m, r, p])

    # Да — thumb up only
    if t and not i and not m and not r and not p:
        return "Да", 0.92
    # Нет — index only
    if not t and i and not m and not r and not p:
        return "Нет", 0.88
    # Здравствуйте — all five extended
    if t and i and m and r and p:
        return "Здравствуйте", 0.90
    # Вода — index + middle + ring (W shape)
    if not t and i and m and r and not p:
        return "Вода", 0.85
    # Еда — index + middle only
    if not t and i and m and not r and not p:
        return "Еда", 0.82
    # Numbers by non-thumb finger count
    if non_thumb == 0 and not t:
        return "Спасибо", 0.75   # closed fist = approximate
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
    if non_thumb == 1 and i:
        return "Один", 0.90
    if non_thumb == 2 and i and m:
        return "Два", 0.88
    if non_thumb == 3 and i and m and r:
        return "Три", 0.85
    if non_thumb == 4:
        return "Четыре", 0.83
    return "Неизвестно", 0.20


def _classify_ru(fingers: dict) -> tuple[str, float]:
    """
    Rule-based classifier for the "ru" vocabulary — 12 words cited to real
    SLOVO (github.com/hukenovs/slovo) constants.py class ids, see
    docs/superpowers/specs/2026-07-10-russian-sign-language-switcher-design.md
    for the id each word maps to. Single-frame approximations of what are
    mostly dynamic real-world signs — same caliber of simplification as
    _classify_kz. Returns (gesture_name, confidence_0_to_1).
    """
    t = fingers["thumb"]
    i = fingers["index"]
    m = fingers["middle"]
    r = fingers["ring"]
    p = fingers["pinky"]

    # Да — closed fist (nod)
    if not t and not i and not m and not r and not p:
        return "Да", 0.92
    # Один — index only
    if not t and i and not m and not r and not p:
        return "Один", 0.90
    # Два — index + middle
    if not t and i and m and not r and not p:
        return "Два", 0.88
    # Три — thumb + index + middle (Russian counting style)
    if t and i and m and not r and not p:
        return "Три", 0.85
    # Четыре — four fingers, thumb tucked
    if not t and i and m and r and p:
        return "Четыре", 0.83
    # Привет! — all five extended, open palm
    if t and i and m and r and p:
        return "Привет!", 0.90
    # Хорошо — thumb up
    if t and not i and not m and not r and not p:
        return "Хорошо", 0.78
    # Плохо — ring only
    if not t and not i and not m and r and not p:
        return "Плохо", 0.78
    # Вода — index + middle + ring
    if not t and i and m and r and not p:
        return "Вода", 0.85
    # Еда — middle only
    if not t and not i and m and not r and not p:
        return "Еда", 0.82
    # Помочь — pinky only
    if not t and not i and not m and not r and p:
        return "Помочь", 0.80
    # Остановить — thumb + pinky
    if t and not i and not m and not r and p:
        return "Остановить", 0.80
    return "Неизвестно", 0.20


def _classify(fingers: dict, language: str = "kz") -> tuple[str, float]:
    if language == "ru":
        return _classify_ru(fingers)
    return _classify_kz(fingers)
```

- [ ] **Step 4: Thread `language` through `recognize_gesture`**

In `backend/app/signflow_model.py`, change:
```python
def recognize_gesture(frame_data: bytes, target_gesture: str | None = None) -> dict:
    landmarker = _get_hand_landmarker()

    # Fallback to emulation if the model failed to load (e.g. offline, or
    # the model download failed)
    if landmarker is None:
        return recognize_emulate(target_gesture)
```
to:
```python
def recognize_gesture(frame_data: bytes, target_gesture: str | None = None, language: str = "kz") -> dict:
    landmarker = _get_hand_landmarker()

    # Fallback to emulation if the model failed to load (e.g. offline, or
    # the model download failed)
    if landmarker is None:
        return recognize_emulate(target_gesture, language)
```

Then, further down in the same function, change:
```python
    lm = result.hand_landmarks[0]
    landmarks = [{"x": p.x, "y": p.y, "z": p.z} for p in lm]
    fingers = _finger_states(lm)
    gesture_name, base_conf = _classify(fingers)
```
to:
```python
    lm = result.hand_landmarks[0]
    landmarks = [{"x": p.x, "y": p.y, "z": p.z} for p in lm]
    fingers = _finger_states(lm)
    gesture_name, base_conf = _classify(fingers, language)
```

- [ ] **Step 5: Split the mock fallback table and thread `language` through `recognize_emulate`**

In `backend/app/signflow_model.py`, replace the mock-fallback section (today's `GESTURE_COMPONENTS` dict and `recognize_emulate` function, roughly lines 202–242) with:

```python
# ── Mock fallback (used when mediapipe is unavailable) ──────────────────────

GESTURE_COMPONENTS_KZ = {
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

GESTURE_COMPONENTS_RU = {
    "Да":           {"hand_shape": 90, "position": 88, "movement": 85},
    "Один":         {"hand_shape": 88, "position": 85, "movement": 80},
    "Два":          {"hand_shape": 86, "position": 84, "movement": 80},
    "Три":          {"hand_shape": 84, "position": 82, "movement": 78},
    "Четыре":       {"hand_shape": 82, "position": 80, "movement": 76},
    "Привет!":      {"hand_shape": 90, "position": 87, "movement": 84},
    "Хорошо":       {"hand_shape": 80, "position": 78, "movement": 75},
    "Плохо":        {"hand_shape": 78, "position": 76, "movement": 73},
    "Вода":         {"hand_shape": 84, "position": 80, "movement": 78},
    "Еда":          {"hand_shape": 80, "position": 77, "movement": 74},
    "Помочь":       {"hand_shape": 79, "position": 76, "movement": 73},
    "Остановить":   {"hand_shape": 81, "position": 78, "movement": 75},
}

GESTURE_COMPONENTS_BY_LANGUAGE = {
    "kz": GESTURE_COMPONENTS_KZ,
    "ru": GESTURE_COMPONENTS_RU,
}


def recognize_emulate(target_gesture: str | None = None, language: str = "kz") -> dict:
    table = GESTURE_COMPONENTS_BY_LANGUAGE.get(language, GESTURE_COMPONENTS_KZ)

    if target_gesture:
        base = table.get(target_gesture, {"hand_shape": 85, "position": 80, "movement": 80})
    else:
        chosen = random.choice(list(table.keys()))
        base = table[chosen]
        target_gesture = chosen

    noise = random.uniform(-5, 5)
    confidence = max(0, min(100, (
        base["hand_shape"] * 0.4 + base["position"] * 0.3 + base["movement"] * 0.3
    ) + noise))

    return {
        "gesture": target_gesture,
        "confidence": round(confidence, 1),
        "components": {
            "hand_shape": round(max(0, min(100, base["hand_shape"] + random.uniform(-8, 8))), 1),
            "position":   round(max(0, min(100, base["position"]   + random.uniform(-8, 8))), 1),
            "movement":   round(max(0, min(100, base["movement"]   + random.uniform(-8, 8))), 1),
        },
        "landmarks": None,
    }
```

- [ ] **Step 6: Run the verify script again to confirm it passes**

Run:
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" backend/verify_signflow_gestures.py
```
Expected: 27 `PASS` lines (5 + 10 kz + 12 ru), then `All gesture classification checks passed`, exit code 0.

- [ ] **Step 7: Add `language` to the request model**

In `backend/app/models.py`, change:
```python
from typing import Optional, List
```
to:
```python
from typing import Optional, List, Literal
```

Then change:
```python
class GestureRecognizeRequest(BaseModel):
    image: str
    target_gesture: Optional[str] = None
```
to:
```python
class GestureRecognizeRequest(BaseModel):
    image: str
    target_gesture: Optional[str] = None
    language: Literal["kz", "ru"] = "kz"
```

- [ ] **Step 8: Thread `language` through the route**

In `backend/app/routes/gestures.py`, change:
```python
        result = await asyncio.to_thread(recognize_gesture, frame, data.target_gesture)
```
to:
```python
        result = await asyncio.to_thread(recognize_gesture, frame, data.target_gesture, data.language)
```

- [ ] **Step 9: Re-run the verify script one more time (sanity check after the models/routes edits)**

Run:
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" backend/verify_signflow_gestures.py
```
Expected: same as Step 6 — 27 `PASS` lines, exit code 0. (`models.py`/`routes/gestures.py` changes don't affect `_classify` directly, but this confirms nothing else broke.)

- [ ] **Step 10: Commit**

```bash
git add backend/app/models.py backend/app/signflow_model.py backend/app/routes/gestures.py backend/verify_signflow_gestures.py
git commit -m "Add ru (SLOVO-referenced) gesture vocabulary and language request field"
```

---

### Task 2: Shared TypeScript — `languages.ts` + `classifyGesture.ts` `"ru"` ruleset

**Files:**
- Create: `shared/signLanguageReader/languages.ts`
- Modify: `shared/signLanguageReader/classifyGesture.ts`
- Modify: `shared/signLanguageReader/classifyGesture.verify.ts`

**Interfaces:**
- Produces (`languages.ts`): `export type SignLanguage = "kz" | "ru"`, `export const SIGN_LANGUAGES: { code: SignLanguage; label: string }[]`, `export const DEFAULT_SIGN_LANGUAGE: SignLanguage`, `export const SIGN_LANGUAGE_STORAGE_KEY: string`.
- Produces (`classifyGesture.ts`): `export function classifyGesture(landmarks: HandLandmarkPoint[], handednessScore: number, language: SignLanguage = "kz"): ClassifiedGesture` — same `ClassifiedGesture`/`HandLandmarkPoint` types as today, now with an optional third parameter.
- Consumes: nothing new from other tasks (this task is standalone; Tasks 3 and 4 consume it).

- [ ] **Step 1: Create `languages.ts`**

Create `shared/signLanguageReader/languages.ts`:

```ts
export type SignLanguage = "kz" | "ru";

export const SIGN_LANGUAGES: { code: SignLanguage; label: string }[] = [
  { code: "kz", label: "KZ" },
  { code: "ru", label: "RU (SLOVO)" },
];

export const DEFAULT_SIGN_LANGUAGE: SignLanguage = "ru";

export const SIGN_LANGUAGE_STORAGE_KEY = "hearless.signLanguage";
```

- [ ] **Step 2: Write the failing verify cases**

Replace the full contents of `shared/signLanguageReader/classifyGesture.verify.ts` with:

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

// "ru" vocabulary: 12 words, each cited to a real SLOVO constants.py class id
// (see docs/superpowers/specs/2026-07-10-russian-sign-language-switcher-design.md).
const RU_CASES: [Fingers, string][] = [
  [{ thumb: false, index: false, middle: false, ring: false, pinky: false }, "Да"],
  [{ thumb: false, index: true, middle: false, ring: false, pinky: false }, "Один"],
  [{ thumb: false, index: true, middle: true, ring: false, pinky: false }, "Два"],
  [{ thumb: true, index: true, middle: true, ring: false, pinky: false }, "Три"],
  [{ thumb: false, index: true, middle: true, ring: true, pinky: true }, "Четыре"],
  [{ thumb: true, index: true, middle: true, ring: true, pinky: true }, "Привет!"],
  [{ thumb: true, index: false, middle: false, ring: false, pinky: false }, "Хорошо"],
  [{ thumb: false, index: false, middle: false, ring: true, pinky: false }, "Плохо"],
  [{ thumb: false, index: true, middle: true, ring: true, pinky: false }, "Вода"],
  [{ thumb: false, index: false, middle: true, ring: false, pinky: false }, "Еда"],
  [{ thumb: false, index: false, middle: false, ring: false, pinky: true }, "Помочь"],
  [{ thumb: true, index: false, middle: false, ring: false, pinky: true }, "Остановить"],
];

for (const [fingers, expected] of [...NEW_CASES, ...EXISTING_CASES]) {
  const { gesture } = classifyGesture(makeLandmarks(fingers), 1.0, "kz");
  assertEqual(gesture, expected, `kz ${JSON.stringify(fingers)} -> ${expected}`);
}

for (const [fingers, expected] of RU_CASES) {
  const { gesture } = classifyGesture(makeLandmarks(fingers), 1.0, "ru");
  assertEqual(gesture, expected, `ru ${JSON.stringify(fingers)} -> ${expected}`);
}

console.log("All classifyGesture checks passed");
```

- [ ] **Step 3: Run it to verify the new cases fail**

Run (from repo root):
```bash
npx tsx shared/signLanguageReader/classifyGesture.verify.ts
```
Expected: the 15 `kz`-labeled assertions still `PASS` (today's `classifyGesture` ignores the extra third argument and still runs kz rules), but the 12 `ru`-labeled assertions `FAIL` — the script throws on the first one (`ru {"thumb":false,...} -> Да`, since today's classifier has no fist→"Да" rule reachable the same way and/or produces a kz-vocabulary word instead).

- [ ] **Step 4: Implement the `"ru"` ruleset and `language` dispatch**

Replace the full contents of `shared/signLanguageReader/classifyGesture.ts` with:

```ts
import type { SignLanguage } from "./languages";

export interface ClassifiedGesture {
  gesture: string;
  confidence: number;
}

/**
 * Structurally compatible with @mediapipe/tasks-vision's NormalizedLandmark
 * (same x/y/z shape) without importing that package's types directly —
 * shared/ has no node_modules of its own to resolve them from (no
 * root-level node_modules in this repo), and real NormalizedLandmark[]
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

function classifyKz(fingers: FingerStates): { gesture: string; baseConfidence: number } {
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
 * "ru" vocabulary — 12 words cited to real SLOVO (github.com/hukenovs/slovo)
 * constants.py class ids, see
 * docs/superpowers/specs/2026-07-10-russian-sign-language-switcher-design.md
 * for the id each word maps to. Single-frame approximations of what are
 * mostly dynamic real-world signs — same caliber of simplification as classifyKz.
 * Keep in sync with backend/app/signflow_model.py's _classify_ru().
 */
function classifyRu(fingers: FingerStates): { gesture: string; baseConfidence: number } {
  const { thumb: t, index: i, middle: m, ring: r, pinky: p } = fingers;

  if (!t && !i && !m && !r && !p) return { gesture: "Да", baseConfidence: 0.92 };
  if (!t && i && !m && !r && !p) return { gesture: "Один", baseConfidence: 0.90 };
  if (!t && i && m && !r && !p) return { gesture: "Два", baseConfidence: 0.88 };
  if (t && i && m && !r && !p) return { gesture: "Три", baseConfidence: 0.85 };
  if (!t && i && m && r && p) return { gesture: "Четыре", baseConfidence: 0.83 };
  if (t && i && m && r && p) return { gesture: "Привет!", baseConfidence: 0.90 };
  if (t && !i && !m && !r && !p) return { gesture: "Хорошо", baseConfidence: 0.78 };
  if (!t && !i && !m && r && !p) return { gesture: "Плохо", baseConfidence: 0.78 };
  if (!t && i && m && r && !p) return { gesture: "Вода", baseConfidence: 0.85 };
  if (!t && !i && m && !r && !p) return { gesture: "Еда", baseConfidence: 0.82 };
  if (!t && !i && !m && !r && p) return { gesture: "Помочь", baseConfidence: 0.80 };
  if (t && !i && !m && !r && p) return { gesture: "Остановить", baseConfidence: 0.80 };
  return { gesture: "Неизвестно", baseConfidence: 0.20 };
}

function classify(fingers: FingerStates, language: SignLanguage): { gesture: string; baseConfidence: number } {
  return language === "ru" ? classifyRu(fingers) : classifyKz(fingers);
}

/**
 * TypeScript port of backend/app/signflow_model.py's _finger_states()/_classify().
 * Keep both in sync if either vocabulary changes.
 */
export function classifyGesture(
  landmarks: HandLandmarkPoint[],
  handednessScore: number,
  language: SignLanguage = "kz"
): ClassifiedGesture {
  const { gesture, baseConfidence } = classify(fingerStates(landmarks), language);
  const confidence = Math.round(Math.min(100, baseConfidence * handednessScore * 100) * 10) / 10;
  return { gesture, confidence };
}
```

- [ ] **Step 5: Run the verify script again to confirm it passes**

Run:
```bash
npx tsx shared/signLanguageReader/classifyGesture.verify.ts
```
Expected: 27 `PASS` lines (15 kz + 12 ru), then `All classifyGesture checks passed`, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add shared/signLanguageReader/languages.ts shared/signLanguageReader/classifyGesture.ts shared/signLanguageReader/classifyGesture.verify.ts
git commit -m "Add ru (SLOVO-referenced) gesture vocabulary to classifyGesture"
```

---

### Task 3: Web — language toggle on `/dashboard/sign-language-reader`

**Files:**
- Modify: `landing/app/dashboard/sign-language-reader/page.tsx`

**Interfaces:**
- Consumes: `classifyGesture(landmarks, handednessScore, language)` (Task 2), `SignLanguage`, `SIGN_LANGUAGES`, `DEFAULT_SIGN_LANGUAGE`, `SIGN_LANGUAGE_STORAGE_KEY` (Task 2, `shared/signLanguageReader/languages.ts`).

- [ ] **Step 1: Add language state, persistence, and pass it into `classifyGesture`**

In `landing/app/dashboard/sign-language-reader/page.tsx`, change the imports at the top:
```tsx
import { GestureRecognizer, type RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../../../../shared/signLanguageReader/TextComposer";
import { classifyGesture } from "../../../../shared/signLanguageReader/classifyGesture";
```
to:
```tsx
import { GestureRecognizer, type RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../../../../shared/signLanguageReader/TextComposer";
import { classifyGesture } from "../../../../shared/signLanguageReader/classifyGesture";
import { SIGN_LANGUAGES, DEFAULT_SIGN_LANGUAGE, SIGN_LANGUAGE_STORAGE_KEY, type SignLanguage } from "../../../../shared/signLanguageReader/languages";
```

Then, inside the `SignLanguageReaderPage` component, right after the existing `recognizerRef`/`composerRef` declarations:
```tsx
  const recognizerRef = useRef(new GestureRecognizer());
  const composerRef = useRef(new TextComposer());
```
add:
```tsx
  const recognizerRef = useRef(new GestureRecognizer());
  const composerRef = useRef(new TextComposer());

  const [language, setLanguageState] = useState<SignLanguage>(() => {
    if (typeof window === "undefined") return DEFAULT_SIGN_LANGUAGE;
    const stored = window.localStorage.getItem(SIGN_LANGUAGE_STORAGE_KEY);
    return stored === "kz" || stored === "ru" ? stored : DEFAULT_SIGN_LANGUAGE;
  });
  const languageRef = useRef<SignLanguage>(language);
```

Then, right after the `handleSample` callback:
```tsx
  const handleSample = useCallback((sample: RawSample) => {
    setLiveSample(sample);
    const state = recognizerRef.current.pushSample(sample);
    if (state.changed) {
      composerRef.current.onConfirmedChange(state.confirmed);
      setSentence(composerRef.current.sentence);
    }
  }, []);
```
add:
```tsx
  const setLanguage = useCallback((next: SignLanguage) => {
    languageRef.current = next;
    setLanguageState(next);
    window.localStorage.setItem(SIGN_LANGUAGE_STORAGE_KEY, next);
    recognizerRef.current.reset();
    composerRef.current.clear();
    setSentence("");
  }, []);
```

Then, in `handleTrackingResults`, change:
```tsx
        if (shouldSample) {
          lastSampleAtRef.current = now;
          const { gesture, confidence } = classifyGesture(landmarks, handednessScore);
          handleSample({ gesture, confidence });
        }
```
to:
```tsx
        if (shouldSample) {
          lastSampleAtRef.current = now;
          const { gesture, confidence } = classifyGesture(landmarks, handednessScore, languageRef.current);
          handleSample({ gesture, confidence });
        }
```

(`languageRef` — not the `language` state directly — is read here because `handleTrackingResults` is captured once by the `requestAnimationFrame` loop set up in the `useEffect(() => {...}, [])` below; reading a ref avoids a stale closure without having to restart the camera/tracking loop on every language switch.)

- [ ] **Step 2: Render the toggle**

In the same file, change the header block:
```tsx
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Перевод жестов</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Покажите жест перед камерой — приложение распознает его и добавит слово в предложение.
        </p>
      </div>
```
to:
```tsx
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-syne font-extrabold text-3xl text-slate-800">Перевод жестов</h2>
          <p className="text-slate-500 text-sm max-w-2xl font-medium">
            Покажите жест перед камерой — приложение распознает его и добавит слово в предложение.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {SIGN_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={
                lang.code === language
                  ? "px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold"
                  : "px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
              }
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
```

- [ ] **Step 3: Typecheck**

Run (from `landing/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add landing/app/dashboard/sign-language-reader/page.tsx
git commit -m "Add sign language switcher to the web reader"
```

---

### Task 4: Mobile — language toggle on `SignLanguageReaderScreen`

**Files:**
- Modify: `mobile/src/components/signLanguageReader/useHandTracker.ts`
- Modify: `mobile/src/hooks/useSignLanguageReader.ts`
- Create: `mobile/src/components/signLanguageReader/LanguageToggle.tsx`
- Modify: `mobile/src/screens/SignLanguageReaderScreen.tsx`

**Interfaces:**
- Consumes: `SignLanguage`, `SIGN_LANGUAGES`, `DEFAULT_SIGN_LANGUAGE`, `SIGN_LANGUAGE_STORAGE_KEY` (Task 2, `shared/signLanguageReader/languages.ts`).
- Produces: `useSignLanguageReader()` now additionally returns `language: SignLanguage` and `setLanguage: (next: SignLanguage) => void`. `LanguageToggle` component: `{ language: SignLanguage; onChange: (next: SignLanguage) => void }` props.

- [ ] **Step 1: Add a `languageRef` parameter to `useHandTracker` and send it with each request**

Replace the full contents of `mobile/src/components/signLanguageReader/useHandTracker.ts` with:

```ts
import { useCallback, useRef } from "react";
import type { CameraView as ExpoCameraView } from "expo-camera";
import axios from "axios";
import type { RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";
import type { SignLanguage } from "../../../../shared/signLanguageReader/languages";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const POLL_INTERVAL_MS = 350;

/**
 * Owns the continuous capture-and-recognize loop: every POLL_INTERVAL_MS,
 * grabs a still frame from the camera and posts it to the backend, skipping
 * a tick if the previous request hasn't resolved yet (same backpressure
 * pattern as GesturePracticeScreen.tsx).
 *
 * `languageRef` (not a plain `language` value) is used so a mid-session
 * language switch is picked up by the already-running interval without
 * needing to stop/restart it.
 */
export function useHandTracker(
  cameraRef: React.RefObject<ExpoCameraView>,
  onSample: (sample: RawSample) => void,
  languageRef: React.MutableRefObject<SignLanguage>
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
          language: languageRef.current,
        });
        onSample({
          gesture: response.data.gesture,
          confidence: response.data.confidence ?? 0,
          error: response.data.error,
        });
      } catch {
        onSample({ gesture: null, confidence: 0, error: "processing_error" });
      } finally {
        inFlightRef.current = false;
      }
    }, POLL_INTERVAL_MS);
  }, [cameraRef, onSample, languageRef]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { start, stop };
}
```

- [ ] **Step 2: Add `language`/`setLanguage` to `useSignLanguageReader`, loaded from and persisted to `AsyncStorage`**

Replace the full contents of `mobile/src/hooks/useSignLanguageReader.ts` with:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import type { CameraView as ExpoCameraView, CameraType } from "expo-camera";
import { GestureRecognizer } from "../../../shared/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../../../shared/signLanguageReader/TextComposer";
import { useHandTracker } from "../components/signLanguageReader/useHandTracker";
import type { RawSample } from "../../../shared/signLanguageReader/GestureRecognizer";
import { DEFAULT_SIGN_LANGUAGE, SIGN_LANGUAGE_STORAGE_KEY, type SignLanguage } from "../../../shared/signLanguageReader/languages";
import { Colors } from "../constants/theme";

export type Quality = "none" | "low" | "medium" | "high";

export const QUALITY_COLOR: Record<Quality, string> = {
  none: "#9CA3AF",
  low: Colors.sos,
  medium: "#F5A623",
  high: "#22c55e",
};

function qualityFor(sample: RawSample | null): Quality {
  if (!sample || sample.error) return "none";
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
  const [language, setLanguageState] = useState<SignLanguage>(DEFAULT_SIGN_LANGUAGE);
  const languageRef = useRef<SignLanguage>(DEFAULT_SIGN_LANGUAGE);

  useEffect(() => {
    AsyncStorage.getItem(SIGN_LANGUAGE_STORAGE_KEY).then((stored) => {
      if (stored === "kz" || stored === "ru") {
        languageRef.current = stored;
        setLanguageState(stored);
      }
    });
  }, []);

  const setLanguage = useCallback((next: SignLanguage) => {
    languageRef.current = next;
    setLanguageState(next);
    AsyncStorage.setItem(SIGN_LANGUAGE_STORAGE_KEY, next);
    recognizerRef.current.reset();
    composerRef.current.clear();
    setSentence("");
  }, []);

  const handleSample = useCallback((sample: RawSample) => {
    setLiveSample(sample);
    const state = recognizerRef.current.pushSample(sample);
    if (state.changed) {
      composerRef.current.onConfirmedChange(state.confirmed);
      setSentence(composerRef.current.sentence);
    }
  }, []);

  const { start, stop } = useHandTracker(cameraRef, handleSample, languageRef);

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
    language,
    setLanguage,
  };
}
```

(The `Speech.speak(sentence, { language: "ru-RU" })` call is unchanged — that `language` is `expo-speech`'s own TTS-voice-locale option, an unrelated field on a different object literal, not the sign-language mode.)

- [ ] **Step 3: Create the `LanguageToggle` component**

Create `mobile/src/components/signLanguageReader/LanguageToggle.tsx`:

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize } from "../../constants/theme";
import { SIGN_LANGUAGES, type SignLanguage } from "../../../../shared/signLanguageReader/languages";

interface Props {
  language: SignLanguage;
  onChange: (language: SignLanguage) => void;
}

export default function LanguageToggle({ language, onChange }: Props) {
  return (
    <View style={styles.row}>
      {SIGN_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[styles.pill, lang.code === language && styles.pillActive]}
          onPress={() => onChange(lang.code)}
        >
          <Text style={[styles.pillText, lang.code === language && styles.pillTextActive]}>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.listBackground,
  },
  pillActive: {
    backgroundColor: Colors.accent,
  },
  pillText: {
    fontSize: FontSize.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.white,
  },
});
```

- [ ] **Step 4: Render `LanguageToggle` in `SignLanguageReaderScreen`**

Replace the full contents of `mobile/src/screens/SignLanguageReaderScreen.tsx` with:

```tsx
import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import CameraView from "../components/signLanguageReader/CameraView";
import RecognitionOverlay from "../components/signLanguageReader/RecognitionOverlay";
import ResultPanel from "../components/signLanguageReader/ResultPanel";
import LanguageToggle from "../components/signLanguageReader/LanguageToggle";
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
    language,
    setLanguage,
  } = useSignLanguageReader();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <SafeAreaView style={styles.container}>
        <LanguageToggle language={language} onChange={setLanguage} />
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

- [ ] **Step 5: Typecheck**

Run (from `mobile/`):
```bash
npx tsc --noEmit
```
Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/signLanguageReader/useHandTracker.ts mobile/src/hooks/useSignLanguageReader.ts mobile/src/components/signLanguageReader/LanguageToggle.tsx mobile/src/screens/SignLanguageReaderScreen.tsx
git commit -m "Add sign language switcher to the mobile reader"
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

- [ ] **Step 2: Re-run all verify scripts**

Run (from the repo root):
```bash
npx tsx shared/signLanguageReader/GestureRecognizer.verify.ts
npx tsx shared/signLanguageReader/TextComposer.verify.ts
npx tsx shared/signLanguageReader/classifyGesture.verify.ts
"/c/Users/111/AppData/Local/Python/bin/python.exe" backend/verify_signflow_gestures.py
```
Expected: all four print their final "All ... passed" line, exit code 0.

- [ ] **Step 3: Confirm the backend recognizes `"ru"` end-to-end via the mock fallback**

Run (from `backend/`, starting a throwaway Python shell — no server needed, this calls `recognize_emulate` directly the same way `recognize_gesture` does when MediaPipe is unavailable):
```bash
"/c/Users/111/AppData/Local/Python/bin/python.exe" -c "
import sys, os
sys.path.insert(0, 'backend')
from app.signflow_model import recognize_emulate
result = recognize_emulate('Привет!', 'ru')
assert result['gesture'] == 'Привет!', result
print('PASS: ru mock fallback returns the requested ru word')
"
```
Expected: `PASS: ru mock fallback returns the requested ru word`, exit code 0.

- [ ] **Step 4: Sanity-check no stale references remain**

Run:
```bash
grep -rn "_classify(fingers)" backend/app/signflow_model.py
```
Expected: no matches (confirms every call site was updated to pass `language`).

- [ ] **Step 5: Human verification checklist (not agent-executable)**

Record that the following need a person with a real browser/device + webcam:
- Open `/dashboard/sign-language-reader`: confirm it defaults to "RU (SLOVO)" on first visit (no stored preference), the pill toggle switches correctly, and each of the 12 `"ru"` words is recognized when signed in front of a real webcam.
- Switch back to "KZ" mid-sentence and confirm the displayed sentence clears instead of mixing vocabularies.
- Reload the page and confirm the last-selected language persists (`localStorage`).
- On mobile, open the sign language reader screen: confirm the same default/switch/persist/reset behavior via `AsyncStorage`, and that the toggle doesn't visually collide with the flip-camera button in the top-right corner of the camera view.

- [ ] **Step 6: Final commit (only if the checklist above surfaced code changes — otherwise this step is a no-op, skip it)**
