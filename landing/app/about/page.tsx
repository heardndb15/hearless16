import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О проекте — Hearless",
};

export default function AboutPage() {
  return (
    <div style={styles.page}>
      <div className="container" style={{ maxWidth: 720 }}>
        <Link href="/" style={styles.backLink}>
          ← На главную
        </Link>
        <h1 style={styles.title}>О проекте Hearless</h1>

        <section style={styles.section}>
          <h2 style={styles.heading}>Миссия</h2>
          <p style={styles.text}>
            Hearless — это приложение, созданное для глухих и слабослышащих людей. Мы используем
            искусственный интеллект, чтобы сделать мир звуков доступным каждому.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Что мы делаем</h2>
          <p style={styles.text}>
            Наше приложение переводит речь в текст в реальном времени, распознаёт важные звуки
            (пожарная сигнализация, дверной звонок, плач ребёнка) и помогает изучать жестовый язык
            через камеру.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Технологии</h2>
          <p style={styles.text}>
            Hearless построен на современных AI-технологиях: OpenAI Whisper для распознавания речи,
            компьютерное зрение для жестового языка, и нейросети для классификации звуков.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.heading}>Для кого</h2>
          <p style={styles.text}>
            Приложение предназначено для глухих и слабослышащих людей, их родных и близких,
            а также для всех, кто хочет изучать жестовый язык.
          </p>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--background)",
    padding: "60px 20px",
  },
  backLink: {
    color: "var(--accent)",
    textDecoration: "underline",
    fontSize: 14,
    display: "inline-block",
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "var(--heading)",
    marginBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  heading: {
    fontSize: 22,
    fontWeight: 600,
    color: "var(--heading)",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: "var(--textSecondary)",
    lineHeight: 1.7,
  },
};
