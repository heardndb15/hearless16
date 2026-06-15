"use client";

const FEATURES = [
  {
    icon: "💬",
    title: "AI-субтитры",
    desc: "Речь → текст в реальном времени на казахском, русском и английском. Автоопределение языка и перевод.",
    color: "var(--accent)",
    span: "wide",
  },
  {
    icon: "🔔",
    title: "Умные оповещения",
    desc: "Распознаёт пожар, звонок, плач, лай, сирену, стекло. Уведомляет вибрацией и вспышкой.",
    color: "var(--sos)",
    span: "normal",
  },
  {
    icon: "🤟",
    title: "Изучение жестов",
    desc: "Алфавит, цифры, слова. Уровни: начальный, средний, продвинутый. С AI-преподавателем.",
    color: "var(--purple)",
    span: "normal",
  },
  {
    icon: "🎓",
    title: "AI-преподаватель",
    desc: "Чат с ИИ, видеоразборы, тесты, анимации. Отслеживает твой прогресс и подбирает уроки.",
    color: "var(--purple)",
    span: "normal",
  },
  {
    icon: "📷",
    title: "Камера → Текст",
    desc: "Распознавание жестов через камеру в реальном времени. Мгновенная обратная связь от ИИ.",
    color: "var(--accent)",
    span: "normal",
  },
  {
    icon: "👤",
    title: "Текст → Жесты",
    desc: "Введи текст — 3D-аватар покажет его на жестовом языке. Поддержка КАЗ / РУС / ENG.",
    color: "var(--accent)",
    span: "normal",
  },
  {
    icon: "🆘",
    title: "Экстренная помощь",
    desc: "SOS-кнопка с геолокацией. Экстренный чат. Мгновенное уведомление родственников.",
    color: "var(--sos)",
    span: "normal",
  },
  {
    icon: "🏆",
    title: "Геймификация",
    desc: "XP, стрики, ачивки, ежедневные задания, уровни. Учиться — весело!",
    color: "var(--success)",
    span: "normal",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features">
      <div className="container">
        <div style={{ marginBottom: 56 }}>
          <div className="section-label">Возможности</div>
          <h2 className="section-title">
            Всё, что нужно для{" "}
            <span className="gradient-text">доступного мира</span>
          </h2>
          <p className="section-subtitle">
            Восемь ключевых функций, которые превращают твой смартфон в мост между
            миром звуков и тишины.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {FEATURES.map((feat, i) => {
            const colSpan =
              feat.span === "wide" ? "1 / -1" : undefined;
            const gridColumn = colSpan;

            return (
              <div
                key={feat.title}
                style={{
                  gridColumn,
                  background: "var(--bgCard)",
                  borderRadius: "var(--radius)",
                  padding: "32px 28px",
                  border: "1px solid var(--border)",
                  transition: "all 0.3s ease",
                  cursor: "default",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = feat.color;
                  e.currentTarget.style.background = "var(--bgCardHover)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bgCard)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Glow dot */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: feat.color + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    marginBottom: 18,
                  }}
                >
                  {feat.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 10,
                  }}
                >
                  {feat.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--textSecondary)", lineHeight: 1.7 }}>
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
