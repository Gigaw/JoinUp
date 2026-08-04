# AI-assisted development

## Статус решения

После создания первого vertical slice в [Issue #2](https://github.com/Gigaw/JoinUp/issues/2)
проведён аудит фактических mobile и backend workflow для
[Issue #12](https://github.com/Gigaw/JoinUp/issues/12).

На текущем этапе:

- вложенные `apps/api/AGENTS.md` и `apps/mobile/AGENTS.md` не создаются;
- repository-specific skills не создаются;
- общие правила остаются в корневом `AGENTS.md`;
- проверенные команды остаются в `package.json`, CI и корневом `README.md`.

Причина: различия между приложениями уже появились, но повторяющиеся многошаговые процессы ещё не
подтверждены несколькими delivery-задачами. Сейчас отдельные инструкции в основном повторяли бы
корневые правила, package scripts и архитектурные документы.

## Проверенные workflow

Общие проверки запускаются из корня:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Backend дополнительно требует PostgreSQL и использует:

```bash
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm test:e2e
pnpm api:generate
```

Mobile использует Expo и дополнительно проверяется командами:

```bash
pnpm --filter @vmeste/mobile exec expo install --check
EXPO_PUBLIC_API_URL=http://localhost:3000 \
  pnpm --filter @vmeste/mobile exec expo export --platform android
```

OpenAPI связывает workflows: после изменения transport DTO или controller metadata нужно выполнить
`pnpm api:generate`, затем проверить сгенерированные файлы `packages/api-client` и mobile
type-check.

## Когда вернуться к решению

Повторный аудит нужен, когда произойдёт хотя бы одно из событий:

- выполнены ещё две feature-задачи с одинаковой последовательностью backend-изменений;
- появляется повторяемый процесс создания и проверки Prisma migration;
- mobile получает component/navigation tests или обязательную device build-проверку;
- общие инструкции начинают требовать исключений только для одного приложения;
- ручная последовательность регулярно пропускается и не может быть выражена обычным package script
  или CI job.

Тогда локальные `AGENTS.md` должны содержать только отличия конкретного приложения. Skill имеет
смысл только для устойчивого многошагового процесса с проверяемым результатом; он не должен
дублировать `README.md`, architecture docs или одну команду из `package.json`.
