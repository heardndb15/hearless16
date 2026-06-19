"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";

interface SubtitleHistoryItem {
  id: string;
  text: string;
  created_at: string;
}

const SAMPLE_PHRASES = [
  "Привет! Рад тебя видеть.",
  "Как твои дела? Всё хорошо?",
  "Сегодня отличная погода для прогулки.",
  "Hearless помогает переводить речь в текст на лету.",
  "Искусственный интеллект завершил распознавание голоса.",
  "Если вам нужна помощь, нажмите красную кнопку SOS."
];

export default function SubtitlesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<SubtitleHistoryItem[]>([]);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        fetchHistory(data.user.id);
      }
    });
  }, []);

  async function fetchHistory(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("subtitles_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setHistory(data);
    }
    setLoading(false);
  }

  // Simulate real-time speech recognition
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (listening) {
      setText("");
      let phraseIndex = 0;
      let wordIndex = 0;
      let currentPhrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];
      let words = currentPhrase.split(" ");

      interval = setInterval(() => {
        if (wordIndex < words.length) {
          setText(prev => (prev ? prev + " " : "") + words[wordIndex]);
          wordIndex++;
        } else {
          // Pause before starting the next phrase
          wordIndex = 0;
          currentPhrase = SAMPLE_PHRASES[Math.floor(Math.random() * SAMPLE_PHRASES.length)];
          words = currentPhrase.split(" ");
          setText("");
        }
      }, 800);
    } else {
      setText("");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [listening]);

  async function handleToggleListening() {
    if (listening) {
      // Stopped listening, save the final text if not empty
      setListening(false);
      if (text && user) {
        setSaving(true);
        const supabase = createClient();
        await supabase.from("subtitles_history").insert({
          user_id: user.id,
          text: text,
          created_at: new Date().toISOString()
        });
        setSaving(false);
        fetchHistory(user.id);
      }
    } else {
      setListening(true);
    }
  }

  async function handleDeleteHistory(id: string) {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("subtitles_history").delete().eq("id", id);
    fetchHistory(user.id);
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Загрузка модуля субтитров...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header info */}
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Живые субтитры</h2>
        <p className="text-slate-500 text-sm max-w-2xl">
          Распознавайте речь собеседника в реальном времени. Текст выводится крупным шрифтом на контрастной стеклянной подложке.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Netflix style subtitle output (7 cols) */}
        <div className="lg:col-span-7 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6 relative">
          <div className="flex justify-between items-center">
            <span className="font-syne text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></span>
              {listening ? "Распознавание активно" : "Ассистент ожидает запуска"}
            </span>
            {saving && (
              <span className="text-xs text-accent font-bold font-syne animate-pulse">Сохранение...</span>
            )}
          </div>

          {/* Netflix Subtitle display screen */}
          <div className="relative aspect-[16/10] rounded-2xl bg-slate-950/90 border border-slate-900 shadow-2xl flex items-center justify-center p-8 overflow-hidden">
            {listening ? (
              <div className="text-center space-y-6 max-w-lg">
                {/* Netflix style subtitles: large, semi-transparent backdrop, highly readable */}
                <p className="font-dm font-bold text-2xl md:text-3xl text-white leading-relaxed tracking-wide bg-black/60 backdrop-blur-sm px-6 py-3.5 rounded-xl border border-white/5 inline-block shadow-lg animate-[fade-up_0.2s_ease-out]">
                  {text || "..."}
                </p>
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <span className="text-4xl opacity-40">💬</span>
                <p className="text-sm font-bold text-slate-400">Экран субтитров</p>
                <p className="text-xs text-slate-500 max-w-xs leading-normal mx-auto">
                  Нажмите кнопку ниже, чтобы включить микрофон. Речь вашего собеседника будет транслироваться сюда.
                </p>
              </div>
            )}

            {/* Glowing borders */}
            {listening && (
              <div className="absolute inset-0 border border-red-500/20 rounded-2xl pointer-events-none animate-pulse"></div>
            )}
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleToggleListening}
            className={`w-full py-4.5 rounded-2xl font-syne font-bold text-sm tracking-wide shadow-md transition-all duration-200 ${
              listening
                ? "bg-slate-900 hover:bg-slate-800 text-white border border-slate-800"
                : "bg-accent hover:bg-accent/90 text-white"
            }`}
          >
            {listening ? "■ Остановить и сохранить" : "▶ Начать слушать речь"}
          </button>
        </div>

        {/* Right Side: Saved History (5 cols) */}
        <div className="lg:col-span-5 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6">
          <h3 className="font-syne font-extrabold text-lg text-slate-800">История диалогов</h3>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-3 pr-1">
            {history.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Сохраненных диалогов пока нет.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white/50 border border-white/80 shadow-sm space-y-3 text-left group"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(item.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => handleDeleteHistory(item.id)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="font-dm text-xs text-slate-700 leading-relaxed font-medium">
                    {item.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
