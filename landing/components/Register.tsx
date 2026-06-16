"use client";

import { useState } from "react";

export default function Register() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email || !password) {
      setError("Заполните все поля");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isLogin ? "login" : "register",
          email,
          password,
          name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сервера");
      } else {
        setMessage(
          isLogin ? "Вход выполнен!" : "Регистрация успешна! Проверьте почту."
        );
      }
    } catch {
      setError("Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="register" style={{ background: "var(--white)" }}>
      <div className="container" style={{ maxWidth: 480 }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 36,
            fontWeight: "bold",
            color: "var(--heading)",
            marginBottom: 32,
          }}
        >
          {isLogin ? "Войти" : "Создать аккаунт"}
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--card)",
            borderRadius: 20,
            padding: 40,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {!isLogin && (
            <input
              type="text"
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          {error && (
            <p style={{ color: "var(--sos)", fontSize: 14, textAlign: "center" }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ color: "green", fontSize: 14, textAlign: "center" }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              border: "none",
              cursor: loading ? "wait" : "pointer",
              fontSize: 16,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--textSecondary)" }}>
            {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "underline",
              }}
            >
              {isLogin ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: "var(--background)",
  fontSize: 16,
  color: "var(--heading)",
  outline: "none",
};
