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
      const newUrl = URL.createObjectURL(blob);
      setAudioUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return newUrl;
      });
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
              { step: "02", title: "Озвучивание ИИ", desc: "Текст отправляется в ИИ-сервис и превращается в естественную речь." },
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
