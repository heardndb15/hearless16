"use client";

import { useState, useEffect } from "react";

const subtitles = [
  "Сәлеметсіз бе! Менің атым Айгүл.",
  "Здравствуйте! Меня зовут Айгуль.",
  "Hello! My name is Aigul.",
  "Распознавание речи...",
  "Автоопределение языка: казахский",
];

export default function Hero() {
  const [subIndex, setSubIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    const current = subtitles[subIndex];
    if (charIndex < current.length) {
      const timer = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, 40);
      return () => clearTimeout(timer);
    }
    const pause = setTimeout(() => {
      setSubIndex((i) => (i + 1) % subtitles.length);
      setCharIndex(0);
      setDisplayText("");
    }, 2500);
    return () => clearTimeout(pause);
  }, [charIndex, subIndex]);

  return (
    <section
      style={{
        paddingTop: 160,
        paddingBottom: 100,
        overflow: "hidden",
      }}
    >
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 60,
          alignItems: "center",
        }}
      >
        <div>
          <div className="section-label">AI-платформа</div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(40px, 6vw, 68px)",
              lineHeight: 1.08,
              color: "var(--text)",
              marginBottom: 24,
            }}
          >
            Мир звуков —
            <br />
            <span className="gradient-text">теперь доступен каждому</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "var(--textSecondary)",
              lineHeight: 1.7,
              maxWidth: 480,
              marginBottom: 36,
            }}
          >
            Первая AI-платформа в Казахстане и Центральной Азии для глухих и
            слабослышащих. Переводим речь в текст, распознаём звуки и учим
            жестовому языку с помощью ИИ.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="/register" className="btn btn-primary" style={{ fontSize: 15, padding: "16px 36px" }}>
              Начать бесплатно
              <span style={{ fontSize: 18 }}>→</span>
            </a>
            <a href="/features" className="btn btn-outline" style={{ fontSize: 15, padding: "16px 36px" }}>
              Как это работает
            </a>
          </div>

          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 48,
              paddingTop: 32,
              borderTop: "1px solid var(--border)",
            }}
          >
            {[
              { label: "Языков", value: "3" },
              { label: "Режимов", value: "8" },
              { label: "Пользователей", value: "500+" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: "var(--textMuted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Pulsing rings */}
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              width: 440,
              height: 440,
              borderRadius: "50%",
              border: "1px solid var(--accent)",
              opacity: 0.2,
            }}
          />
          <div
            className="pulse-ring-delayed"
            style={{
              position: "absolute",
              width: 360,
              height: 360,
              borderRadius: "50%",
              border: "1px solid var(--purple)",
              opacity: 0.15,
            }}
          />
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: "50%",
              border: "1px solid var(--accent)",
              opacity: 0.1,
            }}
          />

          {/* Phone mockup */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: 260,
              height: 520,
              borderRadius: 36,
              border: "2px solid var(--border)",
              background: "url('/bg-main.png') center/cover no-repeat",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadowPhone)",
              overflow: "hidden"
            }}
          >
            {/* Status bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#64748b",
                marginBottom: 8,
                padding: "0 4px",
                fontWeight: 600,
                zIndex: 5,
              }}
            >
              <span>9:41</span>
              <span>🔊</span>
            </div>

            {/* Miniature AI Status Pill */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, zIndex: 5 }}>
              <div style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 20,
                padding: "3px 8px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 8,
                fontWeight: 800,
                color: "#4ade80",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "#4ade80" }} className="animate-pulse" />
                🎤 ИИ Слушает
              </div>
            </div>

            {/* Live subtitle area */}
            <div
              style={{
                flex: 1,
                background: "rgba(15, 23, 42, 0.85)",
                borderRadius: 18,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                zIndex: 5,
              }}
            >
              {/* Rolling lines preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "flex-end", marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255, 255, 255, 0.2)", transform: "scale(0.95)", transformOrigin: "left" }}>
                  Здравствуйте! Меня зовут...
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.4,
                  textShadow: "0 0 10px rgba(34, 211, 238, 0.4)"
                }}>
                  {displayText}
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 14,
                      background: "#22d3ee",
                      marginLeft: 2,
                      verticalAlign: "middle",
                      animation: "cursor-blink 0.8s step-end infinite",
                    }}
                  />
                </div>
              </div>

              {/* Waveform */}
              <div
                style={{
                  display: "flex",
                  gap: 2.5,
                  alignItems: "flex-end",
                  height: 18,
                }}
              >
                {[10, 16, 8, 20, 12, 6, 18, 14, 8, 16, 10, 6, 14, 20, 8, 12].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: h * 0.7,
                      background: "linear-gradient(to top, #22d3ee, #c084fc)",
                      opacity: 0.8,
                      borderRadius: "1px 1px 0 0",
                      animation: `sound-pulse ${0.8 + Math.random() * 0.6}s ease-in-out infinite`,
                      animationDelay: `${i * 0.06}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
