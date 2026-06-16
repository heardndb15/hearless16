"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PHRASES: Record<string, string[]> = {
  "ҚАЗ": ["Сәлем, қаліңіз қалай?", "Менің атым Әлихан.", "Сізге көмек қажет пе?", "Рахмет! Сау болыңыз."],
  "РУС": ["Привет, как дела?", "Меня зовут Алихан.", "Вам нужна помощь?", "Спасибо! До свидания."],
  "ENG": ["Hello, how are you?", "My name is Alikhan.", "Do you need help?", "Thank you! Goodbye."],
};

export default function SubtitlesPage() {
  const [lang, setLang] = useState("РУС");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const isDemo = inputText.trim() === "";

  useEffect(() => {
    if (!isDemo) return;
    const current = PHRASES[lang][phraseIdx];
    if (chars < current.length) {
      const t = setTimeout(() => setChars(c => c + 1), 45);
      return () => clearTimeout(t);
    }
    const p = setTimeout(() => {
      setPhraseIdx(i => (i + 1) % PHRASES[lang].length);
      setChars(0);
    }, 2800);
    return () => clearTimeout(p);
  }, [chars, phraseIdx, lang, isDemo]);

  const displayText = isDemo ? PHRASES[lang][phraseIdx].slice(0, chars) : inputText;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 800, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">AI-субтитры в реальном времени</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          Преобразование речи в текст на казахском, русском и английском. Автоопределение языка и перевод.
        </p>

        {/* Switcher */}
        <div style={{ display: "flex", gap: 8, margin: "32px 0 20px" }}>
          {["ҚАЗ", "РУС", "ENG"].map(l => (
            <button key={l} onClick={() => { setLang(l); setPhraseIdx(0); setChars(0); }}
              style={{ padding: "10px 28px", borderRadius: 50, border: lang === l ? "none" : "1px solid var(--border)", background: lang === l ? "var(--gradient)" : "transparent", color: lang === l ? "white" : "var(--textSecondary)", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
              {l}
            </button>
          ))}
        </div>

        {/* Display */}
        <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "32px 28px", border: "1px solid var(--border)", minHeight: 120, marginBottom: 20 }}>
          <div style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 600, color: "var(--text)", lineHeight: 1.4, minHeight: 70 }}>
            {displayText || "‌"}
            <span style={{ display: "inline-block", width: 2, height: 24, background: "var(--accent)", marginLeft: 3, verticalAlign: "middle", animation: "cursor-blink 0.8s step-end infinite" }} />
          </div>
          <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)", opacity: 0.3, marginTop: 16, animation: "wave-move 2s linear infinite" }} />
        </div>

        {/* Input */}
        <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Введи текст для субтитров..." rows={2}
          style={{ width: "100%", padding: "14px 18px", borderRadius: "var(--radiusSm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 15, fontFamily: "'DM Sans', sans-serif", resize: "none", outline: "none", marginBottom: 16 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <button onClick={() => { if (inputText.trim()) { setHistory(h => [...h, inputText.trim()]); setInputText(""); } }}
            className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 13 }}>
            Отправить →
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(43,191,207,0.1)", color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>{lang}</span>
            <span style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(123,94,234,0.1)", color: "var(--purple)", fontSize: 11, fontWeight: 600 }}>Whisper AI</span>
          </div>
        </div>

        {history.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--textSecondary)", marginBottom: 14 }}>История разговоров</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((h, i) => (
                <div key={i} style={{ padding: "14px 18px", borderRadius: "var(--radiusSm)", background: "var(--bg)", border: "1px solid var(--border)", fontSize: 14, color: "var(--textSecondary)" }}>{h}</div>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[{ title: "Автоопределение языка", desc: "Hearless сам определяет, на каком языке говорят — казахский, русский или английский." },
            { title: "Перевод в реальном времени", desc: "Текст появляется на экране с минимальной задержкой. Поддержка потокового режима." },
            { title: "OpenAI Whisper", desc: "Модель от OpenAI обеспечивает высокую точность распознавания даже в шумной обстановке." },
            { title: "История субтитров", desc: "Все разговоры сохраняются. Можно вернуться к ним в любое время." },
          ].map(d => (
            <div key={d.title} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "24px 20px", border: "1px solid var(--border)" }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
              <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
