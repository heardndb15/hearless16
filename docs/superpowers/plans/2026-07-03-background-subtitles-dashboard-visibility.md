# Background Subtitles Dashboard Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make background (tab/screen audio) subtitles visible and accumulating in `/dashboard`'s main screen, not just in the PiP window.

**Architecture:** Single-file change to `landing/app/dashboard/page.tsx`. Add a client-side text-merge helper so background-capture chunks accumulate instead of replacing each other, widen the main screen's render gate to cover `isBackgroundCapturing`, and bound the PiP window to a short tail of the (now-growing) transcript so it doesn't overflow.

**Tech Stack:** Next.js 14 / React / TypeScript. No backend changes. No automated test framework in `landing` — verification is `npm run build` (type-check + production build) plus manual browser testing, matching this repo's existing convention.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-03-background-subtitles-dashboard-visibility-design.md`
- All changes confined to `landing/app/dashboard/page.tsx` — no backend, no other pages.
- `npm run build` (run from `landing/`) must pass with zero errors after every task.
- Do not touch `/subtitles` page's independent background-capture implementation (explicitly out of scope per spec).
- Do not touch the `/api/transcribe` rate-limit issue (separate, out of scope per spec).

---

### Task 1: Accumulate background-capture text via `mergeTranscripts`

**Files:**
- Modify: `landing/app/dashboard/page.tsx` (add helper near top-level functions, e.g. after the `WINDOW_*` constants around line 16; modify `startBackgroundCapture` around line 456-479 and `sendWindow` around line 505-524)

**Interfaces:**
- Produces: `mergeTranscripts(oldText: string, newText: string): string` — a module-level pure function, usable by any later task in this file.

- [ ] **Step 1: Add the `mergeTranscripts` helper**

Add this function near the top of `landing/app/dashboard/page.tsx`, after the existing `WINDOW_*` constant declarations (around line 16-17, before the component definition):

```ts
// Client-side port of backend/app/services/whisper_service.py's
// merge_transcripts: stitches two overlapping transcript chunks by finding
// the longest suffix of oldText that matches a prefix of newText, since
// consecutive background-capture windows share ~1s of audio and would
// otherwise duplicate a word or two at the seam.
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

- [ ] **Step 2: Reset transcript at the start of a new background-capture session**

In `startBackgroundCapture()`, find this existing block (around line 476-479):

```ts
      screenHeaderChunkRef.current = null;
      setIsBackgroundCapturing(true);
      lastNonEmptyTextAtRef.current = Date.now();
      setIsTextStale(false);
```

Replace it with:

```ts
      screenHeaderChunkRef.current = null;
      setIsBackgroundCapturing(true);
      setTranscriptionText("");
      lastNonEmptyTextAtRef.current = Date.now();
      setIsTextStale(false);
```

- [ ] **Step 3: Accumulate instead of replace in `sendWindow`**

In `sendWindow` (around line 515-522), find:

```ts
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) {
              setTranscriptionText(data.text.trim());
              lastNonEmptyTextAtRef.current = Date.now();
              setIsTextStale(false);
            }
          }
```

Replace with:

```ts
          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) {
              const newText = data.text.trim();
              setTranscriptionText(prev => mergeTranscripts(prev, newText));
              lastNonEmptyTextAtRef.current = Date.now();
              setIsTextStale(false);
            }
          }
```

- [ ] **Step 4: Type-check and build**

Run from `landing/`:
```bash
npm run build
```
Expected: build completes with no TypeScript errors (same route list/sizes as before — this task changes no rendered output yet).

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open `/dashboard`, log in, click "🎬 Фоновые субтитры", share a browser tab that's playing continuous speech (with "share tab audio" checked). Open the PiP window ("Открыть в PiP") since the main screen isn't wired up yet (Task 2) — confirm the PiP caption text is growing/accumulating across chunks (not just showing the latest ~4s window as it did before), and that no single word appears visibly doubled at a ~3s boundary. Stop capture, start it again, confirm PiP starts from empty (not leftover text).

- [ ] **Step 6: Commit**

```bash
git add landing/app/dashboard/page.tsx
git commit -m "feat(dashboard): accumulate background-capture transcript instead of replacing per chunk"
```

---

### Task 2: Show background subtitles in the main screen

**Files:**
- Modify: `landing/app/dashboard/page.tsx` (render gate around line 761, empty-state sub-branch around line 805-813)

**Interfaces:**
- Consumes: `isBackgroundCapturing` (existing state), `isRecording` (existing state), `rollingLines` (existing derived array, computed via `getRollingLines()` from `transcriptionText`).

- [ ] **Step 1: Widen the main screen's render gate**

Find the "Subtitles Area (Netflix Screen)" block. The outer condition currently reads (around line 761):

```tsx
                {isRecording ? (
                  rollingLines.length > 0 ? (
```

Change the opening condition to:

```tsx
                {(isRecording || isBackgroundCapturing) ? (
                  rollingLines.length > 0 ? (
```

- [ ] **Step 2: Make the empty-state (no lines yet) copy mode-aware**

Find the empty sub-branch (around line 805-813):

```tsx
                  ) : (
                    <div className="my-auto space-y-4 animate-pulse text-center w-full">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/35 flex items-center justify-center mx-auto text-cyan-400 text-xl">
                        🎙️
                      </div>
                      <p className="text-slate-400 font-syne text-sm font-bold tracking-wider">
                        Говорите, ИИ расшифровывает...
                      </p>
                    </div>
                  )
```

Replace with:

```tsx
                  ) : (
                    <div className="my-auto space-y-4 animate-pulse text-center w-full">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/35 flex items-center justify-center mx-auto text-cyan-400 text-xl">
                        {isRecording ? "🎙️" : "🎬"}
                      </div>
                      <p className="text-slate-400 font-syne text-sm font-bold tracking-wider">
                        {isRecording ? "Говорите, ИИ расшифровывает..." : "Слушаем звук вкладки, ИИ расшифровывает..."}
                      </p>
                    </div>
                  )
```

- [ ] **Step 3: Extend the decorative waveform indicator**

Find (around line 830):

```tsx
            {isRecording && (
              <div className="absolute bottom-6 right-8 flex gap-1 items-end h-8 pointer-events-none z-10 opacity-75">
```

Change to:

```tsx
            {(isRecording || isBackgroundCapturing) && (
              <div className="absolute bottom-6 right-8 flex gap-1 items-end h-8 pointer-events-none z-10 opacity-75">
```

- [ ] **Step 4: Type-check and build**

```bash
npm run build
```
Expected: build completes with no TypeScript errors.

- [ ] **Step 5: Manual verification**

`npm run dev`, open `/dashboard`, click "🎬 Фоновые субтитры" on a tab with speech. Confirm: (a) before the first chunk resolves, the main screen shows the 🎬 "Слушаем звук вкладки..." empty state (not the idle "Нажмите кнопку записи..." placeholder); (b) once text arrives, the main screen fills in exactly like mic mode — newest sentence bright, older ones dimmed, growing over time; (c) the waveform indicator bottom-right animates during capture; (d) starting a normal mic recording still shows the original 🎙️ copy and behaves unchanged.

- [ ] **Step 6: Commit**

```bash
git add landing/app/dashboard/page.tsx
git commit -m "feat(dashboard): render background-capture subtitles in the main screen, not just PiP"
```

---

### Task 3: Bound PiP to a recent tail; fix save-button consistency

**Files:**
- Modify: `landing/app/dashboard/page.tsx` (`drawPipSubtitles` around line 587-609; save-log button condition around line 1045)

**Interfaces:**
- Consumes: `rollingLines` (existing derived array from Task-independent `getRollingLines()`), `isBackgroundCapturing` (existing state).

- [ ] **Step 1: Bound the PiP text source to the last two rolling lines**

In `drawPipSubtitles()`, find (around line 607):

```ts
    const text = transcriptionText || "Ожидание звукового потока...";
```

Replace with:

```ts
    const text = rollingLines.slice(-2).join(" ") || "Ожидание звукового потока...";
```

- [ ] **Step 2: Gate the save-log button on both capture modes being stopped**

Find (around line 1045):

```tsx
              {transcriptionText.trim() && !isRecording && (
                <button
                  onClick={handleSaveDialogue}
```

Replace the condition with:

```tsx
              {transcriptionText.trim() && !isRecording && !isBackgroundCapturing && (
                <button
                  onClick={handleSaveDialogue}
```

- [ ] **Step 3: Type-check and build**

```bash
npm run build
```
Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Manual verification**

`npm run dev`, open `/dashboard`, start background capture on a tab with several minutes of continuous speech (or let a shorter clip loop). Open PiP and confirm: (a) it shows only the last sentence or two, not the whole growing transcript, even after 2+ minutes; (b) it does not visually overflow the floating PiP window. Confirm the "📥 Сохранить лог" button is hidden while background capture is active and appears only after clicking "⏹ Остановить фоновые субтитры". Confirm the existing 8s silence stale-fade in PiP still dims/undims correctly (unaffected by this change, but the visible text source did change).

- [ ] **Step 5: Commit**

```bash
git add landing/app/dashboard/page.tsx
git commit -m "fix(dashboard): bound PiP caption to recent tail, hide save button during active capture"
```
