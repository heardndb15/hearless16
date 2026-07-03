# Background Subtitles: Show in Main /dashboard Screen (Not Just PiP)

**Date:** 2026-07-03
**Scope:** `landing/app/dashboard/page.tsx` only — no backend changes.

## Purpose

`/dashboard`'s main "Netflix screen" (the rolling subtitle box) only renders while `isRecording` is true. During background (tab/screen audio) capture, `isBackgroundCapturing` is true instead, so the main screen falls through to the idle placeholder ("Нажмите кнопку записи...") even though `transcriptionText` is actively updating — the only place background subtitles are currently visible is the PiP window. Users want them visible in the main window too, accumulating like a rolling transcript (matching the look of live-mic mode), not just the PiP's current-chunk snippet.

## Current Behavior (relevant pieces)

- `sendWindow()` (background capture's per-chunk handler, ~line 505-524) calls `setTranscriptionText(data.text.trim())` — **replaces** the full text with just the latest ~4s window's transcription each cycle.
- The main screen (~line 761) is gated on `isRecording` alone; `rollingLines` (last 30 sentences, newest highlighted) is derived from `transcriptionText` and would work correctly for background mode too, but is never reached because of this gate.
- `drawPipSubtitles()` (~line 587) renders raw `transcriptionText` directly onto a fixed 800×240 canvas. This is safe today only because `transcriptionText` is small (one replaced chunk at a time).

## Changes

### 1. Accumulate instead of replace

Add a small pure helper, ported from the backend's `whisper_service.merge_transcripts` (suffix-of-old / prefix-of-new word overlap stitching, with a sentence-punctuation-aware fallback):

```ts
function mergeTranscripts(oldText: string, newText: string): string {
  const oldWords = oldText.trim().split(/\s+/).filter(Boolean);
  const newWords = newText.trim().split(/\s+/).filter(Boolean);
  if (oldWords.length === 0) return newText;
  if (newWords.length === 0) return oldText;

  const maxOverlap = Math.min(oldWords.length, newWords.length);
  let overlapLen = 0;
  for (let i = 1; i <= maxOverlap; i++) {
    if (oldWords.slice(-i).join(" ") === newWords.slice(0, i).join(" ")) overlapLen = i;
  }
  if (overlapLen > 0) {
    return [...oldWords.slice(0, -overlapLen), ...newWords].join(" ");
  }
  return oldText.trim() + " " + newText.trim();
}
```

In `sendWindow()`, replace the direct `setTranscriptionText(data.text.trim())` with:

```ts
if (data.text?.trim()) {
  setTranscriptionText(prev => mergeTranscripts(prev, data.text.trim()));
  lastNonEmptyTextAtRef.current = Date.now();
  setIsTextStale(false);
}
```

An empty/silent chunk leaves the accumulated text untouched (same as today).

### 2. Reset on new session

`startBackgroundCapture()` calls `setTranscriptionText("")` right after `setIsBackgroundCapturing(true)`, so a fresh capture session doesn't inherit leftover text from a prior mic or background run.

### 3. Main screen render gate

Change the outer condition (~line 761) from `isRecording ? (...) : (...)` to `(isRecording || isBackgroundCapturing) ? (...) : (...)`. Inside the "empty" sub-branch (`rollingLines.length === 0`), make the icon/copy mode-aware:

- `isRecording`: 🎙️ "Говорите, ИИ расшифровывает..." (unchanged)
- `isBackgroundCapturing`: 🎬 "Слушаем звук вкладки, ИИ расшифровывает..."

The populated branch (`rollingLines.length > 0`) is unchanged — it already reads purely from `transcriptionText`/`rollingLines` and has no `isRecording`-specific content.

### 4. PiP shows a bounded tail, not the whole transcript

`drawPipSubtitles()`'s text source changes from `transcriptionText || "Ожидание звукового потока..."` to:

```ts
const text = rollingLines.slice(-2).join(" ") || "Ожидание звукового потока...";
```

`rollingLines` is already computed once per render from `transcriptionText`; reusing it keeps PiP showing "the current line or two," matching normal subtitle UX, instead of the whole accumulated session (which would now grow unbounded and overflow the fixed 800×240 canvas).

### 5. Consistency: save-log button

The "📥 Сохранить лог" button (~line 1045, currently `transcriptionText.trim() && !isRecording`) gains `&& !isBackgroundCapturing`, so it only appears once both capture modes are fully stopped — matches its existing "post-session save" intent.

### 6. Waveform indicator

The decorative bottom-right waveform (~line 830, currently `{isRecording && (...)}`) becomes `{(isRecording || isBackgroundCapturing) && (...)}`. Purely cosmetic — no data dependency on which mode is active.

## Out of Scope

- `/subtitles` page's independent background-capture implementation (already appends to a `history` list there — different, pre-existing behavior, not touched).
- The `/api/transcribe` rate limit (10/minute vs. ~20/minute from 3s-interval background sends) — separate known issue, not part of this change.
- Any backend changes — `mergeTranscripts` is a client-only port; the existing Python `merge_transcripts` is untouched.

## Testing

Manual, dev server + browser (no automated tests in `landing`):
1. Start background capture on a tab with continuous speech; confirm the main screen (not just PiP) fills in and grows sentence by sentence, newest line highlighted, older lines dimmed — same visual as live-mic mode.
2. Speak/play across several 3s window boundaries; confirm no visibly duplicated word/phrase at the seams (merge stitching working).
3. Confirm PiP shows only the last line or two, not the full accumulated transcript, even after several minutes of capture.
4. Let audio go silent for 10+ seconds; confirm the existing stale-fade (PiP dimming) still triggers, and the main screen's last line simply stays put (no fade expected there — out of scope).
5. Stop background capture; confirm the "📥 Сохранить лог" button appears only now (not while still capturing), and saving/clearing behave as before.
6. Repeat with a fresh background-capture session after a prior mic session; confirm the main screen starts empty, not showing leftover mic transcript.
