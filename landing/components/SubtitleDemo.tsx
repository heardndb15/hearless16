"use client";

import { useState, useEffect, useRef } from "react";

const PHRASES: Record<string, string[]> = {
  "ҚАЗ": [
    "Сәлем, қаліңіз қалай?",
    "Менің атым Әлихан.",
    "Сізге көмек қажет пе?",
    "Рахмет! Сау болыңыз.",
  ],
  "РУС": [
    "Привет, как дела?",
    "Меня зовут Алихан.",
    "Вам нужна помощь?",
    "Спасибо! До свидания.",
  ],
  "ENG": [
    "Hello, how are you?",
    "My name is Alikhan.",
    "Do you need help?",
    "Thank you! Goodbye.",
  ],
};

export default function SubtitleDemo() {
  const [lang, setLang] = useState("РУС");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDemo = inputText.trim() === "";

  useEffect(() => {
    if (isDemo) {
      const current = PHRASES[lang][phraseIdx];
      if (chars < current.length) {
        const t = setTimeout(() => setChars((c) => c + 1), 50);
        return () => clearTimeout(t);
      }
      const p = setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % PHRASES[lang].length);
        setChars(0);
      }, 3000);
      return () => clearTimeout(p);
    }
  }, [chars, phraseIdx, lang, isDemo]);

  const displayText = isDemo
    ? PHRASES[lang][phraseIdx].slice(0, chars)
    : inputText;

  return (
    <section id="subtitles">
      <div className="container" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 40 }}>
          <div className="section-label">Субтитры</div>
          <h2 className="section-title" style={{ color: "#0C4A6E" }}>
            Живые <span style={{ color: "var(--accent)" }}>AI-субтитры</span>
          </h2>
          <p className="section-subtitle" style={{ color: "#075985" }}>
            Введи текст или смотри демо. Так работают субтитры в реальном времени.
          </p>
        </div>

        {/* Lang switcher */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {["ҚАЗ", "РУС", "ENG"].map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setPhraseIdx(0);
                setChars(0);
              }}
              style={{
                padding: "10px 24px",
                borderRadius: 50,
                border: lang === l ? "none" : "1.5px solid #BAE6FD",
                background: lang === l ? "#0EA5E9" : "white",
                color: lang === l ? "white" : "#075985",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Subtitle display */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "var(--radius)",
            padding: "28px 24px",
            border: "1px solid rgba(14,165,233,0.12)",
            boxShadow: "0 8px 20px rgba(14,165,233,0.07)",
            minHeight: 100,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text)",
              lineHeight: 1.4,
              minHeight: 60,
            }}
          >
            {displayText || "‌"}
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 22,
                background: "var(--accent)",
                marginLeft: 3,
                verticalAlign: "middle",
                animation: "cursor-blink 0.8s step-end infinite",
              }}
            />
          </div>
          {/* Wave */}
          <div
            style={{
              height: 2,
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              opacity: 0.3,
              marginTop: 12,
              animation: "wave-move 2s linear infinite",
            }}
          />
        </div>

        {/* Input */}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Введи текст для перевода в субтитры..."
          rows={2}
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: "var(--radiusSm)",
            border: "1px solid rgba(14,165,233,0.12)",
            background: "#F0F9FF",
            color: "var(--text)",
            fontSize: 15,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            resize: "none",
            outline: "none",
            marginBottom: 20,
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => {
              if (inputText.trim()) {
                setHistory((h) => [...h, inputText.trim()]);
                setInputText("");
              }
            }}
            className="btn btn-primary"
            style={{ padding: "12px 28px", fontSize: 13 }}
          >
            Отправить →
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(14,165,233,0.1)",
                color: "var(--accent)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {lang}
            </span>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(123, 94, 234, 0.1)",
                color: "var(--purple)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              AI
            </span>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h4
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--textSecondary)",
                marginBottom: 12,
              }}
            >
              История
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((h, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radiusSm)",
                    background: "#FFFFFF",
                    border: "1px solid rgba(14,165,233,0.12)",
                    fontSize: 14,
                    color: "#075985",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
