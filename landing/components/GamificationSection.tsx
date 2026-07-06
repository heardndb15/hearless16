"use client";

export default function GamificationSection() {
  const achievements = [
    { icon: "🔥", label: "День 7", color: "var(--accent)" },
    { icon: "⭐", label: "50 слов", color: "var(--purple)" },
    { icon: "🏆", label: "10 уроков", color: "var(--success)" },
    { icon: "💪", label: "100 XP", color: "var(--accent)" },
  ];

  return (
    <section id="gamification">
      <div className="container">
        <div style={{ marginBottom: 48 }}>
          <div className="section-label">Геймификация</div>
          <h2 className="section-title">
            Учись, играя. <span style={{ color: "var(--accent)" }}>Прогресс</span> — это XP.
          </h2>
          <p className="section-subtitle" style={{ color: "var(--textSecondary)" }}>
            Зарабатывай XP, открывай ачивки, продлевай стрики и соревнуйся с друзьями.
            Каждый урок — это шаг к новому уровню.
          </p>
        </div>

        <div className="gamification-grid">
          {/* User card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "var(--radius)",
              padding: "32px 28px",
              border: "1px solid rgba(0, 0, 0,0.12)",
              boxShadow: "0 2px 16px rgba(0, 0, 0,0.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                A
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Айгуль
                </div>
                <div style={{ fontSize: 13, color: "var(--textSecondary)" }}>
                  Уровень 4 · Жестовед
                </div>
              </div>
            </div>

            {/* XP bar */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--textSecondary)",
                  marginBottom: 6,
                }}
              >
                <span>1,240 XP</span>
                <span>2,000 XP</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--chipBg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "62%",
                    height: "100%",
                    borderRadius: 3,
                    background: "var(--accent)",
                    animation: "xp-fill 1.5s ease-out",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--textMuted)",
                  marginTop: 4,
                }}
              >
                Ещё 760 XP до уровня 5
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                { value: "12", label: "Стрик, дней" },
                { value: "48", label: "Слов выучено" },
                { value: "3", label: "Ачивки" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    textAlign: "center",
                    padding: "14px 8px",
                    borderRadius: "var(--radiusSm)",
                    background: "var(--bg)",
                    border: "1px solid rgba(0, 0, 0,0.12)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--textMuted)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Daily quest */}
            <div
              style={{
                padding: "16px",
                borderRadius: "var(--radiusSm)",
                background: "var(--bg)",
                border: "1px solid rgba(0, 0, 0,0.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Ежедневное задание
                </span>
                <span style={{ fontSize: 12, color: "var(--accent)" }}>
                  +50 XP
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--textSecondary)" }}>
                Повтори 10 жестов из категории &laquo;Семья&raquo;
              </div>
              <div
                style={{
                  marginTop: 10,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--chipBg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "40%",
                    height: "100%",
                    borderRadius: 2,
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Achievements grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 14,
            }}
          >
            {achievements.map((a) => (
              <div
                key={a.label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "var(--radius)",
                  padding: "24px 20px",
                  border: "1px solid rgba(0, 0, 0,0.12)",
                  boxShadow: "0 2px 16px rgba(0, 0, 0,0.07)",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = a.color;
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0, 0, 0,0.12)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>{a.icon}</div>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {a.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--textSecondary)" }}>
                  Ачивка
                </div>
              </div>
            ))}
            {/* signup CTA mini */}
            <div
              style={{
                gridColumn: "1 / -1",
                borderRadius: "var(--radius)",
                padding: "20px 24px",
                background: "var(--gradient)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "white",
                  marginBottom: 4,
                }}
              >
                Начни свой путь
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                Зарабатывай XP, открывай ачивки и становись лучше каждый день.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
