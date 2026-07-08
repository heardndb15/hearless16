"use client";

import { useState } from "react";
import Link from "next/link";

const SOUNDS = [
  { icon: "🔥", label: "Пожарная сигнализация", desc: "Резкий, прерывистый звук на высокой частоте. Hearless отличает пожарную сигнализацию от других звуков.", freq: "3–5 кГц" },
  { icon: "🔔", label: "Дверной звонок", desc: "Короткий или повторяющийся звонок. Приложение оповестит вибрацией, если кто-то пришёл.", freq: "1–2 кГц" },
  { icon: "👶", label: "Плач ребёнка", desc: "Высокочастотный, модулированный звук. Распознаётся даже через стены.", freq: "300–600 Гц" },
  { icon: "🐕", label: "Лай собаки", desc: "Отрывистый, повторяющийся звук. Оповещение с указанием направления.", freq: "200–800 Гц" },
  { icon: "🚨", label: "Сирена", desc: "Циклический звук с изменяющейся высотой. Идентификация машины экстренной службы.", freq: "500–1500 Гц" },
  { icon: "💥", label: "Разбитие стекла", desc: "Резкий высокочастотный звук удара и дребезга. Быстрое оповещение.", freq: "4–8 кГц" },
];

export default function AlertsPage() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 900, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">Умная система оповещений</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          Hearless распознаёт важные звуки вокруг и мгновенно уведомляет вибрацией и вспышкой. Наведи на звук — увидишь детали.
        </p>

        <div style={{ marginTop: 40 }}>
          {SOUNDS.map((s, i) => (
            <div key={s.label}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{ display: "flex", alignItems: "flex-start", gap: 24, padding: "24px 20px", borderRadius: "var(--radius)", border: active === i ? "1px solid var(--accent)" : "1px solid var(--border)", background: active === i ? "var(--bgCardHover)" : "var(--bgCard)", marginBottom: 12, transition: "all 0.3s ease", cursor: "default" }}>
              <div style={{ fontSize: 36, minWidth: 48, textAlign: "center" }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 600, color: "var(--text)" }}>{s.label}</h3>
                  <span style={{ fontSize: 11, color: "var(--textMuted)", background: "var(--bg)", padding: "4px 10px", borderRadius: 6 }}>{s.freq}</span>
                </div>
                <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>{s.desc}</p>
                {active === i && (
                  <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 24, marginTop: 12 }}>
                    {[6, 10, 8, 16, 12, 20, 10, 14, 8, 12].map((h, j) => (
                      <div key={j} style={{ flex: 1, height: h, borderRadius: "2px 2px 0 0", background: "var(--accent)", opacity: 0.6, animation: `sound-pulse ${0.6 + j * 0.05}s ease-in-out infinite`, animationDelay: `${j * 0.05}s` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Как это работает</h2>
          <div className="alerts-steps-grid">
            {[{ step: "01", title: "Запись звука", desc: "Микрофон телефона постоянно слушает окружающую обстановку. Все данные обрабатываются локально." },
              { step: "02", title: "AI-анализ", desc: "Нейросеть классифицирует звук по спектру, частоте и длительности. Точность >95%." },
              { step: "03", title: "Оповещение", desc: "Вибрация, вспышка камеры и push-уведомление. Ничего не пропустишь." },
            ].map(d => (
              <div key={d.step} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "28px 24px", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--accent)", opacity: 0.3, marginBottom: 12 }}>{d.step}</div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{d.title}</h3>
                <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
