# Background Subtitles: Chunk Overlap + Stale-Text Fade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two rough edges in the already-shipped background (tab/screen audio) subtitles feature on both `/dashboard` and `/subtitles`: words getting cut at the 3-second chunk boundary, and stale captions hanging on screen forever during silence with no indication they're stale.

**Architecture:** Replace the current stop/restart-per-chunk `MediaRecorder` with a single continuous recorder using a small timeslice, buffering chunks and sending an overlapping "window" (header chunk + last ~4s of buffered chunks) every 3s instead of one isolated 3s chunk. Separately, track the timestamp of the last non-empty transcription and dim the PiP canvas text once too much time has passed without new speech.

**Tech Stack:** Next.js 14 (App Router), plain React state/refs, browser `MediaRecorder`/`getDisplayMedia`/`Canvas` APIs — no new dependencies.

## Global Constraints

- No automated test suite exists in `landing/` (confirmed: neither page has a test file, and the project's own spec calls for manual browser verification). Do not introduce a test framework for this change — every task's verification step is manual, via `npm run dev` + a real browser tab share.
- `landing/app/dashboard/page.tsx` and `landing/app/subtitles/page.tsx` are two independent implementations of the same feature (no shared module) — changes are duplicated across both files with page-appropriate variable names, matching how the original feature was built.
- Keep the existing 3-second update cadence (`WINDOW_INTERVAL_MS = 3000`) — this is a UX expectation already in place, not something this round changes.
- Constants: `WINDOW_TIMESLICE_MS = 500`, `WINDOW_INTERVAL_MS = 3000`, `WINDOW_OVERLAP_MS = 1000`, `WINDOW_CHUNK_COUNT = (WINDOW_INTERVAL_MS + WINDOW_OVERLAP_MS) / WINDOW_TIMESLICE_MS` (= 8), `STALE_AFTER_MS = 8000`, `STALE_ALPHA = 0.4`.

---

## Task 1: Dashboard — continuous-recorder chunk overlap

**Files:**
- Modify: `landing/app/dashboard/page.tsx:45-51` (state/refs block), `landing/app/dashboard/page.tsx:439-516` (`startBackgroundCapture`/`stopBackgroundCapture`)
- Also add module-level constants near the top of the file (after the imports/interface block, before `export default function SubtitlesDashboard()`)

**Interfaces:**
- Produces: module consts `WINDOW_TIMESLICE_MS`, `WINDOW_INTERVAL_MS`, `WINDOW_OVERLAP_MS`, `WINDOW_CHUNK_COUNT`; new ref `screenHeaderChunkRef: React.MutableRefObject<Blob | null>`; rewritten `startBackgroundCapture()` / `stopBackgroundCapture()` (same names/signatures, called the same way from the existing button `onClick` handlers — no JSX changes needed).
- Consumes: existing `screenStreamRef`, `screenRecorderRef`, `screenChunksRef`, `screenIntervalRef`, `userLanguage`, `setTranscriptionText`, `setIsBackgroundCapturing`.

- [ ] **Step 1: Add module-level window constants**

In `landing/app/dashboard/page.tsx`, right after the `interface SubtitleHistoryItem { ... }` block (before `export default function SubtitlesDashboard()`), add:

```ts
const WINDOW_TIMESLICE_MS = 500;
const WINDOW_INTERVAL_MS = 3000;
const WINDOW_OVERLAP_MS = 1000;
const WINDOW_CHUNK_COUNT = (WINDOW_INTERVAL_MS + WINDOW_OVERLAP_MS) / WINDOW_TIMESLICE_MS;
```

- [ ] **Step 2: Add the header-chunk ref**

Find this block (`landing/app/dashboard/page.tsx:45-51`):

```ts
  const [isBackgroundCapturing, setIsBackgroundCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenIntervalRef = useRef<any>(null);
```

Replace with:

```ts
  const [isBackgroundCapturing, setIsBackgroundCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenHeaderChunkRef = useRef<Blob | null>(null);
  const screenIntervalRef = useRef<any>(null);
```

- [ ] **Step 3: Rewrite `startBackgroundCapture` and `stopBackgroundCapture`**

Find the full block from `async function startBackgroundCapture() {` through the closing `}` of `stopBackgroundCapture` (`landing/app/dashboard/page.tsx:439-516`) and replace it with:

```ts
  async function startBackgroundCapture() {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        alert("Аудио не найдено. Выберите вкладку и убедитесь, что включён звук.");
        return;
      }

      // The video track isn't needed — we only want its audio.
      stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());

      const audioStream = new MediaStream(audioTracks);
      screenStreamRef.current = audioStream;
      screenChunksRef.current = [];
      screenHeaderChunkRef.current = null;
      setIsBackgroundCapturing(true);

      // A single continuous recorder (never stopped mid-session) emits a
      // small blob every WINDOW_TIMESLICE_MS. The very first blob carries
      // the WebM header required to decode any blob built from these chunks
      // as a standalone file; later chunks are independent clusters that
      // decode fine appended after that header even with older ones dropped.
      const mr = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data.size === 0) return;
        if (!screenHeaderChunkRef.current) {
          screenHeaderChunkRef.current = e.data;
        } else {
          screenChunksRef.current.push(e.data);
          if (screenChunksRef.current.length > WINDOW_CHUNK_COUNT) {
            screenChunksRef.current = screenChunksRef.current.slice(-WINDOW_CHUNK_COUNT);
          }
        }
      };
      mr.start(WINDOW_TIMESLICE_MS);
      screenRecorderRef.current = mr;

      // Every WINDOW_INTERVAL_MS, send header + the last WINDOW_CHUNK_COUNT
      // chunks (~WINDOW_INTERVAL_MS + WINDOW_OVERLAP_MS of audio). Consecutive
      // sends overlap by WINDOW_OVERLAP_MS, so a word split by the old hard
      // 3s boundary now lands whole inside at least one request.
      const sendWindow = async () => {
        const header = screenHeaderChunkRef.current;
        if (!header || screenChunksRef.current.length === 0) return;
        const windowChunks = screenChunksRef.current.slice(-WINDOW_CHUNK_COUNT);
        const blob = new Blob([header, ...windowChunks], { type: "audio/webm" });
        try {
          const fd = new FormData();
          fd.append("file", blob, "audio.webm");
          fd.append("language", userLanguage);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) setTranscriptionText(data.text.trim());
          }
        } catch {}
      };

      screenIntervalRef.current = setInterval(sendWindow, WINDOW_INTERVAL_MS);

      audioTracks[0].addEventListener("ended", () => stopBackgroundCapture());
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert("Не удалось захватить аудио: " + err.message);
      }
    }
  }

  function stopBackgroundCapture() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    clearInterval(screenIntervalRef.current);
    if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
    screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    screenStreamRef.current = null;
    screenRecorderRef.current = null;
    screenChunksRef.current = [];
    screenHeaderChunkRef.current = null;
    setIsBackgroundCapturing(false);
  }
```

- [ ] **Step 4: Manual verification**

```bash
cd landing
npm run dev
```

Open `http://localhost:3000/dashboard`, log in, click "🎬 Фоновые субтитры", pick a browser tab that's playing continuous speech (e.g. a YouTube video) with "share tab audio" checked.

Expected:
- The browser's tab-share indicator (Chrome shows a small icon in the shared tab) stays continuously active — no blinking off/on every 3s like before.
- `transcriptionText` still updates roughly every 3s.
- Speak or play a phrase that straddles a 3s boundary (e.g. count "one-two-three-four-five" continuously for 10+ seconds) and confirm words aren't chopped off mid-word compared to before.
- Click "⏹ Остановить фоновые субтитры" — confirm the tab-share indicator disappears and the record (mic) button re-enables.

- [ ] **Step 5: Commit**

```bash
git add landing/app/dashboard/page.tsx
git commit -m "feat(dashboard): overlap background-subtitle audio chunks via continuous recorder"
```

---

## Task 2: Dashboard — stale-text fade in PiP

**Files:**
- Modify: `landing/app/dashboard/page.tsx` (module consts, state/refs near Task 1's additions, `startBackgroundCapture`'s `sendWindow` closure and top, `stopBackgroundCapture`, `drawPipSubtitles` at `landing/app/dashboard/page.tsx:550-571`, the re-render effect at `landing/app/dashboard/page.tsx:599-601`)

**Interfaces:**
- Consumes: everything Task 1 produced (`WINDOW_INTERVAL_MS`, rewritten `startBackgroundCapture`/`stopBackgroundCapture`/`sendWindow`).
- Produces: module consts `STALE_AFTER_MS`, `STALE_ALPHA`; new ref `lastNonEmptyTextAtRef: React.MutableRefObject<number>`; new state `isTextStale: boolean` / `setIsTextStale`; new ref `staleCheckIntervalRef`.

- [ ] **Step 1: Add stale-fade constants**

Next to the constants added in Task 1, add:

```ts
const STALE_AFTER_MS = 8000;
const STALE_ALPHA = 0.4;
```

- [ ] **Step 2: Add stale-tracking state/refs**

Right after the `screenHeaderChunkRef` line added in Task 1, add:

```ts
  const lastNonEmptyTextAtRef = useRef<number>(0);
  const [isTextStale, setIsTextStale] = useState(false);
  const staleCheckIntervalRef = useRef<any>(null);
```

- [ ] **Step 3: Reset staleness when capture starts**

In `startBackgroundCapture`, right after `setIsBackgroundCapturing(true);`, add:

```ts
      lastNonEmptyTextAtRef.current = Date.now();
      setIsTextStale(false);
```

- [ ] **Step 4: Update the timestamp whenever new text arrives**

Inside `sendWindow`'s success branch, change:

```ts
            if (data.text?.trim()) setTranscriptionText(data.text.trim());
```

to:

```ts
            if (data.text?.trim()) {
              setTranscriptionText(data.text.trim());
              lastNonEmptyTextAtRef.current = Date.now();
              setIsTextStale(false);
            }
```

- [ ] **Step 5: Start the staleness-check interval**

Right after `screenIntervalRef.current = setInterval(sendWindow, WINDOW_INTERVAL_MS);`, add:

```ts
      staleCheckIntervalRef.current = setInterval(() => {
        if (Date.now() - lastNonEmptyTextAtRef.current > STALE_AFTER_MS) setIsTextStale(true);
      }, 1000);
```

- [ ] **Step 6: Tear down the interval and reset staleness on stop**

In `stopBackgroundCapture`, right after `clearInterval(screenIntervalRef.current);`, add:

```ts
    clearInterval(staleCheckIntervalRef.current);
```

And right after `setIsBackgroundCapturing(false);` (last line), add:

```ts
    setIsTextStale(false);
```

- [ ] **Step 7: Dim the PiP canvas text when stale**

Find `drawPipSubtitles` (`landing/app/dashboard/page.tsx:550-571`):

```ts
  function drawPipSubtitles() {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bgFill = bgColor === "dark" ? "rgba(15, 23, 42, 0.8)" : bgColor === "semi" ? "rgba(0, 0, 0, 0.4)" : null;
    if (bgFill) {
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const fontPx = fontSize === "sm" ? 18 : fontSize === "lg" ? 30 : fontSize === "xl" ? 38 : 24;
    ctx.fillStyle = getColorCode(textColor);
    ctx.font = `bold ${fontPx}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = transcriptionText || "Ожидание звукового потока...";
    wrapText(ctx, text, canvas.width / 2, canvas.height / 2, canvas.width - 60, fontPx + 10);
  }
```

Replace with:

```ts
  function drawPipSubtitles() {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bgFill = bgColor === "dark" ? "rgba(15, 23, 42, 0.8)" : bgColor === "semi" ? "rgba(0, 0, 0, 0.4)" : null;
    if (bgFill) {
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const fontPx = fontSize === "sm" ? 18 : fontSize === "lg" ? 30 : fontSize === "xl" ? 38 : 24;
    ctx.fillStyle = getColorCode(textColor);
    ctx.globalAlpha = isTextStale ? STALE_ALPHA : 1;
    ctx.font = `bold ${fontPx}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = transcriptionText || "Ожидание звукового потока...";
    wrapText(ctx, text, canvas.width / 2, canvas.height / 2, canvas.width - 60, fontPx + 10);
    ctx.globalAlpha = 1;
  }
```

- [ ] **Step 8: Re-render the PiP canvas when staleness flips**

Find (`landing/app/dashboard/page.tsx:599-601`):

```ts
  useEffect(() => {
    if (isPipActive) drawPipSubtitles();
  }, [transcriptionText, textColor, bgColor, fontSize, isPipActive]);
```

Replace with:

```ts
  useEffect(() => {
    if (isPipActive) drawPipSubtitles();
  }, [transcriptionText, textColor, bgColor, fontSize, isPipActive, isTextStale]);
```

- [ ] **Step 9: Manual verification**

With the dev server still running, open `/dashboard`, start background capture, open PiP, let audio play for a bit so a caption appears, then pause the video/audio (or mute the shared tab) for 10+ seconds.

Expected:
- Around the 8s mark, the PiP caption visibly dims to roughly 40% opacity while keeping the same text.
- The instant new non-empty speech is transcribed, the caption snaps back to full opacity.
- Font size / text color / background changes made while stale still apply correctly (dimming stacks with the existing style, doesn't replace it).

- [ ] **Step 10: Commit**

```bash
git add landing/app/dashboard/page.tsx
git commit -m "feat(dashboard): fade stale PiP background-subtitle text after 8s of silence"
```

---

## Task 3: `/subtitles` — continuous-recorder chunk overlap

**Files:**
- Modify: `landing/app/subtitles/page.tsx:126-131` (state/refs block), `landing/app/subtitles/page.tsx:354-437` (`startScreenCapture`/`stopScreenCapture`)
- Also add the same module-level constants from Task 1 near the top of this file (after `const API_URL = ...`, before `function parseSRT`)

**Interfaces:**
- Produces: same module consts as Task 1 (`WINDOW_TIMESLICE_MS`, `WINDOW_INTERVAL_MS`, `WINDOW_OVERLAP_MS`, `WINDOW_CHUNK_COUNT`) — independent copies in this file; new ref `screenHeaderChunkRef`; rewritten `startScreenCapture()` / `stopScreenCapture()` (same names, still invoked the same way from existing JSX).
- Consumes: existing `screenStreamRef`, `screenRecorderRef`, `screenChunksRef`, `screenIntervalRef`, `toLangCode`, `langRef`, `setHistory`, `setActivePipText`, `togglePipSubtitles`, `setIsScreenCapturing`.

- [ ] **Step 1: Add module-level window constants**

In `landing/app/subtitles/page.tsx`, right after `const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://hearless16-1.onrender.com";`, add:

```ts
const WINDOW_TIMESLICE_MS = 500;
const WINDOW_INTERVAL_MS = 3000;
const WINDOW_OVERLAP_MS = 1000;
const WINDOW_CHUNK_COUNT = (WINDOW_INTERVAL_MS + WINDOW_OVERLAP_MS) / WINDOW_TIMESLICE_MS;
```

- [ ] **Step 2: Add the header-chunk ref**

Find (`landing/app/subtitles/page.tsx:126-131`):

```ts
  // Screen audio capture for background subtitles
  const [isScreenCapturing, setIsScreenCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenIntervalRef = useRef<any>(null);
```

Replace with:

```ts
  // Screen audio capture for background subtitles
  const [isScreenCapturing, setIsScreenCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenHeaderChunkRef = useRef<Blob | null>(null);
  const screenIntervalRef = useRef<any>(null);
```

- [ ] **Step 3: Rewrite `startScreenCapture` and `stopScreenCapture`**

Find the full block from `const startScreenCapture = async () => {` through the closing `};` of `stopScreenCapture` (`landing/app/subtitles/page.tsx:354-437`) and replace it with:

```ts
  const startScreenCapture = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        alert("Аудио не найдено. Выберите вкладку и убедитесь, что включён звук.");
        return;
      }

      // Останавливаем видео-трек — он нам не нужен
      stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());

      const audioStream = new MediaStream(audioTracks);
      screenStreamRef.current = audioStream;
      screenChunksRef.current = [];
      screenHeaderChunkRef.current = null;
      setIsScreenCapturing(true);

      // Открываем PiP автоматически
      if (!document.pictureInPictureElement) {
        setTimeout(() => togglePipSubtitles(), 300);
      }

      // A single continuous recorder (never stopped mid-session) emits a
      // small blob every WINDOW_TIMESLICE_MS. The very first blob carries
      // the WebM header required to decode any blob built from these chunks
      // as a standalone file; later chunks are independent clusters that
      // decode fine appended after that header even with older ones dropped.
      const mr = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data.size === 0) return;
        if (!screenHeaderChunkRef.current) {
          screenHeaderChunkRef.current = e.data;
        } else {
          screenChunksRef.current.push(e.data);
          if (screenChunksRef.current.length > WINDOW_CHUNK_COUNT) {
            screenChunksRef.current = screenChunksRef.current.slice(-WINDOW_CHUNK_COUNT);
          }
        }
      };
      mr.start(WINDOW_TIMESLICE_MS);
      screenRecorderRef.current = mr;

      // Every WINDOW_INTERVAL_MS, send header + the last WINDOW_CHUNK_COUNT
      // chunks (~WINDOW_INTERVAL_MS + WINDOW_OVERLAP_MS of audio). Consecutive
      // sends overlap by WINDOW_OVERLAP_MS, so a word split by the old hard
      // 3s boundary now lands whole inside at least one request.
      const sendWindow = async () => {
        const header = screenHeaderChunkRef.current;
        if (!header || screenChunksRef.current.length === 0) return;
        const windowChunks = screenChunksRef.current.slice(-WINDOW_CHUNK_COUNT);
        const blob = new Blob([header, ...windowChunks], { type: "audio/webm" });
        try {
          const fd = new FormData();
          fd.append("file", blob, "audio.webm");
          fd.append("language", toLangCode(langRef.current));
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) {
              setHistory(prev => [...prev, data.text.trim()]);
              setActivePipText(data.text.trim());
            }
          }
        } catch {}
      };

      screenIntervalRef.current = setInterval(sendWindow, WINDOW_INTERVAL_MS);

      audioTracks[0].addEventListener("ended", () => stopScreenCapture());
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert("Не удалось захватить аудио: " + err.message);
      }
    }
  };

  const stopScreenCapture = () => {
    clearInterval(screenIntervalRef.current);
    if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
    screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    screenStreamRef.current = null;
    screenRecorderRef.current = null;
    screenChunksRef.current = [];
    screenHeaderChunkRef.current = null;
    setIsScreenCapturing(false);
  };
```

- [ ] **Step 4: Manual verification**

With `npm run dev` running (from Task 1's `landing/`), open `http://localhost:3000/subtitles`, switch to any mode, click the background/screen-capture control, pick a tab playing continuous speech with "share tab audio" checked.

Expected:
- The tab-share indicator stays continuously active (no blink off/on every 3s).
- `history` still gains a new entry roughly every 3s and the PiP window (auto-opened) still updates.
- A phrase spoken across a 3s boundary isn't chopped compared to before.
- Stop capture — confirm the stream/interval tear down (tab-share indicator disappears).

- [ ] **Step 5: Commit**

```bash
git add landing/app/subtitles/page.tsx
git commit -m "feat(subtitles): overlap background-subtitle audio chunks via continuous recorder"
```

---

## Task 4: `/subtitles` — stale-text fade in PiP

**Files:**
- Modify: `landing/app/subtitles/page.tsx` (module consts, state/refs near Task 3's additions, `startScreenCapture`'s `sendWindow` closure and top, `stopScreenCapture`, `drawPipSubtitles` at `landing/app/subtitles/page.tsx:925-948`, the re-render effect at `landing/app/subtitles/page.tsx:984-988`)

**Interfaces:**
- Consumes: everything Task 3 produced (`WINDOW_INTERVAL_MS`, rewritten `startScreenCapture`/`stopScreenCapture`/`sendWindow`), plus existing `activePipText`, `isMicActive`, `textColor`, `mode`.
- Produces: module consts `STALE_AFTER_MS`, `STALE_ALPHA` (independent copies in this file); new ref `lastNonEmptyTextAtRef`; new state `isTextStale` / `setIsTextStale`; new ref `staleCheckIntervalRef`.

- [ ] **Step 1: Add stale-fade constants**

Next to the constants added in Task 3, add:

```ts
const STALE_AFTER_MS = 8000;
const STALE_ALPHA = 0.4;
```

- [ ] **Step 2: Add stale-tracking state/refs**

Right after the `screenHeaderChunkRef` line added in Task 3, add:

```ts
  const lastNonEmptyTextAtRef = useRef<number>(0);
  const [isTextStale, setIsTextStale] = useState(false);
  const staleCheckIntervalRef = useRef<any>(null);
```

- [ ] **Step 3: Reset staleness when capture starts**

In `startScreenCapture`, right after `setIsScreenCapturing(true);`, add:

```ts
      lastNonEmptyTextAtRef.current = Date.now();
      setIsTextStale(false);
```

- [ ] **Step 4: Update the timestamp whenever new text arrives**

Inside `sendWindow`'s success branch, change:

```ts
            if (data.text?.trim()) {
              setHistory(prev => [...prev, data.text.trim()]);
              setActivePipText(data.text.trim());
            }
```

to:

```ts
            if (data.text?.trim()) {
              setHistory(prev => [...prev, data.text.trim()]);
              setActivePipText(data.text.trim());
              lastNonEmptyTextAtRef.current = Date.now();
              setIsTextStale(false);
            }
```

- [ ] **Step 5: Start the staleness-check interval**

Right after `screenIntervalRef.current = setInterval(sendWindow, WINDOW_INTERVAL_MS);`, add:

```ts
      staleCheckIntervalRef.current = setInterval(() => {
        if (Date.now() - lastNonEmptyTextAtRef.current > STALE_AFTER_MS) setIsTextStale(true);
      }, 1000);
```

- [ ] **Step 6: Tear down the interval and reset staleness on stop**

In `stopScreenCapture`, right after `clearInterval(screenIntervalRef.current);`, add:

```ts
    clearInterval(staleCheckIntervalRef.current);
```

And right after `setIsScreenCapturing(false);` (last line), add:

```ts
    setIsTextStale(false);
```

- [ ] **Step 7: Dim the PiP canvas text when stale**

Find `drawPipSubtitles` (`landing/app/subtitles/page.tsx:925-948`):

```ts
  const drawPipSubtitles = () => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очистка и заливка темного фона (высококонтрастная подложка)
    ctx.fillStyle = "rgba(9, 13, 22, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Добавляем красивую полупрозрачную рамку для эстетики
    ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    // Отрисовка текста субтитров
    ctx.fillStyle = textColor;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = activePipText || (isMicActive ? "Слушаю вас..." : "Ожидание звукового потока...");
    wrapText(ctx, text, canvas.width / 2, canvas.height / 2, canvas.width - 60, 42);
  };
```

Replace with:

```ts
  const drawPipSubtitles = () => {
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очистка и заливка темного фона (высококонтрастная подложка)
    ctx.fillStyle = "rgba(9, 13, 22, 0.95)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Добавляем красивую полупрозрачную рамку для эстетики
    ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    // Отрисовка текста субтитров
    ctx.fillStyle = textColor;
    ctx.globalAlpha = isTextStale ? STALE_ALPHA : 1;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = activePipText || (isMicActive ? "Слушаю вас..." : "Ожидание звукового потока...");
    wrapText(ctx, text, canvas.width / 2, canvas.height / 2, canvas.width - 60, 42);
    ctx.globalAlpha = 1;
  };
```

- [ ] **Step 8: Re-render the PiP canvas when staleness flips**

Find (`landing/app/subtitles/page.tsx:984-988`):

```ts
  useEffect(() => {
    if (isPipActive) {
      drawPipSubtitles();
    }
  }, [activePipText, textColor, isPipActive, mode, isMicActive]);
```

Replace with:

```ts
  useEffect(() => {
    if (isPipActive) {
      drawPipSubtitles();
    }
  }, [activePipText, textColor, isPipActive, mode, isMicActive, isTextStale]);
```

- [ ] **Step 9: Manual verification**

On `/subtitles`, start screen capture (PiP auto-opens), let a caption appear, then pause/mute the shared tab's audio for 10+ seconds.

Expected:
- Around the 8s mark, the PiP caption dims to roughly 40% opacity, same text.
- New speech immediately snaps it back to full opacity.
- Switching between speech/video dictation modes (which also drive this same `drawPipSubtitles`) still behaves exactly as before — staleness only ever gets set while screen capture is running and is reset to `false` when it stops, so it can't leak into unrelated modes.

- [ ] **Step 10: Commit**

```bash
git add landing/app/subtitles/page.tsx
git commit -m "feat(subtitles): fade stale PiP background-subtitle text after 8s of silence"
```
