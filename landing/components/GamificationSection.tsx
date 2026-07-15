"use client";

import { useLanguage } from "../lib/LanguageContext";

export default function GamificationSection() {
  const { t } = useLanguage();
  const colors = ["var(--accent)", "var(--accent)", "var(--success)", "var(--accent)"];
  const achievements = t.gamificationSection.achievements.map((a, i) => ({ ...a, color: colors[i] }));

  return (
    <section id="gamification">
      <div className="container">
        <div style={{ marginBottom: 48 }}>
          <div className="section-label">{t.gamificationSection.label}</div>
          <h2 className="section-title">
            {t.gamificationSection.title}<span style={{ color: "var(--accent)" }}>{t.gamificationSection.titleHighlight}</span>{t.gamificationSection.titleSuffix}
          </h2>
          <p className="section-subtitle" style={{ color: "var(--textSecondary)" }}>
            {t.gamificationSection.subtitle}
          </p>
        </div>

        <div className="gamification-grid">
          {/* User card */}
          <div
            style={{
              background: "var(--bgCard)",
              borderRadius: "var(--radius)",
              padding: "32px 28px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
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
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--white)",
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
                  {t.gamificationSection.levelLabel}
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
                {t.gamificationSection.xpToNext}
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
              {t.gamificationSection.stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    textAlign: "center",
                    padding: "14px 8px",
                    borderRadius: "var(--radiusSm)",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
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
                border: "1px solid var(--border)",
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
                  {t.gamificationSection.dailyQuestLabel}
                </span>
                <span style={{ fontSize: 12, color: "var(--accent)" }}>
                  +50 XP
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--textSecondary)" }}>
                {t.gamificationSection.dailyQuestDesc}
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
                  background: "var(--bgCard)",
                  borderRadius: "var(--radius)",
                  padding: "24px 20px",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow)",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = a.color;
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
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
                  {t.gamificationSection.achievementCaption}
                </div>
              </div>
            ))}
            {/* signup CTA mini */}
            <div
              style={{
                gridColumn: "1 / -1",
                borderRadius: "var(--radius)",
                padding: "20px 24px",
                background: "var(--accent)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--white)",
                  marginBottom: 4,
                }}
              >
                {t.gamificationSection.ctaMiniTitle}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                {t.gamificationSection.ctaMiniDesc}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
