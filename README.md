# Вместе

«Вместе» — мобильное приложение для поиска и создания локальных активностей. Оно помогает быстро
найти компанию для спорта, прогулки, настольных игр, встречи или другого занятия в выбранном городе.

Проект ориентирован на iOS и Android и строится на React Native с Expo и Node.js backend.

## Текущий статус

Архитектура первого рабочего каркаса зафиксирована, создан `pnpm workspace`, реализованы первый
сквозной сценарий из [Issue #2](https://github.com/Gigaw/JoinUp/issues/2) и авторизация с онбордингом
из [Issue #14](https://github.com/Gigaw/JoinUp/issues/14): регистрация, вход, заполнение профиля,
список событий, карточка события и присоединение. Backend работает на NestJS/Fastify и PostgreSQL,
mobile клиент — на Expo Router, а его типы генерируются из OpenAPI.

Остальные возможности полного первого каркаса из следующего раздела ещё реализуются по отдельным
задачам. Текущий vertical slice запускается локально и покрыт unit-, e2e- и concurrency-тестами.

## Первый рабочий каркас

В текущий scope входят:

- регистрация и вход по email и паролю;
- приватная дата рождения и server-side проверка 18+;
- необязательный публичный рассчитанный возраст, скрытый по умолчанию;
- выбор города из поддерживаемого списка;
- отдельное текстовое описание места встречи;
- создание, список, детали, редактирование и отмена событий;
- автоматическое присоединение и участие по заявке;
- подтверждение, отклонение и отзыв заявки;
- отказ подтверждённого участника от участия;
- раздел «Мои активности» для участия, заявок и созданных событий;
- общий чат активности для организатора и подтверждённых участников;
- одно изображение профиля или события с базовым хранением на сервере.

Основная нижняя навигация mobile состоит из вкладок «Главная», «Мои», «Чаты» и «Профиль».
Создание активности открывается действием внутри раздела «Мои», а не отдельной вкладкой.

Основные инварианты участия проверяются backend и PostgreSQL: организатор всегда считается
участником, pending-заявки не занимают место, повторные запросы не создают дубликаты, а последнее
место нельзя занять одновременно двум пользователям.

## Что отложено

В первый каркас не входят:

- подтверждение email и восстановление пароля;
- push- и email-уведомления;
- карты, координаты и точная геолокация;
- жалобы, блокировки и административные инструменты;
- личные сообщения, друзья, подписки и социальная лента;
- рейтинги, отзывы, рекомендации и платежи;
- пользовательская web-версия.

Жалобы, блокировки и минимальная административная панель должны появиться до публичного пилота.
Переход с локального media storage на Amazon S3 вынесен в отдельную задачу
[#13](https://github.com/Gigaw/JoinUp/issues/13).

## Архитектура

Принята следующая техническая основа:

- `pnpm workspaces` без дополнительного monorepo orchestrator на старте;
- React Native, Expo и Expo Router;
- TanStack Query для server state;
- React Hook Form и Zod для mobile-форм;
- NestJS с Fastify adapter;
- PostgreSQL и Prisma;
- JSON REST API `/v1`, OpenAPI и сгенерированный TypeScript-клиент;
- opaque server sessions, token в Expo SecureStore;
- локальный `MEDIA_ROOT` на persistent volume для первого media storage.

Backend проектируется как модульный монолит. Бизнес-логика отделена от transport и persistence, а
конкурентные изменения участия выполняются в PostgreSQL-транзакции с блокировкой события.

## Документация

| Документ                                                          | Назначение                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| [PRD](docs/product/prd.md)                                        | Цели продукта, scope, пользовательские сценарии и бизнес-правила |
| [Открытые вопросы](docs/product/open-questions.md)                | Решения, которые можно принять позднее                           |
| [Системная архитектура](docs/architecture/system-design.md)       | Компоненты, границы доверия, надёжность и точки расширения       |
| [Модель данных](docs/architecture/data-model.md)                  | Таблицы, связи, constraints, privacy и concurrency               |
| [API-контракты](docs/architecture/api-contracts.md)               | Endpoints, DTO, errors, authorization и идемпотентность          |
| [Mobile architecture](docs/architecture/mobile-architecture.md)   | Навигация, state, forms, API и mobile testing                    |
| [Backend architecture](docs/architecture/backend-architecture.md) | NestJS-модули, слои, transactions и backend testing              |
| [ADR](docs/adr/README.md)                                         | Принятые архитектурные решения и их последствия                  |

Главная точка навигации по документации — [`docs/README.md`](docs/README.md).

## Структура репозитория

Исполняемый код и документация находятся в одном workspace:

```text
apps/
  api/          # NestJS backend
  mobile/       # Expo application
packages/
  api-client/   # Generated OpenAPI client
  config/       # Shared tool configuration
docs/
  product/
  architecture/
  adr/
```

Точная структура и допустимые зависимости описаны в
[ADR 0002](docs/adr/0002-monorepo-structure.md).

## Локальный запуск

Нужны Node.js 22+, pnpm 10+ и запущенный Docker Desktop.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
docker compose -p vmeste up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm db:seed
```

API и Swagger UI запускаются командами:

```bash
pnpm dev:api
# API: http://localhost:3000/v1
# Swagger UI: http://localhost:3000/openapi
```

Для первого локального запуска соберите и установите development build в выбранный
Simulator/Emulator. `expo run:*` автоматически выполнит prebuild, если native-каталог отсутствует:

```bash
pnpm mobile:ios
pnpm mobile:android
```

Для iOS нужен Xcode 26.4 или новее и рабочий CocoaPods. Это минимальное требование текущей связки
Expo SDK 57 и React Native 0.86.

Для Android Emulator можно указать в `apps/mobile/.env`
`EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` либо выполнить `adb reverse tcp:3000 tcp:3000` и оставить
`http://localhost:3000`. Seed создаёт поддерживаемые города Владикавказ, Беслан, Моздок, Алагир,
Ардон и Казань. Будущие демо-активности создаются в Казани; после регистрации и заполнения
обязательных полей профиля они появляются в списке и доступны для присоединения.

После первой native-сборки изменения TypeScript/React-кода не требуют повторного build. Запустите
Metro для development client:

```bash
pnpm dev:mobile
```

Явный `pnpm mobile:prebuild` нужен только для проверки или регенерации native-проектов. Каталоги
`apps/mobile/ios` и `apps/mobile/android` являются локальным output Expo Prebuild и не коммитятся.

### Проверка mobile через Maestro

Для локальных UI smoke-тестов нужен Maestro CLI и установленный development build
`app.vmeste.mobile` в iOS Simulator или Android Emulator. На macOS CLI устанавливается командой:

```bash
brew install mobile-dev-inc/tap/maestro
```

После запуска PostgreSQL, seed, API и Metro выполните команду для выбранной платформы:

```bash
pnpm test:e2e:mobile:ios
pnpm test:e2e:mobile:android
```

Android-команда сама выполняет `adb reverse tcp:3000 tcp:3000`, поэтому для неё можно оставить
`EXPO_PUBLIC_API_URL=http://localhost:3000`. Перед iOS-проверкой также используйте
`http://localhost:3000`. Flow запускает development build напрямую, очищает только его локальное
состояние, выбирает запущенный Metro на порту `8081`, создаёт тестовые аккаунты и проверяет
регистрацию, онбординг, вход, восстановление сессии и открытие seed-события.

Основные проверки:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:e2e:mobile:ios # требует запущенные API, Expo и iOS Simulator
pnpm build
```

`test:e2e` требует запущенный PostgreSQL, применённую миграцию и seed. CI выполняет эту же
последовательность на чистой базе и дополнительно проверяет, что OpenAPI-клиент сгенерирован без
незакоммиченного diff.

## Поддержка платформ

| Платформа | Статус                                                            |
| --------- | ----------------------------------------------------------------- |
| iOS       | Настроена через Expo SDK 57; локальная сборка требует Xcode 26.4+ |
| Android   | Development build проверен в Android Emulator API 34              |
| Web       | Не входит в пользовательский MVP                                  |

Точные минимальные версии iOS и Android будут зафиксированы после первой device-сборки.

## Работа с задачами

- [#1 — архитектурная основа MVP](https://github.com/Gigaw/JoinUp/issues/1)
- [#8 — корневой README](https://github.com/Gigaw/JoinUp/issues/8)
- [#9 — system design, data model и API](https://github.com/Gigaw/JoinUp/issues/9)
- [#10 — mobile и backend architecture](https://github.com/Gigaw/JoinUp/issues/10)
- [#11 — ADR и первые решения](https://github.com/Gigaw/JoinUp/issues/11)
- [#2 — каркас MVP и первый сквозной сценарий](https://github.com/Gigaw/JoinUp/issues/2)
- [#14 — вход и онбординг профиля](https://github.com/Gigaw/JoinUp/issues/14)

GitHub Issues определяют delivery scope и критерии готовности. Если Issue, PRD и архитектурный
документ расходятся, конфликт нужно разрешить в источниках истины до реализации.

## Безопасность и данные

- Backend проверяет authentication, ownership, возраст, event status и capacity.
- Дата рождения не возвращается в public profile или participant API.
- Рассчитанный возраст виден только по явному выбору пользователя.
- Пароли, tokens, production credentials и реальные пользовательские данные нельзя коммитить.
- Новые персональные данные и visibility rules сначала документируются в PRD и data model.
