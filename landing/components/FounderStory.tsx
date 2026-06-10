export default function FounderStory() {
  return (
    <section id="story" style={{ background: "var(--white)" }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 36,
            fontWeight: "bold",
            color: "var(--heading)",
            marginBottom: 32,
          }}
        >
          История создания
        </h2>
        <div
          style={{
            background: "var(--card)",
            borderRadius: 20,
            padding: 40,
            fontSize: 16,
            color: "var(--heading)",
            lineHeight: 1.8,
          }}
        >
          <p style={{ marginBottom: 16 }}>
            Идея Hearless родилась из личного опыта. Мой близкий друг,
            родившийся глухим, каждый день сталкивался с барьерами в общении.
            Он не мог услышать пожарную сигнализацию, пропускал звонки в дверь
            и был вынужден постоянно просить помощи у окружающих.
          </p>
          <p style={{ marginBottom: 16 }}>
            Я понял, что современные технологии могут решить эти проблемы.
            Используя Whisper от OpenAI для распознавания речи, камеру смартфона
            для жестового языка и нейросети для классификации звуков — мы
            создали Hearless.
          </p>
          <p>
            Наша миссия — сделать мир звуков доступным для каждого,
            независимо от его физических возможностей.
          </p>
          <div
            style={{
              marginTop: 24,
              fontStyle: "italic",
              color: "var(--accent)",
              fontWeight: "600",
            }}
          >
            — Основатель Hearless
          </div>
        </div>
      </div>
    </section>
  );
}
