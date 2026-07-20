"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import type { User } from "@supabase/supabase-js";

const PLAN_NAMES: Record<"free" | "basic" | "pro", string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
};

function formatPlanExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [language, setLanguage] = useState<"kk" | "ru">("ru");
  const [plan, setPlan] = useState<"free" | "basic" | "pro">("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // Same fix as app/dashboard/layout.tsx: getUser()/getSession() called
    // directly on mount can race the browser client's cookie restore and
    // false-negative right after navigating in from /community. middleware.ts
    // already gates this route server-side, so only redirect on a real
    // SIGNED_OUT event, not on a transient null session at mount.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("users")
          .select("name, bio, avatar_url, language, plan, plan_expires_at")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setName(profile.name || "");
              setBio(profile.bio || "");
              setAvatarUrl(profile.avatar_url || "");
              setAvatarPreview(profile.avatar_url || "");
              setLanguage((profile.language as "kk" | "ru") || "ru");
              setPlan((profile.plan as "free" | "basic" | "pro") || "free");
              setPlanExpiresAt(profile.plan_expires_at || null);
            }
            setLoading(false);
          });
        return;
      }
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    await supabase.storage.createBucket("avatars", { public: true }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setMessage("Ошибка загрузки фото: " + uploadError.message);
      setAvatarPreview(avatarUrl);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const busted = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(busted);
    setAvatarPreview(busted);
    setUploadingAvatar(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ name, bio, language, avatar_url: avatarUrl })
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
    return <div className="py-20 text-center text-[#9AA5BD]">Загрузка настроек профиля...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-[#F5F5F7]">Настройки профиля</h2>
        <p className="text-[#9AA5BD] text-sm max-w-2xl font-medium">
          Управляйте своей учетной записью, языковыми предпочтениями и параметрами приватности.
        </p>
      </div>

      <div className="max-w-xl glass-card rounded-2xl p-6 md:p-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#9AA5BD] uppercase tracking-wider mb-1">Текущий тариф</p>
          <p className="font-syne font-extrabold text-2xl text-[#F5F5F7]">{PLAN_NAMES[plan]}</p>
          {plan !== "free" && planExpiresAt && (
            <p className="text-xs text-[#9AA5BD] font-medium mt-1">
              Продлится: {formatPlanExpiry(planExpiresAt)}
            </p>
          )}
        </div>
        <Link
          href="/pricing"
          className="px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-syne font-bold text-sm tracking-wide shadow-md transition-colors duration-200 whitespace-nowrap"
        >
          {plan === "free" ? "Улучшить план" : "Сменить тариф"}
        </Link>
      </div>

      <div className="max-w-xl glass-card rounded-2xl p-6 md:p-8 space-y-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-md focus:outline-none"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-[#9AA5BD] text-3xl font-bold font-syne">
                {name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <p className="text-xs text-[#9AA5BD] font-medium">Нажмите чтобы изменить фото</p>
        </div>

        {/* Name */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-[#9AA5BD] uppercase tracking-wider">
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            className="w-full px-4 py-3 rounded-xl bg-[#12182A]/60 border border-white/10 focus:border-accent text-[#F5F5F7] text-sm font-semibold outline-none transition-colors"
            placeholder="Введите ваше имя"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-[#9AA5BD] uppercase tracking-wider">
            О себе
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-[#12182A]/60 border border-white/10 focus:border-accent text-[#F5F5F7] text-sm font-semibold outline-none transition-colors resize-none"
            placeholder="Расскажите о себе..."
          />
          <p className="text-right text-xs text-[#9AA5BD]">{bio.length}/200</p>
        </div>

        {/* Language */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-[#9AA5BD] uppercase tracking-wider">
            Язык интерфейса
          </label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "kk" | "ru")}
              className="w-full px-4 py-3 rounded-xl bg-[#12182A]/60 border border-white/10 focus:border-accent text-[#F5F5F7] text-sm font-semibold outline-none transition-colors appearance-none"
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#9AA5BD]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2 text-left">
          <label className="block font-syne text-xs font-bold text-[#9AA5BD] uppercase tracking-wider">
            Email-адрес (нельзя изменить)
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#9AA5BD] text-sm outline-none cursor-not-allowed"
          />
        </div>

        {message && (
          <p className={`text-xs font-bold font-syne text-left ${message.includes("Ошибка") ? "text-red-500" : "text-green-600"}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || uploadingAvatar}
          className="w-full py-4 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-white/10 disabled:text-[#9AA5BD] text-white font-syne font-bold text-sm tracking-wide shadow-md transition-colors duration-200"
        >
          {saving ? "Сохранение..." : "Сохранить изменения"}
        </button>

        <hr className="border-white/10" />

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
