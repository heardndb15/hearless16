"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

const schema = z
  .object({
    name: z.string().min(1, "Имя обязательно").max(50, "Имя слишком длинное"),
    email: z.string().email("Некорректный email"),
    password: z.string().min(6, "Пароль должен быть не менее 6 символов"),
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
    language: z.enum(["kk", "ru"]),
    terms: z.boolean().refine((val) => val === true, { message: "Примите условия" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "google" }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setServerError(json.error || "Ошибка входа через Google");
    } catch {
      setServerError("Ошибка подключения к серверу");
    } finally {
      setGoogleLoading(false);
    }
  }

  // Предварительно кэшируем страницу личного кабинета для мгновенного перехода после регистрации
  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { language: "ru", terms: false },
  });

  async function onSubmit(data: FormData) {
    setServerError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          email: data.email,
          password: data.password,
          name: data.name,
          language: data.language,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Ошибка регистрации");
      } else {
        setSuccess(true);
        if (json.session) {
          // Сокращаем задержку с 1500мс до 600мс для ускорения редиректа
          setTimeout(() => router.push("/dashboard"), 600);
        } else {
          setConfirmationRequired(true);
        }
      }
    } catch {
      setServerError("Ошибка подключения к серверу");
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Регистрация успешна!</h1>
          {confirmationRequired ? (
            <div style={{ marginTop: 16 }}>
              <p style={styles.text}>
                На ваш email отправлено письмо для подтверждения аккаунта.
              </p>
              <p style={styles.text}>
                Пожалуйста, подтвердите email по ссылке в письме перед входом в личный кабинет.
              </p>
              <Link href="/login" style={{ ...styles.button, display: "block", textAlign: "center", textDecoration: "none", marginTop: 24 }}>
                Перейти к входу
              </Link>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <p style={styles.text}>
                Вход в личный кабинет...
              </p>
              <p style={styles.text}>
                Пожалуйста, подождите.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link href="/" style={{ ...styles.link, marginBottom: 16, display: "inline-block" }}>
          ← На главную
        </Link>
        <h1 style={styles.title}>Создать аккаунт</h1>
        <p style={styles.subtitle}>Присоединяйтесь к Hearless</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          style={styles.googleButton}
        >
          <svg style={{ flexShrink: 0 }} width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Загрузка..." : "Зарегистрироваться через Google"}
        </button>

        <div style={{ textAlign: "center", margin: "16px 0", borderBottom: "1px solid rgba(0, 0, 0,0.15)", lineHeight: "0.1em" }}>
          <span style={{ background: "var(--white)", padding: "0 10px", fontSize: 13, color: "var(--textSecondary, #5a7a8f)" }}>или заполните форму</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Имя</label>
            <input {...register("name")} style={styles.input} placeholder="Ваше имя" autoComplete="name" />
            {errors.name && <p style={styles.error}>{errors.name.message}</p>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input {...register("email")} style={styles.input} placeholder="you@example.com" type="email" autoComplete="email" />
            {errors.email && <p style={styles.error}>{errors.email.message}</p>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input {...register("password")} style={styles.input} placeholder="Не менее 6 символов" type="password" autoComplete="new-password" />
            {errors.password && <p style={styles.error}>{errors.password.message}</p>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Подтверждение пароля</label>
            <input {...register("confirmPassword")} style={styles.input} placeholder="Повторите пароль" type="password" autoComplete="new-password" />
            {errors.confirmPassword && <p style={styles.error}>{errors.confirmPassword.message}</p>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Язык интерфейса</label>
            <select {...register("language")} style={styles.input}>
              <option value="ru">Русский</option>
              <option value="kk">Қазақ</option>
            </select>
          </div>

          <div style={styles.checkboxRow}>
            <input {...register("terms")} type="checkbox" id="terms" style={{ width: 18, height: 18 }} />
            <label htmlFor="terms" style={styles.checkboxLabel}>
              Я принимаю{" "}
              <Link href="/terms" style={styles.link}>
                условия использования
              </Link>
            </label>
          </div>
          {errors.terms && <p style={styles.error}>{errors.terms.message}</p>}

          {serverError && <p style={styles.error}>{serverError}</p>}

          <button 
            type="submit" 
            disabled={isSubmitting} 
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              background: isSubmitting ? "var(--textMuted)" : "var(--button)",
              transition: "all 0.2s ease"
            }}
          >
            {isSubmitting ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <p style={styles.footerText}>
          Уже есть аккаунт?{" "}
          <Link href="/login" style={styles.link}>
            Войти
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
    background: "var(--gradient-soft)",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: 440,
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
    marginBottom: 12,
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
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "var(--heading)",
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
  googleButton: {
    width: "100%",
    padding: "12px",
    borderRadius: 12,
    border: "1px solid rgba(0, 0, 0,0.2)",
    background: "white",
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 4,
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
