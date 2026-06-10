-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'ru' CHECK (language IN ('kk', 'ru')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- История субтитров
CREATE TABLE IF NOT EXISTS subtitles_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Каталог жестов
CREATE TABLE IF NOT EXISTS gestures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard'))
);

-- Прогресс пользователя
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gesture_id UUID REFERENCES gestures(id) ON DELETE CASCADE,
  learned BOOLEAN DEFAULT FALSE,
  accuracy REAL DEFAULT 0.0,
  PRIMARY KEY (user_id, gesture_id)
);

-- Звуковые оповещения
CREATE TABLE IF NOT EXISTS sound_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sound_type TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_subtitles_user ON subtitles_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subtitles_created ON subtitles_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gestures_category ON gestures(category);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON sound_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_detected ON sound_alerts(detected_at DESC);

-- Вставка начальных жестов
INSERT INTO gestures (name, category, difficulty) VALUES
  ('Здравствуйте', 'Базовые', 'easy'),
  ('Спасибо', 'Базовые', 'easy'),
  ('До свидания', 'Базовые', 'easy'),
  ('Пожалуйста', 'Базовые', 'easy'),
  ('Да', 'Базовые', 'easy'),
  ('Нет', 'Базовые', 'easy'),
  ('Мама', 'Семья', 'easy'),
  ('Папа', 'Семья', 'easy'),
  ('Брат', 'Семья', 'medium'),
  ('Сестра', 'Семья', 'medium'),
  ('Еда', 'Еда', 'easy'),
  ('Вода', 'Еда', 'easy'),
  ('Вкусно', 'Еда', 'medium'),
  ('Радость', 'Эмоции', 'medium'),
  ('Грусть', 'Эмоции', 'medium'),
  ('Любовь', 'Эмоции', 'hard'),
  ('Один', 'Числа', 'easy'),
  ('Два', 'Числа', 'easy'),
  ('Три', 'Числа', 'easy'),
  ('Сто', 'Числа', 'hard')
ON CONFLICT DO NOTHING;
