# Russian Sign Language (SLOVO) Mode + Language Switcher (Design Spec)

**Date:** 2026-07-10
**Scope:** `backend/app/models.py`, `backend/app/signflow_model.py`, `backend/app/routes/gestures.py`, `shared/signLanguageReader/classifyGesture.ts`, new `shared/signLanguageReader/languages.ts`, `mobile/src/hooks/useSignLanguageReader.ts`, `mobile/src/components/signLanguageReader/useHandTracker.ts`, `mobile/src/screens/SignLanguageReaderScreen.tsx`, `landing/app/dashboard/sign-language-reader/page.tsx`, plus new toggle UI components on both platforms.

## Goal

The live sign-language reader (mobile `SignLanguageReaderScreen` + web `/dashboard/sign-language-reader`) currently recognizes one fixed 15-word vocabulary with no language label. Add a second vocabulary sourced from [SLOVO](https://github.com/hukenovs/slovo) (a Russian Sign Language dataset/class list), and a persisted per-device toggle so the user can switch which vocabulary the reader recognizes against.

## Why

The user wants Russian Sign Language (RSL) support added alongside the existing gesture set, using SLOVO as the vocabulary reference, with a language switcher in the UI.

## Non-goals (out of scope for this spec)

- **Running SLOVO's actual pretrained model.** SLOVO's baseline checkpoints (MViTv2-small ~141MB, Swin-large ~822MB, ResNet-i3d ~146MB, plus SignFlow-A/R) all classify **video clips** (~16–48 frames), not single frames, and the dataset's own README doesn't ship per-class pose/landmark data inline (only class name → id). Downloading/serving a multi-hundred-MB video-sequence model is infeasible on Render's free-tier CPU worker (see the existing "Fix inaccurate node_modules wording" / mediapipe Solutions-API history in this repo for prior Render-constraint pain). Instead, this spec extends the **existing lightweight rule-based classifier** with a second ruleset, using SLOVO only as the source of truth for which Russian words to support (real class ids, cited below), not as a running model.
- **Tutorial pages** (`/sign-language`, its dactyl-alphabet/numbers/greetings/emotions content) and the **practice-calibration page** (`/sign-language/practice`, `gestureDefs.ts`'s separate 14-dim feature-vector matcher, mostly placeholder-calibrated even for the existing vocabulary). Both stay untouched. Only the reader (`GestureRecognizer`/`classifyGesture`/`signflow_model.py` pipeline, shared by mobile and web) gets the second language.
- **Expanding either vocabulary beyond the sizes below.** Not building a general 1000-word RSL dictionary — SLOVO has 1000 classes total; this spec cherry-picks the subset that maps onto today's existing word list.
- **Two-handed or motion-based recognition.** Same limitation the existing classifier already has: one static hand pose per sample, `numHands: 1`. The new Russian rules are single-frame approximations of what are mostly dynamic real-world signs — same caliber of simplification the existing (`kz`) ruleset already makes for words like "Здравствуйте"/"Спасибо".

## Vocabulary

Referred to internally as `language: "kz" | "ru"`. `"kz"` is today's existing 15-word vocabulary (unchanged, unlabeled until now). `"ru"` is new.

SLOVO's `constants.py` (1000-class list, fetched directly from the repo) has exact matches for 9 of today's 11 non-numeric words and all 4 numbers, but **not** for "Нет", "Спасибо", "Пожалуйста", and only a different word form for 3 others. Per decision, the `"ru"` vocabulary conforms to SLOVO's real class names rather than forcing 1:1 parity with `"kz"`:

| Russian word | SLOVO class id | Note |
|---|---|---|
| Да | 900 | |
| Хорошо | 540 | |
| Плохо | 766 | |
| Вода | 662 | |
| Еда | 549 | |
| Привет! | 476 | replaces "Здравствуйте" |
| Остановить | 795 | replaces "Стоп" |
| Помочь | 933 | replaces "Помощь" |
| Один | 555 | |
| Два | 621 | |
| Три | 707 | |
| Четыре | 737 | |

12 words total. "Нет", "Спасибо", "Пожалуйста" have no SLOVO class and are simply absent from `"ru"` mode.

## Classifier rules (`"ru"` ruleset)

Same primitive as today: 5 booleans (thumb/index/middle/ring/pinky extended, via fingertip-vs-joint y-comparison). New non-overlapping rule table, kept in `_classify_ru()` (backend) and its TS mirror, parallel to the existing `_classify_kz()`:

| Word | thumb | index | middle | ring | pinky |
|---|:-:|:-:|:-:|:-:|:-:|
| Да | | | | | |
| Один | | ✓ | | | |
| Два | | ✓ | ✓ | | |
| Три | ✓ | ✓ | ✓ | | |
| Четыре | | ✓ | ✓ | ✓ | ✓ |
| Привет! | ✓ | ✓ | ✓ | ✓ | ✓ |
| Хорошо | ✓ | | | | |
| Плохо | | | | ✓ | |
| Вода | | ✓ | ✓ | ✓ | |
| Еда | | | ✓ | | |
| Помочь | | | | | ✓ |
| Остановить | ✓ | | | | ✓ |

All 12 rows are distinct 5-bit combinations (no ambiguity within `"ru"` mode). Confidence base values and the `no_hand_detected`/`invalid_image`/`processing_error` error paths are unchanged — only the finger→word mapping differs per language.

The mock `recognize_emulate()` fallback (used when MediaPipe fails to load) also needs an `"ru"` branch of `GESTURE_COMPONENTS` with plausible per-word `hand_shape`/`position`/`movement` base values, mirroring the existing `"kz"` table's style.

## Architecture

### Backend
- `backend/app/models.py`: `GestureRecognizeRequest` gets `language: Literal["kz", "ru"] = "kz"`.
- `backend/app/signflow_model.py`: `_classify(fingers)` splits into `_classify_kz(fingers)` (today's logic, unchanged) and `_classify_ru(fingers)` (new table above). `recognize_gesture(frame_data, target_gesture=None, language="kz")` dispatches to the matching ruleset. `GESTURE_COMPONENTS` mock table gains an `"ru"` counterpart; `recognize_emulate(target_gesture=None, language="kz")` picks the right one.
- `backend/app/routes/gestures.py`: `/gestures/recognize` passes `data.language` through to `recognize_gesture`.

### Shared TypeScript
- `shared/signLanguageReader/classifyGesture.ts`: mirrors the backend split — internal `classifyKz`/`classifyRu`, exported `classifyGesture(landmarks, handednessScore, language: SignLanguage = "kz")`. Keep in sync with `signflow_model.py`, per the existing "TypeScript port" comment convention already in this file.
- New `shared/signLanguageReader/languages.ts`:
  ```ts
  export type SignLanguage = "kz" | "ru";
  export const SIGN_LANGUAGES: { code: SignLanguage; label: string }[] = [
    { code: "kz", label: "KZ" },
    { code: "ru", label: "RU (SLOVO)" },
  ];
  export const DEFAULT_SIGN_LANGUAGE: SignLanguage = "ru";
  ```
  Imported by both the mobile and web toggle components so the option list/labels/default live in one place.

### Mobile
- `useSignLanguageReader.ts`: adds `language` state, initialized from `AsyncStorage` (key `hearless.signLanguage`, already a dependency — `@react-native-async-storage/async-storage`), falling back to `DEFAULT_SIGN_LANGUAGE`. `setLanguage` persists to `AsyncStorage` and calls `recognizerRef.current.reset()` + `composerRef.current.clear()` + `setSentence("")` so an in-progress sentence doesn't mix vocabularies mid-switch.
- `useHandTracker.ts`: `start(language)` (or the hook takes `language` as a param) includes `language` in the `POST /gestures/recognize` body.
- `SignLanguageReaderScreen.tsx`: renders a new small pill-toggle component (two buttons, "KZ" / "RU (SLOVO)") near the top of the screen, wired to `language`/`setLanguage` from the hook.

### Web
- `landing/app/dashboard/sign-language-reader/page.tsx`: adds `language` state initialized from `localStorage.getItem("hearless.signLanguage")` (falling back to `DEFAULT_SIGN_LANGUAGE`), persisted via `localStorage.setItem` on change. Passed into `classifyGesture(landmarks, handednessScore, language)`. Same toggle component pattern rendered above the camera panel. Switching resets `recognizerRef`/`composerRef`/`sentence` the same way as mobile.

## Testing

- `shared/signLanguageReader/classifyGesture.verify.ts`: add cases covering all 12 `"ru"` rules (mirroring the existing per-word assertion style for `"kz"`).
- `backend/verify_signflow_gestures.py`: add equivalent `language="ru"` cases.
- Manual check (per this session's "no visible browser" convention): curl `/gestures/recognize` with `language: "ru"` and a synthetic landmark payload, or exercise via the existing verify scripts — no need to open a browser.

## Attribution

SLOVO is released under a CC BY-SA 4.0 variant (with repo-specific modifications in `license/`). Since this spec only reuses SLOVO's public class *names* (not its dataset or model weights), a one-line credit ("Russian vocabulary referenced from the SLOVO RSL dataset, github.com/hukenovs/slovo") in the reader's UI or README is good practice but not a hard license requirement for this usage — left as an implementation nicety, not a blocking requirement.
