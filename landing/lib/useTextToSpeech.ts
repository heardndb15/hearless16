"use client";

import { useState } from "react";

export type TtsLang = "kk" | "ru" | "en";

export const TTS_DEMO_PHRASES: Record<TtsLang, string[]> = {
  kk: ["Сәлем", "Рахмет", "Көмектесіңізші", "Су", "Тамақ", "Отбасы"],
  ru: ["Привет", "Спасибо", "Помогите", "Вода", "Еда", "Семья"],
  en: ["Hello", "Thank you", "Help me", "Water", "Food", "Family"],
};

export const TTS_LANGUAGES: { key: TtsLang; label: string }[] = [
  { key: "kk", label: "Қазақша" },
  { key: "ru", label: "Русский" },
  { key: "en", label: "English" },
];

export function useTextToSpeech() {
  const [lang, setLang] = useState<TtsLang>("ru");
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetOutput() {
    setAudioUrl(null);
    setError(null);
  }

  function selectLanguage(key: TtsLang) {
    setLang(key);
    setText("");
    resetOutput();
  }

  function updateText(value: string) {
    setText(value);
    resetOutput();
  }

  async function handleSpeak() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: lang }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      const blob = await res.blob();
      const newUrl = URL.createObjectURL(blob);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return newUrl;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось озвучить текст");
    } finally {
      setLoading(false);
    }
  }

  return {
    lang,
    text,
    audioUrl,
    loading,
    error,
    selectLanguage,
    updateText,
    handleSpeak,
  };
}
