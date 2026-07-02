# Background Subtitles on /dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "🎬 Фоновые субтитры" button to `/dashboard` that captures tab/screen audio (not the mic) and transcribes it live, plus a "Открыть в PiP" button that floats the current subtitle text in a Picture-in-Picture window on top of other apps/fullscreen video — so users can watch a movie elsewhere and see captions.

**Architecture:** Ports the already-working `/subtitles` page's screen-capture + Picture-in-Picture-via-canvas pattern into `SubtitlesDashboard` (`landing/app/dashboard/page.tsx`), adapted to that page's single-string `transcriptionText` model (replace, not append) and its existing Tailwind + font/color/background display-customization state, instead of `/subtitles`' inline-CSS + accumulating `history` list. No backend changes — reuses the existing `/api/transcribe` route.

**Tech Stack:** Next.js 14 client component (`"use client"`), browser `getDisplayMedia`/`MediaRecorder`/`requestPictureInPicture` APIs, Tailwind CSS.

## Global Constraints

- `landing` has no automated test framework — verification is manual dev-server/browser checks, consistent with the rest of this project. Agent-executable checks here are limited to `tsc --noEmit` and structural HTML checks via curl; real screen-capture/PiP interaction requires a human (see Task 3).
- Do not touch the WS mic-streaming pipeline (`startWhisperRecording`, `startRecordingSession`, `startBrowserRecognition`) beyond adding the mutual-exclusion `disabled` guard specified below — background capture is a fully separate code path.
- Reuse the existing `/api/transcribe` route as-is — it already supports `ru`/`kk`/`en` via the `language` form field and requires no changes.
- Mutual exclusion is mandatory: mic recording and background capture must never run at the same time, because both write to the same `transcriptionText` state.
- Design spec: `docs/superpowers/specs/2026-07-02-background-subtitles-dashboard-design.md` — consult it if anything here seems ambiguous.

---

### Task 1: Background tab/screen audio capture

**Files:**
- Modify: `landing/app/dashboard/page.tsx`

**Interfaces:**
- Produces: `isBackgroundCapturing: boolean` (state), `startBackgroundCapture(): Promise<void>`, `stopBackgroundCapture(): void` — Task 2 will read `isBackgroundCapturing` and modify `stopBackgroundCapture`.
- Consumes: existing `userLanguage: string` state (`"ru" | "kk"`), existing `isRecording: boolean` state, existing `setTranscriptionText: (text: string) => void`.

- [ ] **Step 1: Add new state and refs**

In `landing/app/dashboard/page.tsx`, find this block (around line 40-43):

```tsx
  const audioStreamRef = useRef<MediaStream | null>(null);
  // Kazakh has no browser fallback, so a flaky/cold-starting WS connection is
  // retried a couple of times instead of immediately killing the session.
  const kkReconnectAttemptsRef = useRef(0);
```

Change it to add the new state and refs right after:

```tsx
  const audioStreamRef = useRef<MediaStream | null>(null);
  // Kazakh has no browser fallback, so a flaky/cold-starting WS connection is
  // retried a couple of times instead of immediately killing the session.
  const kkReconnectAttemptsRef = useRef(0);

  // Background (tab/screen audio) capture — a separate path from the mic
  // recording above, for watching video elsewhere with subtitles.
  const [isBackgroundCapturing, setIsBackgroundCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenIntervalRef = useRef<any>(null);
```

- [ ] **Step 2: Add `startBackgroundCapture` and `stopBackgroundCapture`**

Find this exact block in `landing/app/dashboard/page.tsx` (the end of `startBrowserRecognition`, right before the `handleSaveDialogue` comment):

```tsx
    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      isRecordingRef.current = false;
      setIsRecording(false);
      setAiStatus("ready");
    }
  }

  // Save current speech transcript to database
  async function handleSaveDialogue() {
```

Change it to insert the two new functions between them:

```tsx
    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      isRecordingRef.current = false;
      setIsRecording(false);
      setAiStatus("ready");
    }
  }

  // Capture tab/screen audio (not the mic) and transcribe it every 3s via
  // the existing /api/transcribe route — for watching a video elsewhere and
  // seeing captions. Mutually exclusive with mic recording (see the JSX
  // `disabled` guards on both buttons).
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
      setIsBackgroundCapturing(true);

      const startRecorder = () => {
        const mr = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
        mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) screenChunksRef.current.push(e.data); };
        mr.start();
        screenRecorderRef.current = mr;
      };

      const sendChunk = async () => {
        const chunks = [...screenChunksRef.current];
        screenChunksRef.current = [];
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
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

      startRecorder();
      screenIntervalRef.current = setInterval(async () => {
        if (!screenStreamRef.current) {
          clearInterval(screenIntervalRef.current);
          return;
        }
        if (screenRecorderRef.current?.state === "recording") {
          screenRecorderRef.current.stop();
          await new Promise<void>(r => { screenRecorderRef.current!.onstop = () => r(); });
          await sendChunk();
          if (screenStreamRef.current) startRecorder();
        }
      }, 3000);

      audioTracks[0].addEventListener("ended", () => stopBackgroundCapture());
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert("Не удалось захватить аудио: " + err.message);
      }
    }
  }

  function stopBackgroundCapture() {
    clearInterval(screenIntervalRef.current);
    if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
    screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    screenStreamRef.current = null;
    setIsBackgroundCapturing(false);
  }

  // Save current speech transcript to database
  async function handleSaveDialogue() {
```

- [ ] **Step 3: Wire the UI — new button and mutual-exclusion guards**

Find this exact block (the record button, "Unified Floating Controller Dock" left section):

```tsx
              <button
                onClick={isRecording ? stopRecordingSession : startRecordingSession}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                  isRecording
                    ? "bg-slate-900 border border-slate-700 text-red-500 hover:bg-slate-800 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    : "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                }`}
                style={{
                  animation: isRecording ? "pulse-ring 2s infinite" : "none"
                }}
                aria-label={isRecording ? "Остановить запись" : "Начать запись"}
              >
                {isRecording ? (
                  <span className="w-3.5 h-3.5 bg-red-500 rounded-sm"></span>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                  </svg>
                )}
              </button>
              <div className="text-left">
                <p className="font-syne font-bold text-xs text-slate-800">
                  {isRecording ? "Запись активна" : "Микрофон отключен"}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {isRecording ? "Слушаем собеседника" : "Нажмите для запуска"}
                </p>
              </div>
            </div>
```

Change it to add `disabled` on the record button and a new background-capture button after the status text:

```tsx
              <button
                onClick={isRecording ? stopRecordingSession : startRecordingSession}
                disabled={isBackgroundCapturing}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                  isRecording
                    ? "bg-slate-900 border border-slate-700 text-red-500 hover:bg-slate-800 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    : "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                } ${isBackgroundCapturing ? "opacity-40 cursor-not-allowed" : ""}`}
                style={{
                  animation: isRecording ? "pulse-ring 2s infinite" : "none"
                }}
                aria-label={isRecording ? "Остановить запись" : "Начать запись"}
              >
                {isRecording ? (
                  <span className="w-3.5 h-3.5 bg-red-500 rounded-sm"></span>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
                  </svg>
                )}
              </button>
              <div className="text-left">
                <p className="font-syne font-bold text-xs text-slate-800">
                  {isRecording ? "Запись активна" : "Микрофон отключен"}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {isRecording ? "Слушаем собеседника" : "Нажмите для запуска"}
                </p>
              </div>
              <button
                onClick={isBackgroundCapturing ? stopBackgroundCapture : startBackgroundCapture}
                disabled={isRecording}
                className={`px-4 py-2.5 rounded-xl font-syne font-bold text-xs shadow-sm transition-all border flex items-center gap-1.5 ${
                  isBackgroundCapturing
                    ? "bg-red-500 border-red-500 text-white hover:bg-red-600"
                    : "bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800"
                } ${isRecording ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {isBackgroundCapturing ? "⏹ Остановить фоновые субтитры" : "🎬 Фоновые субтитры"}
              </button>
            </div>
```

- [ ] **Step 4: Start the dev server and verify structurally**

```bash
cd landing && npm run dev
```

```bash
curl -s http://localhost:3000/dashboard | grep -o "Фоновые субтитры"
```

Expected: prints `Фоновые субтитры` (confirms the page rendered without a build error — the dashboard route requires auth for full data, but the button text is static markup present regardless).

If curl returns nothing, check the dev server log for a compile error (`npm run dev`'s terminal output) before proceeding — a TypeScript error here would silently render an error page instead of the dashboard.

- [ ] **Step 5: Typecheck**

```bash
cd landing && npx tsc --noEmit -p tsconfig.json
```

Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add landing/app/dashboard/page.tsx
git commit -m "feat: add background tab/screen audio capture to /dashboard"
```

---

### Task 2: Picture-in-Picture floating captions

**Files:**
- Modify: `landing/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `isBackgroundCapturing: boolean`, `stopBackgroundCapture(): void` (from Task 1, must modify), `transcriptionText: string`, `fontSize: string`, `textColor: string`, `bgColor: string`, `getColorCode(color: string): string` (existing helper, already in the file).
- Produces: `isPipActive: boolean` (state), `togglePipSubtitles(): Promise<void>`.

- [ ] **Step 1: Add PiP state and refs**

In `landing/app/dashboard/page.tsx`, find the block added in Task 1 (around line 44-49):

```tsx
  // Background (tab/screen audio) capture — a separate path from the mic
  // recording above, for watching video elsewhere with subtitles.
  const [isBackgroundCapturing, setIsBackgroundCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenIntervalRef = useRef<any>(null);
```

Change it to add PiP state and refs right after:

```tsx
  // Background (tab/screen audio) capture — a separate path from the mic
  // recording above, for watching video elsewhere with subtitles.
  const [isBackgroundCapturing, setIsBackgroundCapturing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const screenIntervalRef = useRef<any>(null);

  // Picture-in-Picture floating captions (draws transcriptionText onto a
  // hidden canvas, streams that canvas into a hidden <video>, and requests
  // PiP on it — the only way to get arbitrary styled text into a real PiP
  // window, which only accepts <video> elements).
  const [isPipActive, setIsPipActive] = useState(false);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
```

- [ ] **Step 2: Modify `stopBackgroundCapture` to exit PiP**

Find this exact block (added in Task 1):

```tsx
  function stopBackgroundCapture() {
    clearInterval(screenIntervalRef.current);
    if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
    screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    screenStreamRef.current = null;
    setIsBackgroundCapturing(false);
  }
```

Change it to exit PiP first:

```tsx
  function stopBackgroundCapture() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    clearInterval(screenIntervalRef.current);
    if (screenRecorderRef.current?.state === "recording") screenRecorderRef.current.stop();
    screenStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    screenStreamRef.current = null;
    setIsBackgroundCapturing(false);
  }
```

- [ ] **Step 3: Add `wrapText`, `drawPipSubtitles`, `togglePipSubtitles`, and the re-render effect**

Find this exact block (the end of Task 1's `stopBackgroundCapture`, right before the `handleSaveDialogue` comment):

```tsx
    screenStreamRef.current = null;
    setIsBackgroundCapturing(false);
  }

  // Save current speech transcript to database
  async function handleSaveDialogue() {
```

Change it to insert the PiP functions and effect between them:

```tsx
    screenStreamRef.current = null;
    setIsBackgroundCapturing(false);
  }

  // Word-wraps text onto a canvas, centered both horizontally and vertically
  // around (x, y) within maxWidth, one line per lineHeight px.
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const manualLines = text.split("\n");
    const lines: string[] = [];

    manualLines.forEach((mLine) => {
      const words = mLine.split(" ");
      let line = "";
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);
    });

    const totalHeight = lines.length * lineHeight;
    let startY = y - totalHeight / 2 + lineHeight / 2;

    lines.forEach((l) => {
      ctx.fillText(l.trim(), x, startY);
      startY += lineHeight;
    });
  };

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

  async function togglePipSubtitles() {
    const pipVideo = pipVideoRef.current;
    const canvas = pipCanvasRef.current;
    if (!pipVideo || !canvas) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPipActive(false);
    } else {
      try {
        drawPipSubtitles();
        const stream = (canvas as any).captureStream(10);
        pipVideo.srcObject = stream;
        await pipVideo.play();
        await pipVideo.requestPictureInPicture();
        setIsPipActive(true);
        pipVideo.addEventListener("leavepictureinpicture", () => {
          setIsPipActive(false);
        }, { once: true });
      } catch (err) {
        console.error("Ошибка запуска Picture-in-Picture: ", err);
        alert("Режим Картинка-в-картинке не поддерживается вашим браузером или заблокирован.");
      }
    }
  }

  // Save current speech transcript to database
  async function handleSaveDialogue() {
```

- [ ] **Step 4: Add the re-render effect**

Right after the `togglePipSubtitles` function you just added in Step 3, find this exact block (the boundary between your new code and the existing code):

```tsx
    }
  }

  // Save current speech transcript to database
  async function handleSaveDialogue() {
```

Change it to insert a new `useEffect` between `togglePipSubtitles`'s closing brace and the comment:

```tsx
    }
  }

  useEffect(() => {
    if (isPipActive) drawPipSubtitles();
  }, [transcriptionText, textColor, bgColor, fontSize, isPipActive]);

  // Save current speech transcript to database
  async function handleSaveDialogue() {
```

(Final order: `togglePipSubtitles` function, then this new `useEffect`, then the existing `handleSaveDialogue`. `useEffect` is already imported at the top of the file from `"react"` — no new import needed.)

- [ ] **Step 5: Add hidden canvas/video elements and the PiP toggle button**

Find the start of the JSX return:

```tsx
  return (
    <div className="space-y-6 relative">
      {/* Screen Header */}
```

Change it to add the hidden elements right after the opening div:

```tsx
  return (
    <div className="space-y-6 relative">
      <canvas ref={pipCanvasRef} width="800" height="240" style={{ display: "none" }} />
      <video ref={pipVideoRef} style={{ display: "none" }} playsInline muted />
      {/* Screen Header */}
```

Then find the background-capture button added in Task 1:

```tsx
              <button
                onClick={isBackgroundCapturing ? stopBackgroundCapture : startBackgroundCapture}
                disabled={isRecording}
                className={`px-4 py-2.5 rounded-xl font-syne font-bold text-xs shadow-sm transition-all border flex items-center gap-1.5 ${
                  isBackgroundCapturing
                    ? "bg-red-500 border-red-500 text-white hover:bg-red-600"
                    : "bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800"
                } ${isRecording ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {isBackgroundCapturing ? "⏹ Остановить фоновые субтитры" : "🎬 Фоновые субтитры"}
              </button>
            </div>
```

Change it to add the PiP button right after:

```tsx
              <button
                onClick={isBackgroundCapturing ? stopBackgroundCapture : startBackgroundCapture}
                disabled={isRecording}
                className={`px-4 py-2.5 rounded-xl font-syne font-bold text-xs shadow-sm transition-all border flex items-center gap-1.5 ${
                  isBackgroundCapturing
                    ? "bg-red-500 border-red-500 text-white hover:bg-red-600"
                    : "bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800"
                } ${isRecording ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {isBackgroundCapturing ? "⏹ Остановить фоновые субтитры" : "🎬 Фоновые субтитры"}
              </button>
              {isBackgroundCapturing && (
                <button
                  onClick={togglePipSubtitles}
                  className={`px-4 py-2.5 rounded-xl font-syne font-bold text-xs shadow-sm transition-all border ${
                    isPipActive
                      ? "bg-accent/15 border-accent/20 text-accent"
                      : "bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {isPipActive ? "Закрыть PiP" : "Открыть в PiP"}
                </button>
              )}
            </div>
```

- [ ] **Step 6: Start the dev server (if not already running) and verify structurally**

```bash
cd landing && npm run dev
```

```bash
curl -s http://localhost:3000/dashboard | grep -o "Открыть в PiP\|Фоновые субтитры"
```

Expected: prints `Фоновые субтитры` only (the "Открыть в PiP" button is conditionally rendered — it won't appear in the static HTML unless `isBackgroundCapturing` is true, which it never is on a fresh server-rendered page load). This confirms the page still compiles and renders after this task's changes.

- [ ] **Step 7: Typecheck**

```bash
cd landing && npx tsc --noEmit -p tsconfig.json
```

Expected: no output, exit code 0.

- [ ] **Step 8: Commit**

```bash
git add landing/app/dashboard/page.tsx
git commit -m "feat: add Picture-in-Picture floating captions to /dashboard"
```

---

### Task 3: Human interactive verification (not agent-executable)

**Why this task exists:** `getDisplayMedia` requires a real user gesture and a real tab/window to share; `requestPictureInPicture` requires a real browser window. No agent can drive this — it needs a human with a browser.

- [ ] **Step 1:** With the dev server running, log into `http://localhost:3000/dashboard`.
- [ ] **Step 2:** Click "🎬 Фоновые субтитры". In the browser's share picker, pick a tab that's playing audio (e.g. a YouTube video) and make sure "share tab audio" is checked.
- [ ] **Step 3:** Confirm the transcript area updates roughly every 3 seconds with new recognized text (replacing the previous text, not accumulating below it).
- [ ] **Step 4:** Confirm the record (mic) button is visibly disabled while background capture is active. Click "⏹ Остановить фоновые субтитры", confirm the record button re-enables.
- [ ] **Step 5:** Start background capture again, click "Открыть в PiP". Confirm a small floating window appears (usually bottom-right of the screen) showing the current subtitle text.
- [ ] **Step 6:** Switch to a different app/tab (e.g. fullscreen the video you're capturing audio from) — confirm the PiP window stays visible on top and keeps updating with new text.
- [ ] **Step 7:** While PiP is open, open the "⚙️ Дизайн" panel and change font size, text color, and background style — confirm the PiP window's text updates to match each change live.
- [ ] **Step 8:** Close the PiP window using its native close button (not the in-page toggle) — confirm background capture keeps running (check the transcript area is still updating) and the in-page "Открыть в PiP" button correctly flips back from "Закрыть PiP".
- [ ] **Step 9:** Click "⏹ Остановить фоновые субтитры" while PiP is open — confirm the PiP window closes automatically and the browser's tab-sharing indicator disappears.
- [ ] **Step 10:** Repeat steps 2-3 with the dashboard's language switcher set to Қазақша (`kk`) — confirm background transcription still works (routes through FreedomSpeech via the existing `/api/transcribe` route).

No commit for this task — it's a verification gate, not a code change. If any step fails, report back with which step and what happened before any further work proceeds.
