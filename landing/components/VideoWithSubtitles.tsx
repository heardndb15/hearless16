"use client";

import { useSubtitles, SubtitleMap } from "@/hooks/useSubtitles";

// Replace with your own subtitles or load via fetch() from /public/subtitles/*.json
const SUBTITLES: SubtitleMap = {
  ru: [
    { start: 0,  end: 4,  text: "Привет, как дела?" },
    { start: 4,  end: 9,  text: "Меня зовут Алихан." },
    { start: 9,  end: 14, text: "Вам нужна помощь?" },
  ],
  kz: [
    { start: 0,  end: 4,  text: "Sәlem, qalıňız qalai?" },
    { start: 4,  end: 9,  text: "Menіń atыm Әlіxan." },
    { start: 9,  end: 14, text: "Sіzge kómek qazhet pe?" },
  ],
  en: [
    { start: 0,  end: 4,  text: "Hello, how are you?" },
    { start: 4,  end: 9,  text: "My name is Alikhan." },
    { start: 9,  end: 14, text: "Do you need help?" },
  ],
};

const LANGS = [
  { code: "ru", label: "RUS" },
  { code: "kz", label: "KAZ" },
  { code: "en", label: "ENG" },
];

export default function VideoWithSubtitles({ src }: { src: string }) {
  const { videoRef, lang, setLang, text } = useSubtitles(SUBTITLES, "ru");

  return (
    <div style={wrap}>
      {/* Replace src with the path to your video file */}
      <video ref={videoRef} src={src} controls style={video} />

      <div style={subBox}>
        {text && <span style={subText}>{text}</span>}
      </div>

      <div style={switcher}>
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            style={lang === l.code ? { ...btn, ...btnActive } : btn}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  background: "#000",
  borderRadius: 8,
  overflow: "hidden",
  width: "100%",
  maxWidth: 800,
};
const video: React.CSSProperties = { display: "block", width: "100%" };
const subBox: React.CSSProperties = {
  position: "absolute",
  bottom: 64,
  left: 0,
  right: 0,
  textAlign: "center",
  pointerEvents: "none",
  padding: "0 20px",
};
const subText: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(0,0,0,0.78)",
  color: "#fff",
  fontSize: 18,
  fontWeight: 500,
  padding: "5px 14px",
  borderRadius: 4,
  lineHeight: 1.45,
};
const switcher: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  display: "flex",
  gap: 6,
};
const btn: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 20,
  border: "1.5px solid rgba(255,255,255,0.35)",
  background: "rgba(0,0,0,0.5)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
};
const btnActive: React.CSSProperties = {
  background: "#fff",
  color: "#000",
  borderColor: "#fff",
};
