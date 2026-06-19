"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface GestureItem {
  id: string;
  name: string;
  category: string;
  difficulty: string;
}

interface UserProgressItem {
  gesture_id: string;
  learned: boolean;
  accuracy: number;
  attempts: number;
  gesture: GestureItem;
}

export default function GesturesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [gesturesList, setGesturesList] = useState<GestureItem[]>([]);
  const [progress, setProgress] = useState<UserProgressItem[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchData(data.user.id);
      }
    });
  }, []);

  async function fetchData(userId: string) {
    const supabase = createClient();
    
    // Fetch all gestures dictionary
    const gesturesRes = await supabase.from("gestures").select("*");
    let allGestures: GestureItem[] = [];
    if (gesturesRes.data) {
      allGestures = gesturesRes.data;
      setGesturesList(gesturesRes.data);
    }

    // Fetch user progress join with gestures
    // Since PostgREST allows nested queries if relation exists
    const progressRes = await supabase
      .from("user_progress")
      .select("learned, accuracy, attempts, gesture_id, gestures ( id, name, category, difficulty )")
      .eq("user_id", userId);

    if (progressRes.data) {
      const formatted: UserProgressItem[] = progressRes.data.map((item: any) => ({
        gesture_id: item.gesture_id,
        learned: item.learned,
        accuracy: item.accuracy,
        attempts: item.attempts,
        gesture: item.gestures || { id: item.gesture_id, name: "Неизвестный жест", category: "Базовые", difficulty: "easy" }
      }));
      setProgress(formatted);
    }
    setLoading(false);
  }

  async function handleSimulateRecognition() {
    if (!user || gesturesList.length === 0) return;
    setDetecting(true);
    setDetectedGesture(null);
    setConfidence(0);

    // Simulate AI model processing time (1.2 seconds)
    setTimeout(async () => {
      const randomIndex = Math.floor(Math.random() * gesturesList.length);
      const chosenGesture = gesturesList[randomIndex];
      const acc = Math.floor(Math.random() * 16) + 84; // 84% - 99% accuracy
      
      setDetectedGesture(chosenGesture.name);
      setConfidence(acc);
      setDetecting(false);

      // Save user progress in database
      const supabase = createClient();
      // First check if progress already exists
      const existing = progress.find(p => p.gesture_id === chosenGesture.id);
      
      if (existing) {
        const attempts = existing.attempts + 1;
        const bestAcc = Math.max(existing.accuracy, acc);
        await supabase
          .from("user_progress")
          .update({
            attempts: attempts,
            accuracy: acc,
            best_accuracy: bestAcc,
            learned: bestAcc >= 90 // mark learned if accuracy >= 90%
          })
          .eq("user_id", user.id)
          .eq("gesture_id", chosenGesture.id);
      } else {
        await supabase
          .from("user_progress")
          .insert({
            user_id: user.id,
            gesture_id: chosenGesture.id,
            attempts: 1,
            accuracy: acc,
            best_accuracy: acc,
            learned: acc >= 90
          });
      }

      // Refresh activity list
      fetchData(user.id);
    }, 1200);
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Загрузка модуля жестов...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header info */}
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-white">Распознавание жестов</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Этот модуль использует камеру для распознавания жестового языка. ИИ распознает движения рук и переводит их в текст.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Camera Panel (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <span className="font-syne text-sm font-bold text-white flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
              {cameraActive ? "Камера включена" : "Камера отключена"}
            </span>
            <button
              onClick={() => {
                setCameraActive(!cameraActive);
                if (cameraActive) {
                  setDetectedGesture(null);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-syne transition-colors duration-200 ${
                cameraActive
                  ? "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-accent text-white hover:bg-accent/80"
              }`}
            >
              {cameraActive ? "Выключить камеру" : "Включить камеру"}
            </button>
          </div>

          {/* Camera View Box */}
          <div className="relative aspect-[4/3] rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center">
            {cameraActive ? (
              <div className="w-full h-full relative flex items-center justify-center">
                {/* Hand skeleton tracking effect */}
                <div className="relative flex items-center justify-center z-10 w-full h-full">
                  {detecting ? (
                    <div className="text-center space-y-4">
                      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="font-syne font-bold text-sm text-accent animate-pulse">Анализ жеста...</p>
                    </div>
                  ) : detectedGesture ? (
                    <div className="text-center space-y-4 animate-[fade-up_0.3s_ease-out]">
                      <div className="text-7xl">🖐️</div>
                      <div>
                        <h4 className="font-syne font-extrabold text-2xl text-green-400">{detectedGesture}</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-1">Точность: {confidence}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 text-slate-400">
                      <span className="text-5xl opacity-40">🤚</span>
                      <p className="text-xs font-semibold">Покажите жест перед камерой</p>
                    </div>
                  )}
                </div>

                {/* Laser scan lines */}
                {cameraActive && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent h-1/2 w-full border-b border-accent/20 animate-[wave-move_2.5s_infinite_linear]"></div>
                )}
                {/* Corner markers */}
                <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-accent/40 rounded-tl"></div>
                <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-accent/40 rounded-tr"></div>
                <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-accent/40 rounded-bl"></div>
                <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-accent/40 rounded-br"></div>
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <span className="text-4xl opacity-20">📷</span>
                <p className="text-sm font-semibold text-slate-400">Камера отключена</p>
                <p className="text-xs text-slate-500 max-w-xs leading-normal mx-auto">
                  Включите камеру, чтобы начать автоматическое распознавание жестов с помощью компьютерного зрения.
                </p>
              </div>
            )}
          </div>

          {/* Trigger button */}
          {cameraActive && (
            <button
              onClick={handleSimulateRecognition}
              disabled={detecting}
              className="w-full py-4 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-slate-800 disabled:text-slate-500 text-white font-syne font-bold text-sm tracking-wide transition-colors duration-200"
            >
              {detecting ? "Сканирование..." : "Симулировать жест перед камерой"}
            </button>
          )}
        </div>

        {/* Right Side: Progress & History (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
          <h3 className="font-syne font-extrabold text-lg text-white">Изученные жесты</h3>
          
          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1">
            {progress.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                У вас пока нет сохраненной истории. Попробуйте отсканировать первый жест!
              </div>
            ) : (
              progress.map((item) => (
                <div
                  key={item.gesture_id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80"
                >
                  <div className="text-2xl p-2 bg-slate-900 border border-slate-800 rounded-lg">
                    {translateGestureToEmoji(item.gesture.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-syne font-bold text-sm text-white truncate">{item.gesture.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Раздел: {item.gesture.category} · Попыток: {item.attempts}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.learned
                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                    }`}>
                      {item.learned ? "Изучено" : "В процессе"}
                    </span>
                    <p className="text-xs font-bold text-slate-300 font-syne mt-1">{item.accuracy}% точность</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function translateGestureToEmoji(name: string): string {
  const dict: Record<string, string> = {
    "Здравствуйте": "👋",
    "Спасибо": "🙏",
    "До свидания": "👋",
    "Пожалуйста": "🙌",
    "Да": "✅",
    "Нет": "❌",
    "Мама": "👩",
    "Папа": "👨",
    "Брат": "👦",
    "Сестра": "👧",
    "Еда": "🍎",
    "Вода": "💧",
    "Вкусно": "😋",
    "Радость": "😊",
    "Грусть": "😢",
    "Любовь": "❤️",
  };
  return dict[name] || "🖐️";
}
