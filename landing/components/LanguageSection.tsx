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
          <div className="section-label" style={{ color: "rgba(255,255,255,0.9)" }}>Языки</div>
          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Три языка. Один <span style={{ background: "linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>голос</span>.
          </h2>
          <p className="section-subtitle" style={{ color: "rgba(255,255,255,0.8)" }}>
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
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderRadius: "var(--radius)",
                padding: "32px 28px",
                border: "1.5px solid rgba(255,255,255,0.6)",
                boxShadow: "0 8px 20px rgba(2,136,209,0.18)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Language code badge */}
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: 3,
                  marginBottom: 16,
                }}
              >
                {l.code}
              </div>
              <h3
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#0D47A1",
                  marginBottom: 12,
                }}
              >
                {l.name}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#1E6FA8",
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
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#0D47A1",
                  }}
                >
                  {l.stat}
                </span>
                <span style={{ fontSize: 13, color: "#1565C0" }}>
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
