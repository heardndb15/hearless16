"use client";

import { useState } from "react";
import { useLanguage } from "../lib/LanguageContext";

type TtsLang = "kk" | "ru" | "en";

const LANG_PILLS: { key: TtsLang; label: string }[] = [
  { key: "kk", label: "ҚАЗ" },
  { key: "ru", label: "РУС" },
  { key: "en", label: "ENG" },
];

const DEMO_PHRASES: Record<TtsLang, string[]> = {
  kk: ["Сәлем", "Рахмет", "Көмектесіңізші"],
  ru: ["Привет", "Спасибо", "Помогите"],
  en: ["Hello", "Thank you", "Help me"],
};

export default function TextToSpeechSection() {
  const { t } = useLanguage();
  const [lang, setLang] = useState<TtsLang>("ru");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  function selectLanguage(key: TtsLang) {
    setLang(key);
    setText("");
    setError(null);
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
      setAudioUrl((prev) => {
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
    <section id="text-to-speech">
      <div className="container" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 40 }}>
          <div className="section-label">{t.textToSpeechSection.label}</div>
          <h2 className="section-title" style={{ color: "var(--text)" }}>
            {t.textToSpeechSection.title} <span style={{ color: "var(--accent)" }}>{t.textToSpeechSection.titleHighlight}</span>
          </h2>
          <p className="section-subtitle" style={{ color: "var(--textSecondary)" }}>
            {t.textToSpeechSection.subtitle}
          </p>
        </div>

        {/* Lang switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {LANG_PILLS.map((l) => (
            <button
              key={l.key}
              onClick={() => selectLanguage(l.key)}
              style={{
                padding: "10px 24px",
                borderRadius: 50,
                border: lang === l.key ? "none" : "1.5px solid var(--border)",
                background: lang === l.key ? "var(--accent)" : "white",
                color: lang === l.key ? "white" : "var(--textSecondary)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "var(--radius)",
            padding: "28px 24px",
            border: "1px solid rgba(0, 0, 0,0.12)",
            boxShadow: "0 8px 20px rgba(0, 0, 0,0.07)",
          }}
        >
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            placeholder={t.textToSpeechSection.inputPlaceholder}
            rows={2}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: "var(--radiusSm)",
              border: "1px solid rgba(0, 0, 0,0.12)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 15,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              resize: "none",
              outline: "none",
              marginBottom: 16,
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DEMO_PHRASES[lang].map((w) => (
                <button
                  key={w}
                  onClick={() => { setText(w); setError(null); }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 50,
                    border: "1px solid rgba(0, 0, 0,0.12)",
                    background: "var(--bg)",
                    color: "var(--textSecondary)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
            <button
              onClick={handleSpeak}
              disabled={!text.trim() || loading}
              className="btn btn-primary"
              style={{ padding: "12px 28px", fontSize: 13, opacity: !text.trim() || loading ? 0.5 : 1, cursor: !text.trim() || loading ? "not-allowed" : "pointer" }}
            >
              {loading ? t.textToSpeechSection.speakingBtn : t.textToSpeechSection.speakBtn}
            </button>
          </div>

          {error && <div style={{ marginTop: 16, color: "#DC2626", fontSize: 13 }}>{error}</div>}

          {audioUrl && (
            <audio controls autoPlay src={audioUrl} style={{ width: "100%", marginTop: 20 }} />
          )}
        </div>
      </div>
    </section>
  );
}
