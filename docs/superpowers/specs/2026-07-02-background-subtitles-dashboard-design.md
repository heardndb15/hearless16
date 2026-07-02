# Background (Screen/Tab Audio) Subtitles on /dashboard

**Date:** 2026-07-02
**Scope:** Port the existing `/subtitles` background-capture + Picture-in-Picture feature to `/dashboard`, adapted to that page's data model and styling

## Purpose

`/dashboard` (`SubtitlesDashboard`, `landing/app/dashboard/page.tsx`) is the current primary product surface (per README and recent commit history — `/subtitles` isn't even listed as a page there). It only supports live microphone transcription today. Users want to watch a movie/video in another app or fullscreen and see subtitles floating on top — this already exists on the older `/subtitles` page (`🎬 Фоновые субтитры` button + Picture-in-Picture canvas hack) but is missing from `/dashboard`.

## Approach

Port the proven pattern from `/subtitles`, not the WS mic-streaming pipeline (`startWhisperRecording`):
- `getDisplayMedia({ video: true, audio: {...} })` captures tab/screen audio (video track immediately stopped, unused)
- Every 3 seconds, the accumulated `MediaRecorder` webm chunk is POSTed to the existing `/api/transcribe` route (already supports `ru`/`kk`/`en` — no backend changes needed)
- The returned text **replaces** `transcriptionText` (matches how the existing WS mic mode already behaves on this page — screen stays uncluttered, unlike `/subtitles`' accumulating `history` list)

This avoids touching the more complex, latency-sensitive WS pipeline used for live mic conversations — background/movie subtitles tolerate the ~3s chunk latency fine.

## Mutual Exclusion

Mic recording (`startRecordingSession`/`isRecording`) and background capture (`isBackgroundCapturing`, new state) share `transcriptionText` and cannot run at once:
- The existing record button is `disabled` while `isBackgroundCapturing` is true.
- The new "🎬 Фоновые субтитры" button is `disabled` while `isRecording` is true.

## New State (in `SubtitlesDashboard`)

```ts
const [isBackgroundCapturing, setIsBackgroundCapturing] = useState(false);
const [isPipActive, setIsPipActive] = useState(false);
const screenStreamRef = useRef<MediaStream | null>(null);
const screenRecorderRef = useRef<MediaRecorder | null>(null);
const screenChunksRef = useRef<Blob[]>([]);
const screenIntervalRef = useRef<any>(null);
const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
const pipVideoRef = useRef<HTMLVideoElement | null>(null);
```

## Functions

`startBackgroundCapture()` / `stopBackgroundCapture()` — direct adaptation of `/subtitles`' `startScreenCapture`/`stopScreenCapture` (see `landing/app/subtitles/page.tsx:354-434` for the reference implementation), with two changes:
1. `fd.append("language", ...)` uses `userLanguage` directly (dashboard already has this as `"ru" | "kk"` — no `toLangCode`/display-label mapping needed, unlike `/subtitles`' `"ҚАЗ"/"РУС"/"ENG"` labels).
2. On a successful chunk, call `setTranscriptionText(data.text.trim())` (replace) instead of `setHistory(prev => [...prev, ...])` (append).
3. Do NOT auto-open PiP on start (unlike `/subtitles`) — the user clicks "Открыть в PiP" explicitly, since this is a secondary action here (see UI section).

`togglePipSubtitles()` — direct port of `/subtitles`' version (`landing/app/subtitles/page.tsx:951-981`): canvas → `captureStream(10)` → hidden `<video>` → `requestPictureInPicture()`. No changes needed beyond calling the renamed draw function below.

`drawPipSubtitles()` — adapted from `/subtitles`' version (`landing/app/subtitles/page.tsx:925-948`) to use dashboard's existing display-customization state instead of fixed styling:
- Background: `bgColor === "dark"` → `rgba(15, 23, 42, 0.8)` (slate-900/80), `bgColor === "semi"` → `rgba(0, 0, 0, 0.4)`, `bgColor === "none"` → fully transparent fill skip (matches the Tailwind classes already used at `landing/app/dashboard/page.tsx:539`)
- Text color: `getColorCode(textColor)` (existing helper, `landing/app/dashboard/page.tsx:54-61`)
- Font size: same mapping already used at `landing/app/dashboard/page.tsx:542` (`sm`→18px, `md`→24px, `lg`→30px, `xl`→38px), bolded for canvas legibility
- Text glow: skip on canvas (canvas `shadowBlur`/`shadowColor` adds real cost per frame at 10fps; the existing `textGlow` toggle only affects the on-page DOM text, not the PiP canvas — acceptable, PiP canvas readability comes from the opaque background instead)
- Text shown: `transcriptionText || "Ожидание звукового потока..."` (no separate interim-text concept in the background-capture path, unlike `/subtitles`)
- Uses the same `wrapText` line-wrapping helper logic as `/subtitles/page.tsx:894-921` (word-wrap to canvas width, centered)

Re-render effect: `useEffect(() => { if (isPipActive) drawPipSubtitles(); }, [transcriptionText, textColor, bgColor, fontSize, isPipActive]);`

## UI

In the "Unified Floating Controller Dock" (`landing/app/dashboard/page.tsx:759-833`), left section next to the record button:
- New button "🎬 Фоновые субтитры" / "⏹ Остановить фоновые субтитры" (toggles `isBackgroundCapturing`), Tailwind-styled to match the dock's existing button conventions (e.g. the `⚙️ Дизайн` button's pill style), `disabled` + dimmed while `isRecording`.
- When `isBackgroundCapturing` is true, a second small button "Открыть в PiP" / "Закрыть PiP" appears next to it (toggles `togglePipSubtitles()`), styled like the existing `📜 История` toggle button (accent-tinted when active).

Hidden elements added near the top of the returned JSX (matching `/subtitles/page.tsx:1006-1007`):
```tsx
<canvas ref={pipCanvasRef} width="800" height="240" style={{ display: "none" }} />
<video ref={pipVideoRef} style={{ display: "none" }} playsInline muted />
```

The main record button's `onClick`/`disabled` gains `|| isBackgroundCapturing` guards; the new button's `onClick`/`disabled` gains `|| isRecording` guards.

## Error Handling

Matches `/subtitles`' existing behavior exactly:
- No audio track in the captured stream (user picked a window/screen without "share audio" checked) → `alert("Аудио не найдено. Выберите вкладку и убедитесь, что включён звук.")`, capture aborted.
- `getDisplayMedia` rejected by user (`NotAllowedError`) → silently do nothing (no alert — matches `/subtitles`' handling of a user-cancelled picker).
- Other `getDisplayMedia` failures → `alert("Не удалось захватить аудио: " + err.message)`.
- PiP unsupported/blocked → `alert("Режим Картинка-в-картинке не поддерживается вашим браузером или заблокирован.")`.
- User manually closes the PiP window (browser's native close button) → `leavepictureinpicture` listener sets `isPipActive` back to `false` (background capture itself keeps running).
- Shared tab/window closed or "stop sharing" clicked by the user → the audio track's `ended` event triggers `stopBackgroundCapture()`, which also exits PiP if active and stops the interval/recorder/stream.

## Testing

Manual, dev server + browser (no automated tests in `landing`, consistent with the rest of this project):
1. Log into `/dashboard`, click "🎬 Фоновые субтитры", pick a browser tab playing audio with "share tab audio" checked.
2. Confirm `transcriptionText` updates roughly every 3s with new recognized text (replacing, not appending).
3. Click "Открыть в PiP", confirm a floating window appears showing the current subtitle text styled per the page's font/color/background settings.
4. Change font size / text color / background settings while background capture + PiP are active — confirm the PiP window updates to match.
5. Click the record button while background capture is active — confirm it's disabled. Stop background capture, confirm the record button re-enables.
6. Click "⏹ Остановить фоновые субтитры" — confirm PiP closes (if open) and the stream/interval are torn down (check `chrome://media-internals` or just confirm the "recording" tab indicator in the browser disappears).
7. Repeat steps 1-3 with `userLanguage` set to `kk` (казахский) to confirm the background path also uses FreedomSpeech correctly via `/api/transcribe`.
