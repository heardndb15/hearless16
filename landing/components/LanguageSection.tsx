"use client";

export default function LanguageSection() {
  const langs = [
    {
      code: "ҚАЗ",
      name: "Қазақ тілі",
      desc: "Полная поддержка казахского языка: субтитры, перевод, жестовый язык. Первая платформа с ИИ на казахском.",
      stat: "12M+",
      statLabel: "говорящих",
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
          <div className="section-label">Языки</div>
          <h2 className="section-title">
            Три языка. Один <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>голос</span>.
          </h2>
          <p className="section-subtitle" style={{ color: "#075985" }}>
            Hearless говорит на казахском, русском и английском. Автоопределение
            языка и перевод в реальном времени.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {langs.map((l) => (
            <div
              key={l.code}
              style={{
                background: "#FFFFFF",
                borderRadius: "var(--radius)",
                padding: "32px 28px",
                border: "1px solid rgba(14,165,233,0.12)",
                boxShadow: "0 2px 16px rgba(14,165,233,0.07)",
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
                  color: "#0369A1",
                  letterSpacing: 3,
                  marginBottom: 16,
                  background: "#E0F2FE",
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
                  color: "#0C4A6E",
                  marginBottom: 12,
                }}
              >
                {l.name}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#075985",
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
                    color: "#0EA5E9",
                  }}
                >
                  {l.stat}
                </span>
                <span style={{ fontSize: 13, color: "#075985" }}>
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
                  background: "var(--gradient)",
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
