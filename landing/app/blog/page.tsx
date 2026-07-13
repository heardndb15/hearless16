import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Блог — Hearless",
};

const POSTS = [
  {
    slug: "kak-rabotaet-raspoznavanie-zhestov",
    title: "Как работает распознавание жестов в Hearless",
    excerpt: "Рассказываем о технологии компьютерного зрения, которая лежит в основе распознавания казахского жестового языка.",
    date: "10 июня 2026",
    author: "Команда Hearless",
  },
  {
    slug: "sovety-po-obshcheniyu-s-gluhimi",
    title: "Советы по общению с глухими и слабослышащими людьми",
    excerpt: "Простые правила, которые помогут сделать общение комфортным и уважительным.",
    date: "3 июня 2026",
    author: "Команда Hearless",
  },
  {
    slug: "chto-takoe-ai-subtitry",
    title: "Что такое AI-субтитры и как они работают",
    excerpt: "Объясняем технологию OpenAI Whisper, которая используется для преобразования речи в текст в реальном времени.",
    date: "25 мая 2026",
    author: "Команда Hearless",
  },
  {
    slug: "zapusk-hearless",
    title: "Запуск Hearless — наш путь к доступности",
    excerpt: "История создания приложения, которое помогает глухим и слабослышащим людям по всему Казахстану.",
    date: "15 мая 2026",
    author: "Команда Hearless",
  },
];

export default function BlogPage() {
  return (
    <div style={styles.page}>
      <div className="container" style={{ maxWidth: 720 }}>
        <Link href="/" style={styles.backLink}>
          ← На главную
        </Link>
        <h1 style={styles.title}>Блог Hearless</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={styles.card}
            >
              <div style={styles.meta}>
                <span>{post.date}</span>
                <span> · </span>
                <span>{post.author}</span>
              </div>
              <h2 style={styles.postTitle}>{post.title}</h2>
              <p style={styles.excerpt}>{post.excerpt}</p>
            </Link>
          ))}
        </div>
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
    borderRadius: 16,
    padding: "24px",
    textDecoration: "none",
    display: "block",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  meta: {
    fontSize: 13,
    color: "var(--textSecondary)",
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--heading)",
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 14,
    color: "var(--textSecondary)",
    lineHeight: 1.6,
  },
};
