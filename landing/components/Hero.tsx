export default function Hero() {
  return (
    <section
      style={{
        textAlign: "center",
        paddingTop: 120,
        paddingBottom: 80,
      }}
    >
      <div className="container">
        <h1
          style={{
            fontSize: 56,
            fontWeight: "bold",
            color: "var(--heading)",
            marginBottom: 20,
            lineHeight: 1.2,
          }}
        >
          Мир звуков —
          <br />
          <span style={{ color: "var(--accent)" }}>теперь доступен каждому</span>
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "#5a7a8f",
            maxWidth: 600,
            margin: "0 auto 40px",
          }}
        >
          Hearless переводит речь в текст, распознаёт звуки и помогает изучать
          жестовый язык с помощью искусственного интеллекта.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <a href="#download" className="btn btn-primary">
            Скачать приложение
          </a>
          <a href="#features" className="btn btn-outline">
            Узнать больше
          </a>
        </div>
      </div>
    </section>
  );
}
