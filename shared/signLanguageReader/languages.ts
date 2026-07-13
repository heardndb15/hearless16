export type SignLanguage = "kz" | "ru";

export const SIGN_LANGUAGES: { code: SignLanguage; label: string }[] = [
  { code: "kz", label: "KZ" },
  { code: "ru", label: "RU (SLOVO)" },
];

export const DEFAULT_SIGN_LANGUAGE: SignLanguage = "ru";

export const SIGN_LANGUAGE_STORAGE_KEY = "hearless.signLanguage";

export const SIGN_LANGUAGE_TTS_LOCALE: Record<SignLanguage, string> = {
  kz: "kk-KZ",
  ru: "ru-RU",
};
