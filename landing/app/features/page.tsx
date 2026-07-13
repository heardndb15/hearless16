import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Возможности — Hearless",
};

const FEATURES = [
  {
    icon: "💬",
    title: "Субтитры в реальном времени",
    description:
      "Преобразование речи в текст с помощью OpenAI Whisper. Просто нажмите кнопку записи и говорите. Идеально для разговоров, лекций и встреч.",
    details: [
      "Распознавание на русском и казахском языках",
      "Потоковый режим с низкой задержкой",
      "История всех субтитров сохраняется",
    ],
  },
  {
    icon: "🤟",
    title: "Жестовый язык",
    description:
      "Каталог жестов казахского жестового языка с изображениями. Практикуйте жесты через камеру и получайте обратную связь от ИИ.",
    details: [
      "20 базовых жестов в 5 категориях",
      "Распознавание жестов через камеру",
      "Прогресс и статистика изучения",
      "Система ежедневных целей",
    ],
  },
  {
    icon: "🔔",
    title: "Звуковые алерты",
    description:
      "Приложение определяет важные звуки вокруг вас и уведомляет о них. Больше никаких пропущенных звонков или сигналов.",
    details: [
      "Пожарная сигнализация",
      "Дверной звонок",
      "Плач ребёнка",
      "Звук автомобиля",
      "Телефонный звонок",
    ],
  },
  {
    icon: "🔊",
    title: "Текст → Речь",
    description:
      "Введите текст — устройство озвучит его вслух с помощью ИИ, чтобы вы могли общаться со слышащими собеседниками.",
    details: [
      "Поддержка казахского, русского и английского",
      "Естественное звучание на основе ИИ",
      "Готовые фразы для быстрого общения",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div style={styles.page}>
      <div className="container" style={{ maxWidth: 800 }}>
        <Link href="/" style={styles.backLink}>
          ← На главную
        </Link>
        <h1 style={styles.title}>Все возможности Hearless</h1>

        {FEATURES.map((feature) => (
          <div key={feature.title} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.icon}>{feature.icon}</span>
              <h2 style={styles.cardTitle}>{feature.title}</h2>
            </div>
            <p style={styles.cardDesc}>{feature.description}</p>
            <ul style={styles.list}>
              {feature.details.map((item) => (
                <li key={item} style={styles.listItem}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--gradient-soft)",
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
  card: {
    background: "var(--white)",
    borderRadius: 20,
    padding: "32px",
    marginBottom: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: "var(--heading)",
  },
  cardDesc: {
    fontSize: 15,
    color: "#5a7a8f",
    lineHeight: 1.6,
    marginBottom: 16,
  },
  list: {
    listStyle: "none",
    padding: 0,
  },
  listItem: {
    padding: "6px 0",
    fontSize: 14,
    color: "var(--heading)",
    paddingLeft: 20,
    position: "relative",
  },
};
