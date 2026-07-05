# Hearless 🦻

Мобильное приложение + веб-лендинг для глухих и слабослышащих людей.

## Состав проекта

| Компонент | Путь | Технологии |
|-----------|------|------------|
| Мобильное приложение | `mobile/` | React Native, Expo SDK 51, Supabase |
| Веб-лендинг | `landing/` | Next.js 14, Supabase SSR, react-hook-form + zod |
| Бэкенд | `backend/` | FastAPI, Supabase, OpenAI Whisper |
| Общие типы | `shared/` | TypeScript интерфейсы для всех таблиц |

## Сайт (лендинг)

Развёрнут на Vercel: https://hearless16-pcug.vercel.app

Страницы:
- `/` — главная (Hero, Features, Stats)
- `/register` — регистрация (имя, email, пароль, язык kk/ru, согласие с условиями)
- `/login` — вход (email/пароль, Google OAuth)
- `/reset-password` — сброс пароля
- `/dashboard` — личный кабинет (статистика жестов, звуков, SOS)
- `/profile` — настройки профиля (имя, язык, выход)
- `/about` — о проекте
- `/features` — все возможности
- `/blog` — блог (4 статьи)
- `/contact` — форма обратной связи

### Разработка лендинга

```bash
cd landing
npm install
npm run dev        # http://localhost:3000
npm run build      # production сборка
```

**Важно:** Для авторизации нужны переменные окружения (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
```

### Схема БД (Supabase)

Нужно выполнить `backend/supabase/migration.sql` в SQL Editor Supabase. Таблицы:
- `users` — профили (связаны с `auth.users` через триггер)
- `subtitles_history` — история субтитров
- `gestures` — каталог жестов (20 начальных)
- `user_progress` — прогресс изучения жестов
- `sound_alerts` — звуковые оповещения
- `sos_events` — SOS сигналы

## Мобильное приложение

```bash
cd mobile
npm install
npx expo start     # сканируйте QR-код в Expo Go
```

Экраны:
- `SubtitlesScreen` — субтитры в реальном времени (WebSocket)
- `GesturesScreen` — каталог жестов с прогрессом
- `GesturePracticeScreen` — практика через камеру
- `AlertsScreen` — звуковые оповещения + SOS
- `ProfileScreen` — настройки пользователя

### Переменные окружения (мобильное)
```
EXPO_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
EXPO_PUBLIC_API_URL=https://hearless16-1.onrender.com
```

## Бэкенд

Развёрнут на Render: https://hearless16-1.onrender.com

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

### API endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth` | регистрация/вход |
| WebSocket | `/ws/transcribe` | стриминг субтитров |
| POST | `/gestures/recognize` | распознавание жеста |
| POST | `/sos/alert` | обычный SOS |
| POST | `/sos/silent` | тихий SOS |
| POST | `/alerts` | звуковые оповещения |

### Переменные окружения (бэкенд)
```
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_SERVICE_KEY=ваш-service-role-key
OPENAI_API_KEY=sk-...
```

## Деплой

| Компонент | Платформа | Настройка |
|-----------|-----------|-----------|
| Лендинг | Vercel | Root Directory: `landing/`, переменные: NEXT_PUBLIC_* |
| Бэкенд | Render | rootDir: backend, переменные: SUPABASE_*, OPENAI_API_KEY |

## Цветовая палитра

| Назначение | Цвет |
|-----------|-------|
| Фон | `#f3f8fc` |
| Карточки | `#cce4f0` |
| Акцент | `#3c95bb` |
| Кнопки | `#2c789d` |
| Заголовки | `#214559` |
| Тёмный | `#162d3b` |
| SOS | `#ef4444` |
