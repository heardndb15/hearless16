-- Таблица пользователей (связана с auth.users Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  language TEXT DEFAULT 'ru' CHECK (language IN ('kk', 'ru')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Автосоздание профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'ru')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
  attempts INT DEFAULT 0,
  best_accuracy REAL DEFAULT 0.0,
  PRIMARY KEY (user_id, gesture_id)
);

-- Звуковые оповещения
CREATE TABLE IF NOT EXISTS sound_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sound_type TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS события
CREATE TABLE IF NOT EXISTS sos_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('silent', 'normal')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_subtitles_user ON subtitles_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subtitles_created ON subtitles_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gestures_category ON gestures(category);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON sound_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_detected ON sound_alerts(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_user ON sos_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_created ON sos_events(created_at DESC);

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

-- Включение Row Level Security (RLS) для всех таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtitles_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sound_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- 1. Политики для таблицы пользователей (users)
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.users;
CREATE POLICY "Allow users to read their own profile"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;
CREATE POLICY "Allow users to update their own profile"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Политики для каталога жестов (gestures) - доступен всем на чтение
DROP POLICY IF EXISTS "Allow read access to gestures for everyone" ON public.gestures;
CREATE POLICY "Allow read access to gestures for everyone"
  ON public.gestures FOR SELECT TO anon, authenticated
  USING (true);

-- 3. Политики для истории субтитров (subtitles_history)
DROP POLICY IF EXISTS "Allow users to read their own subtitles" ON public.subtitles_history;
CREATE POLICY "Allow users to read their own subtitles"
  ON public.subtitles_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own subtitles" ON public.subtitles_history;
CREATE POLICY "Allow users to insert their own subtitles"
  ON public.subtitles_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own subtitles" ON public.subtitles_history;
CREATE POLICY "Allow users to delete their own subtitles"
  ON public.subtitles_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Политики для прогресса пользователя (user_progress)
DROP POLICY IF EXISTS "Allow users to read their own progress" ON public.user_progress;
CREATE POLICY "Allow users to read their own progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert/update their own progress" ON public.user_progress;
CREATE POLICY "Allow users to insert/update their own progress"
  ON public.user_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Политики для звуковых оповещений (sound_alerts)
DROP POLICY IF EXISTS "Allow users to read their own sound alerts" ON public.sound_alerts;
CREATE POLICY "Allow users to read their own sound alerts"
  ON public.sound_alerts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own sound alerts" ON public.sound_alerts;
CREATE POLICY "Allow users to insert their own sound alerts"
  ON public.sound_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Политики для SOS событий (sos_events)
DROP POLICY IF EXISTS "Allow users to read their own sos events" ON public.sos_events;
CREATE POLICY "Allow users to read their own sos events"
  ON public.sos_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own sos events" ON public.sos_events;
CREATE POLICY "Allow users to insert their own sos events"
  ON public.sos_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

