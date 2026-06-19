"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
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
              setLanguage((profile.language as "kk" | "ru") || "ru");
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
      setMessage("Настройки успешно сохранены!");
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
    return <div className="py-20 text-center text-slate-400">Загрузка настроек профиля...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header info */}
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Настройки профиля</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Управляйте своей учетной записью, языковыми предпочтениями и параметрами приватности.
        </p>
      </div>

      <div className="max-w-xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 md:p-8 space-y-6">
        {/* Name input */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-slate-600 uppercase tracking-wider">
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/60 border border-slate-200/60 focus:border-accent text-slate-850 text-sm font-semibold outline-none transition-colors"
            placeholder="Введите ваше имя"
          />
        </div>

        {/* Language select */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-slate-600 uppercase tracking-wider">
            Язык интерфейса
          </label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "kk" | "ru")}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-slate-200/60 focus:border-accent text-slate-850 text-sm font-semibold outline-none transition-colors appearance-none"
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Email display (read only) */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-slate-400 uppercase tracking-wider">
            Email-адрес (нельзя изменить)
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 rounded-xl bg-slate-100/40 border border-slate-200/40 text-slate-400 text-sm outline-none cursor-not-allowed"
          />
        </div>

        {/* Message notification */}
        {message && (
          <p className={`text-xs font-bold font-syne text-left ${message.includes("Ошибка") ? "text-red-500" : "text-green-600"}`}>
            {message}
          </p>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-slate-350 disabled:text-slate-500 text-white font-syne font-bold text-sm tracking-wide shadow-md transition-colors duration-200"
        >
          {saving ? "Сохранение..." : "Сохранить изменения"}
        </button>

        <hr className="border-slate-200/60" />

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-xl bg-transparent border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors duration-200 font-syne font-bold text-sm"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
