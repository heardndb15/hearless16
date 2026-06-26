"use client";

import Link from "next/link";

const FEATURES = [
  { icon: "💬", title: "AI-субтитры", desc: "Речь → текст в реальном времени на казахском, русском и английском. Автоопределение языка и перевод.", color: "var(--accent)", span: "wide", href: "/subtitles" },
  { icon: "🔔", title: "Умные оповещения", desc: "Распознаёт пожар, звонок, плач, лай, сирену, стекло. Уведомляет вибрацией и вспышкой.", color: "var(--sos)", span: "normal", href: "/alerts" },
  { icon: "🤟", title: "Изучение жестов", desc: "Алфавит, цифры, слова. Уровни: начальный, средний, продвинутый. С AI-преподавателем.", color: "var(--purple)", span: "normal", href: "/sign-language" },
  { icon: "🎓", title: "AI-преподаватель", desc: "Чат с ИИ, видеоразборы, тесты, анимации. Отслеживает твой прогресс и подбирает уроки.", color: "var(--purple)", span: "normal", href: "/ai-tutor" },
  { icon: "📷", title: "Камера → Текст", desc: "Распознавание жестов через камеру в реальном времени. Мгновенная обратная связь от ИИ.", color: "var(--accent)", span: "normal", href: "/camera-to-text" },
  { icon: "👤", title: "Текст → Жесты", desc: "Введи текст — 3D-аватар покажет его на жестовом языке. Поддержка КАЗ / РУС / ENG.", color: "var(--accent)", span: "normal", href: "/text-to-sign" },
  { icon: "🏆", title: "Геймификация", desc: "XP, стрики, ачивки, ежедневные задания, уровни. Учиться — весело!", color: "var(--success)", span: "normal", href: "/gamification" },
];

export default function FeaturesSection() {
  return (
    <section id="features">
      <div className="container">
        <div style={{ marginBottom: 56 }}>
          <div className="section-label">Возможности</div>
          <h2 className="section-title">
            Всё, что нужно для{" "}
            <span style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>доступного мира</span>
          </h2>
          <p className="section-subtitle">
            Семь ключевых функций, которые превращают твой смартфон в мост между
            миром звуков и тишины. Нажми на карточку, чтобы узнать больше.
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((feat) => (
            <Link
              key={feat.title}
              href={feat.href}
              style={{
                gridColumn: feat.span === "wide" ? "1 / -1" : undefined,
                background: "#FFFFFF",
                borderRadius: "var(--radius)",
                padding: "32px 28px",
                border: "1px solid rgba(14,165,233,0.12)",
                boxShadow: "0 2px 16px rgba(14,165,233,0.07)",
                transition: "all 0.3s ease",
                textDecoration: "none",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)";
                e.currentTarget.style.background = "#F0F9FF";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(14,165,233,0.12)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(14,165,233,0.12)";
                e.currentTarget.style.background = "#FFFFFF";
                e.currentTarget.style.boxShadow = "0 2px 16px rgba(14,165,233,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "#E0F2FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>
                {feat.icon}
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "#0C4A6E", marginBottom: 10 }}>
                {feat.title}
              </h3>
              <p style={{ fontSize: 14, color: "#075985", lineHeight: 1.7 }}>
                {feat.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
