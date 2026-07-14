"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Ошибка отправки. Попробуйте позже.");
    }
  }

  return (
    <div style={styles.page}>
      <div className="container" style={{ maxWidth: 560 }}>
        <Link href="/" style={styles.backLink}>
          ← На главную
        </Link>
        <h1 style={styles.title}>Связаться с нами</h1>

        {sent ? (
          <div style={styles.card}>
            <p style={{ fontSize: 16, color: "var(--heading)", marginBottom: 8 }}>
              Сообщение отправлено!
            </p>
            <p style={{ fontSize: 14, color: "var(--textSecondary)" }}>
              Мы ответим вам в ближайшее время.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.card}>
            <div style={styles.field}>
              <label style={styles.label}>Имя</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                placeholder="Ваше имя"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="you@example.com"
                type="email"
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Сообщение</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ ...styles.input, minHeight: 140, resize: "vertical" }}
                placeholder="Опишите ваш вопрос или предложение"
                required
              />
            </div>
            {error && <p style={{ color: "var(--sos)", fontSize: 14 }}>{error}</p>}
            <button type="submit" style={styles.button}>
              Отправить
            </button>
          </form>
        )}
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
    marginBottom: 32,
  },
  card: {
    background: "var(--bgCard)",
    borderRadius: 20,
    padding: "32px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--heading)",
  },
  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid var(--card)",
    background: "var(--background)",
    fontSize: 15,
    color: "var(--heading)",
    outline: "none",
    fontFamily: "inherit",
  },
  button: {
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: "var(--button)",
    color: "var(--white)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
};
