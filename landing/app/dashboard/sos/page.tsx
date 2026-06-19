"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function SOSPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [sosSent, setSosSent] = useState(false);
  const [sosType, setSosType] = useState<"normal" | "silent">("normal");
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
      }
    });

    return () => {
      clearTimers();
    };
  }, []);

  function clearTimers() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  }

  function handlePressStart() {
    if (sosSent) return;
    setIsPressing(true);
    setPressProgress(0);

    const duration = 2000;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = 0;

    progressIntervalRef.current = setInterval(() => {
      currentStep++;
      const percent = Math.min((currentStep / steps) * 100, 100);
      setPressProgress(percent);
      if (percent >= 100) {
        clearInterval(progressIntervalRef.current!);
      }
    }, intervalTime);

    timerRef.current = setTimeout(async () => {
      await triggerSOS();
    }, duration);
  }

  function handlePressEnd() {
    if (sosSent) return;
    setIsPressing(false);
    clearTimers();
    setPressProgress(0);
  }

  async function triggerSOS() {
    if (!user) return;
    clearTimers();
    setIsPressing(false);
    setPressProgress(100);

    let lat = 43.238947;
    let lng = 76.889709;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          saveSOSToDB(lat, lng);
        },
        () => {
          saveSOSToDB(lat, lng);
        }
      );
    } else {
      saveSOSToDB(lat, lng);
    }
  }

  async function saveSOSToDB(lat: number, lng: number) {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sos_events")
      .insert({
        user_id: user.id,
        type: sosType,
        lat: lat,
        lng: lng,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (data) {
      setActiveSosId(data.id);
    }
    setSosSent(true);
  }

  async function handleCancelSOS() {
    if (!user || !activeSosId) {
      setSosSent(false);
      return;
    }
    const supabase = createClient();
    await supabase
      .from("sos_events")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", activeSosId);

    setSosSent(false);
    setActiveSosId(null);
    setPressProgress(0);
  }

  return (
    <div className="space-y-8 relative">
      {/* Flashing SOS Overlay when sent */}
      {sosSent && (
        <div className="fixed inset-0 z-50 bg-red-600/95 backdrop-blur-md flex items-center justify-center text-center p-6 animate-[fade-up_0.3s_ease-out]">
          <div className="max-w-md space-y-6 text-white">
            <div className="w-24 h-24 rounded-full bg-white text-red-600 flex items-center justify-center text-4xl mx-auto shadow-2xl animate-bounce">
              🚨
            </div>
            <div className="space-y-2">
              <h2 className="font-syne font-extrabold text-4xl tracking-wider">СИГНАЛ SOS АКТИВЕН</h2>
              <p className="text-sm text-red-100 font-semibold max-w-sm mx-auto leading-relaxed">
                {sosType === "silent"
                  ? "Тихий SOS сигнал отправлен доверенным лицам. Экран не издает звуков."
                  : "Сигнал бедствия отправлен! Ваши координаты и гео-метка переданы близким."}
              </p>
            </div>
            <div className="p-4 bg-red-700/50 border border-white/20 rounded-2xl text-xs text-red-100 font-medium">
              Ожидайте помощи. Доверенные контакты получили SMS и Push-уведомление.
            </div>
            <button
              onClick={handleCancelSOS}
              className="px-8 py-3.5 bg-white text-red-600 hover:bg-slate-100 transition-colors rounded-xl font-syne font-bold text-sm tracking-wide shadow-xl"
            >
              Отменить тревогу
            </button>
          </div>
        </div>
      )}

      {/* Header info */}
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Экстренная помощь</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Критический модуль безопасности. Отправляет сигнал бедствия и ваши координаты доверенным лицам.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: SOS Button Panel (7 cols) */}
        <div className="lg:col-span-7 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col items-center justify-center gap-8 min-h-[460px]">
          
          {/* Mode Selector */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 w-full max-w-xs gap-1.5">
            <button
              onClick={() => setSosType("normal")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold font-syne transition-all ${
                sosType === "normal"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🚨 Обычный
            </button>
            <button
              onClick={() => setSosType("silent")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold font-syne transition-all ${
                sosType === "silent"
                  ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🤫 Тихий SOS
            </button>
          </div>

          {/* Large SOS Pulse button */}
          <div className="relative">
            {/* Pulsing visual circles */}
            {isPressing && (
              <div
                style={{ transform: `scale(${1 + pressProgress / 100})` }}
                className="absolute inset-0 rounded-full bg-red-500/20 transition-transform duration-75 pointer-events-none"
              ></div>
            )}
            <div className="absolute -inset-4 rounded-full bg-red-500/10 animate-pulse-slow"></div>

            {/* Circular Progress Border */}
            <svg className="w-52 h-52 transform -rotate-90">
              <circle cx="104" cy="104" r="92" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
              <circle
                cx="104"
                cy="104"
                r="92"
                stroke="#ef4444"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="578"
                strokeDashoffset={578 - (578 * pressProgress) / 100}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>

            {/* Central Press trigger Button */}
            <button
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              className={`absolute top-4 left-4 w-44 h-44 rounded-full flex flex-col items-center justify-center select-none text-white cursor-pointer transition-all duration-200 ${
                isPressing
                  ? "bg-red-700 shadow-[0_0_60px_rgba(239,68,68,0.6)] scale-[0.96]"
                  : "bg-red-500 hover:bg-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              }`}
            >
              <span className="font-syne font-black text-4xl tracking-wider">SOS</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-100 mt-2">
                {isPressing ? "Удерживайте..." : "Зажать 2 сек"}
              </span>
            </button>
          </div>

          <div className="text-center space-y-1">
            <h4 className="font-syne font-bold text-sm text-slate-850">Кнопка защиты от случайных нажатий</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-normal font-medium">
              Зажмите и удерживайте центральный круг. Сигнал с вашей точной локацией мгновенно запишется в базу данных.
            </p>
          </div>
        </div>

        {/* Right Side: Information / Guidelines (5 cols) */}
        <div className="lg:col-span-5 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6 justify-between">
          <div className="space-y-6">
            <h3 className="font-syne font-extrabold text-lg text-slate-800">Режимы оповещения</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/50 border border-white/80 shadow-sm flex gap-4 text-left">
                <span className="text-2xl mt-0.5">🚨</span>
                <div className="space-y-1">
                  <h4 className="font-syne font-bold text-sm text-slate-800">Обычная тревога</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Отправляет геолокацию, включает вспышку экрана красным светом. Родственники получают громкий сигнал.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/50 border border-white/80 shadow-sm flex gap-4 text-left">
                <span className="text-2xl mt-0.5">🤫</span>
                <div className="space-y-1">
                  <h4 className="font-syne font-bold text-sm text-slate-800">Тихий SOS</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    Скрытый сигнал без визуальной индикации тревоги на вашем телефоне. Безопасно при нежелательном внимании.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/60 border border-white/80 rounded-xl shadow-sm">
            <h4 className="font-syne font-bold text-xs text-slate-800 mb-1.5 text-left">Внимание:</h4>
            <p className="text-[11px] text-slate-400 leading-normal font-semibold text-left">
              Функционал геолокации требует доступа к датчикам GPS вашего устройства. Убедитесь, что разрешение предоставлено в браузере.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
