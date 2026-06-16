"use client";

import Link from "next/link";

const ACHIEVEMENTS = [
  { icon: "🔥", name: "Первое пламя", desc: "Получи первый стрик — 3 дня подряд", xp: 50, locked: false },
  { icon: "⭐", name: "Звезда", desc: "Выучи 50 жестов", xp: 100, locked: false },
  { icon: "🏆", name: "Чемпион", desc: "Заверши 10 уроков", xp: 200, locked: false },
  { icon: "💪", name: "Силач", desc: "Заработай 1000 XP", xp: 300, locked: false },
  { icon: "👑", name: "Король стрика", desc: "30 дней без пропуска", xp: 500, locked: true },
  { icon: "🎯", name: "Меткий", desc: "100% точность в тесте", xp: 150, locked: true },
  { icon: "📚", name: "Книжный червь", desc: "Пройди все уроки категории", xp: 250, locked: true },
  { icon: "🌟", name: "Легенда", desc: "Достигни 10 уровня", xp: 1000, locked: true },
  { icon: "🤝", name: "Друг", desc: "Пригласи 5 друзей", xp: 200, locked: true },
  { icon: "📸", name: "Фотограф", desc: "Распознай 100 жестов через камеру", xp: 300, locked: true },
];

const LEVELS = [
  { level: 1, name: "Новичок", xp: 0 },
  { level: 2, name: "Ученик", xp: 200 },
  { level: 3, name: "Жестовед", xp: 500 },
  { level: 4, name: "Знаток", xp: 1000 },
  { level: 5, name: "Эксперт", xp: 2000 },
  { level: 6, name: "Мастер", xp: 3500 },
  { level: 7, name: "Профессионал", xp: 5000 },
  { level: 8, name: "Легенда", xp: 7500 },
];

const DAILY_QUESTS = [
  { task: "Повтори 10 жестов из категории «Семья»", progress: 4, total: 10, xp: 50 },
  { task: "Пройди тест по алфавиту", progress: 0, total: 1, xp: 30 },
  { task: "Посмотри 1 видеоурок", progress: 0, total: 1, xp: 20 },
];

export default function GamificationPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 960, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">Геймификация</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          XP, стрики, ачивки, ежедневные задания и уровни. Преврати обучение в увлекательную игру.
        </p>

        {/* User card */}
        <div style={{ marginTop: 40, background: "var(--bgCard)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "32px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--gradient)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: "white" }}>A</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Айгуль</div>
              <div style={{ fontSize: 13, color: "var(--textMuted)" }}>Уровень 4 · Жестовед · 1,240 XP</div>
            </div>
          </div>

          {/* XP bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--textSecondary)", marginBottom: 6 }}><span>1,240 XP</span><span>2,000 XP</span></div>
            <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
              <div style={{ width: "62%", height: "100%", borderRadius: 4, background: "var(--gradient)", animation: "xp-fill 1.5s ease-out" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 4 }}>Ещё 760 XP до уровня 5</div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[{ value: "12", label: "Стрик, дней" }, { value: "48", label: "Слов" }, { value: "3", label: "Ачивки" }, { value: "28", label: "Уроков" }].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "14px 8px", borderRadius: "var(--radiusSm)", background: "var(--bg)" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--textMuted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Levels */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Уровни</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            {LEVELS.map(l => (
              <div key={l.level} style={{ background: l.level <= 4 ? "var(--bgCard)" : "var(--bg)", borderRadius: "var(--radiusSm)", padding: "16px 12px", textAlign: "center", border: l.level <= 4 ? "1px solid var(--accent)" : "1px solid var(--border)", opacity: l.level <= 4 ? 1 : 0.4 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: l.level <= 4 ? "var(--accent)" : "var(--textMuted)" }}>{l.level}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>{l.name}</div>
                <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 2 }}>{l.xp} XP</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily quests */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Ежедневные задания</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DAILY_QUESTS.map((q, i) => (
              <div key={i} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "20px 24px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: "var(--text)" }}>{q.task}</span>
                  <span style={{ fontSize: 12, color: "var(--accent)", fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>+{q.xp} XP</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ width: `${(q.progress / q.total) * 100}%`, height: "100%", borderRadius: 3, background: "var(--gradient)" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--textMuted)" }}>{q.progress}/{q.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Ачивки</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {ACHIEVEMENTS.map(a => (
              <div key={a.name} style={{ background: a.locked ? "var(--bg)" : "var(--bgCard)", borderRadius: "var(--radius)", padding: "24px 20px", textAlign: "center", border: "1px solid var(--border)", opacity: a.locked ? 0.4 : 1 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{a.icon}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: "var(--textMuted)", lineHeight: 1.4, marginBottom: 8 }}>{a.desc}</div>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>+{a.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
