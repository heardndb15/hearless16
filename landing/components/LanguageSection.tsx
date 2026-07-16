"use client";

import { useLanguage } from "../lib/LanguageContext";

export default function LanguageSection() {
  const { t } = useLanguage();
  const langs = [
    {
      code: "ҚАЗ",
      name: "Қазақ тілі",
      desc: "Қазақ тіліне толық қолдау: субтитрлер, аударма, ишара тілі. Қазақ тіліндегі алғашқы ЖИ платформасы.",
      stat: "12M+",
      statLabel: "сөйлеушілер",
    },
    {
      code: "РУС",
      name: "Русский язык",
      desc: "Распознавание речи, AI-субтитры и обучение жестовому языку на русском. Автоопределение языка.",
      stat: "8M+",
      statLabel: "пользователей в РК",
    },
    {
      code: "ENG",
      name: "English",
      desc: "Full support for English: real-time subtitles, sound alerts, sign language learning with AI tutor.",
      stat: "1.5B+",
      statLabel: "global speakers",
    },
  ];

  return (
    <section id="languages">
      <div className="container">
        <div style={{ marginBottom: 48 }}>
          <div className="section-label">{t.languageSection.label}</div>
          <h2 className="section-title">
            {t.languageSection.title} <span style={{ color: "var(--accent)" }}>{t.languageSection.titleHighlight}</span>.
          </h2>
          <p className="section-subtitle" style={{ color: "var(--textSecondary)" }}>
            {t.languageSection.subtitle}
          </p>
        </div>

        <div className="lang-grid">
          {langs.map((l) => (
            <div
              key={l.code}
              className="glass-card"
              style={{
                borderRadius: "var(--radius)",
                padding: "32px 28px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Language code badge */}
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: 3,
                  marginBottom: 16,
                  background: "var(--chipBg)",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                {l.code}
              </div>
              <h3
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 12,
                }}
              >
                {l.name}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--textSecondary)",
                  lineHeight: 1.7,
                  marginBottom: 24,
                }}
              >
                {l.desc}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {l.stat}
                </span>
                <span style={{ fontSize: 13, color: "var(--textSecondary)" }}>
                  {l.statLabel}
                </span>
              </div>

              {/* Decorative gradient line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "var(--accent)",
                  opacity: 0.5,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
