"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface ActivityItem {
  id: string;
  type: "gesture" | "alert" | "sos";
  label: string;
  detail: string;
  time: string;
  severity?: "info" | "warning" | "critical";
}

export default function DashboardOverview() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ name: string; language: string } | null>(null);
  const [stats, setStats] = useState({ gestures: 0, alerts: 0, sos: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        Promise.all([
          fetchProfile(data.user.id),
          fetchStats(data.user.id),
          fetchActivityLog(data.user.id),
        ]).then(() => setLoading(false));
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
    if (data) setProfile({ name: data.name || "", language: data.language || "ru" });
  }

  async function fetchStats(userId: string) {
    const supabase = createClient();
    const [gesturesRes, alertsRes, sosRes] = await Promise.all([
      supabase.from("user_progress").select("gesture_id", { count: "exact", head: true }).eq("user_id", userId).eq("learned", true),
      supabase.from("sound_alerts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("sos_events").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    setStats({
      gestures: gesturesRes.count || 0,
      alerts: alertsRes.count || 0,
      sos: sosRes.count || 0,
    });
  }

  async function fetchActivityLog(userId: string) {
    const supabase = createClient();
    
    // Fetch recent items
    const [alertsData, sosData] = await Promise.all([
      supabase.from("sound_alerts").select("*").eq("user_id", userId).order("detected_at", { ascending: false }).limit(3),
      supabase.from("sos_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(2),
    ]);

    const log: ActivityItem[] = [];

    if (alertsData.data) {
      alertsData.data.forEach((item: any) => {
        log.push({
          id: item.id,
          type: "alert",
          label: "Обнаружен звук",
          detail: translateSoundType(item.sound_type),
          time: new Date(item.detected_at).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          severity: "warning",
        });
      });
    }

    if (sosData.data) {
      sosData.data.forEach((item: any) => {
        log.push({
          id: item.id,
          type: "sos",
          label: item.type === "silent" ? "Тихий SOS сигнал" : "Экстренный SOS сигнал",
          detail: `Координаты: ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`,
          time: new Date(item.created_at).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
          severity: "critical",
        });
      });
    }

    setActivities(log.slice(0, 5));
  }

  function translateSoundType(type: string): string {
    const dict: Record<string, string> = {
      siren: "Сирена / Сигнализация",
      baby_cry: "Плач ребёнка",
      doorbell: "Дверной звонок",
      fire_alarm: "Пожарная тревога",
      knock: "Стук в дверь",
    };
    return dict[type] || type;
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center text-slate-500 font-bold">
        Загрузка панели...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Welcome Banner */}
      <div className="relative p-8 md:p-10 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-lg space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/25 text-xs font-bold text-accent tracking-wide shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
            ИИ-Ассистент активен
          </span>
          <h2 className="font-syne font-extrabold text-3xl md:text-4xl text-slate-800 leading-tight">
            Привет, {profile?.name || "Пользователь"}!
          </h2>
          <p className="text-slate-600 text-sm font-medium leading-relaxed">
            Система мониторинга Hearless работает в штатном режиме. Все микрофоны и камера готовы к использованию.
          </p>
        </div>
      </div>

      {/* Grid Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Gestures */}
        <div className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md hover:shadow-lg hover:bg-white/50 hover:border-accent/30 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-3xl font-extrabold font-syne text-slate-800 mb-1 group-hover:text-accent transition-colors">{stats.gestures}</p>
              <h3 className="font-syne font-bold text-sm text-slate-400">Жестов изучено</h3>
            </div>
            <span className="text-3xl p-3 bg-white/60 border border-slate-100 shadow-sm rounded-xl">🖐️</span>
          </div>
        </div>

        {/* Card Sound Alerts */}
        <div className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md hover:shadow-lg hover:bg-white/50 hover:border-purpleBrand/30 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-3xl font-extrabold font-syne text-slate-800 mb-1 group-hover:text-purpleBrand transition-colors">{stats.alerts}</p>
              <h3 className="font-syne font-bold text-sm text-slate-400">Звуков распознано</h3>
            </div>
            <span className="text-3xl p-3 bg-white/60 border border-slate-100 shadow-sm rounded-xl">🔊</span>
          </div>
        </div>

        {/* Card SOS Alerts */}
        <div className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md hover:shadow-lg hover:bg-white/50 hover:border-red-500/30 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-3xl font-extrabold font-syne text-slate-800 mb-1 group-hover:text-red-500 transition-colors">{stats.sos}</p>
              <h3 className="font-syne font-bold text-sm text-slate-400">SOS сигналов</h3>
            </div>
            <span className="text-3xl p-3 bg-white/60 border border-slate-100 shadow-sm rounded-xl">🆘</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Access & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Launcher Grid - Left (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="font-syne font-extrabold text-xl text-slate-800">Быстрый запуск функций</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subtitles Card */}
            <Link
              href="/dashboard/subtitles"
              className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md hover:shadow-lg hover:bg-white/50 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left group"
            >
              <span className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-xl shadow-sm">
                💬
              </span>
              <div>
                <h4 className="font-syne font-bold text-slate-800 text-base mb-1.5 group-hover:text-accent transition-colors">
                  Живые субтитры
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Netflix-style титры для распознавания речи в реальном времени. Крупный шрифт и высокая контрастность.
                </p>
              </div>
            </Link>

            {/* Gesture Card */}
            <Link
              href="/dashboard/gestures"
              className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md hover:shadow-lg hover:bg-white/50 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left group"
            >
              <span className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-xl shadow-sm">
                📷
              </span>
              <div>
                <h4 className="font-syne font-bold text-slate-800 text-base mb-1.5 group-hover:text-accent transition-colors">
                  Распознавание жестов
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Используйте камеру для распознавания жестов в реальном времени с помощью компьютерного зрения.
                </p>
              </div>
            </Link>

            {/* Sound Card */}
            <Link
              href="/dashboard/sounds"
              className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md hover:shadow-lg hover:bg-white/50 hover:border-purpleBrand/40 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left group"
            >
              <span className="w-12 h-12 rounded-xl bg-purpleBrand/15 border border-purpleBrand/25 flex items-center justify-center text-xl shadow-sm">
                🎙️
              </span>
              <div>
                <h4 className="font-syne font-bold text-slate-800 text-base mb-1.5 group-hover:text-purpleBrand transition-colors">
                  Детектор звуков
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Следите за окружающими шумами. Уведомление на экране о плаче ребенка, пожарной тревоге или звонке в дверь.
                </p>
              </div>
            </Link>

            {/* SOS Card */}
            <Link
              href="/dashboard/sos"
              className="p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-md hover:shadow-lg hover:bg-white/50 hover:border-red-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 text-left group"
            >
              <span className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-xl shadow-sm">
                🚨
              </span>
              <div>
                <h4 className="font-syne font-bold text-slate-800 text-base mb-1.5 group-hover:text-red-500 transition-colors">
                  Экстренный SOS модуль
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Быстрая отправка тревожного сигнала с вашей геолокацией близким родственникам в один клик.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Activities Feed - Right (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="font-syne font-extrabold text-xl text-slate-800">Последние события</h3>
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-5 space-y-4 shadow-md">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                Событий пока не зарегистрировано.
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((item) => (
                  <div key={item.id} className="flex gap-3 text-left">
                    <div className="mt-1">
                      {item.type === "sos" ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 block animate-ping"></span>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className="font-syne text-xs font-bold text-slate-800 truncate">{item.label}</p>
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal font-semibold truncate">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2.5 border-t border-slate-200/60">
              <p className="text-[10px] text-slate-400 text-center font-bold">
                База данных Supabase · Hearless AI
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
