"use client";

import { useTextToSpeech, TTS_LANGUAGES, TTS_DEMO_PHRASES } from "../../../lib/useTextToSpeech";

export default function DashboardTextToSpeechPage() {
  const { lang, text, audioUrl, loading, error, selectLanguage, updateText, handleSpeak } = useTextToSpeech();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-syne font-extrabold text-3xl text-slate-800">Текст → Речь</h2>
        <p className="text-slate-500 text-sm max-w-2xl font-medium">
          Введи текст — устройство озвучит его вслух для собеседника. Поддержка казахского, русского и английского.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex gap-2">
            {TTS_LANGUAGES.map(l => (
              <button
                key={l.key}
                onClick={() => selectLanguage(l.key)}
                className={`px-4 py-2 rounded-full font-syne font-bold text-xs transition-all border ${
                  lang === l.key
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-white/50 text-slate-500 border-slate-200 hover:border-slate-350"
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
            className="w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3.5 text-sm text-slate-800 font-medium resize-none outline-none focus:border-accent transition-colors"
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {TTS_DEMO_PHRASES[lang].map(w => (
                <button
                  key={w}
                  onClick={() => updateText(w)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 bg-white/50 text-slate-500 text-xs font-semibold hover:border-accent hover:text-accent transition-colors"
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
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 space-y-3">
              <audio controls autoPlay src={audioUrl} className="w-full" />
              <p className="font-syne text-sm font-bold text-slate-700">&ldquo;{text}&rdquo;</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="font-syne font-extrabold text-base text-slate-800">Как это работает</h3>
          {[
            { step: "01", title: "Ввод текста", desc: "Напиши фразу на казахском, русском или английском языке." },
            { step: "02", title: "Озвучивание ИИ", desc: "Текст отправляется в ИИ-сервис и превращается в естественную речь." },
            { step: "03", title: "Воспроизведение", desc: "Аудио проигрывается вслух — собеседник слышит фразу." },
          ].map(d => (
            <div key={d.step} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-sky-100 border border-sky-200 text-[10px] font-bold text-sky-600 flex items-center justify-center mt-0.5">
                {d.step}
              </span>
              <div>
                <p className="font-syne text-xs font-bold text-slate-800">{d.title}</p>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
