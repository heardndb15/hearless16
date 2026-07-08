"use client";

import { useState } from "react";
import Link from "next/link";

const GESTURES = [
  { emoji: "🖐️", name: "Привет", confidence: 94 },
  { emoji: "👍", name: "Хорошо", confidence: 91 },
  { emoji: "👌", name: "ОК", confidence: 88 },
  { emoji: "✌️", name: "Мир", confidence: 85 },
  { emoji: "🤟", name: "Люблю", confidence: 82 },
  { emoji: "✊", name: "Сила", confidence: 79 },
];

export default function CameraToTextPage() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 900, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">Камера → Текст</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          Распознавание жестов через камеру смартфона в реальном времени. ИИ анализирует положение рук и даёт мгновенную обратную связь.
        </p>

        {/* Camera preview */}
        <div className="camera-grid">
          <div style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 24, textAlign: "center" }}>
            <div style={{ width: "100%", aspectRatio: "4/3", borderRadius: "var(--radiusSm)", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              {/* Simulated camera view */}
              <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 80, opacity: 0.6 }}>🖐️</span>
                {/* Grid overlay */}
                <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(43,191,207,0.05) 19px, rgba(43,191,207,0.05) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(43,191,207,0.05) 19px, rgba(43,191,207,0.05) 20px)" }} />
                {/* Corner brackets */}
                <div style={{ position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTop: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", opacity: 0.6 }} />
                <div style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTop: "2px solid var(--accent)", borderRight: "2px solid var(--accent)", opacity: 0.6 }} />
                <div style={{ position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottom: "2px solid var(--accent)", borderLeft: "2px solid var(--accent)", opacity: 0.6 }} />
                <div style={{ position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottom: "2px solid var(--accent)", borderRight: "2px solid var(--accent)", opacity: 0.6 }} />
              </div>
              <button className="btn btn-primary" style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", padding: "10px 24px", fontSize: 13 }}>
                🎥 Запись
              </button>
            </div>
            <div style={{ fontSize: 14, color: "var(--textSecondary)" }}>Направь камеру на жест</div>
          </div>

          {/* Results */}
          <div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Распознанные жесты</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {GESTURES.map((g, i) => (
                <div key={g.name}
                  onMouseEnter={() => setSelected(i)}
                  onMouseLeave={() => setSelected(null)}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: "var(--radiusSm)", background: selected === i ? "var(--bgCardHover)" : "var(--bgCard)", border: selected === i ? "1px solid var(--accent)" : "1px solid var(--border)", transition: "all 0.2s ease", cursor: "default" }}>
                  <span style={{ fontSize: 28 }}>{g.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: "var(--textMuted)" }}>Уверенность: {g.confidence}%</div>
                  </div>
                  <div style={{ width: 48, height: 48, position: "relative" }}>
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
                      <circle cx="24" cy="24" r="20" fill="none" stroke="var(--success)" strokeWidth="4" strokeDasharray={`${(g.confidence / 100) * 125.6} 125.6`} strokeLinecap="round" transform="rotate(-90, 24, 24)" />
                    </svg>
                    <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{g.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[{ title: "Реальное время", desc: "Обработка каждого кадра занимает миллисекунды. Жест распознаётся мгновенно." },
            { title: "Компьютерное зрение", desc: "Нейросеть анализирует положение пальцев, ладони и их движение в пространстве." },
            { title: "Обратная связь", desc: "Ты видишь название жеста и процент уверенности. Можно повторить для улучшения." },
            { title: "Без интернета", desc: "Базовое распознавание работает офлайн на устройстве. Никакой задержки." },
          ].map(d => (
            <div key={d.title} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "24px 20px", border: "1px solid var(--border)" }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
              <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
