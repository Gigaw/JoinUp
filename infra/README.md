# Тестовое развёртывание API

Этот каталог описывает только тестовое окружение из [Issue #51](https://github.com/Gigaw/JoinUp/issues/51).
Оно запускает один API-экземпляр, PostgreSQL и Caddy на одном VPS. PostgreSQL не имеет внешнего
порта; Caddy принимает HTTP/HTTPS и хранит состояние сертификатов в named volume.

Окружение предназначено только для тестовых учётных записей и данных. До публичного пилота нужны
постоянный домен, независимые резервные копии, rate limiting auth-endpoints и инструменты safety из
PRD.

## Подготовка runtime-конфигурации

На VPS рабочая копия должна находиться в `/opt/vmeste`. Создайте runtime-файл только на сервере:

```bash
cd /opt/vmeste/infra
cp .env.test.example .env.test
chmod 600 .env.test
openssl rand -hex 32
```

Вставьте сгенерированное значение в `POSTGRES_PASSWORD` файла `.env.test`. Не коммитьте этот файл
и не передавайте его в чат.

## Первый запуск

Перед первым запуском убедитесь, что порты 80 и 443 свободны, а у сервера есть минимум 8 ГБ
свободного места. Команды ниже выполняются из `/opt/vmeste/infra`:

```bash
docker compose --env-file .env.test -f compose.test.yml config --quiet
docker compose --env-file .env.test -f compose.test.yml up -d postgres
docker compose --env-file .env.test -f compose.test.yml --profile ops run --rm migrate
docker compose --env-file .env.test -f compose.test.yml --profile ops run --rm seed-catalog
docker compose --env-file .env.test -f compose.test.yml up -d api caddy
```

`seed-catalog` добавляет только поддерживаемые города и категории. Не используйте `db:seed` на
публично доступном сервере: он создаёт демонстрационную учётную запись с известным паролем.

Проверьте состояние и HTTPS:

```bash
docker compose --env-file .env.test -f compose.test.yml ps
curl --fail --show-error https://31-128-42-29.sslip.io/v1/health/ready
```

## Обновление и остановка

Перед обновлением новой версии повторите migration, затем замените API-контейнер. `down` сохраняет
данные PostgreSQL и media; `down -v` удаляет тестовые данные без возможности восстановления.

```bash
docker compose --env-file .env.test -f compose.test.yml build api
docker compose --env-file .env.test -f compose.test.yml --profile ops run --rm migrate
docker compose --env-file .env.test -f compose.test.yml up -d api caddy
```

После появления постоянного домена замените `API_HOST` в `.env.test`, перезапустите Caddy и
соберите mobile application с новым `EXPO_PUBLIC_API_URL`.
