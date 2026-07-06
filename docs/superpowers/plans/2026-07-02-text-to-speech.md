# Text-to-Speech Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/text-to-speech` page to the `landing` Next.js app where a user types text and hears it spoken aloud (OpenAI `tts-1`), mirroring the existing `/text-to-sign` page.

**Architecture:** A self-contained Next.js API route (`landing/app/api/tts/route.ts`) calls OpenAI's REST TTS endpoint via raw `fetch` (no new npm dependency, matching the existing `api/transcribe/route.ts` pattern) and streams back `audio/mpeg`. The client page (`landing/app/text-to-speech/page.tsx`) POSTs `{ text, language }`, gets a blob back, and plays it through an `<audio>` element.

**Tech Stack:** Next.js 14 (App Router, route handlers), React 18, inline `CSSProperties` styling using the existing CSS custom properties in `landing/app/globals.css` (`--bg`, `--bgCard`, `--text`, `--textSecondary`, `--accent`, `--border`, `--radius`, `--radiusSm`).

## Global Constraints

- `landing` has no test framework configured (no jest/testing-library in `landing/package.json`) — verification is manual curl / dev-server checks, the same pattern already used for `api/transcribe/route.ts` and `text-to-sign/page.tsx`. Do not add a test framework as part of this work.
- Do not add the `openai` npm package — use raw `fetch` against `https://api.openai.com/v1/audio/speech`, consistent with how `api/transcribe/route.ts` calls FreedomSpeech/Replicate directly.
- `OPENAI_API_KEY` is already present in `landing/.env.local` and `backend/.env` (added 2026-07-02) — no env setup needed, but the dev server must be (re)started after this plan's changes to pick it up if it was started before the key was added.
- Languages supported: `kk`, `ru`, `en` — same three as `text-to-sign`.
- Feature cards on `/features` currently have no links (verified in `landing/app/features/page.tsx`) — do not add a link when adding the new card; match the existing unlinked-card style exactly.
- Design spec: `docs/superpowers/specs/2026-07-02-text-to-speech-design.md` — consult it if any task here seems ambiguous.

---

### Task 1: `/api/tts` route

**Files:**
- Create: `landing/app/api/tts/route.ts`

**Interfaces:**
- Produces: `POST /api/tts` accepting JSON body `{ text: string, language: "kk" | "ru" | "en" }`.
  - Success: `200` response, `Content-Type: audio/mpeg`, raw mp3 bytes as body.
  - Failure: `400` with JSON `{ error: string }` for missing/empty `text`; `500` with JSON `{ error: string }` for missing `OPENAI_API_KEY` or upstream OpenAI failure.
- Consumes: `process.env.OPENAI_API_KEY` (already set in `landing/.env.local`).

- [ ] **Step 1: Write the route file**

```ts
import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TTS_VOICE = "alloy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: TTS_VOICE,
        input: text,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenAI TTS error:", res.status, detail);
      return NextResponse.json(
        { error: `TTS request failed: ${res.status}` },
        { status: 500 }
      );
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json({ error: "Text-to-speech failed" }, { status: 500 });
  }
}
```

Note: `language` is accepted in the request body for forward compatibility (and because the client always sends it) but is not used to pick a voice — OpenAI `tts-1` infers pronunciation from the input text itself, it has no per-language voice parameter. A single constant voice (`alloy`) is used for all three languages.

- [ ] **Step 2: Start the dev server**

```bash
cd landing && npm run dev
```

Expected: console prints `Ready` and `Local: http://localhost:3000` within a few seconds. Leave running in the background for the next step.

- [ ] **Step 3: Verify the route with curl — empty text returns 400**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"","language":"ru"}'
```

Expected: `400`

- [ ] **Step 4: Verify the route with curl — valid text returns mp3 audio**

```bash
curl -s -D - -o /tmp/tts-test.mp3 -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Привет, как дела?","language":"ru"}' | head -5
ls -la /tmp/tts-test.mp3
```

Expected: headers show `HTTP/1.1 200 OK` and `content-type: audio/mpeg`; `/tmp/tts-test.mp3` exists with a non-zero size (a few KB).

If this returns `500` with `TTS not configured`, `OPENAI_API_KEY` is missing from `landing/.env.local` — check the file and restart the dev server. If it returns `500` with `TTS request failed: 401`, the key in `landing/.env.local` is invalid.

- [ ] **Step 5: Commit**

```bash
git add landing/app/api/tts/route.ts
git commit -m "feat: add /api/tts route using OpenAI tts-1"
```

---

### Task 2: `/text-to-speech` page

**Files:**
- Create: `landing/app/text-to-speech/page.tsx`

**Interfaces:**
- Consumes: `POST /api/tts` from Task 1 (`{ text, language }` → `audio/mpeg` blob or `{ error }` JSON).
- Produces: a route reachable at `/text-to-speech`, no exports consumed by other files.

- [ ] **Step 1: Write the page file**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type Lang = "kk" | "ru" | "en";

const DEMO_PHRASES: Record<Lang, string[]> = {
  kk: ["Сәлем", "Рахмет", "Көмектесіңізші", "Су", "Тамақ", "Отбасы"],
  ru: ["Привет", "Спасибо", "Помогите", "Вода", "Еда", "Семья"],
  en: ["Hello", "Thank you", "Help me", "Water", "Food", "Family"],
};

const LANGUAGES: { key: Lang; label: string }[] = [
  { key: "kk", label: "Қазақша" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

export default function TextToSpeechPage() {
  const [lang, setLang] = useState<Lang>("ru");
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetOutput() {
    setAudioUrl(null);
    setError(null);
  }

  function selectLanguage(key: Lang) {
    setLang(key);
    setText("");
    resetOutput();
  }

  async function handleSpeak() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: lang }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось озвучить текст");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 800, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">Текст → Речь</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          Введи текст — устройство озвучит его вслух для собеседника. Поддержка казахского, русского и английского.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {LANGUAGES.map(l => (
            <button key={l.key} onClick={() => selectLanguage(l.key)}
              style={{
                padding: "8px 18px", borderRadius: 50, fontSize: 13, cursor: "pointer",
                border: `1px solid ${lang === l.key ? "var(--accent)" : "var(--border)"}`,
                background: lang === l.key ? "var(--accent)" : "var(--bg)",
                color: lang === l.key ? "#fff" : "var(--textSecondary)",
              }}>
              {l.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "32px 28px" }}>
          <textarea value={text} onChange={e => { setText(e.target.value); resetOutput(); }} placeholder="Введи текст для озвучивания..." rows={3}
            style={{ width: "100%", padding: "14px 18px", borderRadius: "var(--radiusSm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", outline: "none", marginBottom: 16 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DEMO_PHRASES[lang].map(w => (
                <button key={w} onClick={() => { setText(w); resetOutput(); }}
                  style={{ padding: "6px 14px", borderRadius: 50, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--textSecondary)", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--textSecondary)"; }}>
                  {w}
                </button>
              ))}
            </div>
            <button onClick={handleSpeak} disabled={!text.trim() || loading} className="btn btn-primary"
              style={{ padding: "12px 28px", fontSize: 13, opacity: !text.trim() || loading ? 0.5 : 1, cursor: !text.trim() || loading ? "not-allowed" : "pointer" }}>
              {loading ? "Озвучиваем…" : "Озвучить →"}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 16, color: "#DC2626", fontSize: 13 }}>{error}</div>
          )}
        </div>

        {audioUrl && (
          <div style={{ marginTop: 24, background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "32px 28px", textAlign: "center" }}>
            <audio controls autoPlay src={audioUrl} style={{ width: "100%" }} />
            <div style={{ marginTop: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
              &ldquo;{text}&rdquo;
            </div>
          </div>
        )}

        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>Как это работает</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[{ step: "01", title: "Ввод текста", desc: "Напиши фразу на казахском, русском или английском языке." },
              { step: "02", title: "Озвучивание ИИ", desc: "Текст отправляется в OpenAI и превращается в естественную речь." },
              { step: "03", title: "Воспроизведение", desc: "Аудио проигрывается вслух — собеседник слышит фразу." },
            ].map(d => (
              <div key={d.step} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "28px 24px", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--accent)", opacity: 0.3, marginBottom: 12 }}>{d.step}</div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
                <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page compiles and renders (dev server from Task 1 still running; if not, `cd landing && npm run dev`)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/text-to-speech
```

Expected: `200`

- [ ] **Step 3: Verify the rendered HTML contains the page's key text**

```bash
curl -s http://localhost:3000/text-to-speech | grep -o "Текст → Речь"
```

Expected: prints `Текст → Речь` (confirms the page rendered, not a fallback/error page)

- [ ] **Step 4: Commit**

```bash
git add landing/app/text-to-speech/page.tsx
git commit -m "feat: add /text-to-speech page"
```

---

### Task 3: Feature card on `/features`

**Files:**
- Modify: `landing/app/features/page.tsx:8-58` (the `FEATURES` array)

**Interfaces:**
- Consumes: none (static data only).
- Produces: none (leaf UI change).

- [ ] **Step 1: Add a new entry to the `FEATURES` array**

In `landing/app/features/page.tsx`, the `FEATURES` array currently ends like this (lines 45-58):

```tsx
  {
    icon: "🆘",
    title: "SOS — кнопка помощи",
    description:
      "В экстренной ситуации отправьте сигнал бедствия с вашей геолокацией близким людям.",
    details: [
      "Активация удержанием 2 секунды",
      "Автоматическая отправка через 5 секунд",
      "Тихий режим для скрытой помощи",
      "Геолокация в сообщении",
      "Повторная отправка каждые 5 минут",
    ],
  },
];
```

Change it to add a new card after the SOS entry, keeping the closing `];`:

```tsx
  {
    icon: "🆘",
    title: "SOS — кнопка помощи",
    description:
      "В экстренной ситуации отправьте сигнал бедствия с вашей геолокацией близким людям.",
    details: [
      "Активация удержанием 2 секунды",
      "Автоматическая отправка через 5 секунд",
      "Тихий режим для скрытой помощи",
      "Геолокация в сообщении",
      "Повторная отправка каждые 5 минут",
    ],
  },
  {
    icon: "🔊",
    title: "Текст → Речь",
    description:
      "Введите текст — устройство озвучит его вслух с помощью ИИ, чтобы вы могли общаться со слышащими собеседниками.",
    details: [
      "Поддержка казахского, русского и английского",
      "Естественное звучание на основе ИИ (OpenAI)",
      "Готовые фразы для быстрого общения",
    ],
  },
];
```

Do not add a `href`/link — none of the existing cards have one (verified in `styles` and the `.map()` render block, which reads `feature.icon`/`title`/`description`/`details` only).

- [ ] **Step 2: Verify the page still compiles and shows the new card**

```bash
curl -s http://localhost:3000/features | grep -o "Текст → Речь"
```

Expected: prints `Текст → Речь`

- [ ] **Step 3: Commit**

```bash
git add landing/app/features/page.tsx
git commit -m "feat: add text-to-speech card to /features"
```

---

### Task 4: Human listening verification (not agent-executable)

**Why this task exists:** Tasks 1-3 verify the plumbing (HTTP status codes, rendered HTML) but not actual audio quality or language accuracy — no agent can listen to an mp3. Per the design spec, this must be confirmed by ear before the feature is considered done.

- [ ] **Step 1:** With the dev server running, open `http://localhost:3000/text-to-speech` in a browser.
- [ ] **Step 2:** For each of the three languages (Қазақша / Русский / English), click a demo phrase chip, click "Озвучить →", and listen: confirm the audio is clearly speech (not silence/noise), in the correct language, and reasonably natural-sounding.
- [ ] **Step 3:** Type a custom sentence in Kazakh (not one of the demo chips) and confirm it also sounds correct — this is the language most likely to have quality issues given prior project history with `kk-KZ`.
- [ ] **Step 4:** If any language sounds wrong (e.g. Kazakh text read with a Russian accent, or garbled), report back before considering this plan complete — the fix would be changing `TTS_VOICE` in `landing/app/api/tts/route.ts` or reconsidering the OpenAI model, not something to silently patch over.

No commit for this task — it's a verification gate, not a code change.
