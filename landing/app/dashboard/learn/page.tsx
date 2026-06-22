"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Gesture {
  id: string;
  name: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  image_url?: string;
}

interface Progress {
  gesture_id: string;
  learned: boolean;
  attempts: number;
  accuracy: number;
}

export default function LearnSignLanguagePage() {
  const [user, setUser] = useState<User | null>(null);
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [selectedGesture, setSelectedGesture] = useState<Gesture | null>(null);
  const [loading, setLoading] = useState(true);

  // Status updates
  const [actionMessage, setActionMessage] = useState("");

  // Category tabs
  const [selectedCategory, setSelectedCategory] = useState("Все");

  // Camera check states
  const [cameraMode, setCameraMode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    gesture: string;
    confidence: number;
    components: { hand_shape: number; position: number; movement: number };
  } | null>(null);
  const [verifyError, setVerifyError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (selectedGesture) {
      stopCamera();
    }
  }, [selectedGesture]);

  async function startCamera() {
    setVerifyError("");
    setVerificationResult(null);
    setCameraMode(true);
    setIsVerifying(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start capture interval (every 800ms)
      intervalRef.current = setInterval(() => {
        captureAndVerify();
      }, 800);

    } catch (err) {
      console.error("Error accessing camera:", err);
      setVerifyError("Не удалось получить доступ к камере. Убедитесь, что разрешения предоставлены.");
      setIsVerifying(false);
      setCameraMode(false);
    }
  }

  function stopCamera() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsVerifying(false);
    setCameraMode(false);
  }

  async function captureAndVerify() {
    if (!videoRef.current || !canvasRef.current || !selectedGesture) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context && video.videoWidth > 0) {
        canvas.width = 300;
        canvas.height = 300;
        
        // Crop/draw to square
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        
        context.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        const base64Image = dataUrl.split(",")[1];

        const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || (isProd ? "https://hearless16-1.onrender.com" : "http://localhost:8000");

        const response = await fetch(`${baseUrl}/gestures/recognize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image: base64Image,
            target_gesture: selectedGesture.name
          })
        });

        if (response.ok) {
          const result = await response.json();
          setVerificationResult(result);

          if (result.confidence >= 80) {
            // Success! Save progress
            handleSuccess(result.confidence);
          }
        }
      }
    } catch (e) {
      console.error("Error during gesture recognition:", e);
    }
  }

  async function handleSuccess(confidence: number) {
    if (!user || !selectedGesture) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsVerifying(false);

    setActionMessage("Жест успешно распознан! 🎉");
    setTimeout(() => {
      setActionMessage("");
      stopCamera();
    }, 2500);

    const supabase = createClient();
    const currentProgress = progressMap[selectedGesture.id];

    if (currentProgress) {
      const updatedAttempts = currentProgress.attempts + 1;
      await supabase
        .from("user_progress")
        .update({
          learned: true,
          accuracy: confidence,
          attempts: updatedAttempts,
          best_accuracy: Math.max(currentProgress.accuracy, confidence)
        })
        .eq("user_id", user.id)
        .eq("gesture_id", selectedGesture.id);
    } else {
      await supabase
        .from("user_progress")
        .insert({
          user_id: user.id,
          gesture_id: selectedGesture.id,
          attempts: 1,
          accuracy: confidence,
          best_accuracy: confidence,
          learned: true
        });
    }

    fetchData(user.id);
  }

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

    // 1. Fetch all gestures dictionary
    const gesturesRes = await supabase.from("gestures").select("*");
    let allGestures: Gesture[] = [];
    if (gesturesRes.data) {
      allGestures = gesturesRes.data;
      setGestures(gesturesRes.data);
      if (gesturesRes.data.length > 0 && !selectedGesture) {
        setSelectedGesture(gesturesRes.data[0]);
      }
    }

    // 2. Fetch user's progress
    const progressRes = await supabase.from("user_progress").select("*").eq("user_id", userId);
    if (progressRes.data) {
      const map: Record<string, Progress> = {};
      progressRes.data.forEach((p: any) => {
        map[p.gesture_id] = {
          gesture_id: p.gesture_id,
          learned: p.learned,
          attempts: p.attempts,
          accuracy: p.accuracy
        };
      });
      setProgressMap(map);
    }
    setLoading(false);
  }

  // Interactive Action: Repeat (повторить) - increments attempts
  async function handleRepeatGesture() {
    if (!user || !selectedGesture) return;
    const supabase = createClient();
    const currentProgress = progressMap[selectedGesture.id];
    setActionMessage("Попытка добавлена! Повторяйте движения рук...");
    setTimeout(() => setActionMessage(""), 2500);

    if (currentProgress) {
      const updatedAttempts = currentProgress.attempts + 1;
      await supabase
        .from("user_progress")
        .update({ attempts: updatedAttempts })
        .eq("user_id", user.id)
        .eq("gesture_id", selectedGesture.id);
    } else {
      await supabase
        .from("user_progress")
        .insert({
          user_id: user.id,
          gesture_id: selectedGesture.id,
          attempts: 1,
          accuracy: 0,
          best_accuracy: 0,
          learned: false
        });
    }

    fetchData(user.id);
  }

  // Interactive Action: Remember (запомнить) - sets learned: true
  async function handleRememberGesture() {
    if (!user || !selectedGesture) return;
    const supabase = createClient();
    const currentProgress = progressMap[selectedGesture.id];
    const isLearned = currentProgress ? !currentProgress.learned : true;
    
    setActionMessage(isLearned ? "Жест помечен как изученный! Отличная работа! 🎉" : "Жест возвращен на изучение.");
    setTimeout(() => setActionMessage(""), 3000);

    if (currentProgress) {
      await supabase
        .from("user_progress")
        .update({ learned: isLearned, accuracy: isLearned ? 100 : 0 })
        .eq("user_id", user.id)
        .eq("gesture_id", selectedGesture.id);
    } else {
      await supabase
        .from("user_progress")
        .insert({
          user_id: user.id,
          gesture_id: selectedGesture.id,
          attempts: 1,
          accuracy: 100,
          best_accuracy: 100,
          learned: true
        });
    }

    fetchData(user.id);
  }

  // Calculate learning progress stats
  const totalGestures = gestures.length;
  const learnedCount = Object.values(progressMap).filter(p => p.learned).length;
  const progressPercent = totalGestures > 0 ? Math.round((learnedCount / totalGestures) * 100) : 0;

  function translateDifficulty(diff: string) {
    const dict: Record<string, string> = {
      easy: "Легко",
      medium: "Средне",
      hard: "Сложно"
    };
    return dict[diff] || diff;
  }

  function getDifficultyStyle(diff: string) {
    if (diff === "easy") return "bg-green-500/10 text-green-600 border border-green-500/20";
    if (diff === "medium") return "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20";
    return "bg-red-500/10 text-red-600 border border-red-500/20";
  }

  function translateNameToEmoji(name: string): string {
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
      "Один": "1️⃣",
      "Два": "2️⃣",
      "Три": "3️⃣",
      "Сто": "💯",
    };
    return dict[name] || "🖐️";
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Загрузка программы обучения...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Изучение жестового языка</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Интерактивный тренажер для запоминания жестов. Просматривайте инструкции, отмечайте жесты как выученные и отслеживайте свой прогресс.
        </p>
      </div>

      {/* Progress Section */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-md rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 w-full text-left space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="font-syne text-sm font-bold text-slate-700">Ваш прогресс обучения</span>
            <span className="font-syne text-xs font-bold text-accent">{learnedCount} из {totalGestures} жестов ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className="bg-gradient-to-r from-accent to-purpleBrand h-full rounded-full transition-all duration-500"
            ></div>
          </div>
        </div>
        
        <div className="p-3 bg-white/60 border border-slate-100 shadow-sm rounded-xl shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Уровень владения</p>
          <p className="font-syne text-base font-extrabold text-slate-800">
            {progressPercent >= 80 ? "Эксперт" : progressPercent >= 40 ? "Любитель" : "Новичок"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Selected Gesture Instruction Display (5 cols) */}
        <div className="lg:col-span-5 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6 text-center justify-between min-h-[460px]">
          {selectedGesture ? (
            <>
              {/* Card Title & tags */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getDifficultyStyle(selectedGesture.difficulty)}`}>
                    {translateDifficulty(selectedGesture.difficulty)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Раздел: {selectedGesture.category}
                  </span>
                </div>
                <h3 className="font-syne font-black text-2xl text-slate-800">{selectedGesture.name}</h3>
              </div>

              {/* Gesture visual illustration placeholder OR Webcam preview */}
              {cameraMode ? (
                <div className="relative aspect-square w-56 h-56 mx-auto rounded-2xl border-2 border-slate-300 bg-slate-950 overflow-hidden flex items-center justify-center shadow-2xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Corner scan brackets */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-accent"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-accent"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-accent"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-accent"></div>

                  {/* Recognition Status Overlay */}
                  {verificationResult && (
                    <div className="absolute bottom-4 left-4 right-4 py-2 px-3 rounded-xl bg-black/60 border border-white/10 backdrop-blur-sm flex justify-between items-center text-white text-[11px] font-bold">
                      <span>Точность:</span>
                      <span className={verificationResult.confidence >= 80 ? "text-green-400" : "text-amber-400"}>
                        {verificationResult.confidence}%
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative aspect-square w-48 h-48 mx-auto rounded-full bg-gradient-to-tr from-accent/5 to-purpleBrand/5 border border-white flex items-center justify-center shadow-lg shadow-accent/5">
                  <span className="text-8xl animate-[float_4s_infinite_ease-in-out]">
                    {translateNameToEmoji(selectedGesture.name)}
                  </span>
                  
                  {/* Visual scanning circle border */}
                  <div className="absolute inset-2 border border-dashed border-accent/20 rounded-full animate-[spin_40s_linear_infinite]"></div>
                </div>
              )}

              {/* Action logs & message */}
              <div className="space-y-4">
                {actionMessage && (
                  <p className="text-xs font-bold text-accent font-syne animate-pulse">{actionMessage}</p>
                )}
                {verifyError && (
                  <p className="text-xs font-bold text-red-500 font-syne">{verifyError}</p>
                )}

                {/* Accuracy progress meters if verifying */}
                {cameraMode && verificationResult && (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 space-y-2 text-left text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Форма руки:</span>
                      <span className="font-bold text-slate-700">{verificationResult.components.hand_shape}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div style={{ width: `${verificationResult.components.hand_shape}%` }} className="bg-accent h-full"></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Позиция:</span>
                      <span className="font-bold text-slate-700">{verificationResult.components.position}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div style={{ width: `${verificationResult.components.position}%` }} className="bg-accent h-full"></div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Движение:</span>
                      <span className="font-bold text-slate-700">{verificationResult.components.movement}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div style={{ width: `${verificationResult.components.movement}%` }} className="bg-accent h-full"></div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  {cameraMode ? (
                    <button
                      onClick={stopCamera}
                      className="w-full py-3.5 rounded-xl border border-red-200 bg-red-500/10 text-red-650 hover:bg-red-500 hover:text-white font-syne font-bold text-sm tracking-wide shadow-sm transition-all"
                    >
                      ⏹ Остановить проверку
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-syne font-bold text-sm tracking-wide shadow-md transition-all flex justify-center items-center gap-2"
                    >
                      <span>🎥 Проверить через камеру</span>
                    </button>
                  )}

                  {!cameraMode && (
                    <div className="flex gap-4">
                      <button
                        onClick={handleRepeatGesture}
                        className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 hover:text-slate-850 hover:bg-white font-syne font-bold text-sm tracking-wide shadow-sm transition-all"
                      >
                        ✊ Повторить
                      </button>
                      <button
                        onClick={handleRememberGesture}
                        className={`flex-1 py-3.5 rounded-xl text-white font-syne font-bold text-sm tracking-wide shadow-md transition-all ${
                          progressMap[selectedGesture.id]?.learned
                            ? "bg-slate-800 hover:bg-slate-750"
                            : "bg-accent hover:bg-accent/90"
                        }`}
                      >
                        {progressMap[selectedGesture.id]?.learned ? "✓ Выучено" : "☆ Запомнить"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="my-auto py-16 text-center text-slate-400 space-y-2">
              <span className="text-4xl">📚</span>
              <p className="text-xs font-bold">Выберите жест из списка для начала изучения</p>
            </div>
          )}
        </div>

        {/* Right Side: Gesture Dictionary Grid (7 cols) */}
        <div className="lg:col-span-7 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h3 className="font-syne font-extrabold text-lg text-slate-800">Каталог жестов</h3>
            
            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto max-w-full pb-1 pr-1 custom-scrollbar">
              {["Все", "Базовые", "Семья", "Еда", "Эмоции", "Числа"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border shrink-0 ${
                    selectedCategory === cat
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-white/50 text-slate-500 border-slate-200 hover:border-slate-350"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
            {gestures
              .filter((item) => selectedCategory === "Все" || item.category === selectedCategory)
              .map((item) => {
              const isSelected = selectedGesture?.id === item.id;
              const hasProgress = progressMap[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedGesture(item)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-4 ${
                    isSelected
                      ? "bg-white/70 border-accent shadow-md scale-[1.02]"
                      : "bg-white/40 border-white/60 hover:bg-white/50 hover:border-slate-300 shadow-sm"
                  }`}
                >
                  <div className="text-2xl p-2 bg-white/80 border border-slate-100 shadow-sm rounded-lg">
                    {translateNameToEmoji(item.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-syne font-bold text-sm text-slate-800 truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                      Попыток: {hasProgress?.attempts || 0}
                    </p>
                  </div>
                  {hasProgress?.learned && (
                    <span className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Hidden canvas for video captures */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
