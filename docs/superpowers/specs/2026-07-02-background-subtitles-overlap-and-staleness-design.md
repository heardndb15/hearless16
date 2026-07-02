# Background Subtitles: Chunk Overlap + Stale-Text Fade

**Date:** 2026-07-02
**Scope:** `landing/app/dashboard/page.tsx` and `landing/app/subtitles/page.tsx` — both have their own independent implementation of background (tab/screen audio) capture + PiP captions; this improves both the same way.

## Purpose

Background subtitles capture tab/screen audio, chunk it, and send each chunk to `/api/transcribe` for a movie/video the user is watching elsewhere. Two rough edges in the current implementation:

1. **Chunk boundaries cut words.** Each `MediaRecorder` instance fully stops and a new one starts every 3s, with no overlap and independent transcription per chunk — a word spoken right at the 3s mark can be split (or lost) across two unrelated requests.
2. **Stale captions never fade.** The displayed text only updates on a non-empty transcription result; during silence (e.g. an ad break) the last spoken line stays on screen indefinitely with no indication it's stale, which can read as "stuck."

## 1. Chunk overlap via continuous recorder + windowing

Replace the stop/restart-per-chunk `MediaRecorder` with a **single continuous recorder** for the whole capture session:

- `mr.start(500)` (500ms timeslice) — recorder never stops until `stopBackgroundCapture`/`stopScreenCapture` is called. `ondataavailable` pushes each ~500ms blob into a buffer array.
- The **very first** chunk is kept as `headerChunkRef` — it carries the WebM EBML header/Segment info required for the blob to decode as a standalone file. Later chunks are Matroska clusters that decode fine when concatenated after that header, even with older clusters dropped in between (each cluster carries its own timestamps).
- Every `INTERVAL_MS = 3000`, build a window: `headerChunkRef.current` (if not already the current buffer's first entry) + the last `(INTERVAL_MS + OVERLAP_MS) / TIMESLICE_MS = 8` buffered chunks (`OVERLAP_MS = 1000`), i.e. ~4s of audio covering 1s before the previous window's boundary. `new Blob([header, ...windowChunks], { type: "audio/webm" })`, POST to `/api/transcribe` as today.
- Trim the buffer to the last ~8-10 chunks after each send (bounded memory); never drop `headerChunkRef` itself.
- `language` field and response handling (`setTranscriptionText` replace on `/dashboard`, `setHistory` append + `setActivePipText` on `/subtitles`) unchanged.

This removes the dead-air gap between stop/restart (continuous capture) and gives every send ~1s of shared audio with the previous send, so a word split by the old hard boundary now falls entirely inside at least one request.

`stopBackgroundCapture`/`stopScreenCapture`: stop the single recorder, stop the stream's tracks, clear the buffer and refs — same shape as today, just one recorder instead of two alternating.

## 2. Stale-text fade in PiP

New ref `lastNonEmptyTextAtRef` (timestamp), updated whenever a transcribe response has non-empty text (same place `setTranscriptionText`/`setActivePipText` is called). New state `isTextStale`, driven by a `setInterval` (1s tick, running only while background-capturing) that sets `isTextStale = true` once `Date.now() - lastNonEmptyTextAtRef.current > 8000`, and resets to `false` immediately when a fresh non-empty chunk arrives.

Applied only in the PiP canvas draw function (`drawPipSubtitles` on both pages) — the on-page display is out of scope (see below): when `isTextStale` is true, the text fill alpha drops to `0.4`; full opacity otherwise. Text content itself is untouched — same last-known caption, just dimmed.

Not touched: `/dashboard`'s main cinematic box doesn't render `transcriptionText` during background capture at all today (gated on `isRecording`, not `isBackgroundCapturing`) — that's a separate, pre-existing gap outside this round's scope. PiP is the actual viewing surface for this feature (floating over the video being watched elsewhere), so that's where the fade belongs. `/subtitles`' existing 8s activePipText-clear effect for speech/video dictation modes is untouched — this fade is additive, specific to the screen-capture code path.

## Constants

```ts
const INTERVAL_MS = 3000;   // unchanged cadence, matches existing UX expectations
const OVERLAP_MS = 1000;
const TIMESLICE_MS = 500;   // (INTERVAL_MS + OVERLAP_MS) / TIMESLICE_MS = 8 chunks per window
const STALE_AFTER_MS = 8000;
const STALE_ALPHA = 0.4;
```

## Testing

Manual, dev server + browser (no automated tests in `landing`), repeated on both `/dashboard` and `/subtitles`:
1. Share a tab playing continuous speech audio; confirm the browser's tab-share indicator never blinks off/on (no stop/restart gaps).
2. Speak/play audio continuously across several 3s boundaries; confirm words landing near a boundary aren't chopped or dropped compared to the current behavior.
3. Pause the audio/video (or let silence run) for 10+ seconds; confirm the PiP caption dims to ~40% opacity around the 8s mark and snaps back to full opacity the moment new speech is transcribed.
4. Confirm memory doesn't grow unbounded during a long (5+ minute) capture session (buffer trimming works).
5. Stop capture mid-session; confirm the recorder/stream/interval all tear down cleanly (repeat start/stop a few times).
