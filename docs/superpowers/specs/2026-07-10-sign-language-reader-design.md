# Read Sign Language: Real-Time Camera Recognition (Design Spec)

**Date:** 2026-07-10
**Scope:** New mobile screen + tab (`mobile/src/screens/SignLanguageReaderScreen.tsx`, `mobile/src/components/signLanguageReader/*`, `mobile/src/hooks/useSignLanguageReader.ts`), navigation types (`shared/types.ts`, `TabNavigator.tsx`), backend vocabulary (`backend/app/signflow_model.py`), rate limit (`backend/app/routes/gestures.py`).

## Goal

Add a "Read Sign Language" feature: the user points the phone camera at their hands, the app continuously recognizes signs and builds up a sentence on screen in near-real-time, with no record button — recognition just runs while the screen is open.

## Why

The app already has one-off gesture *practice* (`GesturePracticeScreen`, matches against a single target gesture) and a *dictionary* of signs to learn. There's no free-form "translate what I'm signing into text" mode. This is the third and most visible sign-language capability in the app, and the primary way a hearing person could understand a deaf user signing to them.

## Non-goals (out of scope for this spec)

- On-device (frame-processor) hand tracking. Would require ejecting the Expo managed workflow to a custom dev client (`react-native-vision-camera` + `worklets-core`) — a major infra change the team explicitly decided against for this iteration. The existing server round-trip pipeline (`POST /gestures/recognize`) is reused instead.
- Training a real ML sign-language classifier. The backend classifier stays a rule-based static-hand-pose matcher (`_classify()` in `signflow_model.py`) — same approach already used for the 11 existing gesture rules, just extended with ~5 more.
- Recognizing motion-based or two-handed signs, facial expression, or fingerspelling sequences. The classifier only ever sees one static hand pose per frame, `num_hands=1`.
- Any change to `GesturePracticeScreen.tsx` or the gesture-dictionary flow — unrelated, untouched.
- Sentence editing (manual word deletion, reordering, punctuation editing) — only whole-text Clear is in scope, per the 4 buttons the spec lists.

## Architecture

### Data flow

```
CameraView (expo-camera, ref)
   │  every ~350ms, only if no request in-flight
   ▼
useHandTracker (hook)
   │  cameraRef.takePictureAsync({ base64, quality: 0.4 })
   │  POST /gestures/recognize { image } — no target_gesture
   ▼
GestureRecognizer.ts (pure function/class, no React)
   │  input: raw {gesture, confidence, error} samples over time
   │  - confidence < 60 → treated as "no confident guess" (ignored for confirmation,
   │    still shown live in the overlay as low-confidence)
   │  - a gesture is "confirmed" once it's the top guess in ≥2 of the last 3 samples
   │  - error === "no_hand_detected" resets the rolling window (no stale carry-over)
   ▼
TextComposer.ts (pure function/class, no React)
   │  called only on GestureRecognizer's edge-triggered "changed" event
   │  (holding one sign steadily fires "changed" once, not repeatedly):
   │  - appends the newly-confirmed word
   │  - a released-then-re-shown sign naturally re-appends, since releasing
   │    resets GestureRecognizer's window and produces a fresh "changed" edge
   │  - auto-capitalizes the first letter of the sentence
   ▼
useSignLanguageReader (orchestrator hook)
   exposes: { sentence, liveGuess, confidence, quality, facing, permission,
              toggleFacing, requestPermission, clear, copyToClipboard, speak }
   ▼
SignLanguageReaderScreen.tsx
   renders: CameraView + RecognitionOverlay (on top of camera) + ResultPanel (below)
```

`GestureRecognizer` and `TextComposer` are plain TypeScript modules (classes or closures) with no JSX — "component" in the sense of a distinct, independently-testable unit, not a React component. This keeps the confirmation/debounce logic unit-testable without rendering anything.

### Why polling, not a persistent stream

`expo-camera`'s `CameraView` in Expo managed workflow only exposes frame-by-frame still capture (`takePictureAsync`), the same primitive `GesturePracticeScreen` already uses — there's no continuous frame stream available without native frame processors (out of scope, see above). The loop already used there (attempt every N ms, skip if a request is still in flight) is the proven pattern for this constraint and is reused here, just tuned to 350ms instead of 300ms and without the target-gesture countdown/result phases.

### Components (`mobile/src/components/signLanguageReader/`)

- **`CameraView.tsx`** — thin wrapper around `expo-camera`'s `CameraView` + `useCameraPermissions`. Owns the permission-request UI (glass card, "Разрешить доступ к камере" button — replacing the bare-text fallback pattern in `GesturePracticeScreen` with an actual retry action) and the front/back `facing` toggle button (flip icon, top-right corner of the camera frame). Forwards a ref for `takePictureAsync`.
- **`useHandTracker.ts`** (hook, colocated in the same folder) — owns the capture-loop `setInterval`, the in-flight guard (`useRef<boolean>`), calls `axios.post(`${API_URL}/gestures/recognize`, { image })`, and streams each raw result up via a callback. Mirrors the `recognizeInFlightRef` pattern from `GesturePracticeScreen.tsx:49,89-124`.
- **`GestureRecognizer.ts`** — rolling-window confirmation logic described above. Pure, testable, no dependencies on React or the network.
- **`TextComposer.ts`** — sentence-building/dedup logic described above. Pure, testable.
- **`RecognitionOverlay.tsx`** — absolutely-positioned overlay on top of the camera preview. Shows the live (unconfirmed) best guess word + a small confidence ring, using `expo-blur`'s `BlurView` for a real glass panel (tinted blue, translucent) rather than the flat `rgba(0,0,0,0.5)` badge style used in `GesturePracticeScreen`. Updates on every poll tick, independent of whether a word gets confirmed, so it always feels live.
- **`ResultPanel.tsx`** — the card below the camera: growing sentence text (large, readable), the quality indicator (colored dot + label + %), and the 3-button toolbar (Очистить / Копировать / Озвучить). Buttons are disabled (not hidden) when the sentence is empty.

### Screen & orchestrator hook

- **`useSignLanguageReader.ts`** (`mobile/src/hooks/`) — wires `useHandTracker` → `GestureRecognizer` → `TextComposer` into one hook, holds the composed sentence and live-guess state, and exposes the actions the screen needs (`clear`, `copyToClipboard` via `expo-clipboard`, `speak` via `expo-speech`, `toggleFacing`).
- **`SignLanguageReaderScreen.tsx`** — thin composition: `CameraView` + `RecognitionOverlay` stacked in a `View`, `ResultPanel` below, both driven by `useSignLanguageReader()`. Matches the existing screen convention (`SafeAreaView`, white background, `StyleSheet.create` at the bottom, colors from `../constants/theme`).

### Quality indicator

Derived from the latest raw sample (not the confirmed word), recomputed every poll tick:

| Condition | Label | Color |
|---|---|---|
| `error === "no_hand_detected"` or no sample yet | «Наведите камеру на руки» | gray `#9CA3AF` |
| hand detected, confidence < 45 | «Низкое качество» | red `Colors.sos` |
| confidence 45–70 | «Среднее качество» | yellow `#F5A623` |
| confidence ≥ 70 | «Хорошее качество» | green `#22c55e` |

Shown as a colored dot + label + numeric `%` in `ResultPanel`, and as a thinner colored ring around the live-guess badge in `RecognitionOverlay`.

### Low-confidence handling (spec requirement: "don't add random words")

Two independent gates before a word reaches the sentence:
1. Per-sample: confidence must be ≥ 60 to count as a candidate at all (below that, the sample is treated the same as "no clear guess" for confirmation purposes, though it still updates the live overlay/quality indicator so the user gets feedback that *something* is being seen).
2. Temporal: a candidate must win ≥2 of the last 3 samples before `TextComposer` appends it. This filters single-frame misreads (motion blur, hand entering/leaving frame) without adding perceptible lag at a 350ms poll interval (~0.7–1.4s to confirm).

### Navigation

- New tab **"Перевод"** (icon `👋` — distinct from the `🤟` already used by "Жесты") added to `RootTabParamList` in `shared/types.ts` (`Translate: undefined`) and to `TabNavigator.tsx`, positioned between `Gestures` and `Study`.
- `SignLanguageReaderScreen` is registered directly as this tab's screen (not a stacked modal) — it's meant to be a primary, frequently-revisited destination, matching the user's choice of "tab, not a button buried in another screen."

## Backend changes

### New vocabulary entries

`_classify()` in `signflow_model.py` gets ~5 new static-pose rules for **Пожалуйста, Помощь, Хорошо, Плохо, Стоп** (Спасибо already exists as the closed-fist rule). Each new rule is assigned a `(thumb, index, middle, ring, pinky)` extended/folded combination not already claimed by an existing rule — exact assignments are a small enumeration task done during implementation (verify no two rules can match the same input), each returning a `(name, base_confidence)` tuple in the same style as the existing entries. `GESTURE_COMPONENTS` (the emulate-mode fallback dict) gets matching entries so offline/emulated mode stays consistent with the real classifier's vocabulary.

No route or request/response shape changes: `POST /gestures/recognize` already returns `{gesture, confidence, components, landmarks, error?}` for a single frame with no `target_gesture` required — exactly the shape `useHandTracker` needs.

### Rate limit

`@limiter.limit("60/minute")` on `/gestures/recognize` (`backend/app/routes/gestures.py:33`) is a per-client limit. At a 350ms poll interval with the in-flight guard, actual request rate is bounded by round-trip latency (typically 1–2s per the existing screen's real-world behavior), so it will likely self-throttle under 60/min in practice — but to give headroom for fast networks/devices, raise the limit on this route to **120/minute**.

## UI / visual design

- Blue palette from `Colors.accent` (`#1565C0`), consistent with the rest of the app.
- `expo-blur`'s `BlurView` used for `RecognitionOverlay` and the button toolbar in `ResultPanel` — actual glassmorphism (blurred, translucent), not the flat semi-opaque black badges used elsewhere in the app today.
- `ResultPanel` is a large rounded (24px) card holding the sentence in big readable text (`FontSize.heading`), matching the "big cards" requirement.
- Animations via core `Animated` from `"react-native"` (`Animated.Value`/`.timing`/`.spring`, `useNativeDriver: true`) — the same API `GesturePracticeScreen.tsx` already uses. `react-native-reanimated` is installed but has no actual usage anywhere in the codebase yet, so this avoids introducing its first usage for no benefit: overlay caption pulses when the live guess changes; toolbar buttons scale slightly on press.

## New dependencies

- `expo-speech` — TTS for the "Озвучить" button, `Speech.speak(sentence, { language: "ru-RU" })`.
- `expo-clipboard` — `Clipboard.setStringAsync(sentence)` for the "Копировать" button.
- `expo-blur` — `BlurView` for glassmorphism panels.

All three are standard Expo SDK packages, compatible with the existing managed workflow (no prebuild/eject required, matches SDK 51).

## Error handling

- Camera permission denied → `CameraView` component shows a glass card with explanation + a button that calls `requestPermission()` again (Expo's permission prompt can be re-triggered without leaving the app on most OS versions; if the OS reports permanently-denied, the button opens app settings via `Linking.openSettings()`).
- Network/API error on a given poll tick → swallowed the same way `GesturePracticeScreen` does today (`catch {}` around the request, `finally` clears the in-flight flag) so a transient failure doesn't stop the loop; the quality indicator falls back to "no data" gray until the next successful sample.
- Empty sentence → Copy/Speak buttons are disabled (not hidden), Clear is always available but a no-op on empty text.

## Testing / Verification

Agent-executable (no camera needed):
- `cd mobile && npx tsc --noEmit` — typechecks the new screen, components, hooks, and updated `shared/types.ts`.
- `GestureRecognizer.ts` and `TextComposer.ts` are pure logic — cover with a standalone verify script (no test framework exists in this repo): confirmation window, low-confidence rejection, duplicate-word suppression on a held sign, re-append after a release-and-reshow.
- Backend: a small script/pytest hitting `_classify()` directly with synthetic finger-state dicts for each of the 5 new words, asserting no rule collides with an existing one.
- `curl` the deployed `/gestures/recognize` (or local backend) to confirm the response shape is unchanged.

**Not agent-executable — human verification required:**
- Confirm real-time recognition actually works pointing a real phone camera at a real hand performing the 11 supported words, in a physical device or simulator with camera passthrough.
- Confirm the 350ms poll interval feels responsive and doesn't visibly lag or drop frames on a real device.
- Confirm TTS actually speaks Russian text audibly, and Clipboard paste works in another app.
- Confirm the new tab icon doesn't visually collide with the "Жесты" tab's `🤟`.

## Follow-up (tracked separately, not designed here)

- Expanding the vocabulary further, or moving to a trained classifier instead of hand-written finger-state rules, if the 11-word vocabulary proves too limiting in practice.
- On-device recognition (frame processors) if server round-trip latency becomes the main complaint — would need the Expo eject decision revisited.
