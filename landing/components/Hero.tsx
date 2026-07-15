"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";

const subtitles = [
  "Сәлеметсіз бе! Менің атым Айгүл.",
  "Здравствуйте! Меня зовут Айгуль.",
  "Hello! My name is Aigul.",
  "Распознавание речи...",
  "Автоопределение языка: казахский",
];

export default function Hero() {
  const { t } = useLanguage();
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
        paddingTop: "clamp(100px, 14vw, 160px)",
        paddingBottom: "clamp(60px, 8vw, 100px)",
        overflow: "hidden",
      }}
    >
      <div className="container hero-grid">
        <div>
          <div className="section-label">{t.hero.label}</div>
          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(40px, 6vw, 68px)",
              lineHeight: 1.08,
              color: "var(--text)",
              marginBottom: 24,
            }}
          >
            {t.hero.title1}
            <br />
            <span className="gradient-text">{t.hero.title2}</span>
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
            {t.hero.desc}
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="/register" style={{ fontSize: 15, padding: "16px 36px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "var(--gradient-accent)", color: "var(--white)", border: "none", transition: "all 0.3s ease" }}>
              {t.hero.cta1}
              <span style={{ fontSize: 18 }}>→</span>
            </a>
            <a href="/features" style={{ fontSize: 15, padding: "16px 36px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, textDecoration: "none", background: "var(--bgCard)", color: "var(--accent)", border: "1.5px solid var(--border)", transition: "all 0.3s ease" }}>
              {t.hero.cta2}
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
            {t.hero.stats.map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: "var(--textSecondary)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="hero-phone-col"
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
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
              boxShadow: "var(--shadow)",
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
                {t.hero.aiListening}
              </div>
            </div>

            {/* Live subtitle area */}
            <div
              style={{
                flex: 1,
                background: "#FFFFFF",
                borderRadius: 16,
                border: "1.5px solid var(--border)",
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0, 0, 0,0.08)",
                zIndex: 5,
              }}
            >
              {/* Rolling lines preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "flex-end", marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "var(--border)", transform: "scale(0.95)", transformOrigin: "left" }}>
                  Здравствуйте! Меня зовут...
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--accent)",
                  lineHeight: 1.4,
                  textShadow: "none"
                }}>
                  {displayText}
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 14,
                      background: "var(--accent)",
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
                      background: "var(--accent)",
                      opacity: 0.9,
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
