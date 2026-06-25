"use client";

import Link from "next/link";

const LESSONS = [
  { icon: "🖐️", title: "Алфавит", desc: "Буквы казахского жестового алфавита. 42 символа с видео и анимациями.", level: "Начальный", lessons: "10 уроков" },
  { icon: "✌️", title: "Цифры", desc: "Числа от 0 до 100. Базовые жесты для счёта и математики.", level: "Начальный", lessons: "4 урока" },
  { icon: "👪", title: "Семья", desc: "Мама, папа, брат, сестра, бабушка, дедушка и другие родственники.", level: "Начальный", lessons: "6 уроков" },
  { icon: "🍔", title: "Еда", desc: "Продукты, напитки, ресторан. Набор базовых жестов для повседневной жизни.", level: "Средний", lessons: "8 уроков" },
  { icon: "😊", title: "Эмоции", desc: "Радость, грусть, страх, удивление. Как выражать чувства на жестовом языке.", level: "Средний", lessons: "6 уроков" },
  { icon: "💼", title: "Работа", desc: "Профессии, офис, собеседование. Жесты для делового общения.", level: "Продвинутый", lessons: "8 уроков" },
  { icon: "🏥", title: "Здоровье", desc: "Больница, симптомы, лекарства. Важные жесты экстренных ситуаций.", level: "Продвинутый", lessons: "6 уроков" },
  { icon: "🌍", title: "Категории", desc: "Погода, природа, путешествия. Расширенный словарный запас.", level: "Продвинутый", lessons: "10 уроков" },
];

const LEVELS = [
  { name: "Начальный", count: 20, color: "var(--success)", desc: "Алфавит, цифры, семья" },
  { name: "Средний", count: 30, color: "var(--accent)", desc: "Эмоции, еда, повседневность" },
  { name: "Продвинутый", count: 50, color: "var(--purple)", desc: "Работа, здоровье, категории" },
];

export default function SignLanguagePage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 960, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label" style={{ color: "var(--text)" }}>Функция</div>
        <h1 className="section-title" style={{ color: "var(--text)" }}>Изучение жестового языка</h1>
        <p className="section-subtitle" style={{ maxWidth: 600, color: "var(--textSecondary)" }}>
          Казахский жестовый язык. Алфавит, цифры, базовые слова. Три уровня сложности: начальный, средний, продвинутый.
        </p>

        {/* Banner for Interactive Simulator */}
        <div style={{
          background: "var(--bgCard)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
          padding: "32px",
          marginTop: "32px",
          marginBottom: "40px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8.5" />
              <path d="M6 14v-1.5a1.5 1.5 0 0 0-3 0V16a5 5 0 0 0 5 5h4a8 8 0 0 0 8-8v-2a1.5 1.5 0 0 0-3 0" />
            </svg>
            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>
                Интерактивный тренажер жестов
              </h2>
              <p style={{ fontSize: "14px", color: "var(--textSecondary)", marginTop: "4px" }}>
                Обучайтесь в реальном времени. Наш алгоритм сравнит ваши жесты с эталоном с точностью до миллиметра!
              </p>
            </div>
          </div>
          <p style={{ fontSize: "14px", color: "var(--textSecondary)", lineHeight: 1.6 }}>
            Включите веб-камеру, повторяйте буквы алфавита (дактиля) и получайте моментальный фидбек: система подскажет, если нужно сжать кулак или выпрямить большой палец.
          </p>
          <div>
            <Link href="/sign-language/practice" className="btn btn-primary" style={{ textDecoration: "none", fontSize: "14px", padding: "12px 28px" }}>
              🎥 Запустить тренажер
            </Link>
          </div>
        </div>

        {/* Levels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, margin: "40px 0" }}>
          {LEVELS.map(l => (
            <div key={l.name} style={{ background: "var(--bgCard)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "var(--radius)", padding: "28px 24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)", textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 700, color: l.color }}>{l.count}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "8px 0 4px" }}>{l.name}</div>
              <div style={{ fontSize: 13, color: "var(--textMuted)" }}>{l.desc}</div>
            </div>
          ))}
        </div>

        {/* Lessons */}
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>Каталог уроков</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {LESSONS.map(lesson => (
            <div key={lesson.title} style={{ background: "var(--bgCard)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "var(--radius)", padding: "28px 24px", border: "1px solid var(--border)", boxShadow: "var(--shadow)", transition: "all 0.3s ease", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{lesson.icon}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{lesson.title}</h3>
              <p style={{ fontSize: 13, color: "var(--textSecondary)", lineHeight: 1.6, marginBottom: 14 }}>{lesson.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#1565C0" }}>
                <span style={{ padding: "3px 8px", borderRadius: 4, background: "rgba(14, 165, 233, 0.05)", border: "1px solid var(--border)" }}>{lesson.level}</span>
                <span>{lesson.lessons}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
