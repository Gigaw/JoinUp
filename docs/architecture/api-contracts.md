# API-контракты первого рабочего каркаса

- **Статус:** Draft
- **Дата:** 2026-08-03
- **Связанная задача:** [#9](https://github.com/Gigaw/JoinUp/issues/9)

## 1. Общие правила

- Base path: `/v1`.
- Формат request и response body: JSON UTF-8.
- Все timestamps передаются в ISO 8601 с UTC offset; календарная дата рождения — `YYYY-MM-DD`.
- Идентификаторы являются UUID strings и не несут бизнес-смысла.
- Необязательное отсутствующее поле и поле со значением `null` различаются в OpenAPI.
- Неизвестные request fields отклоняются validation layer.
- Event, profile и participation endpoints требуют bearer session, если ниже не указано обратное.
- Успешный `DELETE` или logout возвращает `204`, когда response representation не требуется.
- OpenAPI генерируется из NestJS DTO и является transport source of truth.

Backend не доверяет capability-флагам mobile и при каждом mutation повторно проверяет
authentication, ownership, время начала, статус события, режим участия и capacity.

## 2. Authentication и request context

Защищённый запрос передаёт:

```http
Authorization: Bearer <opaque-session-token>
X-Request-Id: <optional-client-correlation-id>
```

Backend принимает корректный `X-Request-Id` или создаёт новый и возвращает его в response header.
Bearer token не попадает в логи и OpenAPI examples.

Истёкший, отозванный или неизвестный token возвращает `401 SESSION_INVALID`. Недостаток прав при
валидной сессии возвращает `403`, а не маскируется client-side проверкой.

## 3. Формат ошибок

Все ожидаемые ошибки имеют один формат:

```json
{
  "code": "EVENT_FULL",
  "message": "В событии больше нет свободных мест.",
  "details": {
    "eventId": "5b61f5a6-bc32-4f7f-bb51-24cebd154a39"
  },
  "requestId": "req_01J..."
}
```

`message` безопасен для отображения, но mobile принимает решения по стабильному `code`. `details`
не содержит stack trace, SQL, дату рождения, email другого пользователя или внутренние имена
таблиц.

| HTTP | Базовый code | Назначение |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Некорректный формат, неизвестное поле или несогласованные даты |
| `401` | `SESSION_INVALID` | Нет действующей сессии |
| `403` | `FORBIDDEN` | Нет права выполнить действие |
| `404` | `RESOURCE_NOT_FOUND` | Ресурс отсутствует или недоступен пользователю |
| `409` | domain code | Конфликт текущего состояния или идемпотентности |
| `422` | `AGE_RESTRICTION` | Валидная дата рождения не проходит правило 18+ |
| `429` | `RATE_LIMITED` | Превышен безопасный лимит запросов |
| `500` | `INTERNAL_ERROR` | Неожиданная ошибка без внутренних подробностей |

## 4. Общие представления

### 4.1. `PublicUser`

```json
{
  "id": "4f564fb0-20c2-4fa7-b553-f1f3da3ee0ae",
  "displayName": "Мария",
  "avatarUrl": null,
  "bio": "Люблю настольные игры",
  "city": {
    "id": "c5e1b60d-1730-44dc-9171-38c8f445476d",
    "name": "Казань"
  },
  "interests": [],
  "age": 29
}
```

`age` полностью отсутствует, если пользователь не включил `showAge`. `birthDate`, `email` и
`showAge` никогда не входят в `PublicUser` или participant projection.

### 4.2. `Participant`

Participant содержит только `id`, `displayName`, nullable `avatarUrl` и optional `age`. Список
участников включает только `going`; pending applications выдаются отдельным organizer endpoint.

### 4.3. `EventSummary`

| Поле | Тип | Назначение |
| --- | --- | --- |
| `id` | UUID | Event id |
| `title` | string | Название |
| `category` | object | `id`, `slug`, `name` |
| `city` | object | `id`, `name`, `timeZone` |
| `meetingPlace` | string | Текстовое место |
| `startsAt` | timestamp | Начало |
| `endsAt` | timestamp nullable | Окончание |
| `imageUrl` | string nullable | API URL локального изображения или `null` |
| `participationMode` | enum | `automatic`, `approval_required` |
| `participantsCount` | integer | Все `going`, включая организатора |
| `capacity` | integer | Максимум участников |
| `isFull` | boolean | `participantsCount >= capacity` |
| `status` | enum | Текущий event status |
| `contentVersion` | integer | Версия значимых данных события |

### 4.4. `EventDetails`

Расширяет `EventSummary` полями `description`, `organizer`, `participants`, `version`, `createdAt`,
`updatedAt`, `myParticipation` и `availableActions`. `availableActions` может содержать `join`,
`apply`, `leave`, `withdraw`, `edit`, `cancel`, `reviewApplications`, но является только подсказкой
UI.

`myParticipation` равно `null` либо содержит `id`, `status`, `seenEventVersion` и
`hasEventUpdates`. Pending applications других пользователей в этот объект не попадают.

## 5. Authentication endpoints

### `POST /v1/auth/register`

Создаёт пользователя и текущую сессию в одной транзакции.

Request:

```json
{
  "email": "user@example.com",
  "password": "minimum-8-characters",
  "birthDate": "2000-05-17"
}
```

Validation:

- email нормализуется и проверяется до 254 символов;
- password содержит 8–128 символов;
- `birthDate` является существующей календарной датой и проходит backend 18+ policy;
- будущая дата и дата с невозможным значением отклоняются.

Response `201`:

```json
{
  "sessionToken": "returned-only-once",
  "expiresAt": "2026-09-02T10:00:00Z",
  "user": {
    "id": "4f564fb0-20c2-4fa7-b553-f1f3da3ee0ae",
    "email": "user@example.com",
    "birthDate": "2000-05-17",
    "showAge": false,
    "onboardingCompleted": false
  }
}
```

Ошибки: `409 EMAIL_ALREADY_EXISTS`, `422 AGE_RESTRICTION`, `429 RATE_LIMITED`.

Повтор запроса не создаёт второго пользователя благодаря unique normalized email, но может вернуть
`EMAIL_ALREADY_EXISTS`, если первый response был потерян. Mobile предлагает login; session token не
сохраняется в idempotency response storage в открытом виде.

### `POST /v1/auth/login`

Request содержит `email` и `password`. Response `200` имеет тот же session envelope, что
registration. Ошибки не различают неизвестный email и неверный пароль: `401 INVALID_CREDENTIALS`.

### `POST /v1/auth/logout`

Требует bearer token, отзывает текущую сессию и возвращает `204`. Повторный logout с уже отозванным
token также считается завершённым клиентским состоянием; mobile в любом случае удаляет token из
SecureStore.

## 6. Profile и справочники

### `GET /v1/me`

Возвращает собственную проекцию: `id`, `email`, `birthDate`, `displayName`, `showAge`, nullable
`avatarUrl`, nullable `bio`, nullable `city`, `interests`, `onboardingCompleted`, timestamps. Auth
hashes и session data отсутствуют.

### `PATCH /v1/me`

Принимает абсолютные optional поля:

```json
{
  "displayName": "Мария",
  "showAge": true,
  "bio": "Настольные игры и прогулки",
  "cityId": "c5e1b60d-1730-44dc-9171-38c8f445476d",
  "categoryIds": ["d3ad02c2-508d-4cee-ae45-ac640c589ad6"]
}
```

`categoryIds` заменяет полный набор интересов. После наличия display name, поддерживаемого города и
минимум одного active interest backend устанавливает `onboardingCompletedAt`. Дата рождения и email
не изменяются этим endpoint. Response `200` возвращает обновлённый `Me`.

Ошибки: `400 VALIDATION_ERROR`, `409 CITY_NOT_SUPPORTED`, `409 CATEGORY_NOT_ACTIVE`.

### `GET /v1/users/{userId}`

Возвращает `PublicUser` и ближайшие созданные published events. Требует authentication. Дата
рождения отсутствует независимо от age visibility.

### `GET /v1/cities`

Возвращает поддерживаемые города с `id`, `slug`, `name`, `timeZone`. Endpoint доступен без сессии.

### `GET /v1/categories`

Возвращает active categories с `id`, `slug`, `name`. Endpoint доступен без сессии.

### `PUT /v1/me/avatar`

Принимает `multipart/form-data` с одним изображением, заменяет собственный avatar и возвращает
обновлённый `Me`. Требует `Idempotency-Key`. Backend проверяет фактический тип, размер и dimensions,
а имя файла создаёт сам. Допустимы non-animated JPEG, PNG и WebP до 5 MiB и до 4096 × 4096 pixels.
Повтор с тем же ключом не создаёт второй файл.

### `DELETE /v1/me/avatar`

Удаляет database reference и возвращает `204`. Физическое удаление выполняется безопасно после
фиксации database mutation; повторное удаление также возвращает `204`.

## 7. Event endpoints

### `GET /v1/events`

Query parameters:

| Параметр | Тип | Правило |
| --- | --- | --- |
| `cityId` | UUID | Обязательный поддерживаемый город |
| `categoryIds` | CSV UUID | Optional список категорий; событие подходит при совпадении с любой выбранной категорией |
| `q` | string, максимум 100 символов | Optional Russian full-text поиск по title, description, meeting place и category; пробелы нормализуются |
| `cursor` | opaque string | Следующая страница для того же города, категорий, q и порядка сортировки |
| `limit` | integer | Default 20, maximum 50 |

Без `q` published будущие события сортируются по `startsAt`, затем `id`. При `q` используется
PostgreSQL Russian full-text search с GIN-индексами; результаты сортируются по `rank` по убыванию,
затем по `startsAt` и `id`. Cancelled, hidden и прошедшие события в общий список не входят.
`q` после `trim` и схлопывания повторных пробелов трактуется как отсутствие фильтра, если пуст.
Курсор непрозрачен для mobile и отклоняется, если применён с другим набором фильтров или сортировкой.

Периодические фильтры `startsFrom`/`startsTo`, фильтр свободных мест и другие варианты поиска по
дате остаются отдельным slice и пока не принимаются текущим DTO.

Response `200`:

```json
{
  "items": [],
  "nextCursor": null
}
```

Cursor непрозрачен для mobile и связан с активным sort/filter набором.

### `POST /v1/events`

Требует `Idempotency-Key` и завершённый онбординг.

```json
{
  "title": "Волейбол вечером",
  "categoryId": "d3ad02c2-508d-4cee-ae45-ac640c589ad6",
  "description": "Собираемся на любительскую игру",
  "cityId": "c5e1b60d-1730-44dc-9171-38c8f445476d",
  "meetingPlace": "Площадка у центрального парка",
  "startsAt": "2026-08-10T16:00:00Z",
  "endsAt": "2026-08-10T18:00:00Z",
  "capacity": 8,
  "participationMode": "automatic"
}
```

Validation соответствует PRD: title 3–80, description 10–2000, meeting place 3–300, capacity не
меньше 2, начало в будущем, конец позже начала, city/category доступны. Организатор и его
participation `going` создаются атомарно. Response `201` возвращает `EventDetails`.

Ошибки: `409 CITY_NOT_SUPPORTED`, `409 CATEGORY_NOT_ACTIVE`, `409 IDEMPOTENCY_KEY_REUSED`,
`409 ONBOARDING_INCOMPLETE`.

### `GET /v1/events/{eventId}`

Возвращает `EventDetails`. Published event доступен любому авторизованному пользователю. Cancelled
event остаётся доступен организатору и пользователям с participation для истории. Hidden visibility
будет определена модерацией и не реализуется сейчас.

### `PATCH /v1/events/{eventId}`

Доступен только организатору, требует `Idempotency-Key`. Принимает абсолютные optional поля create
DTO и обязательный `expectedVersion`. `organizerId`, `status` и прошлое `startsAt` не принимаются.

Backend под row lock запрещает capacity ниже текущего `going` count. `expectedVersion` сравнивается
с техническим `version`, который увеличивается при каждом mutation. Несовпавшая версия возвращает
`409 EVENT_VERSION_CONFLICT`. Изменение даты, времени, города или места дополнительно увеличивает
`contentVersion`. Повтор с тем же idempotency key возвращает исходный response.

### `POST /v1/events/{eventId}/cancel`

Доступен только организатору и требует `Idempotency-Key`. Переводит published event в `cancelled`,
заполняет `cancelledAt` и не удаляет participation. Повтор возвращает текущий cancelled event.

### `GET /v1/events/{eventId}/participants`

Возвращает cursor page `going` participants. Доступен любому авторизованному пользователю, который
может открыть event. Organizer всегда присутствует.

### `GET /v1/events/{eventId}/messages`

Возвращает сообщения общего чата активности в обратном хронологическом порядке. Query `cursor`
указывает последнее полученное message id, `limit` имеет default 30 и maximum 50. Response содержит
`items`, `nextCursor` и `readOnly`. Доступ получают только organizer и участник с актуальным
`participation.status = going`; для остальных endpoint намеренно возвращает `404`, не раскрывая
содержимое чата. После отмены или наступления `startsAt` response остаётся доступен до retention,
но `readOnly = true`.

### `POST /v1/events/{eventId}/messages`

Создаёт одно организационное сообщение и требует `Idempotency-Key`.

```json
{ "text": "Буду у входа в парк к 18:50" }
```

`text` normalizes trim и должен содержать от 1 до 1000 символов. Запись выполняется под row lock
event с повторной проверкой актуального `going` участия: пользователь, потерявший доступ параллельно
с запросом, не создаст сообщение. Для отменённой, начавшейся или завершённой активности endpoint
возвращает `409 CHAT_READ_ONLY`. Ответ `201` — message с id, author projection, text и `createdAt`.
Текст не попадает в технические логи.

### `GET /v1/events/{eventId}/applications`

Доступен только организатору approval-required event. Query поддерживает status и cursor; первый
каркас использует прежде всего `status=pending`. Response содержит participation id, applicant
`PublicUser`, status и timestamps.

### `PUT /v1/events/{eventId}/image`

Доступен только организатору и принимает одно `multipart/form-data` изображение. Требует
`Idempotency-Key`, проверяет файл по правилам ADR 0007, заменяет `imageObjectKey` и возвращает
обновлённый `EventDetails`.

### `DELETE /v1/events/{eventId}/image`

Доступен только организатору, очищает database reference и возвращает `204`. Повторное удаление
без изображения также успешно.

### `GET /v1/media/{mediaKey}`

Требует authentication и возвращает текущее изображение по opaque key с корректным `Content-Type`
и cache headers. `mediaKey` состоит из сгенерированного backend identifier и не содержит исходного
имени или filesystem path. Неизвестный или больше не связанный с сущностью key возвращает `404`.

## 8. Participation endpoints

### `PUT /v1/events/{eventId}/participation`

Идемпотентно создаёт требуемое участие согласно mode события:

- `automatic` приводит запись к `going`;
- `approval_required` создаёт `pending`.

Request body отсутствует. Backend блокирует event row и проверяет, что событие published, не
началось, не заполнено, пользователь не organizer и не имеет terminal participation. Response
`200` возвращает participation и обновлённые capacity fields.

Если целевое состояние уже достигнуто, повтор возвращает тот же логический успех. `rejected`,
`withdrawn` и `cancelled` не реактивируются в первом каркасе.

Ошибки:

- `409 EVENT_FULL`;
- `409 EVENT_STARTED`;
- `409 EVENT_CANCELLED`;
- `409 ORGANIZER_ALREADY_PARTICIPATES`;
- `409 PARTICIPATION_TERMINAL`.

### `DELETE /v1/events/{eventId}/participation`

Под event row lock переводит собственный `pending` в `withdrawn`, а `going` в `cancelled`. Organizer
получает `409 ORGANIZER_CANNOT_LEAVE`. После начала или отмены event изменения запрещены.

Response `200` возвращает terminal participation. Повтор withdrawal/cancellation возвращает то же
состояние без нового перехода.

### `PUT /v1/events/{eventId}/applications/{participationId}/decision`

Доступен только организатору соответствующего approval-required event.

```json
{
  "decision": "approve"
}
```

`decision` принимает `approve` или `reject`. Approve под event row lock переводит pending в `going`.
Если занято последнее место, остальные pending records в той же transaction переходят в
`rejected`. Reject переводит только выбранную запись.

Повтор того же решения возвращает текущий успешный результат. Попытка изменить уже принятое или
автоматическое решение возвращает `409 APPLICATION_ALREADY_DECIDED`. При гонке за последнее место
только одна заявка может стать `going`; остальные получают `EVENT_FULL` или уже auto-rejected
состояние.

### `PUT /v1/events/{eventId}/view-state`

Для пользователя с participation принимает `{ "seenEventVersion": 3 }` и монотонно увеличивает
`seen_event_version` до `min(requestedVersion, currentEventVersion)`. Endpoint идемпотентен и
позволяет убрать отметку об изменении события без notification module.

## 9. «Мои активности»

### `GET /v1/me/activities`

Query:

- `tab=upcoming|applications|created|past|cancelled`;
- `cursor`;
- `limit` с default 20 и maximum 50.

| Tab | Состав |
| --- | --- |
| `upcoming` | Будущие events с собственной participation `going` |
| `applications` | Events со всеми статусами собственных заявок |
| `created` | Events с `organizerId = me`, включая `pendingApplicationsCount` |
| `past` | Начавшиеся или завершённые events с отношением пользователя |
| `cancelled` | Cancelled events, созданные пользователем или с его participation |

Элемент списка содержит `EventSummary`, собственную participation, `hasEventUpdates` и доступные
действия. Pending application count означает количество необработанных `pending`, а не отдельный
unread notification state.

## 10. Чаты

### `GET /v1/me/chats`

Возвращает доступные пользователю event-scoped чаты: только события с собственной актуальной
participation `going`, не вышедшие за 30-дневный retention. Элемент содержит `eventId`, title,
`startsAt`, event status, `lastMessageAt` без текста и `readOnly`. Mobile использует polling каждые
15 секунд в detail и 30 секунд в списке, а также явный pull-to-refresh; realtime transport не
нужен на первом этапе.

## 11. Идемпотентность

`Idempotency-Key` обязателен для:

- `POST /events`;
- `PATCH /events/{eventId}`;
- `POST /events/{eventId}/cancel`;
- `POST /events/{eventId}/messages`;
- `PUT /me/avatar`;
- `PUT /events/{eventId}/image`.

Ключ рекомендуется генерировать как UUID, ограничение — 128 символов. Он scoped по user, operation
и route. Публичный контракт гарантирует replay минимум 24 часа. Первый каркас хранит и повторно
выдаёт результат 7 дней, после чего housekeeping удаляет запись.

- тот же key и тот же существенный body возвращают сохранённый status/body;
- тот же key с другим body возвращает `409 IDEMPOTENCY_KEY_REUSED`;
- конкурентный повтор ожидает завершения первой операции или получает воспроизводимый in-progress
  conflict, после которого mobile повторяет запрос с тем же key;
- response storage не содержит password, bearer token или birth date.

Participation использует idempotent `PUT`/`DELETE`, unique `(eventId, userId)` и проверку state
transition; отдельный key для этих endpoints не требуется.

## 11. Authorization matrix

| Операция | Authenticated user | Participant | Organizer |
| --- | --- | --- | --- |
| Читать published event и going participants | Да | Да | Да |
| Читать cancelled event | Нет, если не связан | Да | Да |
| Создать event | После онбординга | После онбординга | После онбординга |
| Редактировать/cancel event | Нет | Нет | Да |
| Join/apply | Да, если не organizer | По текущему state | Нет |
| Withdraw/leave | Только собственная запись | Да | Нет |
| Читать pending applications | Нет | Только собственную через me | Да |
| Approve/reject application | Нет | Нет | Да |

Все проверки выполняются на backend после authentication. Отсутствие кнопки в mobile не является
authorization control.

## 12. Domain conflicts

| Code | Когда возвращается |
| --- | --- |
| `EMAIL_ALREADY_EXISTS` | Normalized email уже зарегистрирован |
| `AGE_RESTRICTION` | Пользователю меньше 18 лет |
| `ONBOARDING_INCOMPLETE` | Действие требует завершённого профиля |
| `CITY_NOT_SUPPORTED` | Город отсутствует или выключен |
| `CATEGORY_NOT_ACTIVE` | Категория отсутствует или выключена |
| `EVENT_FULL` | Нет свободного места |
| `EVENT_STARTED` | Event уже начался |
| `EVENT_CANCELLED` | Event отменён |
| `EVENT_VERSION_CONFLICT` | Organizer редактирует устаревшую версию |
| `CAPACITY_BELOW_PARTICIPANTS` | Новый capacity меньше going count |
| `PARTICIPATION_TERMINAL` | Повторное участие после terminal state не разрешено |
| `APPLICATION_ALREADY_DECIDED` | Решение уже принято или изменилось конкурентно |
| `ORGANIZER_CANNOT_LEAVE` | Organizer пытается отказаться от участия |
| `IDEMPOTENCY_KEY_REQUIRED` | Mutation требует ключ, но он отсутствует |
| `IDEMPOTENCY_KEY_REUSED` | Key повторён с другим request body |

## 13. Контрактные проверки

- OpenAPI генерируется детерминированно и проверяется в CI;
- `packages/api-client` пересоздаётся из OpenAPI без ручного редактирования generated files;
- contract tests выполняют успешные, validation, authorization и conflict cases;
- privacy tests проверяют отсутствие `birthDate` во всех public user, organizer и participant DTO;
- retry tests проверяют create/edit/cancel event и все participation transitions;
- concurrency tests используют реальный PostgreSQL и подтверждают единственного владельца
  последнего места;
- breaking change в `/v1` требует новой версии или явно согласованной migration strategy.

## 14. Связанные документы

- [Product Requirements Document](../product/prd.md)
- [Системная архитектура](system-design.md)
- [Модель данных](data-model.md)
- [ADR 0004: аутентификация и серверные сессии](../adr/0004-authentication-sessions.md)
- [ADR 0005: конкурентное участие](../adr/0005-participation-concurrency.md)
- [ADR 0006: REST и OpenAPI](../adr/0006-api-contracts.md)
- [ADR 0007: локальное хранение изображений](../adr/0007-local-media-storage.md)
