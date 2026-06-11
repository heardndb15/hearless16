const FEATURES = [
  {
    icon: "💬",
    title: "Субтитры в реальном времени",
    description:
      "Преобразование речи в текст с помощью OpenAI Whisper. Просто нажмите кнопку записи и говорите.",
  },
  {
    icon: "🤟",
    title: "Жестовый язык",
    description:
      "Каталог жестов казахского жестового языка с изображениями и практикой через камеру.",
  },
  {
    icon: "🔔",
    title: "Звуковые алерты",
    description:
      "Определяет важные звуки: пожарную сигнализацию, звонок в дверь, плач ребёнка и другие.",
  },
  {
    icon: "🆘",
    title: "SOS — кнопка помощи",
    description:
      "Отправка сигнала бедствия с геолокацией вашим близким в экстренной ситуации.",
  },
];

export default function Features() {
  return (
    <section id="features" style={{ background: "var(--white)" }}>
      <div className="container">
        <h2
          style={{
            textAlign: "center",
            fontSize: 36,
            fontWeight: "bold",
            color: "var(--heading)",
            marginBottom: 48,
          }}
        >
          Возможности сервиса
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              style={{
                background: "var(--card)",
                borderRadius: 20,
                padding: 32,
                textAlign: "center",
                transition: "transform 0.3s",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{feature.icon}</div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  color: "var(--heading)",
                  marginBottom: 12,
                }}
              >
                {feature.title}
              </h3>
              <p style={{ fontSize: 14, color: "#5a7a8f", lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
