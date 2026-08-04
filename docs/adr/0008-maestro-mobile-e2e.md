# ADR 0008: Maestro для повторяемых mobile E2E smoke-тестов

- **Статус:** Принято
- **Дата:** 2026-08-04
- **Связанные Issues:** [#15](https://github.com/Gigaw/JoinUp/issues/15)
- **Заменяет:** —
- **Заменено:** —

## Контекст

Автоматические backend и mobile unit-тесты проверяют контракты, формы, session storage и выбор
маршрутов, но не подтверждают работу собранного интерфейса в iOS Simulator и Android Emulator.
После появления регистрации, входа и онбординга нужен воспроизводимый smoke-контур, который
выполняет те же действия, что пользователь, и помогает повторять основные сценарии задачи #15.

Инструмент не должен добавлять production dependency в mobile bundle, получать доступ к приватным
backend implementation details или заменять ручную проверку на физических устройствах.

## Критерии решения

- поддержка iOS Simulator и Android Emulator одним декларативным набором flow;
- совместимость с React Native и Expo development builds;
- управление через accessibility tree и пользовательские действия;
- простой локальный запуск и возможность позднее перенести те же flow в EAS Workflows;
- отсутствие runtime-зависимости и test instrumentation в приложении.

## Рассмотренные варианты

### Maestro

Работает как black-box UI automation через accessibility tree, использует YAML flow и не требует
test instrumentation или npm-пакета Maestro внутри приложения. Поддерживает Expo development builds
и EAS Workflows. Для надёжных selectors нужны стабильные accessibility labels или `testID`.

### Detox

Даёт глубокую синхронизацию с React Native и Jest API, но требует native test configuration,
специальных builds и более сложной Expo-интеграции. Для текущего небольшого smoke-набора эта
стоимость не оправдана.

### Только ручная проверка

Не требует нового инструмента, но плохо воспроизводится, не обеспечивает быстрый regression smoke и
не даёт машиночитаемого результата для будущего CI.

## Решение

Использовать Maestro CLI для повторяемых mobile E2E smoke-тестов. Workspace хранится в корневом
`.maestro/`, а root package scripts предоставляют отдельные команды iOS и Android.

Flow взаимодействуют с UI по стабильным `testID`, accessibility state или видимому тексту. `testID`
добавляется только для неоднозначных или изменяемых элементов и считается частью testability
contract, но не API-контракта продукта.

Локальный контур запускает development build с `expo-dev-client` напрямую по bundle/package id
`app.vmeste.mobile`. После очистки локального состояния flow выбирает запущенный Metro development
server на порту `8081`. Flow используют только seed и синтетические тестовые аккаунты с уникальными
email. Production credentials, реальные данные и секреты запрещено хранить в YAML, output artifacts
или screenshots.

Android-команда выполняет `adb reverse tcp:3000 tcp:3000`, чтобы development build мог обращаться к
локальному API через тот же `http://localhost:3000`, который используется в iOS Simulator.

Первый smoke-набор покрывает:

- регистрацию и заполнение обязательного профиля;
- переход к списку и открытие seed-события;
- вход seed-пользователя, перезапуск приложения, восстановление сессии и выход.

Проверки server-side 18+, ошибок сети, privacy и платформенной вёрстки расширяются отдельными flow
по мере стабилизации test fixtures. В текущем контуре development build создаётся локально через
`expo run:*`; запуск в EAS Workflows добавляется после настройки воспроизводимого cloud build.

## Последствия

### Положительные

- основные пользовательские сценарии повторяются одинаково на двух платформах;
- тесты не увеличивают mobile bundle и не требуют native instrumentation;
- YAML flow можно запускать локально и позднее использовать в EAS;
- accessibility identifiers одновременно улучшают тестируемость интерфейса.

### Отрицательные и риски

- локальный запуск зависит от работающих PostgreSQL, API, Metro и simulator/emulator;
- локальный development build нужно пересобирать при изменении native dependencies или Expo config;
- black-box flow не заменяют unit/component tests и могут требовать platform-specific handling;
- UI identifiers нужно сохранять стабильными или намеренно обновлять вместе с flow.

## Проверка соблюдения

- `maestro test` загружает все flow из `.maestro/` без ошибки конфигурации;
- оба platform scripts запускают flow для `app.vmeste.mobile` на выбранной платформе;
- mobile type-check подтверждает допустимость добавленных `testID`;
- smoke-flow проходит на iOS Simulator и Android Emulator перед закрытием задачи #15;
- `artifacts/maestro/` исключён из Git и не содержит committed screenshots или logs.

## Связанные документы

- [Mobile architecture](../architecture/mobile-architecture.md)
- [Product Requirements Document](../product/prd.md)
- [Maestro для React Native](https://docs.maestro.dev/platform-support/react-native)
- [Expo E2E с Maestro](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)
