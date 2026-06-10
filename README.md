# Hearless 🦻

Мобильное приложение для глухих и слабослышащих людей.

## Структура проекта

```
hearless/
├── mobile/          # React Native + Expo (SDK 51)
├── landing/         # Next.js 14 лендинг
├── backend/         # FastAPI (Python)
└── shared/          # Общие типы TypeScript
```

## Быстрый старт

### Мобильное приложение

```bash
cd mobile
npm install
npx expo start
```

### Лендинг

```bash
cd landing
npm install
npm run dev
```

### Бэкенд

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Технологии

- **Мобильное**: React Native, Expo SDK 51, React Navigation
- **Веб**: Next.js 14, TypeScript
- **Бэкенд**: FastAPI, Supabase
- **AI**: OpenAI Whisper API

## Цветовая палитра

| Назначение | Цвет |
|-----------|-------|
| Фон | #f3f8fc |
| Карточки | #cce4f0 |
| Акцент | #3c95bb |
| Кнопки | #2c789d |
| Заголовки | #214559 |
| Тёмный | #162d3b |
| SOS | #ef4444 |
