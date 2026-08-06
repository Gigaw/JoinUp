# Архитектура Expo mobile application

- **Статус:** Draft
- **Дата:** 2026-08-04
- **Связанная задача:** [#10](https://github.com/Gigaw/JoinUp/issues/10)

## 1. Назначение

Документ определяет навигацию, feature boundaries, разделение UI/client state/server state, работу с
сессией и API, формы, обработку нестабильной сети и стратегию тестирования iOS/Android клиента.

Mobile реализуется на React Native с Expo и Expo Router. Он не содержит доверенной business logic:
backend остаётся источником истины для возраста, authorization, ownership, capacity и participation
transitions.

## 2. Принципы

- Route files объявляют navigation и передают параметры, но не содержат data fetching и business UI.
- Код группируется по пользовательским возможностям, а не по типам React-файлов всего приложения.
- TanStack Query владеет server state; его данные не копируются в Context или локальный store.
- Session token хранится только в SecureStore; профиль пользователя загружается через `/me`.
- Client validation улучшает UX, но server error всегда является окончательным результатом.
- Mutation не считается успешной до server response и согласования связанных queries.
- UI явно моделирует loading, empty, error, offline, refreshing, full и cancelled states.
- Нативные permissions запрашиваются только в момент действия и с понятным объяснением.
- Styling начинается с React Native `StyleSheet`, theme tokens и собственных primitives без
  дополнительного UI framework.

## 3. Целевая структура

Expo Router использует `src/app` как route tree. Route components остаются тонкими и делегируют
feature screens.

```text
apps/mobile/
  src/
    app/
      _layout.tsx
      (auth)/
      (onboarding)/
      (tabs)/
      events/
      manage/
    features/
      auth/
      onboarding/
      discovery/
      events/
      participation/
      activities/
      profile/
      media/
    shared/
      api/
      components/
      forms/
      navigation/
      session/
      storage/
      theme/
      utils/
    testing/
```

Внутри feature используются только необходимые каталоги:

```text
features/events/
  api/
    event.queries.ts
    event.mutations.ts
    event.query-keys.ts
  model/
    event-form.schema.ts
    event-form.mapper.ts
  screens/
    event-details.screen.tsx
    create-event.screen.tsx
  ui/
    event-card.tsx
    event-form.tsx
```

Feature может импортировать `shared` и публичные exports более низкоуровневого feature. Deep imports
во внутренние файлы другого feature запрещаются package/lint boundaries. Общий компонент переносится
в `shared/components` только после появления повторного независимого использования.

## 4. Навигация

Для первого каркаса выбирается разрешённый PRD упрощённый вариант с тремя tabs: поиск и filters
находятся на главном экране. Создание активности открывается по кнопке в заголовке раздела «Мои
активности», а не занимает отдельный tab.

```text
src/app/
  _layout.tsx
  (auth)/
    sign-in.tsx
    register.tsx
  (onboarding)/
    profile.tsx
    interests.tsx
    (tabs)/
    _layout.tsx
    index.tsx          # Главная + поиск + фильтры
    activities.tsx
    profile.tsx
  events/
    [eventId].tsx
  manage/events/
    [eventId].tsx
    [eventId]/applications.tsx
  users/
    [userId].tsx
```

`_layout.tsx` подключает providers и принимает решение по четырём session состояниям:

- `restoring` — token читается из SecureStore, показывается controlled splash;
- `anonymous` — доступны auth routes;
- `onboarding` — сессия действительна, но профиль не завершён;
- `authenticated` — доступны tabs и detail/manage routes.

Redirect выполняется после восстановления сессии, чтобы защищённый экран не мелькал до проверки.
При открытии deep link на event анонимный пользователь проходит sign-in, после чего приложение
восстанавливает исходный безопасный route target.

Route parameters валидируются до query. Некорректный UUID показывает controlled not-found state и
не вызывает API.

## 5. Providers и application bootstrap

Root layout подключает providers в явном порядке:

```text
ErrorBoundary
  → ThemeProvider
  → SessionProvider
  → QueryClientProvider
  → OnlineAndFocusBridge
  → Router Slot
```

`SessionProvider` хранит только session lifecycle и token reference. `Me` находится в TanStack
Query. Theme содержит visual tokens, но не server data. Provider не добавляется, если state может
оставаться локальным в одном screen/feature.

## 6. Сессия

`shared/session` содержит:

- `SessionProvider` и `useSession`;
- `SessionStoragePort`;
- SecureStore adapter;
- login/register/logout orchestration;
- обработку глобального `401`.

SecureStore сохраняет только небольшой opaque token и его expiry metadata. Password, profile,
birth date, forms и API cache туда не записываются. Ошибка чтения SecureStore приводит к безопасному
anonymous state и диагностическому событию без token contents.

Успешный login/register выполняет:

1. получить token;
2. записать token в SecureStore;
3. переключить session state;
4. установить/запросить `Me`;
5. перейти в onboarding или основное приложение.

Logout удаляет token даже при сетевой ошибке отзыва, очищает приватный Query cache и возвращает на
auth routes. Глобальный `401` выполняет то же один раз, исключая бесконечные redirect/retry loops.

## 7. API client

`packages/api-client` содержит generated OpenAPI types и `openapi-fetch`. `shared/api` добавляет
mobile-specific runtime:

- base URL из validated public configuration;
- bearer header из session provider;
- `X-Request-Id` и `Idempotency-Key`;
- JSON/multipart request helpers;
- преобразование API error в typed `AppError`;
- cancellation через `AbortSignal`;
- безопасное logging metadata без request body и token.

Feature не вызывает `fetch` напрямую. Он использует generated operation types через shared client.
API response не приводится `as` к желаемому типу; narrowing выполняется по status/code.

## 8. Server state с TanStack Query

Query keys централизованы по feature и состоят только из serializable normalized values:

```text
['me']
['events', 'list', normalizedFilters]
['events', 'detail', eventId]
['events', 'applications', eventId, normalizedFilters]
['activities', tab, cursorFilters]
['users', 'public', userId]
```

Правила:

- list использует infinite query и opaque cursor;
- detail и lists не разделяют mutable object references;
- `staleTime` выбирается по типу данных, а не один глобальный для всего приложения;
- app foreground подключается к `focusManager` через React Native `AppState`;
- network status подключается к `onlineManager` через NetInfo adapter;
- reconnect и screen focus обновляют только stale active queries;
- полноценное persistent/offline query cache в первый каркас не входит.

Default query retry ограничен network/`5xx` ошибками. `4xx` и domain conflicts не повторяются.
Backoff имеет верхнюю границу, а UI всегда даёт явное действие «Повторить».

### 8.1. Invalidation matrix

| Mutation | Обновить/инвалидировать |
| --- | --- |
| Profile update | `me`, собственная public user projection |
| Create event | created activities, relevant event lists, new event detail |
| Edit/cancel event | event detail, lists, created/participant activities |
| Join/apply | event detail, event list capacity, upcoming/applications |
| Withdraw/leave | event detail, lists, corresponding activities |
| Approve/reject | event detail, applications, created activities, applicant activities |
| Avatar/event image | affected profile/event detail and visible cards |

Mutation response сначала записывается в точный detail/query cache, затем связанные aggregates
инвалидируются. Capacity и approval не обновляются optimistic, потому что конкурентный server result
может отличаться. Pending UI отображается локальным mutation state.

## 9. Client state

Client state ограничен:

- текущими filters и sort главного экрана;
- незавершёнными form values;
- выбранной вкладкой «Моих активностей»;
- transient UI state: modal, picker, accordion.

Filters живут в route search params или feature context и сохраняются только в пределах текущей
application session согласно PRD. Zustand не добавляется на старте. Если появляется state, которым
управляют три и более несвязанных feature, решение пересматривается на измеримом примере.

Не-секретный `PendingMutationStore` сохраняет idempotency key, operation, request hash и минимальный
normalized retry payload для create/edit/media mutation до окончательного ответа. Password,
birth date, bearer token и raw image bytes туда не записываются. Media retry может хранить только
временный file URI с коротким сроком жизни. Реализация использует небольшой persistent key-value
adapter; token по-прежнему хранится только в SecureStore.

## 10. Mutations, retry и идемпотентность

Для create/edit/cancel event и media upload mobile:

1. генерирует UUID idempotency key при первом submit;
2. связывает его с normalized request hash;
3. сохраняет metadata до завершения операции;
4. при timeout/reconnect повторяет те же body и key;
5. удаляет pending metadata после server success или окончательной domain error;
6. для нового намеренного действия генерирует новый key.

Mutation с обязательным idempotency key можно повторять автоматически только с тем же body. Login и
registration автоматически не повторяются после неопределённого результата; UI предлагает
проверить состояние или выполнить login.

Participation `PUT`/`DELETE` state-idempotent, но mobile всё равно выполняет refetch detail и
activities после ответа. Terminal statuses не реактивируются.

## 11. Формы и validation

React Hook Form управляет полями и submit lifecycle. Zod schema выполняет client validation и
подготавливает нормализованный request. Generated OpenAPI request type проверяет mapper на этапе
TypeScript compilation.

Форма не очищается при network/`5xx` ошибке. Field errors показываются рядом с полем, form-level
domain conflict — над основным действием. Server error code имеет приоритет над client assumption.

Основные формы:

- registration: email, password, birth date;
- onboarding/profile: display name, city, interests, show age, bio/avatar;
- event: title, category, description, city, meeting place, start/end, capacity, participation mode,
  optional image.

Date/time picker показывает local city/user representation, а mapper отправляет unambiguous UTC
timestamp. При редактировании event форма передаёт `expectedVersion` из загруженного detail.

## 12. Изображения

- `expo-image-picker` используется только после явного действия пользователя;
- `expo-image-manipulator` уменьшает dimensions и размер перед multipart upload;
- `expo-image` отображает и кеширует server images;
- client ограничивает выбор до image, но backend повторно проверяет MIME/magic bytes;
- Android pending picker result восстанавливается после уничтожения activity;
- upload использует один idempotency key до окончательного результата;
- до upload показывается preview и возможность отменить выбор;
- отсутствие изображения отображается категорийной заглушкой.

Camera/media permissions не запрашиваются при старте. Permission denial имеет объяснение и путь
продолжить без optional изображения.

## 13. Обработка ошибок и состояний

`AppError` различает:

- `network` — соединение отсутствует или timeout;
- `unauthorized` — сессия недействительна;
- `forbidden`;
- `validation` с field details;
- `conflict` со стабильным domain code;
- `server`;
- `unknown`.

Каждый screen определяет skeleton/loading, empty, error, offline-with-cache и refreshing состояния.
Cached data может оставаться видимой с non-blocking warning. Destructive/important mutation не
показывается успешной только на основании optimistic update.

Коды `EVENT_FULL`, `EVENT_STARTED`, `EVENT_CANCELLED`, `EVENT_VERSION_CONFLICT` и terminal
participation имеют отдельные понятные сценарии UI. Raw server stack/message не показывается.

## 14. UI, доступность и производительность

`shared/theme` определяет spacing, typography, color, radius и semantic state tokens. Базовые
primitives (`Screen`, `Text`, `Button`, `TextField`, `Card`, `AsyncState`) инкапсулируют доступность,
но не знают product feature.

- touch targets имеют достаточный размер;
- controls имеют accessibility label/role/state;
- Dynamic Type не блокируется фиксированной высотой текста;
- цвет не является единственным индикатором статуса;
- списки используют virtualized rendering и cursor pagination;
- изображения запрашиваются в подходящем размере и кешируются;
- route-level code не запускает повторные параллельные queries вручную.

Численные performance budgets фиксируются после измеряемого prototype, как требует PRD.

## 15. Analytics и privacy

Analytics вызывается через typed `AnalyticsPort`; конкретный provider не выбирается в этой задаче.
Event payload заранее перечисляет разрешённые поля. Запрещено отправлять email, birth date, bearer
token, meeting place, free-text description и form contents.

До выбора provider adapter может быть no-op или development logger с тем же allowlist contract.
Добавление внешнего сервиса требует ADR.

## 16. Стратегия тестирования

### 16.1. Unit tests

- Zod schemas и form-to-request mappers;
- query key factories и filter normalization;
- API error mapping;
- session reducer;
- idempotency/pending mutation metadata;
- date/time conversion и age visibility rendering.

### 16.2. Component tests

React Native Testing Library проверяет поведение, доступное пользователю:

- loading/empty/error/offline states;
- validation и сохранение формы после ошибки;
- кнопки по `availableActions`;
- full/cancelled/pending/rejected states;
- отсутствие age, когда field не пришёл;
- accessibility labels и actions.

Тесты ищут элементы по role/label/text, а не по implementation test id без необходимости.

### 16.3. Navigation integration tests

С mock API и in-memory storage проверяются:

- restore session без flash auth screen;
- anonymous → register/login → onboarding → tabs;
- `401` → очистка приватного cache → sign-in;
- deep link event после authentication;
- create/join/apply/withdraw/approve flows и query invalidation.

### 16.4. Contract и device verification

Mobile type-check компилируется только с generated `packages/api-client`. Mock responses строятся по
публичным DTO и не содержат backend domain/Prisma models.

Перед закрытым пилотом основные сценарии выполняются на физических iOS и Android устройствах,
включая slow/offline network, background/foreground, app restart, image picker interruption и
системное масштабирование текста.

Для повторяемых UI smoke-тестов выбран Maestro согласно
[ADR 0008](../adr/0008-maestro-mobile-e2e.md). Flow находятся в корневом `.maestro/` и управляют
приложением только через видимый текст, accessibility tree и стабильные `testID`. Они не обращаются
к Prisma и внутренним backend-модулям, создают только синтетические тестовые данные и запускаются
после подготовки PostgreSQL, seed, API и Expo.

Локальный контур использует development build с `expo-dev-client` и единым bundle/package id
`app.vmeste.mobile`. Maestro запускает его напрямую, очищает только данные тестируемого приложения
и выбирает запущенный Metro development server на порту `8081`, не затрагивая Expo Go.
`expo run:ios` и `expo run:android` выполняют локальный prebuild и native build;
после первой установки изменения TypeScript/React-кода загружаются через Metro без повторной native
сборки.

Android-команда перед flow создаёт `adb reverse tcp:3000 tcp:3000`, поэтому тот же
`EXPO_PUBLIC_API_URL=http://localhost:3000` работает в iOS Simulator и Android Emulator.

Native-каталоги `apps/mobile/ios` и `apps/mobile/android` генерируются Expo Prebuild локально и не
коммитятся. Источниками конфигурации остаются `app.json`, Expo config plugins и package
dependencies. Native-каталог можно регенерировать, поэтому ручные изменения generated native files
не считаются источником истины.

Maestro дополняет, но не заменяет component/integration tests и ручную проверку на физических
устройствах. В CI device-flow добавляется после настройки воспроизводимой EAS simulator/emulator
build в рамках [Issue #16](https://github.com/Gigaw/JoinUp/issues/16); до этого он остаётся явной
локальной проверкой и не включается в корневой `pnpm test`.

## 17. Запрещённые сокращения

- API calls непосредственно из route file или visual component;
- копирование query response в Context/Zustand;
- хранение bearer token в AsyncStorage, query cache или logs;
- повтор mutation с новым idempotency key после timeout того же действия;
- client-only authorization/capacity checks;
- общий giant `useAppStore`;
- использование backend/Prisma types вместо generated API client;
- запрос permissions при старте без действия пользователя;
- очистка формы при временной сетевой ошибке.

## 18. Связанные документы

- [Product Requirements Document](../product/prd.md)
- [Системная архитектура](system-design.md)
- [Backend architecture](backend-architecture.md)
- [API-контракты](api-contracts.md)
- [ADR 0001: технологический стек](../adr/0001-technology-stack.md)
- [ADR 0002: монорепозиторий](../adr/0002-monorepo-structure.md)
- [ADR 0004: серверные сессии](../adr/0004-authentication-sessions.md)
- [ADR 0006: REST и OpenAPI](../adr/0006-api-contracts.md)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo Router authentication](https://docs.expo.dev/router/advanced/authentication/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)
- [Expo Image](https://docs.expo.dev/versions/latest/sdk/image/)
- [Maestro для React Native](https://docs.maestro.dev/platform-support/react-native)
- [ADR 0008: Maestro для mobile E2E](../adr/0008-maestro-mobile-e2e.md)
- [TanStack Query: React Native example](https://tanstack.com/query/v5/docs/framework/react/examples/react-native)
