# Hearless Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 critical bugs, add subtitles history + full-screen mode + persistent settings, replace mock gesture recognition with real MediaPipe, add silence-gap speaker diarization, and build a gesture dictionary screen with GIF support.

**Architecture:** Backend (FastAPI/Python) gets an incremental audio-merge fix, a MediaPipe landmark classifier replacing the random mock, and a new `transcribe_with_diarization()` function that assigns speaker IDs via silence gaps. Mobile (Expo/React Native) gets interval halved to 1500ms, a `useRef`-based frame counter, a two-tab SubtitlesScreen (Live + История), full-screen subtitle overlay, AsyncStorage-persisted display settings, speaker-colored subtitle segments, and a new GestureDictionaryScreen powered by `expo-image` GIF rendering.

**Tech Stack:** FastAPI 0.110+, faster-whisper 1.0+, mediapipe 0.10+, React Native Expo SDK 51, @react-native-async-storage/async-storage 1.x, expo-image 1.x

## Global Constraints

- Python 3.11.9; no new deps unless explicitly listed in this plan
- Expo SDK 51, RN 0.74.3; all new packages installed via `npx expo install`
- All blocking Python calls wrapped in `asyncio.to_thread()`
- Supabase RLS enabled; every authenticated DB call passes `Authorization: Bearer <token>`
- Render free tier (512 MB RAM): MediaPipe must use `static_image_mode=True`, no video-mode Hands
- `mediapipe>=0.10.0` brings its own OpenCV bindings; do NOT add a separate `opencv-python` or `opencv-python-headless` to requirements.txt
- All new gesture names in the classifier must match names stored in the Supabase `gestures` table exactly (case-sensitive)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/requirements.txt` | Modify | Add mediapipe |
| `backend/app/main.py` | Modify | Fix O(N²) merge; add diarization to PCM ws path |
| `backend/app/services/whisper_service.py` | Modify | Add `transcribe_with_diarization()` |
| `backend/app/signflow_model.py` | Rewrite | MediaPipe landmark classifier |
| `mobile/src/hooks/useStreamingRecording.ts` | Modify | 1500ms interval; segments in StreamChunk |
| `mobile/src/screens/SubtitlesScreen.tsx` | Rewrite | History tab; full-screen mode; persist settings; speaker colors |
| `mobile/src/screens/GesturePracticeScreen.tsx` | Modify | useRef frame counter; best-of-N; no-hand-detected feedback |
| `mobile/src/screens/GesturesScreen.tsx` | Modify | Add "Словарь" button |
| `mobile/src/screens/GestureDictionaryScreen.tsx` | Create | Search + GIF dictionary |
| `mobile/App.tsx` | Modify | Register GestureDictionary stack screen |
| `shared/types.ts` | Modify | gif_url on Gesture; segments on StreamChunk; GestureDictionary nav param |
| `backend/supabase/migration_gif_url.sql` | Create | ADD COLUMN gif_url to gestures |

---

## Task 1: Fix O(N²) M4A chunk merging (backend)

**Files:**
- Modify: `backend/app/main.py` (lines 79–202, M4A `is_stream=False` branch)

**Interfaces:**
- Consumes: `merge_audio_chunks(chunks: list[bytes], format: str) -> bytes` (unchanged)
- Produces: `running_merged: bytes` — accumulated merged audio, grows by one pydub concat per chunk

- [ ] **Step 1: Replace `session_chunks` list with `running_merged` bytes**

In `backend/app/main.py`, replace the session variable declarations (lines 79–85):

```python
# BEFORE
session_bytes = b""
session_chunks = [] # Для M4A файлов с мобильного
last_transcribed_len = 0
is_stream = None
current_full_text = ""
pcm_buffer = bytearray()
finalized_text = ""
interim_text = ""
chunk_counter = 0
```

```python
# AFTER
session_bytes = b""
running_merged: bytes = b""          # replaces session_chunks list
last_transcribed_len = 0
is_stream = None
current_full_text = ""
pcm_buffer = bytearray()
finalized_text = ""
interim_text = ""
chunk_counter = 0
```

- [ ] **Step 2: Replace the M4A merge loop with incremental merge**

Find the `else` branch (lines 172–202, `# Если это независимые файлы`) and replace entirely:

```python
                    else:
                        # Independent M4A files from mobile — merge incrementally (O(N) total)
                        from app.services.whisper_service import merge_audio_chunks, detect_audio_format
                        ext = detect_audio_format(audio_bytes)
                        try:
                            if running_merged == b"":
                                running_merged = audio_bytes
                                merged_bytes = audio_bytes
                            else:
                                merged_bytes = await asyncio.to_thread(
                                    merge_audio_chunks, [running_merged, audio_bytes], ext
                                )
                                if merged_bytes:
                                    running_merged = merged_bytes
                                else:
                                    raise Exception("merge returned empty")

                            text = await asyncio.to_thread(transcribe_audio, merged_bytes, language=lang)
                            if text:
                                current_full_text = text.strip()
                        except Exception as e:
                            import sys
                            print(f"Incremental merge failed, transcribing single chunk: {e}", file=sys.stderr)
                            try:
                                chunk_text = await asyncio.to_thread(transcribe_audio, audio_bytes, language=lang)
                                if chunk_text and chunk_text.strip():
                                    current_full_text = (current_full_text + " " + chunk_text.strip()).strip()
                            except Exception as ex:
                                print(f"Single-chunk transcribe also failed: {ex}", file=sys.stderr)

                        await websocket.send_json({
                            "type": "text",
                            "text": current_full_text,
                            "full_text": current_full_text,
                        })
```

- [ ] **Step 3: Update the `stop` handler to use `running_merged`**

In the `elif action == "stop"` block, `else` branch (currently uses `current_full_text` directly), confirm it still just returns `current_full_text` — no reference to `session_chunks` needed. The existing code (lines 237–243) already does this correctly — no change needed.

- [ ] **Step 4: Manual smoke test**

```bash
# Start backend locally (in backend/)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Connect via wscat or mobile dev build
# Send 5 M4A chunks and verify transcription still accumulates correctly
# Check logs: should see no "merge failed" messages for valid audio
```

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/main.py
git commit -m "fix: O(N2) M4A merge replaced with incremental running_merged accumulation"
```

---

## Task 2: Fix audio gap — halve recording interval (mobile)

**Files:**
- Modify: `mobile/src/hooks/useStreamingRecording.ts` (line 168)

**Interfaces:**
- No interface change; existing `sendChunk()` already starts next recording before processing the old one

- [ ] **Step 1: Change interval from 3000ms to 1500ms**

In `useStreamingRecording.ts`, line 164–168:

```typescript
// BEFORE
      intervalRef.current = setInterval(() => {
        if (wsRef.current) {
          sendChunk(wsRef.current);
        }
      }, 3000);
```

```typescript
// AFTER
      intervalRef.current = setInterval(() => {
        if (wsRef.current) {
          sendChunk(wsRef.current);
        }
      }, 1500);
```

- [ ] **Step 2: Verify sendChunk immediately restarts recording**

Confirm lines 96–107 of `useStreamingRecording.ts` still do the stop → immediate-restart → background-send pattern. No change needed — this is already correct.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useStreamingRecording.ts
git commit -m "fix: reduce audio recording interval from 3000ms to 1500ms to halve gap between chunks"
```

---

## Task 3: Fix totalFrames stale closure in GesturePracticeScreen

**Files:**
- Modify: `mobile/src/screens/GesturePracticeScreen.tsx`

**Interfaces:**
- `handleSuccess(confidence: number, frames: number)` — unchanged signature, `frames` now comes from `frameCountRef.current`

- [ ] **Step 1: Replace `useState(0)` with `useRef(0)` for frame counter**

At the top of `GesturePracticeScreen()`, replace:

```typescript
// BEFORE
  const [totalFrames, setTotalFrames] = useState(0);
```

```typescript
// AFTER
  const frameCountRef = useRef(0);
  const [displayFrames, setDisplayFrames] = useState(0);
```

- [ ] **Step 2: Fix the practice `useEffect` — remove totalFrames dependency and stale closure**

Replace the entire second `useEffect` (lines 76–107):

```typescript
// BEFORE
  useEffect(() => {
    if (phase !== "practice") return;

    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.4,
        });
        if (!photo?.base64) return;

        const response = await axios.post(`${API_URL}/gestures/recognize`, {
          image: photo.base64,
          target_gesture: gestureName,
        });

        setResult(response.data);
        const currentFrames = totalFrames + 1;
        setTotalFrames(currentFrames);

        if (response.data.confidence >= 80) {
          handleSuccess(response.data.confidence, currentFrames);
        }
      } catch {}
    }, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, gestureName, totalFrames]);
```

```typescript
// AFTER
  useEffect(() => {
    if (phase !== "practice") return;

    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.4,
        });
        if (!photo?.base64) return;

        const response = await axios.post(`${API_URL}/gestures/recognize`, {
          image: photo.base64,
          target_gesture: gestureName,
        });

        frameCountRef.current += 1;
        // Update display counter every 5 frames to avoid re-render churn
        if (frameCountRef.current % 5 === 0) {
          setDisplayFrames(frameCountRef.current);
        }

        if (response.data.error === "no_hand_detected") {
          // Show feedback without stopping practice
          setResult({ ...response.data, confidence: 0 });
          return;
        }

        setResult(response.data);

        if (response.data.confidence >= 80) {
          handleSuccess(response.data.confidence, frameCountRef.current);
        }
      } catch {}
    }, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, gestureName]); // totalFrames removed from deps
```

- [ ] **Step 3: Reset refs in startCountdown**

In `startCountdown` callback (line ~50–67), add reset for both ref and display state:

```typescript
  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdownIdx(0);
    setResult(null);
    frameCountRef.current = 0;   // ADD
    setDisplayFrames(0);          // ADD

    const timer = setInterval(() => {
      setCountdownIdx((prev) => {
        const next = prev + 1;
        if (next >= COUNTDOWN_STEPS.length) {
          clearInterval(timer);
          setPhase("practice");
          return 0;
        }
        return next;
      });
    }, 800);
  }, []);
```

- [ ] **Step 4: Update JSX to use `displayFrames` instead of `totalFrames`**

In the `practiceOverlay` View (line ~219):

```typescript
// BEFORE
              <Text style={styles.framesText}>Кадров: {totalFrames}</Text>
```

```typescript
// AFTER
              <Text style={styles.framesText}>Кадров: {displayFrames}</Text>
```

- [ ] **Step 5: Track best-of-N confidence and use it for progress save**

Add state for best confidence:

```typescript
  const maxConfidenceRef = useRef(0);
```

Reset in `startCountdown`:
```typescript
    maxConfidenceRef.current = 0;
```

In `handleSuccess`, save best_accuracy correctly:

```typescript
  async function handleSuccess(confidence: number, frames: number) {
    const bestAccuracy = Math.max(confidence, maxConfidenceRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("result");
    setShowConfetti(true);
    // ... animation code unchanged ...

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await axios.post(`${API_URL}/gestures/progress`, {
          user_id: session.user.id,
          gesture_id: gestureId,
          learned: true,
          accuracy: confidence,
          attempts: frames,
          best_accuracy: bestAccuracy,   // now tracks actual best across all frames
        }, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch (err) {
      console.log("Error saving gesture progress:", err);
    }

    setTimeout(() => setShowConfetti(false), 2500);
  }
```

In the interval, before `handleSuccess`, update maxConfidenceRef:

```typescript
        setResult(response.data);
        maxConfidenceRef.current = Math.max(maxConfidenceRef.current, response.data.confidence ?? 0);

        if (response.data.confidence >= 80) {
          handleSuccess(response.data.confidence, frameCountRef.current);
        }
```

- [ ] **Step 6: Add "no_hand_detected" user feedback in the result section**

In the JSX, inside the `phase === "result"` block, add the no-hand case above the main result card:

```typescript
      {phase === "result" && result && (
        <View style={styles.resultSection}>
          {result.error === "no_hand_detected" ? (
            <View style={styles.resultCard}>
              <Text style={[styles.resultTitle, { color: Colors.textSecondary }]}>
                Рука не обнаружена
              </Text>
              <Text style={{ textAlign: "center", color: Colors.textSecondary, fontSize: 14 }}>
                Убедитесь, что рука видна в кадре и освещение достаточное
              </Text>
            </View>
          ) : (
            // ... existing result card JSX unchanged ...
          )}
          <View style={styles.actions}>
            {/* buttons unchanged */}
          </View>
        </View>
      )}
```

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/GesturePracticeScreen.tsx
git commit -m "fix: replace totalFrames useState with useRef to prevent interval re-creation; add best-of-N tracking and no_hand_detected feedback"
```

---

## Task 4: Subtitles — History tab + persist display settings

**Files:**
- Modify: `mobile/src/screens/SubtitlesScreen.tsx`
- No new package needed for history (uses existing supabase + axios)
- New package for AsyncStorage: install first

**Interfaces:**
- Consumes: `GET /subtitles/{user_id}` → `[{id, user_id, text, created_at}]`
- Produces: `activeTab: 'live' | 'history'` state added to component

- [ ] **Step 1: Install AsyncStorage**

```bash
cd mobile
npx expo install @react-native-async-storage/async-storage
```

Expected: package added to node_modules and package.json.

- [ ] **Step 2: Add imports to SubtitlesScreen.tsx**

At the top of `mobile/src/screens/SubtitlesScreen.tsx`, add:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import axios from "axios";
import { FlatList } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const SETTINGS_KEY = "hearless:subtitle_settings";
```

- [ ] **Step 3: Add state for tab and history**

Inside `SubtitlesScreen()`, after existing state declarations, add:

```typescript
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [history, setHistory] = useState<Array<{ id: string; text: string; created_at: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
```

- [ ] **Step 4: Load and persist settings with AsyncStorage**

Replace the four `useState` declarations for display settings and add load/save effect:

```typescript
  // Display settings — loaded from AsyncStorage
  const [fontSize, setFontSize] = useState(28);
  const [textColor, setTextColor] = useState("#22d3ee");
  const [bgOpacity, setBgOpacity] = useState(0.85);
  const [alignment, setAlignment] = useState<"center" | "left">("center");
  const settingsLoadedRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.fontSize) setFontSize(s.fontSize);
        if (s.textColor) setTextColor(s.textColor);
        if (typeof s.bgOpacity === "number") setBgOpacity(s.bgOpacity);
        if (s.alignment) setAlignment(s.alignment);
      } catch {}
      settingsLoadedRef.current = true;
    });
  }, []);

  // Save settings whenever they change (after initial load)
  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ fontSize, textColor, bgOpacity, alignment })
    ).catch(() => {});
  }, [fontSize, textColor, bgOpacity, alignment]);
```

- [ ] **Step 5: Load history when tab switches to "history"**

```typescript
  useEffect(() => {
    if (activeTab !== "history") return;
    setHistoryLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setHistoryLoading(false);
        return;
      }
      axios
        .get(`${API_URL}/subtitles/${session.user.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        .then((res) => {
          setHistory(res.data || []);
        })
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    });
  }, [activeTab]);
```

- [ ] **Step 6: Add tab switcher UI and history tab render**

In the JSX, after `<View style={styles.header}>` block and before the settings panel, add the tab row:

```typescript
      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(["live", "history"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "live" ? "В реальном времени" : "История"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
```

Then wrap the existing live content (settings panel + subtitle area + controls) in `{activeTab === "live" && ( ... )}` and add history content:

```typescript
      {activeTab === "history" && (
        <View style={{ flex: 1 }}>
          {historyLoading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 40 }} />
          ) : history.length === 0 ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>📋</Text>
              <Text style={styles.placeholderText}>История пуста. Запишите первый разговор!</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString("ru-RU", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </Text>
                  <Text style={styles.historyText} numberOfLines={4}>{item.text}</Text>
                </View>
              )}
            />
          )}
        </View>
      )}
```

- [ ] **Step 7: Add missing styles**

Append to the `StyleSheet.create({...})` in SubtitlesScreen.tsx:

```typescript
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: "rgba(33, 69, 89, 0.06)",
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.white,
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(33, 69, 89, 0.08)",
  },
  historyDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  historyText: {
    fontSize: 14,
    color: Colors.heading,
    lineHeight: 20,
  },
```

- [ ] **Step 8: Commit**

```bash
git add mobile/src/screens/SubtitlesScreen.tsx mobile/package.json
git commit -m "feat: subtitles history tab and AsyncStorage-persisted display settings"
```

---

## Task 5: Subtitles — Full-screen mode

**Files:**
- Modify: `mobile/src/screens/SubtitlesScreen.tsx`

**Interfaces:**
- New state: `fullScreen: boolean`; toggled by tapping the subtitle card
- Uses: `StatusBar` from `expo-status-bar` (already in package.json)

- [ ] **Step 1: Add fullScreen state and StatusBar import**

At the top of `SubtitlesScreen.tsx`, add to existing imports:

```typescript
import { StatusBar } from "expo-status-bar";
```

Inside the component:

```typescript
  const [fullScreen, setFullScreen] = useState(false);
```

- [ ] **Step 2: Wrap the subtitle card with TouchableOpacity toggle**

Find the `hasContent` branch subtitle card and wrap:

```typescript
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setFullScreen(true)}
            style={{ width: "100%" }}
          >
            <View style={[styles.subtitleCard, getBgStyle(bgOpacity)]}>
              {/* existing Text content unchanged */}
            </View>
          </TouchableOpacity>
```

- [ ] **Step 3: Add full-screen modal overlay**

Add this block just before the closing `</SafeAreaView>`:

```typescript
      {fullScreen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFullScreen(false)}
          style={styles.fullScreenOverlay}
        >
          <StatusBar hidden />
          <View style={styles.fullScreenContent}>
            <Text style={{ textAlign: "center", lineHeight: fontSize * 1.6 }}>
              {rollingLines.map((line, i) => {
                const isLast = i === rollingLines.length - 1;
                return (
                  <Text
                    key={`fs-${line}-${i}`}
                    style={{
                      fontSize: fontSize + 8,
                      color: isLast ? textColor : "rgba(255,255,255,0.3)",
                      fontWeight: isLast ? "bold" : "400",
                    }}
                  >
                    {line}{" "}
                  </Text>
                );
              })}
            </Text>
            <Text style={styles.fullScreenHint}>Нажмите, чтобы выйти</Text>
          </View>
        </TouchableOpacity>
      )}
```

- [ ] **Step 4: Add full-screen styles**

```typescript
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  fullScreenContent: {
    alignItems: "center",
  },
  fullScreenHint: {
    position: "absolute",
    bottom: -60,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    marginTop: 24,
  },
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/SubtitlesScreen.tsx
git commit -m "feat: full-screen subtitle overlay mode, tap card to enter, tap anywhere to exit"
```

---

## Task 6: MediaPipe gesture recognition (backend)

**Files:**
- Modify: `backend/requirements.txt`
- Rewrite: `backend/app/signflow_model.py`

**Interfaces:**
- `recognize_gesture(frame_data: bytes, target_gesture: str | None) -> dict` — same signature as before
- Returns: `{"gesture": str|None, "confidence": float, "components": {"hand_shape": float, "position": float, "movement": float}, "error"?: str}`
- `error` field is `"no_hand_detected"` when MediaPipe finds no hand, `"invalid_image"` when cv2 can't decode

- [ ] **Step 1: Add mediapipe to requirements.txt**

```txt
# BEFORE (last lines of requirements.txt)
faster-whisper>=1.0.0
```

```txt
# AFTER
faster-whisper>=1.0.0
mediapipe>=0.10.0
```

- [ ] **Step 2: Rewrite signflow_model.py**

Replace `backend/app/signflow_model.py` entirely:

```python
import numpy as np
import random

_mp_hands_module = None


def _get_mp_hands():
    global _mp_hands_module
    if _mp_hands_module is None:
        try:
            import mediapipe as mp
            _mp_hands_module = mp.solutions.hands
        except ImportError:
            _mp_hands_module = False
    return _mp_hands_module if _mp_hands_module is not False else None


def _decode_image(frame_data: bytes):
    try:
        import cv2
        nparr = np.frombuffer(frame_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception:
        return None


def _finger_states(lm) -> dict:
    """True = finger extended. Uses y-axis: smaller y = higher on screen = extended."""
    return {
        "thumb":  lm[4].y < lm[2].y,
        "index":  lm[8].y < lm[6].y,
        "middle": lm[12].y < lm[10].y,
        "ring":   lm[16].y < lm[14].y,
        "pinky":  lm[20].y < lm[18].y,
    }


def _classify(fingers: dict) -> tuple[str, float]:
    """Rule-based classifier. Returns (gesture_name, confidence_0_to_1)."""
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
    if non_thumb == 1 and i:
        return "Один", 0.90
    if non_thumb == 2 and i and m:
        return "Два", 0.88
    if non_thumb == 3 and i and m and r:
        return "Три", 0.85
    if non_thumb == 4:
        return "Четыре", 0.83
    return "Неизвестно", 0.20


def recognize_gesture(frame_data: bytes, target_gesture: str | None = None) -> dict:
    mp_hands = _get_mp_hands()

    # Fallback to emulation if mediapipe not installed
    if mp_hands is None:
        return recognize_emulate(target_gesture)

    img = _decode_image(frame_data)
    if img is None:
        return {
            "gesture": None,
            "confidence": 0,
            "components": {"hand_shape": 0, "position": 0, "movement": 0},
            "error": "invalid_image",
        }

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as hands:
        result = hands.process(img)

    if not result.multi_hand_landmarks:
        return {
            "gesture": None,
            "confidence": 0,
            "components": {"hand_shape": 0, "position": 0, "movement": 0},
            "error": "no_hand_detected",
        }

    lm = result.multi_hand_landmarks[0].landmark
    fingers = _finger_states(lm)
    gesture_name, base_conf = _classify(fingers)

    avg_visibility = float(np.mean([l.visibility for l in lm]))
    confidence = round(min(100.0, base_conf * avg_visibility * 100), 1)

    if target_gesture:
        if gesture_name == target_gesture:
            confidence = min(100.0, confidence * 1.1)
        else:
            confidence = round(confidence * 0.3, 1)

    return {
        "gesture": gesture_name,
        "confidence": confidence,
        "components": {
            "hand_shape": round(min(100.0, base_conf * 100), 1),
            "position":   round(min(100.0, avg_visibility * 100), 1),
            "movement":   round(confidence * 0.9, 1),
        },
    }


# ── Mock fallback (used when mediapipe is unavailable) ──────────────────────

GESTURE_COMPONENTS = {
    "Здравствуйте": {"hand_shape": 92, "position": 88, "movement": 85},
    "Спасибо":      {"hand_shape": 85, "position": 80, "movement": 78},
    "Да":           {"hand_shape": 95, "position": 90, "movement": 88},
    "Нет":          {"hand_shape": 82, "position": 85, "movement": 80},
    "Помогите":     {"hand_shape": 78, "position": 75, "movement": 72},
    "Вода":         {"hand_shape": 88, "position": 82, "movement": 80},
    "Еда":          {"hand_shape": 80, "position": 78, "movement": 75},
}


def recognize_emulate(target_gesture: str | None = None) -> dict:
    if target_gesture:
        base = GESTURE_COMPONENTS.get(target_gesture, {"hand_shape": 85, "position": 80, "movement": 80})
    else:
        chosen = random.choice(list(GESTURE_COMPONENTS.keys()))
        base = GESTURE_COMPONENTS[chosen]
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
    }
```

- [ ] **Step 3: Install mediapipe and verify**

```bash
cd backend
pip install -r requirements.txt
python -c "import mediapipe as mp; print('mediapipe OK', mp.__version__)"
python -c "import cv2; print('cv2 OK', cv2.__version__)"
```

Expected output: `mediapipe OK 0.10.x` and `cv2 OK 4.x.x`

- [ ] **Step 4: Quick smoke test**

```python
# Run in backend/ directory
python - <<'EOF'
from app.signflow_model import recognize_gesture
import base64, pathlib

# Use any JPEG from your machine, or create a tiny 1x1 red pixel
import io
from PIL import Image
img = Image.new("RGB", (100, 100), color=(200, 100, 50))
buf = io.BytesIO()
img.save(buf, format="JPEG")
result = recognize_gesture(buf.getvalue(), "Да")
print(result)
# Expected: error="no_hand_detected" or a low-confidence result
EOF
```

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/signflow_model.py
git commit -m "feat: replace mock gesture recognition with MediaPipe Hands landmark classifier"
```

---

## Task 7: Speaker diarization (backend + mobile)

**Files:**
- Modify: `backend/app/services/whisper_service.py` — add `transcribe_with_diarization()`
- Modify: `backend/app/main.py` — use diarization in PCM WebSocket path
- Modify: `mobile/src/hooks/useStreamingRecording.ts` — expose `segments` in `StreamChunk`
- Modify: `mobile/src/screens/SubtitlesScreen.tsx` — render speaker colors

**Interfaces:**
- `transcribe_with_diarization(audio_bytes: bytes, language: str, session_speaker_state: dict) -> dict`
  - Returns: `{"text": str, "segments": [{"text": str, "speaker": int, "start": float, "end": float}]}`
  - `session_speaker_state` is a mutable dict `{"current_speaker": int, "last_end": float}` shared across WebSocket messages
- `StreamChunk.segments?: Array<{text: string; speaker: number; start: number; end: number}>`

- [ ] **Step 1: Add `transcribe_with_diarization` to whisper_service.py**

Append to `backend/app/services/whisper_service.py`:

```python

SILENCE_GAP_THRESHOLD = 0.5  # seconds gap = potential speaker change


def transcribe_with_diarization(
    audio_bytes: bytes,
    language: str = "ru",
    session_state: dict | None = None,
) -> dict:
    """
    Transcribes audio and assigns speaker IDs using silence-gap heuristic.

    session_state is a mutable dict {"current_speaker": int, "last_end": float}
    shared across multiple calls in a WebSocket session to maintain continuity.
    Pass None to start fresh.
    """
    if session_state is None:
        session_state = {"current_speaker": 0, "last_end": 0.0}

    model = get_local_whisper()
    if model is None:
        text = transcribe_openai(audio_bytes, language)
        speaker = session_state["current_speaker"]
        return {
            "text": text,
            "segments": [{"text": text, "speaker": speaker, "start": 0.0, "end": 0.0}],
        }

    audio = audio_bytes_to_float(audio_bytes)
    if len(audio) == 0:
        return {"text": "", "segments": []}

    raw_segs, _ = model.transcribe(audio, beam_size=1, language=language)
    seg_list = list(raw_segs)

    if not seg_list:
        return {"text": "", "segments": []}

    result_segments = []
    for seg in seg_list:
        gap = seg.start - session_state["last_end"]
        if gap > SILENCE_GAP_THRESHOLD and session_state["last_end"] > 0:
            session_state["current_speaker"] = (session_state["current_speaker"] + 1) % 4
        session_state["last_end"] = seg.end

        result_segments.append({
            "text": seg.text.strip(),
            "speaker": session_state["current_speaker"],
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
        })

    full_text = " ".join(s["text"] for s in result_segments)
    return {"text": full_text, "segments": result_segments}
```

- [ ] **Step 2: Initialize `diarize_state` in the WebSocket handler**

In `backend/app/main.py`, add to the session variable block (after `chunk_counter = 0`):

```python
    diarize_state: dict = {"current_speaker": 0, "last_end": 0.0}
```

- [ ] **Step 3: Use `transcribe_with_diarization` in the PCM path**

In the PCM `chunk_counter % 2 == 0` branch, replace the two `transcribe_pcm` calls:

```python
                    # Replace:
                    # interim_text = await asyncio.to_thread(transcribe_pcm, bytes(pcm_buffer), lang)
                    # With:
                        from app.services.whisper_service import transcribe_with_diarization, pcm_to_wav_bytes
                        wav_bytes = pcm_to_wav_bytes(bytes(pcm_buffer))

                        if len(pcm_buffer) >= 256000:
                            diarize_result = await asyncio.to_thread(
                                transcribe_with_diarization, wav_bytes, lang, diarize_state
                            )
                            pcm_buffer = pcm_buffer[-64000:]
                            from app.services.whisper_service import merge_transcripts
                            finalized_text = merge_transcripts(finalized_text, diarize_result["text"])
                            interim_text = ""
                            interim_segments = []
                        else:
                            diarize_result = await asyncio.to_thread(
                                transcribe_with_diarization, wav_bytes, lang, diarize_state
                            )
                            interim_text = diarize_result["text"]
                            interim_segments = diarize_result["segments"]

                        current_full_text = finalized_text
                        if interim_text:
                            current_full_text = (current_full_text + " " + interim_text).strip()

                        await websocket.send_json({
                            "type": "text",
                            "text": current_full_text,
                            "full_text": current_full_text,
                            "segments": interim_segments if interim_text else [],
                        })
```

Add `interim_segments: list = []` to the session variable declarations alongside the others.

- [ ] **Step 4: Update `StreamChunk` interface in useStreamingRecording.ts**

```typescript
// BEFORE
export interface StreamChunk {
  text: string;
  full_text: string;
  is_final: boolean;
}
```

```typescript
// AFTER
export interface SpeakerSegment {
  text: string;
  speaker: number;
  start: number;
  end: number;
}

export interface StreamChunk {
  text: string;
  full_text: string;
  is_final: boolean;
  segments?: SpeakerSegment[];
}
```

Also expose `segments` in `setChunks` and propagate it from the parsed ws message:

```typescript
        } else if (data.type === "text" || data.type === "final") {
          setError(null);
          const chunk: StreamChunk = {
            text: data.text || "",
            full_text: data.full_text || "",
            is_final: data.type === "final",
            segments: data.segments ?? [],   // ADD
          };
```

Add `streamSegments` to the hook's return value:

```typescript
  const [streamSegments, setStreamSegments] = useState<SpeakerSegment[]>([]);

  // Inside the ws onmessage, after setStreamText:
          setStreamSegments(chunk.segments ?? []);
```

Return it:

```typescript
  return {
    isRecording,
    streamText,
    streamSegments,    // ADD
    chunks,
    error,
    startStreaming,
    stopStreaming,
  };
```

- [ ] **Step 5: Render speaker colors in SubtitlesScreen**

Add the SPEAKER_COLORS constant at the top of SubtitlesScreen.tsx (module level):

```typescript
const SPEAKER_COLORS = ["#22d3ee", "#fdeb47", "#4ade80", "#f472b6"] as const;
```

Update the hook destructuring:

```typescript
  const {
    isRecording,
    streamText,
    streamSegments,   // ADD
    chunks,
    error,
    startStreaming,
    stopStreaming,
  } = useStreamingRecording();
```

Add a `speakerMode` toggle state:

```typescript
  const [speakerMode, setSpeakerMode] = useState(false);
```

In the settings panel, add a toggle row after the alignment row:

```typescript
          {/* Speaker colors toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Разные говорящие</Text>
            <View style={styles.settingOptions}>
              {[
                { key: "off", label: "Выкл" },
                { key: "on",  label: "Вкл"  },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.optionBtn, (speakerMode ? "on" : "off") === opt.key && styles.optionBtnActive]}
                  onPress={() => setSpeakerMode(opt.key === "on")}
                >
                  <Text style={[styles.optionText, (speakerMode ? "on" : "off") === opt.key && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
```

In the `hasContent` subtitle card, replace the rolling-lines `<Text>` block:

```typescript
            <Text style={{ textAlign: alignment, lineHeight: fontSize * 1.5 }}>
              {speakerMode && streamSegments.length > 0
                ? streamSegments.map((seg, i) => (
                    <Text
                      key={`seg-${i}`}
                      style={{
                        fontSize,
                        color: SPEAKER_COLORS[seg.speaker % 4],
                        fontWeight: "bold",
                      }}
                    >
                      {seg.text}{" "}
                    </Text>
                  ))
                : rollingLines.map((line, i) => {
                    const isLast = i === rollingLines.length - 1;
                    const fadedColor = bgOpacity === 0
                      ? "rgba(33, 69, 89, 0.25)"
                      : "rgba(255, 255, 255, 0.25)";
                    return (
                      <Text
                        key={`${line}-${i}`}
                        style={{
                          fontSize,
                          color: isLast ? textColor : fadedColor,
                          fontWeight: isLast ? "bold" : "500",
                        }}
                      >
                        {line}{" "}
                      </Text>
                    );
                  })}
            </Text>
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/whisper_service.py backend/app/main.py
git add mobile/src/hooks/useStreamingRecording.ts mobile/src/screens/SubtitlesScreen.tsx
git commit -m "feat: silence-gap speaker diarization; speaker-colored subtitle segments in mobile"
```

---

## Task 8: Gesture dictionary with GIF

**Files:**
- Create: `backend/supabase/migration_gif_url.sql`
- Modify: `shared/types.ts`
- Create: `mobile/src/screens/GestureDictionaryScreen.tsx`
- Modify: `mobile/src/screens/GesturesScreen.tsx`
- Modify: `mobile/App.tsx`

**Interfaces:**
- `GET /gestures/` returns items that now include `gif_url: string | null`
- `RootStackParamList` gains `GestureDictionary: undefined`
- `Gesture.gif_url?: string` added to shared types

- [ ] **Step 1: Install expo-image**

```bash
cd mobile
npx expo install expo-image
```

- [ ] **Step 2: Create Supabase migration for gif_url**

Create `backend/supabase/migration_gif_url.sql`:

```sql
-- Add gif_url column to gestures table
ALTER TABLE gestures ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Placeholder GIF URLs — replace with real Supabase Storage URLs after upload
-- Pattern: https://<project>.supabase.co/storage/v1/object/public/gesture-gifs/<id>.gif
UPDATE gestures SET gif_url = NULL WHERE gif_url IS NULL;

COMMENT ON COLUMN gestures.gif_url IS 'URL of animated GIF demonstrating the gesture. Hosted in Supabase Storage bucket gesture-gifs.';
```

> **Note:** Run this SQL in the Supabase dashboard SQL editor for the project. After running, upload GIF files to Storage → New bucket → `gesture-gifs` (Public). Name each file `<gesture_id>.gif`. Then update the rows:
> ```sql
> UPDATE gestures SET gif_url = 'https://<project>.supabase.co/storage/v1/object/public/gesture-gifs/' || id || '.gif';
> ```

- [ ] **Step 3: Update shared types**

In `shared/types.ts`:

```typescript
// BEFORE
export interface Gesture {
  id: string;
  name: string;
  category: string;
  image_url: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

```typescript
// AFTER
export interface Gesture {
  id: string;
  name: string;
  category: string;
  image_url: string;
  gif_url?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

Add `GestureDictionary` to `RootStackParamList`:

```typescript
export type RootStackParamList = {
  Tabs: undefined;
  GesturePractice: { gestureId: string; gestureName: string };
  GestureDictionary: undefined;  // ADD
};
```

- [ ] **Step 4: Create GestureDictionaryScreen.tsx**

Create `mobile/src/screens/GestureDictionaryScreen.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { Colors, Spacing, FontSize } from "../constants/theme";
import type { Gesture, RootStackParamList } from "../../../shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

const CATEGORIES = ["Все", "Базовые", "Семья", "Еда", "Эмоции", "Числа"];

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Лёгкий",
  medium: "Средний",
  hard: "Сложный",
};
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#4ade80",
  medium: "#fdeb47",
  hard: "#f87171",
};

export default function GestureDictionaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selected, setSelected] = useState<Gesture | null>(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/gestures`)
      .then((res) => setGestures(res.data || []))
      .catch(() => setGestures([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = gestures.filter((g) => {
    const matchCat = category === "Все" || g.category === category;
    const matchQ = query.trim() === "" || g.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const handlePractice = useCallback((g: Gesture) => {
    setSelected(null);
    navigation.navigate("GesturePractice", { gestureId: g.id, gestureName: g.name });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Словарь жестов</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Поиск жеста..."
        placeholderTextColor={Colors.textSecondary}
        value={query}
        onChangeText={setQuery}
      />

      {/* Category chips */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[styles.chip, cat === category && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, cat === category && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(g) => g.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item: g }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(g)}>
              {g.gif_url ? (
                <Image
                  source={{ uri: g.gif_url }}
                  style={styles.cardGif}
                  contentFit="contain"
                  autoplay
                />
              ) : (
                <View style={[styles.cardGif, styles.cardGifPlaceholder]}>
                  <Text style={styles.cardGifPlaceholderText}>🤟</Text>
                </View>
              )}
              <Text style={styles.cardName}>{g.name}</Text>
              <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLOR[g.difficulty] + "33" }]}>
                <Text style={[styles.diffText, { color: DIFFICULTY_COLOR[g.difficulty] }]}>
                  {DIFFICULTY_LABEL[g.difficulty] ?? g.difficulty}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selected && (
              <>
                {selected.gif_url ? (
                  <Image
                    source={{ uri: selected.gif_url }}
                    style={styles.modalGif}
                    contentFit="contain"
                    autoplay
                  />
                ) : (
                  <View style={[styles.modalGif, styles.cardGifPlaceholder]}>
                    <Text style={{ fontSize: 64 }}>🤟</Text>
                  </View>
                )}
                <Text style={styles.modalName}>{selected.name}</Text>
                <Text style={styles.modalCategory}>{selected.category}</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.practiceBtn} onPress={() => handlePractice(selected)}>
                    <Text style={styles.practiceBtnText}>Практиковать</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtnText}>Закрыть</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: FontSize.body, color: Colors.accent, fontWeight: "600" },
  title: { fontSize: FontSize.title, fontWeight: "bold", color: Colors.heading },
  search: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.body,
    color: Colors.heading,
    borderWidth: 1,
    borderColor: "rgba(33,69,89,0.1)",
  },
  chipsRow: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "rgba(33,69,89,0.12)",
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 12, color: Colors.textPrimary, fontWeight: "600" },
  chipTextActive: { color: Colors.white },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 32, gap: 12 },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
    margin: 4,
    borderWidth: 1,
    borderColor: "rgba(33,69,89,0.07)",
  },
  cardGif: { width: 100, height: 100, borderRadius: 10, marginBottom: 8 },
  cardGifPlaceholder: {
    backgroundColor: "rgba(33,69,89,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardGifPlaceholderText: { fontSize: 40 },
  cardName: { fontSize: FontSize.subtitle, fontWeight: "700", color: Colors.heading, textAlign: "center" },
  diffBadge: { marginTop: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  diffText: { fontSize: 11, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: "center",
    paddingBottom: 48,
  },
  modalGif: { width: 200, height: 200, borderRadius: 16, marginBottom: 16 },
  modalName: { fontSize: 28, fontWeight: "bold", color: Colors.heading, marginBottom: 4 },
  modalCategory: { fontSize: FontSize.body, color: Colors.textSecondary, marginBottom: 24 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  practiceBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  practiceBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.subtitle },
  closeBtn: {
    flex: 1,
    backgroundColor: "rgba(33,69,89,0.07)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: { color: Colors.heading, fontWeight: "600", fontSize: FontSize.subtitle },
});
```

- [ ] **Step 5: Add "Словарь" button to GesturesScreen header**

In `GesturesScreen.tsx`, update the header View (lines ~169–172):

```typescript
        <View style={[styles.header, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={styles.title}>Жестовый язык</Text>
            <Text style={styles.subtitle}>Казахский жестовый язык (КЖЯ)</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("GestureDictionary")}
            style={gestDictStyles.dictBtn}
          >
            <Text style={gestDictStyles.dictBtnText}>📖 Словарь</Text>
          </TouchableOpacity>
        </View>
```

Add a small local style object at the bottom of GesturesScreen.tsx (before the main `styles` const or after it):

```typescript
const gestDictStyles = StyleSheet.create({
  dictBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dictBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 12,
  },
});
```

- [ ] **Step 6: Register GestureDictionary in App.tsx**

```typescript
// BEFORE imports
import GesturePracticeScreen from "./src/screens/GesturePracticeScreen";
```

```typescript
// AFTER
import GesturePracticeScreen from "./src/screens/GesturePracticeScreen";
import GestureDictionaryScreen from "./src/screens/GestureDictionaryScreen";
```

Inside `Stack.Navigator`, add after the `GesturePractice` screen:

```typescript
          <Stack.Screen
            name="GestureDictionary"
            component={GestureDictionaryScreen}
            options={{
              animation: "slide_from_right",
              headerShown: false,
            }}
          />
```

- [ ] **Step 7: Commit**

```bash
git add shared/types.ts
git add mobile/src/screens/GestureDictionaryScreen.tsx
git add mobile/src/screens/GesturesScreen.tsx
git add mobile/App.tsx
git add mobile/package.json
git add backend/supabase/migration_gif_url.sql
git commit -m "feat: gesture dictionary screen with GIF support; gif_url column in Supabase gestures table"
```

---

## Self-Review

**Spec coverage:**
| Spec Section | Task |
|---|---|
| Bug: audio gap 3s | Task 2 ✅ |
| Bug: O(N²) merge | Task 1 ✅ |
| Bug: totalFrames dep | Task 3 ✅ |
| Subtitles history tab | Task 4 ✅ |
| Subtitles full-screen | Task 5 ✅ |
| Persist settings | Task 4 ✅ |
| MediaPipe gesture recognition | Task 6 ✅ |
| GesturePractice UX fixes | Task 3 ✅ |
| Speaker diarization backend | Task 7 ✅ |
| Speaker colors mobile | Task 7 ✅ |
| Gesture dictionary GIF | Task 8 ✅ |
| gif_url Supabase migration | Task 8 ✅ |

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:**
- `SpeakerSegment` defined in Task 7 Step 4, used in Task 7 Step 5 — consistent
- `streamSegments` added to hook in Step 4, consumed in SubtitlesScreen Step 5 — consistent
- `GestureDictionary: undefined` added to `RootStackParamList` in Task 8 Step 3, used in `navigation.navigate("GestureDictionary")` Step 5 — consistent
- `recognize_gesture` return type unchanged — routes/gestures.py needs no modification
- `transcribe_with_diarization` `session_state` is passed by reference (mutable dict) — correct Python semantics
