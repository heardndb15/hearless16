# Hearless — Improvements Design
**Date:** 2026-06-24  
**Scope:** Bug fixes, subtitles UX, gesture recognition (MediaPipe), speaker diarization, gesture dictionary with GIF

---

## 1. Critical Bug Fixes

### 1.1 Audio gap every 3 seconds (mobile)
**File:** `mobile/src/hooks/useStreamingRecording.ts`  
**Problem:** `setInterval` at 3000ms — there is a silent gap during `stopAndUnloadAsync()` while the next recording hasn't started yet.  
**Fix:** Reduce interval to 1500ms. The `sendChunk` function already starts the new recording before processing the old one — halving the interval reduces the maximum gap to ~750ms.

### 1.2 O(N²) M4A chunk merging (backend)
**File:** `backend/app/main.py` — WebSocket handler, M4A path  
**Problem:** `merge_audio_chunks(session_chunks, ext)` is called with the full accumulated list on every new chunk, causing quadratic growth.  
**Fix:** Maintain a `running_merged_bytes: bytes` variable. On each new chunk, merge only the running bytes + new chunk instead of the full list. Fall back to single-chunk transcription if merging fails.

### 1.3 totalFrames dependency bug in GesturePracticeScreen
**File:** `mobile/src/screens/GesturePracticeScreen.tsx`  
**Problem:** `useEffect` depends on `[phase, gestureName, totalFrames]` — every frame update clears and restarts the interval, causing missed frames and jitter.  
**Fix:** Replace `const [totalFrames, setTotalFrames] = useState(0)` with `const frameCountRef = useRef(0)`. Increment the ref directly inside the interval callback. Display via a separate display-only state updated every N frames.

---

## 2. Subtitles UX Improvements

**Files:** `mobile/src/screens/SubtitlesScreen.tsx`, `mobile/src/hooks/useStreamingRecording.ts`

### 2.1 Interim text display
Show a dimmed "listening..." indicator with the last received partial text between chunks, so users see immediate feedback instead of waiting 1.5s.  
The hook already sets `streamText` on each `text` event — the screen just needs a visual indicator when `isRecording && !streamText`.

### 2.2 History tab
Add a two-tab layout to SubtitlesScreen: **"Live"** (current) and **"История"**.  
History tab fetches `GET /subtitles/{user_id}` and shows a scrollable list of saved sessions with date, duration estimate, and truncated text. Tap to expand.

### 2.3 Full-screen subtitle mode
Tap the subtitle card → enter full-screen mode (StatusBar hidden, black background, large white text centered). Tap again to exit. Designed for face-to-face conversations where the phone is held up for the other person to see.

### 2.4 Persist display settings
Save font size, text color, bg opacity, alignment to AsyncStorage with key `hearless:subtitle_settings`. Load on mount.

---

## 3. Gesture Recognition — MediaPipe Integration

**Files:** `backend/app/signflow_model.py`, `backend/requirements.txt`

### 3.1 Architecture
Replace the mock `recognize_emulate()` with MediaPipe Hands landmark detection:
1. Decode base64 image → numpy array (RGB)
2. Run `mediapipe.solutions.hands.Hands()` → extract 21 landmarks per hand
3. Compute finger extension states (5 booleans: thumb, index, middle, ring, pinky)
4. Apply rule-based classifier for the 20 gestures in the database
5. Compute confidence from landmark visibility scores + classifier certainty

### 3.2 Gesture Rules (initial set)
| Gesture | Rule |
|---------|------|
| Да | All fingers closed, thumb up |
| Нет | Index finger extended, waving (detected via position change across frames) |
| Здравствуйте | Open palm, all fingers extended, facing camera |
| Спасибо | Flat hand moving from chin forward |
| Помогите | Fist with thumb between fingers (ASL "A") |
| Вода | Three fingers (W shape) |
| Числа (1-5) | Count of extended fingers |

### 3.3 Fallback
If MediaPipe detects no hand landmarks (poor lighting, hand out of frame), return `{"gesture": null, "confidence": 0, "components": {"hand_shape": 0, "position": 0, "movement": 0}, "error": "no_hand_detected"}`.  
The mobile app shows "Рука не обнаружена" instead of silently showing 0%.

### 3.4 GesturePracticeScreen UX fixes
- Move frame counter to `useRef` (bug fix from §1.3)
- Show reference image placeholder during countdown (gesture name + icon)
- Best-of-N scoring: track `maxConfidence` across all frames in the session; use that for progress save
- Intermediate haptic feedback when confidence crosses 60% (light impact) and 80% (success)

---

## 4. Speaker Diarization (Subtitles)

**Files:** `backend/app/services/whisper_service.py`, `backend/app/main.py`, `mobile/src/screens/SubtitlesScreen.tsx`

### 4.1 Backend approach
Use `pyannote.audio` (speaker diarization library) OR simpler approach: use `faster-whisper`'s built-in word-level timestamps + energy-based speaker change detection.

**Chosen approach:** faster-whisper word timestamps + simple speaker segmentation by silence gaps (>500ms gap = potential speaker change). This avoids pyannote's heavy model download and speaker enrollment requirement.

**Protocol change:** WebSocket `text` message gains a `segments` field:
```json
{
  "type": "text",
  "full_text": "Привет как дела",
  "segments": [
    {"text": "Привет", "speaker": 0, "start": 0.0, "end": 0.5},
    {"text": "как дела", "speaker": 1, "start": 1.2, "end": 2.0}
  ]
}
```
Speaker index resets to 0 on each new WebSocket session. Max 4 speakers tracked per session.

### 4.2 Mobile display
Each speaker gets a distinct color from a fixed palette:
- Speaker 0: Cyan `#22d3ee`
- Speaker 1: Yellow `#fdeb47`  
- Speaker 2: Green `#4ade80`
- Speaker 3: Pink `#f472b6`

Subtitle card renders colored inline spans per segment instead of uniform text. Settings color picker switches to "per-speaker mode" toggle.

---

## 5. Gesture Dictionary with GIF

**Files:** `mobile/src/screens/GesturesScreen.tsx`, `backend/supabase/migration.sql` (add column)

### 5.1 Data model
Add `gif_url TEXT` column to `gestures` table. Populate with hosted GIF URLs (Supabase Storage or CDN).  
No backend code change needed — existing `GET /gestures/` returns all columns including `gif_url`.

### 5.2 Dictionary screen
In `GesturesScreen`, add a **"Словарь"** button in the header. Opens a modal/new screen with:
- Search bar (filter by name)
- Category filter chips (same as existing)
- Grid of gesture cards: name + thumbnail
- Tap → detail view: large GIF autoplay, name, category, difficulty badge, "Практиковать" button (navigates to GesturePracticeScreen)

Use `expo-image` (already available via Expo) for GIF rendering with `contentFit="contain"`.

### 5.3 GIF hosting
GIFs stored in Supabase Storage bucket `gesture-gifs` (public). URLs follow pattern:  
`https://<project>.supabase.co/storage/v1/object/public/gesture-gifs/<gesture_id>.gif`

Migration adds the column and populates placeholder URLs. Real GIFs uploaded separately via Supabase dashboard.

---

## 6. Spec Self-Review

- No TBDs or placeholders in architecture decisions
- All 20 gesture rules don't need to be defined upfront — the classifier falls back to confidence=0 for unknown gestures
- pyannote.audio was explicitly rejected in favor of lighter silence-gap diarization — consistent with free Render tier (512MB RAM)
- GIF autoplay on low-end devices: `expo-image` handles memory-efficient GIF loading; limit to 1 autoplay at a time
- Scope is implementable in a single plan/session: no cross-team dependencies

---

## Out of Scope (Future)
- Offline Whisper (on-device via expo-mlkit)
- Emergency contacts SMS for SOS
- Haptic patterns for sound alerts
- Real speaker enrollment / voice ID
