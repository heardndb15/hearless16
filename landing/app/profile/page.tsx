"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"kk" | "ru">("ru");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        supabase
          .from("users")
          .select("name, language")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setName(profile.name || "");
              setLanguage(profile.language as "kk" | "ru");
            }
            setLoading(false);
          });
      }
    });
  }, [router]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ name, language })
      .eq("id", user.id);
    if (error) {
      setMessage("Ошибка сохранения: " + error.message);
    } else {
      setMessage("Сохранено!");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    });
    router.push("/login");
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: "var(--heading)" }}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Настройки профиля</h1>
            <p style={styles.subtitle}>{user?.email}</p>
          </div>
          <Link href="/dashboard" style={styles.backBtn}>
            ← Назад
          </Link>
        </header>

        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              placeholder="Ваше имя"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Язык интерфейса</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "kk" | "ru")}
              style={styles.input}
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақ</option>
            </select>
          </div>

          {message && (
            <p style={{ color: message.includes("Ошибка") ? "var(--sos)" : "var(--accent)", fontSize: 14 }}>
              {message}
            </p>
          )}

          <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>

          <hr style={styles.divider} />

          <button onClick={handleSignOut} style={styles.signOutBtn}>
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--background)",
    padding: "40px 20px",
  },
  container: {
    maxWidth: 500,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "var(--heading)",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "var(--accent)",
  },
  backBtn: {
    padding: "8px 16px",
    borderRadius: 12,
    background: "var(--card)",
    color: "var(--heading)",
    textDecoration: "none",
    fontSize: 14,
  },
  card: {
    background: "var(--white)",
    borderRadius: 16,
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
  },
  saveBtn: {
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: "var(--button)",
    color: "var(--white)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  divider: {
    border: "none",
    borderTop: "1px solid var(--card)",
    margin: "0",
  },
  signOutBtn: {
    padding: "14px",
    borderRadius: 12,
    border: "2px solid var(--sos)",
    background: "transparent",
    color: "var(--sos)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
};
