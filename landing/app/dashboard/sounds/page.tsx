"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface SoundAlert {
  id: string;
  sound_type: string;
  detected_at: string;
}

export default function SoundsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<SoundAlert[]>([]);
  const [monitoring, setMonitoring] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchAlerts(data.user.id);
      }
    });
  }, []);

  async function fetchAlerts(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("sound_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("detected_at", { ascending: false });

    if (data) {
      setAlerts(data);
    }
    setLoading(false);
  }

  async function handleSimulateSound() {
    if (!user) return;
    setSimulating(true);
    setCurrentSound(null);

    // Simulate short sound capture delay (800ms)
    setTimeout(async () => {
      const soundTypes = ["siren", "baby_cry", "doorbell", "fire_alarm", "knock"];
      const randomType = soundTypes[Math.floor(Math.random() * soundTypes.length)];
      
      setCurrentSound(randomType);
      setSimulating(false);

      // Insert into Supabase sound_alerts
      const supabase = createClient();
      await supabase.from("sound_alerts").insert({
        user_id: user.id,
        sound_type: randomType,
        detected_at: new Date().toISOString()
      });

      // Reload list
      fetchAlerts(user.id);
    }, 800);
  }

  function getSoundMetadata(type: string) {
    const metadata: Record<string, { label: string; emoji: string; severity: "info" | "warning" | "critical" }> = {
      siren: { label: "Сирена / Автосигнализация", emoji: "🚨", severity: "critical" },
      baby_cry: { label: "Плач ребёнка", emoji: "👶", severity: "warning" },
      doorbell: { label: "Дверной звонок", emoji: "🔔", severity: "info" },
      fire_alarm: { label: "Пожарная тревога", emoji: "🔥", severity: "critical" },
      knock: { label: "Стук в дверь", emoji: "✊", severity: "info" },
    };
    return metadata[type] || { label: type, emoji: "🔊", severity: "info" };
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Загрузка детектора звуков...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header info */}
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-white">Детектор звуков</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Система анализирует окружающие акустические частоты и переводит их в визуальные предупреждения на экране.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Audio Waveform Monitor (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="font-syne text-sm font-bold text-white flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${monitoring ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
              {monitoring ? "Микрофон слушает окружение..." : "Мониторинг выключен"}
            </span>
            <button
              onClick={() => {
                setMonitoring(!monitoring);
                if (monitoring) {
                  setCurrentSound(null);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-syne transition-colors duration-200 ${
                monitoring
                  ? "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-accent text-white hover:bg-accent/80"
              }`}
            >
              {monitoring ? "Остановить" : "Запустить микрофон"}
            </button>
          </div>

          {/* Waveform Visualization Box */}
          <div className="relative h-64 rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center">
            {monitoring ? (
              <div className="w-full px-12 flex items-center justify-center gap-1.5 h-32">
                {/* 15 animated audio wave bars */}
                {[...Array(15)].map((_, i) => {
                  const delay = (i * 0.1).toFixed(1);
                  return (
                    <div
                      key={i}
                      style={{ animationDelay: `${delay}s` }}
                      className="w-1.5 bg-gradient-to-t from-accent to-purpleBrand rounded-full animate-[sound-pulse_1.2s_ease-in-out_infinite] min-h-[8px]"
                    ></div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <span className="text-4xl opacity-20">🎙️</span>
                <p className="text-sm font-semibold text-slate-400">Микрофон неактивен</p>
                <p className="text-xs text-slate-500 max-w-xs leading-normal mx-auto">
                  Активируйте детектор, чтобы ИИ в фоновом режиме анализировал опасные и важные звуки вашего дома.
                </p>
              </div>
            )}

            {/* Simulated Alarm Alert pop-up */}
            {monitoring && currentSound && (
              <div className="absolute inset-x-6 bottom-6 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex items-center gap-4 animate-[fade-up_0.3s_ease-out]">
                <span className="text-3xl">{getSoundMetadata(currentSound).emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Обнаружен звук!</span>
                  <h4 className="font-syne font-bold text-sm text-white truncate">{getSoundMetadata(currentSound).label}</h4>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
              </div>
            )}

            {monitoring && simulating && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-purpleBrand border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-purpleBrand font-semibold tracking-wider font-syne">Слушаем резкий шум...</p>
                </div>
              </div>
            )}
          </div>

          {/* Trigger button */}
          {monitoring && (
            <button
              onClick={handleSimulateSound}
              disabled={simulating}
              className="w-full py-4 rounded-xl bg-purpleBrand hover:bg-purpleBrand/90 disabled:bg-slate-800 disabled:text-slate-500 text-white font-syne font-bold text-sm tracking-wide transition-colors duration-200"
            >
              {simulating ? "Обработка..." : "Симулировать громкий звук"}
            </button>
          )}
        </div>

        {/* Right Side: Log History (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
          <h3 className="font-syne font-extrabold text-lg text-white">Журнал событий</h3>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1">
            {alerts.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Журнал пуст. Включите мониторинг и сгенерируйте первый звук!
              </div>
            ) : (
              alerts.map((item) => {
                const meta = getSoundMetadata(item.sound_type);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80"
                  >
                    <div className="text-2xl p-2 bg-slate-900 border border-slate-800 rounded-lg">
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-syne font-bold text-sm text-white truncate">{meta.label}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Обнаружено в {new Date(item.detected_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        meta.severity === "critical"
                          ? "bg-red-500/10 text-red-500 border border-red-500/20"
                          : meta.severity === "warning"
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                            : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      }`}>
                        {meta.severity === "critical" ? "Критично" : meta.severity === "warning" ? "Важно" : "Шум"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
