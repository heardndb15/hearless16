"use client";

import Link from "next/link";
import { useTextToSpeech, TTS_LANGUAGES, TTS_DEMO_PHRASES } from "../../lib/useTextToSpeech";

export default function TextToSpeechPage() {
  const { lang, text, audioUrl, loading, error, selectLanguage, updateText, handleSpeak } = useTextToSpeech();

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-soft)" }}>
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
          {TTS_LANGUAGES.map(l => (
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
          <textarea value={text} onChange={e => updateText(e.target.value)} placeholder="Введи текст для озвучивания..." rows={3}
            style={{ width: "100%", padding: "14px 18px", borderRadius: "var(--radiusSm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif", resize: "none", outline: "none", marginBottom: 16 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TTS_DEMO_PHRASES[lang].map(w => (
                <button key={w} onClick={() => updateText(w)}
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
