# MediaPipe Hands: Web Practice Page Modernization (Design Spec)

**Date:** 2026-07-06
**Scope:** `landing/app/sign-language/practice/page.tsx` and a new `landing/app/sign-language/practice/gestureDefs.ts`

## Goal

Replace the legacy CDN-script-loaded `@mediapipe/hands` engine on the web sign-language practice page with the modern `@mediapipe/tasks-vision` `HandLandmarker` API, and expand gesture coverage from 5 hardcoded dactyl letters to all 20 gestures in the app's catalog (`backend/supabase/migration.sql`).

This is step 1 of a 3-step effort to bring real hand-tracking into the "sign language" section of Hearless (web → backend classifier → mobile app), tracked as separate specs. Steps 2 and 3 are out of scope here.

## Why

The codebase audit (`codebase_analysis.md`) flagged that gesture recognition elsewhere in the app (mobile + backend) is largely fake/emulated. The web practice page is the one part that already does *real* hand tracking, but it:
- Uses the legacy `@mediapipe/hands` package loaded via `<script>` CDN tags (superseded by Google's `@mediapipe/tasks-vision` task API).
- Only recognizes 5 fingerspelling letters (А, В, Г, V, О) — a different, smaller vocabulary than the 20 real gestures (Здравствуйте, Спасибо, Мама, etc.) used everywhere else in the app (mobile catalog, backend classifier, DB).

## Non-goals (out of scope for this spec)

- Backend classifier changes (`signflow_model.py`) — separate spec.
- Mobile app changes (`GesturePracticeScreen.tsx`) — separate spec.
- Any new npm dependency for Worker-based inference — explicitly rejected in favor of main-thread `requestAnimationFrame`, see Architecture.
- Sourcing reference data from the external "Slovo" RSL dataset — investigated and rejected for this step (16GB download, CC BY-SA 4.0 ShareAlike licensing friction, and it's Russian Sign Language, not confirmed Kazakh Sign Language). Human calibration via the in-app tool is the chosen path instead.

## Architecture

### Engine: `@mediapipe/tasks-vision` `HandLandmarker`, main thread

Add `@mediapipe/tasks-vision` as an npm dependency. Replace:
- The two `next/script` CDN tags (`@mediapipe/camera_utils`, `@mediapipe/hands`) and the `window.Hands`/`window.Camera` globals.
- `initMediaPipe()`'s `new Hands({...})` + `new Camera(videoRef.current, {...})` setup.

With:
- `FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@<version>/wasm")` to load the WASM runtime (CDN URL is a standard, Google-recommended pattern — the JS API itself is the npm dependency; only the WASM binary and model `.task` file are fetched from a CDN, matching how the existing `hand_landmarker.task` model URL already works elsewhere in the reference sample).
- `HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" }, numHands: 1, minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.6, runningMode: "VIDEO" })` — same confidence thresholds as today.
- A `requestAnimationFrame` loop that calls `handLandmarker.detectForVideo(videoRef.current, performance.now())` each frame and feeds the result into the existing `handleTrackingResults`-equivalent logic.

**No Web Worker.** The reference sample pasted by the user (Google's `mediapipe-samples` playground demo) uses a Worker + `BaseVisionTask` scaffold built for a multi-model benchmark app. Porting that scaffold (worker bundling, message-passing protocol, template HTML) is real added complexity that isn't justified here — a single hand-landmark model at 640×480 for one hand runs fine on the main thread, as proven by the current (legacy) implementation already doing so successfully.

**Drawing:** replace the hand-rolled `drawHandSkeleton` function with `@mediapipe/tasks-vision`'s `DrawingUtils` class (`drawConnectors`/`drawLandmarks`) and `HandLandmarker.HAND_CONNECTIONS` instead of the hardcoded `CONNECTIONS` array. Same visual output (green/blue skeleton overlay), less custom code.

### Everything downstream of landmarks is unchanged

The 14-dimensional feature computation (`getDistance3D`, palm-size normalization, the `thumb_extension`/`*_wrist`/`*_index` etc. feature set), the weighted Euclidean-distance similarity scoring, the `checkRules` hint system, and the calibration-mode panel all operate on the same landmark shape (`{x, y, z}` per of 21 points, normalized 0–1) that both the old and new MediaPipe APIs produce. None of that logic needs to change — only how landmarks get acquired per frame.

## Gesture data: 20 catalog gestures

### File split

Move `GESTURE_DEFS` and `REFERENCE_LANDMARKS` out of `page.tsx` into `landing/app/sign-language/practice/gestureDefs.ts`, exporting:
```ts
interface GestureDef {
  name: string;
  description: string;
  emoji: string;
  motionBased: boolean;
  features: Record<string, number>;       // 14-dim matching vector
  referenceLandmarks: { x: number; y: number }[]; // 21 points, 0-100 viewBox, for the illustrative SVG
  checkRules: (features: Record<string, number>, states: Record<string, boolean>) => string[];
}
export const GESTURE_DEFS: Record<string, GestureDef> = { ... };
```
Keys/names cover all 20 catalog gestures: Здравствуйте, Спасибо, До свидания, Пожалуйста, Да, Нет, Мама, Папа, Брат, Сестра, Еда, Вода, Вкусно, Радость, Грусть, Любовь, Один, Два, Три, Сто (plus the existing 5 dactyl letters, kept as-is, unless the plan finds it cleaner to fold them into the same catalog — decided during planning).

### `motionBased` flag and UI disclaimer

Numbers (Один, Два, Три, Сто) and the existing dactyl letters are static poses → `motionBased: false`. The remaining ~16 word-gestures are inherently motion/expression-based in real sign language → `motionBased: true`. When active gesture has `motionBased: true`, render a disclaimer badge next to the similarity meter:
> "⚠ Упрощённая проверка: сравниваем финальную позу руки, точность ниже для жестов с движением"

This is a deliberate, accepted trade-off: the matching algorithm only ever compares a single static frame against a single static reference vector (the "final pose" of the gesture). It will not reliably validate the motion/trajectory/facial-expression parts of real signs — only whether the hand's end position roughly matches. Users should not take a high similarity score on a motion-based gesture as confirmation they signed the whole word correctly.

### Reference vectors: calibration tool is the source of truth, not agent-generated data

The 5 existing gestures' vectors were captured by a person performing the gesture on camera and using the page's own "Калибровка" panel. The same path is used for the 20 new catalog gestures — **this is a human task, not agent-executable** (no ability to physically perform sign language on a webcam). The calibration panel is extended (see below) to make this a single recording action per gesture.

We investigated using the open "Slovo" Russian Sign Language dataset (github.com/hukenovs/slovo, MediaPipe-annotated, 1000 classes) as a shortcut to avoid needing a human signer. Rejected for this step because: (a) the relevant data (`slovo_mediapipe.json`) is ~1.2GB, the full dataset ~16GB — impractical to pull into this project; (b) it's licensed CC BY-SA 4.0 (a variant) with a ShareAlike clause that would need legal review before baking derived data into the app; (c) it's Russian Sign Language, not confirmed Kazakh Sign Language — a fidelity question for Hearless's actual audience that a human calibration session sidesteps entirely.

Until real calibration data is recorded, the 20 new entries ship with placeholder vectors, clearly marked with a `// PLACEHOLDER — needs real calibration via the in-app tool` comment, so the feature is code-complete and functional (just inaccurate for those 20) rather than broken.

### Calibration panel: combined vector + illustrative landmarks capture

Extend `handleCalibrate()` so, alongside the existing 14-dim feature JSON, it also captures the raw 21 `{x, y}` landmark positions from the current frame (already available in `handleTrackingResults`), rescaled from MediaPipe's 0–1 normalized space into the existing 0–100 SVG viewBox used by `REFERENCE_LANDMARKS` (same coordinate convention already used for the 5 existing hand-authored diagrams). Output becomes one combined JSON object:
```json
{
  "features": { "thumb_extension": 0.82, ... },
  "referenceLandmarks": [{ "x": 50, "y": 90 }, ...]
}
```
This removes the need to hand-author illustrative SVG diagrams separately — one calibration recording produces both the matching data and the illustrative diagram for a gesture.

## Testing / Verification

Agent-executable (no camera needed):
- `cd landing && npx tsc --noEmit` — typechecks.
- `curl http://localhost:3000/sign-language/practice` → 200, page renders without the old CDN scripts, contains expected UI text.
- `grep` checks that no references to `window.Hands`/`window.Camera`/the old CDN URLs remain.

**Not agent-executable — human verification required** (same category as the TTS feature's listening-verification task):
- Confirm `HandLandmarker` actually initializes and tracks a real hand via webcam in a real browser.
- Confirm similarity scoring still feels reasonable for the 5 existing (real-vector) gestures after the engine swap — this is the regression check that the swap didn't change behavior.
- The 20 new gestures' calibration recordings themselves (see above) are inherently a human, in-person task.

## Follow-up (tracked separately, not designed here)

- **Step 2 — Backend classifier** (`signflow_model.py`): fix the hardcoded rule-tree to cover all 20 gestures reliably, address the silent-fallback-to-random-emulator risk if `mediapipe`/`opencv` aren't installed in production.
- **Step 3 — Mobile app** (`GesturePracticeScreen.tsx`): once backend is solid, revisit whether mobile should keep POST-per-frame to backend or move to on-device recognition matching the web's client-side approach.
