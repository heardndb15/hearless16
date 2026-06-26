"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

const schema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [serverError, setServerError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

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
        body: JSON.stringify({ action: "login", email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Ошибка входа");
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setServerError("Ошибка подключения к серверу");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "google" }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      setServerError("Ошибка входа через Google");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link href="/" style={{ ...styles.link, marginBottom: 16, display: "inline-block" }}>
          ← На главную
        </Link>
        <h1 style={styles.title}>Войти</h1>
        <p style={styles.subtitle}>Добро пожаловать в Hearless</p>

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

          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input
              {...register("password")}
              style={styles.input}
              placeholder="Ваш пароль"
              type="password"
            />
            {errors.password && <p style={styles.error}>{errors.password.message}</p>}
          </div>

          {serverError && <p style={styles.error}>{serverError}</p>}

          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? "Вход..." : "Войти"}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>или</span>
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={styles.googleButton}
        >
          <span style={{ fontSize: 20, marginRight: 8 }}>G</span>
          {googleLoading ? "Загрузка..." : "Войти через Google"}
        </button>

        <p style={styles.footerText}>
          <Link href="/reset-password" style={styles.link}>
            Забыли пароль?
          </Link>
        </p>

        <p style={styles.footerText}>
          Нет аккаунта?{" "}
          <Link href="/register" style={styles.link}>
            Зарегистрироваться
          </Link>
        </p>
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
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "var(--bgCard)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: 20,
    padding: "40px",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "var(--text)",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "var(--textSecondary)",
    marginBottom: 24,
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
    color: "var(--text)",
  },
  input: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "rgba(14, 165, 233, 0.05)",
    fontSize: 15,
    color: "var(--text)",
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
    background: "#0277BD",
    color: "var(--text)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
  },
  divider: {
    textAlign: "center",
    margin: "20px 0",
    borderBottom: "1px solid rgba(255,255,255,0.5)",
    lineHeight: "0.1em",
  },
  dividerText: {
    background: "var(--bgCard)",
    padding: "0 10px",
    fontSize: 13,
    color: "var(--textSecondary)",
  },
  googleButton: {
    width: "100%",
    padding: "12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "rgba(14, 165, 233, 0.05)",
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    color: "#0288D1",
    textDecoration: "underline",
    fontSize: 14,
  },
  footerText: {
    textAlign: "center",
    fontSize: 14,
    color: "var(--text)",
    marginTop: 16,
  },
};
