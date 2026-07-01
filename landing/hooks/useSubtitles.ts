import { useState, useEffect, useRef } from "react";

export type Cue = { start: number; end: number; text: string };
export type SubtitleMap = Record<string, Cue[]>;

export function useSubtitles(subtitles: SubtitleMap, defaultLang: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lang, setLang] = useState(defaultLang);
  const [text, setText] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () => {
      const t = video.currentTime;
      const cue = (subtitles[lang] ?? []).find(c => t >= c.start && t < c.end);
      setText(cue?.text ?? "");
    };

    sync();
    video.addEventListener("timeupdate", sync);
    return () => video.removeEventListener("timeupdate", sync);
  }, [lang, subtitles]);

  return { videoRef, lang, setLang, text };
}
