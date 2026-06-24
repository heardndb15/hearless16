"use client";

import { useState } from "react";

const SOUNDS = [
  { label: "Пожарная сигнализация", icon: "🔥", active: false },
  { label: "Дверной звонок", icon: "🔔", active: false },
  { label: "Плач ребёнка", icon: "👶", active: false },
  { label: "Лай собаки", icon: "🐕", active: false },
  { label: "Сирена", icon: "🚨", active: false },
  { label: "Разбитие стекла", icon: "💥", active: false },
];

export default function SoundIndicators() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <section id="sounds">
      <div className="container">
        <div style={{ marginBottom: 48 }}>
          <div className="section-label" style={{ color: "rgba(255,255,255,0.9)" }}>Звуковой AI</div>
          <h2 className="section-title" style={{ color: "#ffffff" }}>
            Умная система <span style={{ background: "linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>оповещений</span>
          </h2>
          <p className="section-subtitle" style={{ color: "rgba(255,255,255,0.8)" }}>
            Hearless распознаёт важные звуки вокруг и уведомляет тебя вибрацией и
            вспышкой. Наведи курсор на звук — увидишь индикатор.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 14,
          }}
        >
          {SOUNDS.map((s, i) => (
            <div
              key={s.label}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderRadius: "var(--radius)",
                padding: "24px 20px",
                border:
                  activeIdx === i
                    ? "1.5px solid var(--accent)"
                    : "1.5px solid rgba(255,255,255,0.6)",
                boxShadow: "0 8px 20px rgba(2,136,209,0.18)",
                transition: "all 0.3s ease",
                cursor: "default",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Sound wave animation */}
              <div
                style={{
                  display: "flex",
                  gap: 3,
                  alignItems: "flex-end",
                  height: 32,
                  marginBottom: 16,
                }}
              >
                {[4, 8, 6, 14, 10, 18, 8, 12, 6, 10].map((h, j) => (
                  <div
                    key={j}
                    style={{
                      flex: 1,
                      height: activeIdx === i ? h : 4,
                      borderRadius: "2px 2px 0 0",
                      background:
                        activeIdx === i ? "var(--accent)" : "var(--border)",
                      transition: "all 0.3s ease",
                      animation:
                        activeIdx === i
                          ? `sound-pulse ${0.6 + j * 0.05}s ease-in-out infinite`
                          : "none",
                      animationDelay: activeIdx === i ? `${j * 0.05}s` : "0s",
                    }}
                  />
                ))}
              </div>

              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0D47A1",
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: 12,
                  color: activeIdx === i ? "var(--accent)" : "var(--textMuted)",
                  transition: "color 0.3s",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: activeIdx === i ? "var(--accent)" : "var(--textMuted)",
                    transition: "all 0.3s",
                    boxShadow:
                      activeIdx === i
                        ? "0 0 8px var(--accent)"
                        : "none",
                  }}
                />
                {activeIdx === i ? "Распознано" : "Ожидание..."}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
