# Read Sign Language: Web Dashboard Real-Time Recognition (Design Spec)

**Date:** 2026-07-10
**Scope:** New page `landing/app/dashboard/sign-language-reader/page.tsx`, new shared module `shared/signLanguageReader/classifyGesture.ts`, relocating `GestureRecognizer.ts`/`TextComposer.ts` from `mobile/` into `shared/signLanguageReader/`, and a new dashboard nav entry (`landing/app/dashboard/layout.tsx`).

## Goal

Bring the same "read sign language into a sentence" experience already built for mobile (`docs/superpowers/plans/2026-07-10-sign-language-reader.md`) to the web dashboard — but using the browser's real on-device MediaPipe hand tracking instead of the REST-polling approach mobile was forced into by Expo's managed-workflow constraints.

## Why

The user expected the mobile feature to also appear in the web dashboard (`landing/app/dashboard`) and it didn't, since the mobile plan was scoped mobile-only. Rather than port mobile's REST-polling architecture as-is, the web app already has a proven, working client-side `@mediapipe/tasks-vision` `HandLandmarker` integration (`landing/app/sign-language/practice/page.tsx`) — true real-time, zero network round-trip. Reusing that engine gives a strictly better experience on web than mirroring mobile's polling approach would.

## Non-goals (out of scope for this spec)

- Unifying the codebase's three existing separate MediaPipe integrations (`/sign-language/practice`'s 14-dim feature-vector matcher, `/dashboard/learn`'s backend-polling verifier, and mobile's backend-polling reader). Each stays as-is; this spec adds a fourth, independent implementation rather than refactoring the others — matching the codebase's existing pattern of per-screen MediaPipe init code, not a shared hook.
- Expanding the 16-word vocabulary — same words as the mobile feature (Да, Нет, Здравствуйте, Вода, Еда, Спасибо, Пожалуйста, Хорошо, Плохо, Помощь, Стоп, Один, Два, Три, Четыре).
- Camera device selection (front/back or multi-device picker) — single default `getUserMedia({ video: true })`, matching `/sign-language/practice`'s existing approach. Desktops/laptops overwhelmingly have exactly one camera.
- Any backend (`backend/app/signflow_model.py`, FastAPI routes) changes — the web page never calls the backend for recognition; it classifies fully client-side.
- Motion-based or two-handed signs — same limitation as backend/mobile: one static hand pose per sample, `numHands: 1`.

## Architecture

### Data flow

```
getUserMedia({ video: true }) — default camera, no device picker
   │
HandLandmarker.detectForVideo() — every requestAnimationFrame (~60fps)
   │  - every frame: used to draw the live hand skeleton (reuse DrawingUtils,
   │    same pattern as /sign-language/practice/page.tsx:246-268)
   │  - throttled to ~300ms: the frame's landmarks are converted to a
   │    RawSample and pushed into GestureRecognizer
   ▼
classifyGesture(landmarks) — shared/signLanguageReader/classifyGesture.ts
   │  TypeScript port of backend/app/signflow_model.py's
   │  _finger_states()/_classify() — same 16-word vocabulary, same
   │  y-coordinate finger-extension rules, same confidence values
   ▼
GestureRecognizer.pushSample() — shared/signLanguageReader/GestureRecognizer.ts
   │  (relocated from mobile/, unchanged logic: 3-sample majority window,
   │  confidence ≥60 threshold, no_hand_detected resets the window)
   ▼
TextComposer.onConfirmedChange() — shared/signLanguageReader/TextComposer.ts
   │  (relocated from mobile/, unchanged logic: edge-triggered append)
   ▼
Page state: sentence, liveGuess, liveConfidence, quality
   ▼
UI: camera preview + skeleton overlay, live-guess badge, sentence card,
    Очистить / Копировать (navigator.clipboard.writeText) /
    Озвучить (window.speechSynthesis)
```

### Why throttle sampling to ~300ms despite 60fps tracking

`GestureRecognizer`'s 3-sample majority window assumes samples arrive roughly every 300–350ms (mobile's poll interval) — that's what makes "2 of the last 3 samples agree" a meaningful ~0.7–1.4s debounce. Feeding it a sample every animation frame (16ms) would satisfy "2 of 3" within ~50ms, destroying the debounce and spamming the sentence on any brief, accidental pose. Rather than fork `GestureRecognizer`'s constants per platform, the web page gates how often it *feeds* a sample into the shared module — using a `lastSampleAtRef` timestamp check inside the `requestAnimationFrame` loop (skip pushing to `GestureRecognizer` if <300ms have passed since the last push), while every frame still updates the live skeleton drawing and the live-guess badge for visual smoothness. This keeps `GestureRecognizer`/`TextComposer` byte-identical between mobile and web — only the sampling cadence at the call site differs, matching each platform's natural frame source.

### `classifyGesture.ts`: a deliberate, documented duplication

Porting `_classify()`'s rules to TypeScript duplicates logic already living in `backend/app/signflow_model.py` — an accepted trade-off, not an oversight. True zero-latency client-side recognition requires the classification step to run in the browser; keeping it server-side would mean either (a) a network round-trip per sample (defeating the whole point of using the browser's on-device tracking), or (b) sending landmarks instead of images to a new backend endpoint (a larger change, out of scope). If the 16-word vocabulary changes in the future, both `signflow_model.py`'s `_classify()` and `classifyGesture.ts` need updating together — call this out in both files' comments.

The port is mechanical: MediaPipe's `NormalizedLandmark` shape (`{x, y, z}`, 21 points, same normalized image-space convention) is identical whether produced by the Python Tasks API or `@mediapipe/tasks-vision` in the browser — already proven by `/sign-language/practice/page.tsx`'s existing use of the same 21-point landmark array. The same `lm[4].y < lm[2].y`-style comparisons and the same rule-priority order carry over 1:1.

`classifyGesture.ts` does **not** import `NormalizedLandmark` from `@mediapipe/tasks-vision` — this repo's root `package.json` is a thin script-runner wrapper with no dependencies, so there's no root-level `node_modules` for a file under `shared/` to resolve that package's types from (confirmed by actually compiling it in place during planning: `TS2307: Cannot find module '@mediapipe/tasks-vision'`). Instead it declares its own local `HandLandmarkPoint { x, y, z }` interface; a real `NormalizedLandmark[]` satisfies it structurally, so the web page passes `results.landmarks[0]` straight through with no cast needed. This keeps `shared/` dependency-free, matching `shared/types.ts`'s existing zero-dependency pattern.

### Shared module relocation

- `mobile/src/components/signLanguageReader/GestureRecognizer.ts` (+ `GestureRecognizer.verify.ts`) → `shared/signLanguageReader/GestureRecognizer.ts` (+ verify script). Almost a pure move — one line changes: the majority-vote loop iterates `Array.from(counts.entries())` instead of the `Map` directly, because `landing/tsconfig.json` targets `es5` and iterating a `Map` with `for...of` there requires `--downlevelIteration` (confirmed by actually compiling this file into `landing/` during planning — it fails without the change). Behavior is identical; verified by re-running `GestureRecognizer.verify.ts` after the change.
- `mobile/src/components/signLanguageReader/TextComposer.ts` (+ `TextComposer.verify.ts`) → `shared/signLanguageReader/TextComposer.ts` (+ verify script). Same — pure move, zero logic changes.
- Mobile call sites updated to the new relative path: `mobile/src/components/signLanguageReader/useHandTracker.ts` (imports `RawSample` from `GestureRecognizer`) and `mobile/src/hooks/useSignLanguageReader.ts` (imports `GestureRecognizer`, `TextComposer`) — both already use relative imports for cross-app shared code today (`shared/types.ts` is consumed the same way), so this follows an established convention, not a new one.
- No other mobile files change; the mobile feature's behavior is unaffected (same code, new location).

### Web page (`landing/app/dashboard/sign-language-reader/page.tsx`)

A single client component, following `/sign-language/practice/page.tsx`'s proven `HandLandmarker` init/cleanup pattern (`FilesetResolver.forVisionTasks`, same `hand_landmarker.task` model URL, `runningMode: "VIDEO"`, `numHands: 1`, same confidence thresholds, cleanup on unmount via `cancelAnimationFrame`/stream track stop/`handLandmarker.close()`).

Visual structure matches the *dashboard's own* design system — **not** `/sign-language/practice`'s CSS-custom-property styling (`var(--accent)` etc., a standalone-landing-page-only convention). Dashboard content pages (`/dashboard/text-to-speech`, `/dashboard/learn`) use Tailwind utility classes instead: `font-syne` headings, `bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl` glass cards, the `slate-*`/`sky-*` palette, and the `accent`/`successBrand` custom Tailwind color tokens (`text-accent`, `border-accent` — confirmed in `landing/tailwind.config.*`: `accent: "#0066FF"`). The camera preview reuses `/dashboard/learn`'s exact video/canvas pattern: mirrored `<video>` + overlay `<canvas>` inside a `bg-slate-950 rounded-2xl` frame. This correction was made after actually reading a real dashboard content page during planning, not assumed from the standalone practice page.

Layout: camera preview with live hand-skeleton overlay (canvas, same mirrored-video technique as `/sign-language/practice`) on one side, a result card on the other/below showing:
- The growing recognized sentence (large text)
- A quality indicator (colored dot + label — same 4 bands as mobile: none/gray, low <45/red, medium 45–70/yellow, high ≥70/green)
- Three buttons: Очистить (clears `TextComposer` + `GestureRecognizer` state), Копировать (`navigator.clipboard.writeText(sentence)`), Озвучить (`window.speechSynthesis.speak(new SpeechSynthesisUtterance(sentence))`, `lang: "ru-RU"`) — all three disabled (not hidden) when the sentence is empty, same as mobile.

### Navigation

`landing/app/dashboard/layout.tsx`'s `menuItems` array gets one new entry, **"Перевод жестов"**, positioned between "Изучение жестов" (`/dashboard/learn`) and "Текст → Речь" (`/dashboard/text-to-speech`), pointing at `/dashboard/sign-language-reader`, with its own icon (an SVG in the same style as the other five menu icons — a hand/translate-style outline icon, distinct from "Изучение жестов"'s icon).

## Error handling

- Camera/model init failure: same pattern as `/sign-language/practice/page.tsx:120-124` — a full-screen error panel with the error message and a "Повторить попытку" retry button that re-runs `initMediaPipe()`.
- No hand detected: `classifyGesture` returns a `no_hand_detected`-equivalent result (no landmarks path), which resets `GestureRecognizer`'s window exactly as it does on mobile.
- Low-confidence or ambiguous pose: same ≥60 confirmation threshold and 3-sample majority window as mobile — no random words get appended.

## Testing / Verification

Agent-executable (no camera needed):
- `cd landing && npx tsc --noEmit` and `cd mobile && npx tsc --noEmit` — both must stay clean after the relocation and the new page.
- A standalone verify script for `classifyGesture.ts` (run via `npx tsx`), covering the same 16-word/15-pattern matrix as `backend/verify_signflow_gestures.py`, confirming the TypeScript port produces identical results to the Python original for the same finger-state input.
- Re-run the relocated `GestureRecognizer.verify.ts`/`TextComposer.verify.ts` from their new `shared/signLanguageReader/` path — same assertions, same expected output, proving the move didn't change behavior.

**Not agent-executable — human verification required:**
- Confirm real-time recognition actually works pointing a real webcam at a real hand performing each of the 16 supported words, in an actual browser.
- Confirm the ~300ms sampling throttle feels the same debounce/responsiveness as the mobile feature.
- Confirm `window.speechSynthesis` audibly speaks Russian text and `navigator.clipboard.writeText` pastes correctly into another app (both require a real browser with user-gesture/permission context, not something an agent can verify).
- Confirm the new dashboard nav icon doesn't visually collide with "Изучение жестов"'s icon.

## Follow-up (tracked separately, not designed here)

- Reconciling `classifyGesture.ts` and `backend/app/signflow_model.py`'s `_classify()` if the vocabulary changes — currently two hand-maintained copies of the same rules, by design (see "a deliberate, documented duplication" above).
- Whether the codebase's four separate MediaPipe/gesture-recognition implementations should eventually be consolidated — explicitly out of scope here (see Non-goals).
