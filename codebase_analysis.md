# Анализ кодовой базы Hearless: слабые стороны и рекомендации

_Обновлено: 2026-07-22. Предыдущая версия этого отчёта устарела примерно на месяц: часть находок с тех пор исправлена, часть проблем усугубилась (интервалы стриминга на мобильном сокращены вдвое), а сама кодовая база выросла (community, alerts, polar, users на бэкенде; ai-tutor, gamification, pricing, text-to-sign на лендинге). Ревью проведено отдельно по трём доменам: `backend/` (FastAPI), `landing/` (Next.js 14), `mobile/` + `shared/` (Expo RN / TS)._

---

## 0. Статус находок из предыдущей версии отчёта

| Проблема | Статус | Комментарий |
|---|---|---|
| Блокировка event loop синхронным Whisper внутри `async def` | ✅ Исправлено | коммит `69d5b87`: все блокирующие вызовы обёрнуты в `asyncio.to_thread` |
| O(N²) пересборка аудио-чанков в стриминге | ✅ Исправлено | коммиты `0ddba59`, `3b304b7`: инкрементальный merge + окно из 3 чанков + фоновая задача |
| `base64.b64decode` без try/except в `/gestures/recognize` | ✅ Исправлено (частично) | try/except добавлен (`d66b456`), но лимита на размер payload всё ещё нет |
| Утечка текста исключения в auth-ошибках клиенту | ✅ Исправлено | коммит `e659c75`: клиенту — статичный текст, детали — в лог |
| WebSocket `/ws/transcribe` без проверки `Origin` (CSWSH) | ⚠️ Не исправлено | см. §1.4 |
| Рассинхрон `/transcribe` vs `/transcribe/` | ➖ Неактуально | `mobile/src/services/whisper.ts` удалён, клиент полностью перешёл на WS (см. §3.3 для остатка проблемы на сервере) |
| `recognize_gesture` — случайная эмуляция вместо реального ML | 🔄 Изменилось | теперь реальный MediaPipe-инференс, но появилась новая, более скрытая ловушка — см. §1.5 |
| Gemini API-ключ в клиентском бандле лендинга | ✅ Исправлено | Gemini полностью выпилен, заменён на Replicate (коммиты `96fb941`→`3b5e98c`→`24dc957`) |
| `SUPABASE_SERVICE_KEY` в `landing/.env` | ✅ Не было риска | ключ (сейчас `SUPABASE_SERVICE_ROLE_KEY`) никогда не попадал в git, используется только в серверном `app/api/webhooks/polar/route.ts` |
| Обрыв звука каждые ~3с при стриминге (mobile) | ⚠️ Не исправлено, стало хуже | интервал сокращён до **1.5с** — обрывов вдвое больше |
| `takePictureAsync` каждые ~300мс для практики жестов (mobile) | ⚠️ Не исправлено, стало хуже | интервал сокращён до **150мс**, тот же паттерн появился на втором экране (`useHandTracker.ts`, 175мс) |

---

## 1. Backend (FastAPI)

### 1.1. Rate-limiting не работает за прокси Render
**Локация:** `backend/app/limiter.py:4`, `render.yaml` (`startCommand`)

`Limiter(key_func=get_remote_address, ...)` — `slowapi.util.get_remote_address` читает `request.client.host`, а не `X-Forwarded-For`. Uvicorn на Render запущен без `--proxy-headers --forwarded-allow-ips`. За внутренним reverse-proxy Render `request.client.host` одинаков (или из узкого пула) для всех внешних клиентов — де-факто все лимиты (120/мин на жесты, 10/мин на транскрипцию, 20/мин на посты) считают общий счётчик на всех пользователей сразу, а не per-client.

**Severity:** high. **Фикс:** запускать uvicorn с `--proxy-headers --forwarded-allow-ips='*'`, либо задать `key_func`, читающий `X-Forwarded-For`.

### 1.2. Rate-limit покрытие непоследовательно по роутам
**Локация:** `backend/app/routes/alerts.py`, `subtitles.py`, `users.py`, `community.py` (upload/like/comment/delete), `gestures.py` (`progress`)

Явный `@limiter.limit` есть только на `gestures.recognize`, `transcribe.*`, `community.create_post`. Остальные write-эндпоинты (включая `community.upload_image` — до 5MB в Supabase Storage) без лимита вообще. В связке с §1.1 это дополнительный вектор абьюза storage/БД.

**Severity:** medium. **Фикс:** покрыть write-эндпоинты лимитами после исправления §1.1.

### 1.3. Отсутствие ограничения размера запроса
**Локация:** `backend/app/models.py` (`GestureRecognizeRequest.image`, `SubtitleRequest.text`, `PostCreate.text` и др.)

Ни одно Pydantic-поле не имеет `max_length`, глобального body-size-limit middleware нет. Большой base64/JSON payload полностью буферизуется в памяти до валидации — потенциальный memory-DoS.

**Severity:** medium. **Фикс:** добавить `max_length` в Pydantic-модели и/или middleware, ограничивающий `Content-Length`.

### 1.4. WebSocket `/ws/transcribe` без проверки `Origin` (CSWSH) и без лимита соединений
**Локация:** `backend/app/main.py:53-55`

`websocket.accept()` вызывается без проверки заголовка `Origin`. `CORSMiddleware` на WS-хендшейк не распространяется (Starlette так не работает). Аутентификация идёт через query-параметр `token`, а не cookie, что снижает риск кражи сессии, но не риск CPU-DoS: сторонняя страница может инициировать неавторизованные (гостевые) WS-сессии от лица браузера жертвы, гоняя тяжёлую диаризацию/ASR. Лимита на число одновременных соединений также нет.

**Severity:** medium. **Фикс:** проверять `Origin` по белому списку при handshake; ограничить число одновременных соединений на IP/пользователя.

### 1.5. `recognize_gesture` навсегда откатывается в случайную эмуляцию при одном сбое
**Локация:** `backend/app/signflow_model.py:24-53, 194-324`

Сейчас используется реальный MediaPipe `HandLandmarker` + rule-based классификация по landmark-координатам — это не подмена входа, как раньше. Но: при сбое инициализации (например, обрыв сети при скачивании модели с `storage.googleapis.com` на холодном старте) `_hand_landmarker = False` кешируется **навсегда** для жизни процесса. С этого момента все вызовы `/gestures/recognize` тихо переключаются на `recognize_emulate()` (`random.uniform`), и ответ **внешне неотличим** от настоящего результата — нет флага `"emulated": true`. Один сетевой сбой на Render превращает обучение жестам в рандом до следующего рестарта.

**Severity:** high. **Фикс:** не кешировать `False` навечно — retry/lazy-reinit раз в N минут; помечать ответ полем `"emulated": true`, чтобы клиент мог отличить.

### 1.6. Неполный список переменных окружения в `render.yaml`
**Локация:** `render.yaml:10-18`

`DATABASE_URL` (нужен для автомиграций, `backend/app/migrate.py:309-312`), `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_BASIC_PRODUCT_ID`/`POLAR_PRO_PRODUCT_ID`, `REPLICATE_API_TOKEN` — реально используются в коде, но не объявлены в blueprint. При пересборке сервиса из `render.yaml` (например, на новом окружении) платежи молча перестанут работать (`checkout` → 503, webhook → 403 из-за пустого секрета), а `run_migrations()` тихо no-op'нется без `DATABASE_URL` — схема БД может разойтись с кодом незамеченно.

**Severity:** medium. **Фикс:** добавить все переменные (с `sync: false`) в `render.yaml`, чтобы IaC отражал реальную конфигурацию.

### 1.7. Прочее (низкий приоритет)
- **Community:** валидация длины текста поста/комментария есть только как `CHECK`-constraint в БД, а не на Pydantic-уровне — при превышении лимита клиент получает голый 500 вместо понятного 422 (`backend/app/routes/community.py:123-136, 257-268`).
- **Backend всегда использует service-role ключ** (`backend/app/config.py:7`) — RLS-политики защищают только точечные PostgREST-запросы с user JWT; большинство запросов через `db.table(...)` полностью обходят RLS. Активной уязвимости не найдено (ручные проверки владения ресурсом на месте везде), но архитектурно одна забытая проверка в новом эндпоинте = полная утечка данных без подстраховки RLS.
- Module-level кеши моделей (`whisper_service.py`, `signflow_model.py`) без `Lock` — гонка при параллельных первых запросах на холодном старте (лишняя, не критичная нагрузка).
- `is_authenticated` в `main.py:57,65` — вычисляется, но не используется; соседний комментарий не соответствует реальному поведению (мёртвый код).

---

## 2. Landing (Next.js)

### 2.1. Нет security-заголовков (CSP, X-Frame-Options)
**Локация:** `landing/next.config.js` (весь файл), `landing/app/layout.tsx`

Страницы `/login`, `/register`, `/api/checkout` можно встроить в `<iframe>` на стороннем сайте (clickjacking).

**Severity:** medium. **Фикс:** добавить `headers()` в `next.config.js` с `X-Frame-Options: SAMEORIGIN` / `frame-ancestors 'self'` и базовым CSP.

### 2.2. `/api/contact` без валидации и rate-limit
**Локация:** `landing/app/api/contact/route.ts:5-13`

Проверка только на truthy-значения полей, нет проверки формата email, нет ограничения длины `message`, нет `checkRateLimit` (в отличие от `ai`/`transcribe`/`tts`). Возможен спам в таблицу `contact_messages`.

**Severity:** medium. **Фикс:** zod-схема + `checkRateLimit` по IP.

### 2.3. Rate-limit in-memory, не общий между serverless-инстансами
**Локация:** `landing/lib/apiAuth.ts:35-51`

На Vercel при нескольких «тёплых» инстансах реальный лимит на платные прокси (Replicate, Boson, FreedomSpeech) кратно выше заявленного — риск неожиданного счёта.

**Severity:** medium. **Фикс:** перенести лимитер на Vercel KV/Upstash Redis хотя бы для анонимных запросов.

### 2.4. CSRF на `/api/checkout` (GET)
**Локация:** `landing/app/api/checkout/route.ts:5-58`

Эндпоинт создаёт Polar checkout-сессию по GET без проверки `Origin`/CSRF-токена. `SameSite=Lax` не блокирует top-level GET-навигацию с чужого сайта — можно инициировать checkout от имени залогиненного пользователя без его намерения (прямого денежного урона нет — оплату жертва вводит сама на странице Polar, но это путаница/социальная инженерия).

**Severity:** low-medium. **Фикс:** сделать `/api/checkout` POST-эндпоинтом с проверкой `Origin`/CSRF-токена.

### 2.5. Дублирование Supabase server-client + cookie-adapter в 6 файлах
**Локация:** `landing/middleware.ts:19-30`, `lib/apiAuth.ts:14-23`, `app/auth/callback/route.ts:19-32`, `app/api/auth/route.ts:26-41`, `app/api/checkout/route.ts:22-32`, `app/api/contact/route.ts:15-24`

Идентичный copy-paste блок повторён 6 раз. Комментарии в `lib/supabase.ts:12-32` и `dashboard/layout.tsx:52-66` прямо упоминают уже случавшиеся race-баги с auth-refresh — размноженная логика повышает риск повторения.

**Severity:** medium. **Фикс:** вынести в `lib/supabase-server.ts` единую фабрику `createServerSupabase(req)`.

### 2.6. Публичные «демо»-страницы без реальной функциональности
**Локация:** `landing/app/ai-tutor/page.tsx:12-16`, `landing/app/camera-to-text/page.tsx:6-13`, `landing/app/text-to-sign/page.tsx`

Захардкоженные ответы/данные без реального fetch — выглядит как рабочий продукт, но не является им.

**Severity:** low (репутационный/UX риск). **Фикс:** подключить реальный backend либо явно маркировать как «демо».

### 2.7. Прочее (низкий приоритет)
- `subtitles/page.tsx` — монолит на ~2000 строк в одном клиентском компоненте; учитывая серию коммитов именно про лаг этой страницы, стоит разбить на memo-компоненты (AI-панель, PiP, рендер субтитров).
- `images: { unoptimized: true }` + 0 использований `next/image` во всём `app/` — нет lazy-loading/защиты от layout shift.
- `viewport.maximumScale = 1` (`app/layout.tsx:12-16`) отключает pinch-to-zoom — доступностная регрессия для проекта, ориентированного на людей с ограничениями.

---

## 3. Mobile (Expo RN) + Shared

### 3.1. Обрыв звука на каждом цикле стриминговой записи — усугубилось
**Локация:** `mobile/src/hooks/useStreamingRecording.ts:129-170, 250-254`

Каждые **1.5 секунды** (было 3с) код полностью останавливает (`stopAndUnloadAsync`) текущую запись и создаёт новую для отправки чанка. Микрофон физически не пишет звук 100–350мс на каждом переключении — теряются слоги речи, особенно в начале предложений после пауз.

**Severity:** high. **Фикс:** потоковый захват PCM-буфера без пересоздания объекта записи (native audio-stream модуль или аналог).

### 3.2. Избыточный файловый фото-захват для распознавания жестов — усугубилось, теперь на двух экранах
**Локация:** `mobile/src/screens/GesturePracticeScreen.tsx:89-125` (интервал 150мс, было 300мс), `mobile/src/components/signLanguageReader/useHandTracker.ts:7-51` (интервал 175мс, новый экран)

`takePictureAsync({base64:true})` — полный файловый снимок + base64 + запись/удаление на диске 6-7 раз в секунду на двух экранах. Расход батареи, нагрев, дисковый I/O, трафик.

**Severity:** high. **Фикс:** `react-native-vision-camera` Frame Processor (кадры из памяти без файла на диске), либо снизить частоту и разрешение.

### 3.3. Клиентский темп опроса жестов превышает серверный rate-limit — ошибки маскируются
**Локация:** `GesturePracticeScreen.tsx:99, 122`, `useHandTracker.ts:36, 45-46`; backend: `backend/app/routes/gestures.py:31-32` (`120/minute` = 2/сек)

Клиент шлёт 5.7–6.7 запросов/сек, backend лимитирует 2/сек — большинство запросов получают 429, но оба клиента проглатывают любую ошибку (`catch {}` / общий `error: "processing_error"`) без различения «рука не распознана» / «429» / «сеть недоступна». Пользователь считает фичу неработающей, хотя причина — throttling.

**Severity:** high. **Фикс:** снизить частоту опроса клиента до ≤2 req/s или синхронизировать с реальным лимитом backend; различать 429 в UI.

### 3.4. Токены сессии Supabase в незашифрованном AsyncStorage
**Локация:** `mobile/src/services/supabase.ts:11-17`

`storage: AsyncStorage` при `persistSession: true`. `expo-secure-store` не установлен и не используется в проекте. При физическом доступе к устройству (jailbreak/root, незашифрованный бэкап, ADB на debug-сборке) можно извлечь `refresh_token` и захватить аккаунт.

**Severity:** high. **Фикс:** использовать `expo-secure-store` как storage-adapter для Supabase-сессии.

### 3.5. Нулевое автоматизированное тестовое покрытие для mobile/shared
**Локация:** `mobile/package.json` (нет jest), `.github/workflows/ci.yml` (только `tsc --noEmit`), `shared/**/*.verify.ts`

`.verify.ts`-файлы — ручные verification-скрипты с самодельным `assertEqual`, не `jest`/`vitest`. Не подключены ни к CI, ни к npm-скриптам — никто не гарантирует, что они выполняются перед мержем. Фактическое автотестовое покрытие бизнес-логики в `shared/` (жесты, композиция текста) — ноль.

**Severity:** high. **Фикс:** подключить `vitest`/`jest` в `shared/`, конвертировать `.verify.ts` в `*.test.ts` (assert-функции уже написаны), добавить шаг в CI.

### 3.6. Дублирование логики классификации жестов в трёх местах
**Локация:** `shared/signLanguageReader/classifyGesture.ts` (используется только web/landing), `shared/signLanguageReader/GestureRecognizer.ts` (mobile+landing), `backend/app/signflow_model.py` (`_classify_ru`/`_classify_kz`, используется mobile через backend)

Web делает on-device MediaPipe-инференс и классификацию в TS; mobile шлёт фото на backend, где та же классификация повторно реализована на Python. Комментарий в коде прямо просит "Keep both in sync" — нет единого источника правды, риск рассинхронизации словарей жестов между платформами при следующем изменении (на момент проверки словари совпадают).

**Severity:** medium. **Фикс:** долгосрочно — вынести правила классификации в общий конфиг/данные, читаемые обеими реализациями, либо перенести mobile на on-device инференс аналогично web.

### 3.7. Прочее (низкий приоритет)
- `useNetworkStatus.ts:4` — `HEALTH_URL` захардкожен на прод-домен, не привязан к `EXPO_PUBLIC_API_URL`; при переключении backend health-check покажет неверный статус.
- Нет таймаутов на `axios.post` к `/gestures/recognize` — при подвисшем соединении практика жеста замирает без объяснения (нет `timeout`, как в `subscription.ts:27`).
- Отказ в доступе к микрофону (`useStreamingRecording.ts:204-208`) не предлагает кнопку повторного запроса/перехода в настройки, в отличие от обработки доступа к камере.
- `OfflineBanner` опрашивает `/health` раз в 15 сек — до 15 сек «слепой зоны» при внезапном обрыве backend.
- Управление гонками (stop/restart записи vs WS lifecycle) в `useStreamingRecording.ts` реализовано аккуратно (`isActiveRef`, `closeTimeoutRef`) — устраняет race conditions, но не корневую причину обрыва звука (§3.1).

---

## Итоговая сводка по приоритету

**High:** §1.1 (rate-limit сломан за прокси), §1.5 (тихий откат в рандом-эмуляцию жестов), §3.1 (обрыв звука на стриминге), §3.2 (избыточный фото-захват), §3.3 (throttling маскируется как «жест не распознан»), §3.4 (токены в незащищённом хранилище), §3.5 (нулевое тестовое покрытие mobile/shared).

**Medium:** §1.2, §1.3, §1.4, §1.6, §2.1, §2.2, §2.3, §2.4, §2.5, §3.6.

**Low:** §1.7, §2.6, §2.7, §3.7.

Critical (утечка секретов, форджед-платежи, RCE) — не обнаружено: обе критичные находки предыдущей версии отчёта (Gemini-ключ в бандле, service-role key) на текущий момент устранены или не воспроизводятся.
