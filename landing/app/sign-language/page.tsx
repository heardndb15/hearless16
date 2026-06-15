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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ padding: "120px 24px 60px", maxWidth: 960, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14, display: "inline-block", marginBottom: 24 }}>
          ← На главную
        </Link>
        <div className="section-label">Функция</div>
        <h1 className="section-title">Изучение жестового языка</h1>
        <p className="section-subtitle" style={{ maxWidth: 600 }}>
          Казахский жестовый язык. Алфавит, цифры, базовые слова. Три уровня сложности: начальный, средний, продвинутый.
        </p>

        {/* Levels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, margin: "40px 0" }}>
          {LEVELS.map(l => (
            <div key={l.name} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "28px 24px", border: "1px solid var(--border)", textAlign: "center" }}>
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
            <div key={lesson.title} style={{ background: "var(--bgCard)", borderRadius: "var(--radius)", padding: "28px 24px", border: "1px solid var(--border)", transition: "all 0.3s ease", cursor: "default" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{lesson.icon}</div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{lesson.title}</h3>
              <p style={{ fontSize: 13, color: "var(--textSecondary)", lineHeight: 1.6, marginBottom: 14 }}>{lesson.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--textMuted)" }}>
                <span style={{ padding: "3px 8px", borderRadius: 4, background: "var(--bg)", border: "1px solid var(--border)" }}>{lesson.level}</span>
                <span>{lesson.lessons}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
