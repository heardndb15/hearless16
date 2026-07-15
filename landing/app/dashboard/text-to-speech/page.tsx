"use client";

import { useTextToSpeech, TTS_LANGUAGES, TTS_DEMO_PHRASES } from "../../../lib/useTextToSpeech";

export default function DashboardTextToSpeechPage() {
  const { lang, text, audioUrl, loading, error, selectLanguage, updateText, handleSpeak } = useTextToSpeech();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-[#F5F5F7]">Текст → Речь</h2>
        <p className="text-[#9AA5BD] text-sm max-w-2xl font-medium">
          Введи текст — устройство озвучит его вслух для собеседника. Поддержка казахского, русского и английского.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-[#12182A]/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex gap-2">
            {TTS_LANGUAGES.map(l => (
              <button
                key={l.key}
                onClick={() => selectLanguage(l.key)}
                className={`px-4 py-2 rounded-full font-syne font-bold text-xs transition-all border ${
                  lang === l.key
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-[#12182A]/50 text-[#9AA5BD] border-white/10 hover:border-white/15"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={e => updateText(e.target.value)}
            placeholder="Введи текст для озвучивания..."
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-[#12182A]/60 px-4 py-3.5 text-sm text-[#F5F5F7] font-medium resize-none outline-none focus:border-accent transition-colors"
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {TTS_DEMO_PHRASES[lang].map(w => (
                <button
                  key={w}
                  onClick={() => updateText(w)}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-[#12182A]/50 text-[#9AA5BD] text-xs font-semibold hover:border-accent hover:text-accent transition-colors"
                >
                  {w}
                </button>
              ))}
            </div>
            <button
              onClick={handleSpeak}
              disabled={!text.trim() || loading}
              className="px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-syne font-bold text-sm tracking-wide shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Озвучиваем…" : "🔊 Озвучить →"}
            </button>
          </div>

          {error && <p className="text-xs font-bold text-red-500 font-syne">{error}</p>}

          {audioUrl && (
            <div className="bg-[#12182A]/80 border border-white/10 rounded-xl p-4 space-y-3">
              <audio controls autoPlay src={audioUrl} className="w-full" />
              <p className="font-syne text-sm font-bold text-[#F5F5F7]">&ldquo;{text}&rdquo;</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-[#12182A]/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="font-syne font-extrabold text-base text-[#F5F5F7]">Как это работает</h3>
          {[
            { step: "01", title: "Ввод текста", desc: "Напиши фразу на казахском, русском или английском языке." },
            { step: "02", title: "Озвучивание ИИ", desc: "Текст отправляется в ИИ-сервис и превращается в естественную речь." },
            { step: "03", title: "Воспроизведение", desc: "Аудио проигрывается вслух — собеседник слышит фразу." },
          ].map(d => (
            <div key={d.step} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#1A2138] border border-[#4C8DDB]/30 text-[10px] font-bold text-[#4C8DDB] flex items-center justify-center mt-0.5">
                {d.step}
              </span>
              <div>
                <p className="font-syne text-xs font-bold text-[#F5F5F7]">{d.title}</p>
                <p className="text-[11px] text-[#9AA5BD] leading-snug mt-0.5">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
