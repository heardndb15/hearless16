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
    background: "var(--background)",
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
