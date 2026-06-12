"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ name: string; language: string } | null>(null);
  const [stats, setStats] = useState({ gestures: 0, alerts: 0, sos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchProfile(data.user.id);
        fetchStats(data.user.id);
      }
    });
  }, [router]);

  async function fetchProfile(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("name, language")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  }

  async function fetchStats(userId: string) {
    const supabase = createClient();
    const [gesturesRes, alertsRes, sosRes] = await Promise.all([
      supabase.from("user_progress").select("id", { count: "estimated" }).eq("user_id", userId).eq("learned", true),
      supabase.from("sound_alerts").select("id", { count: "estimated" }).eq("user_id", userId),
      supabase.from("sos_events").select("id", { count: "estimated" }).eq("user_id", userId),
    ]);
    setStats({
      gestures: gesturesRes.count || 0,
      alerts: alertsRes.count || 0,
      sos: sosRes.count || 0,
    });
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
            <h1 style={styles.title}>Личный кабинет</h1>
            <p style={styles.subtitle}>
              {profile?.name || user?.email} · {profile?.language === "kk" ? "Қазақ" : "Русский"}
            </p>
          </div>
          <div style={styles.headerLinks}>
            <Link href="/profile" style={styles.linkBtn}>Настройки</Link>
          </div>
        </header>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🖐️</div>
            <div style={styles.cardValue}>{stats.gestures}</div>
            <div style={styles.cardLabel}>Жестов изучено</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🔊</div>
            <div style={styles.cardValue}>{stats.alerts}</div>
            <div style={styles.cardLabel}>Звуков распознано</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🆘</div>
            <div style={styles.cardValue}>{stats.sos}</div>
            <div style={styles.cardLabel}>SOS сигналов</div>
          </div>
        </div>

        <div style={styles.infoCard}>
          <h2 style={styles.infoTitle}>Информация об аккаунте</h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <span>{user?.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Имя</span>
            <span>{profile?.name || "—"}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Язык</span>
            <span>{profile?.language === "kk" ? "Қазақ" : profile?.language === "ru" ? "Русский" : "—"}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Дата регистрации</span>
            <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "—"}</span>
          </div>
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
    maxWidth: 800,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
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
  headerLinks: {
    display: "flex",
    gap: 12,
  },
  linkBtn: {
    padding: "10px 20px",
    borderRadius: 12,
    background: "var(--button)",
    color: "var(--white)",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "var(--white)",
    borderRadius: 16,
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "var(--heading)",
  },
  cardLabel: {
    fontSize: 13,
    color: "var(--textSecondary, #5a7a8f)",
    marginTop: 4,
  },
  infoCard: {
    background: "var(--white)",
    borderRadius: 16,
    padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "var(--heading)",
    marginBottom: 16,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid var(--card)",
    fontSize: 15,
  },
  infoLabel: {
    color: "var(--textSecondary, #5a7a8f)",
    fontWeight: 500,
  },
};
