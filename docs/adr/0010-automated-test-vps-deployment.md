# ADR 0010: Автоматическое безопасное развёртывание test VPS

- **Статус:** Принято
- **Дата:** 2026-08-27
- **Связанные Issues:** [#53](https://github.com/Gigaw/JoinUp/issues/53)
- **Заменяет:** —
- **Заменено:** —

## Контекст

ADR 0009 определяет тестовый API на одном VPS, но намеренно не включал CI/CD. Ручное обновление
зависит от действий владельца, не связывает развёрнутый код с конкретным результатом CI и требует
использовать SSH-подключение root. На текущем этапе репозиторий остаётся public, чтобы standard
GitHub-hosted runners не расходовали включённую квоту минут. Это не должно быть частью модели
защиты VPS: исходный код и история коммитов доступны для просмотра, но secrets и доступ к серверу
не должны из этого следовать. Перед публикацией проверена история Git на отсутствие реальных
ключей, токенов и runtime-конфигурации.

В VPS уже есть Docker Compose, Git-рабочая копия в /opt/vmeste и runtime-секрет
infra/.env.test. Данные PostgreSQL, медиа и сертификаты Caddy сохраняются Docker volumes и не
должны изменяться автоматическим процессом.

## Критерии решения

- разворачивать только точный commit, отправленный в main после успешного CI;
- не передавать GitHub доступ root и не хранить личные ключи разработчика на VPS;
- не коммитить runtime-секреты, SSH private keys или данные тестовой базы;
- не запускать два развёртывания одновременно;
- перед заменой API применять Prisma migrations и после неё проверять HTTPS readiness;
- прекращать обновление при локальном изменении серверной рабочей копии.

## Рассмотренные варианты

### Ручной SSH deploy

Не требует GitHub Actions secrets, но допускает ошибки в порядке команд и не создаёт проверяемой
связи между merge, CI и версией на VPS.

### GitHub Actions с SSH-доступом к отдельному пользователю VPS

GitHub Actions запускает deploy-job только после quality-job на main. Отдельный пользователь
vmeste-deploy владеет рабочей копией и имеет доступ к Docker; его ключ для GitHub Actions принимает
только ограниченную команду deploy с SHA коммита. VPS получает исходники отдельным read-only GitHub
Deploy Key.

### Self-hosted runner на VPS

Убирает SSH-подключение Actions к VPS, но выполняет workflow-код прямо на сервере. Это расширяет
границу доверия и не нужно для одного тестового окружения.

### Container registry

Позволит серверу скачивать готовый immutable image и станет предпочтительным для production, но
добавляет registry, lifecycle images и отдельное решение вне текущего тестового scope.

## Решение

Для test VPS применяется GitHub Actions с SSH-деплоем:

- репозиторий GitHub временно public; перевод в private возможен позднее без изменения VPS;
- job deploy-test-vps в существующем CI зависит от quality, работает только для main и получает
  SHA из GitHub Actions context;
- GitHub Actions использует отдельный SSH key из repository secret для входа как vmeste-deploy;
- SSH-конфигурация этого пользователя запрещает пароль, TTY и forwarding, а authorized key
  принудительно запускает root-owned script /usr/local/sbin/vmeste-deploy;
- исходные версии root-owned script, SSH Match-конфигурации и GitHub known hosts находятся в
  infra/server, но merge не меняет установленную security boundary автоматически;
- VPS получает repository по SSH через отдельный read-only GitHub Deploy Key; этот ключ уже
  готов к private repository, а ключ Actions не даёт доступ к GitHub и ключ VPS не даёт доступа
  на VPS;
- script сравнивает requested SHA с origin/main, требует чистую рабочую копию, делает только
  fast-forward main, запускает migration, пересобирает media-init, API и Caddy, затем проверяет
  HTTPS readiness;
- GitHub Actions и сам script используют независимые locks, поэтому deploy не пересекаются.

Runtime .env.test, named volumes, image cache и данные приложения не входят в Git и не передаются
в GitHub Actions. Автоматический rollback не выполняется: schema migration может быть
однонаправленной. Ошибка deploy остаётся видна в GitHub Actions и требует осознанного исправления.

## Последствия

### Положительные

- успешный merge в main создаёт воспроизводимое развёртывание конкретного commit;
- pull request и неуспешный CI не получают доступ к VPS;
- public repository не расходует минуты Actions при стандартных GitHub-hosted runners;
- доступы раздельны, могут быть отозваны независимо и не используют root SSH key;
- сохранение PostgreSQL, media и сертификатов остаётся прежним.

### Отрицательные и риски

- исходники и история коммитов доступны публично; перед публикацией требуется проверять Git
  history на secrets, а при готовности продукта repository следует перевести в private;
- public pull request не получает VPS-secret: deploy запускается только после успешного CI для
  trusted main; пользователь, способный изменить main, остаётся доверенной границей;
- пользователь с доступом к Docker технически может получить высокий уровень доступа к VPS,
  поэтому key Actions выдаётся только workflow на trusted main;
- VPS остаётся единой точкой отказа без независимого backup;
- build на VPS требует свободного места и может быть медленнее registry-based deployment.

## Проверка соблюдения

- deploy-job запускается после quality и только для main;
- GitHub Actions status показывает success или failure deploy;
- VPS remote origin использует read-only SSH Deploy Key, а git status показывает main и
  origin/main;
- script отказывается от SHA, не совпадающего с origin/main, и от грязной working tree;
- docker compose ps показывает healthy API и PostgreSQL, а HTTPS readiness возвращает 200;
- ревью подтверждает, что secrets, private keys и .env.test отсутствуют в Git.

## Связанные документы

- [Issue #53](https://github.com/Gigaw/JoinUp/issues/53)
- [ADR 0009: Тестовое развёртывание API на одиночном VPS](0009-single-vps-test-deployment.md)
- [Системная архитектура](../architecture/system-design.md)
- [Инструкции test VPS](../../infra/README.md)
