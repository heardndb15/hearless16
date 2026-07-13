"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

const schema = z.object({
  email: z.string().email("Некорректный email"),
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", email: data.email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Ошибка отправки");
      } else {
        setSent(true);
      }
    } catch {
      setServerError("Ошибка подключения к серверу");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link href="/" style={{ ...styles.link, marginBottom: 16, display: "inline-block" }}>
          ← На главную
        </Link>

        {sent ? (
          <>
            <h1 style={styles.title}>Письмо отправлено</h1>
            <p style={styles.text}>
              Проверьте вашу почту — мы отправили ссылку для сброса пароля.
            </p>
            <Link href="/login" style={styles.link}>
              Вернуться к входу
            </Link>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Сброс пароля</h1>
            <p style={styles.subtitle}>
              Введите email, привязанный к аккаунту. Мы отправим ссылку для сброса пароля.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  {...register("email")}
                  style={styles.input}
                  placeholder="you@example.com"
                  type="email"
                />
                {errors.email && <p style={styles.error}>{errors.email.message}</p>}
              </div>

              {serverError && <p style={styles.error}>{serverError}</p>}

              <button type="submit" disabled={isSubmitting} style={styles.button}>
                {isSubmitting ? "Отправка..." : "Отправить"}
              </button>
            </form>

            <p style={styles.footerText}>
              <Link href="/login" style={styles.link}>
                Вернуться к входу
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--gradient-soft)",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "var(--white)",
    borderRadius: 20,
    padding: "40px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "var(--heading)",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "var(--textSecondary, #5a7a8f)",
    marginBottom: 24,
  },
  text: {
    fontSize: 14,
    color: "var(--heading)",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
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
  },
  error: {
    color: "var(--sos)",
    fontSize: 13,
    marginTop: 2,
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
    marginTop: 8,
  },
  link: {
    color: "var(--accent)",
    textDecoration: "underline",
    fontSize: 14,
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    color: "var(--heading)",
    marginTop: 20,
  },
};
