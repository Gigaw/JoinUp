# AGENTS.md

## Project and sources

«Вместе» is a local-activities mobile app in a `pnpm` workspace: React Native/Expo,
NestJS/Fastify, PostgreSQL/Prisma, and a generated OpenAPI client. Architecture and ADRs fix the
stack and repository structure; document any foundational change first.

Before changing behaviour, read only the relevant sources:

1. `docs/product/prd.md` — accepted requirements and MVP boundaries.
2. `docs/product/open-questions.md` — unresolved decisions.
3. `docs/architecture/` and `docs/adr/` — accepted design and rationale.
4. GitHub Issues — active scope and acceptance criteria.
5. Root `README.md` — implemented state.

Do not silently resolve conflicts between sources: report them and update the proper source in the
same approved change. Do not assume that every target capability is implemented.

## Scope

The first skeleton covers email/password auth; private date of birth with backend 18+ validation;
opt-in calculated-age visibility (off by default); supported-city selection and free-text meeting
place; event CRUD/cancellation; automatic participation and organizer-approved applications; «Мои
активности»; and one locally stored profile or event image under `MEDIA_ROOT`.

Work only within the active issue. Unless explicitly scoped, exclude email verification/password
recovery, notifications, maps/precise geolocation, reports, blocking, moderation tools, and S3.

## Product, privacy, and security invariants

- The organizer is always a participant and counts toward capacity; pending applications do not.
- Prevent duplicate active participation and duplicate pending applications per user/event.
- A pending application may be withdrawn before start; an approved participant uses cancellation.
- Filling the last place rejects all remaining pending applications; never restore them automatically.
- Joining, applying, approving, rejecting, and withdrawing must tolerate retries and concurrency.
- Reject participation changes after event start or cancellation.
- Date of birth is private and never appears in public profile/participant APIs. Return calculated
  age only after explicit opt-in; enforce 18+ on the backend.
- Authorize every protected action and validate ownership. Never commit secrets, credentials,
  tokens, or real user data.
- Document new personal data, visibility, or retention rules in the PRD and data model.

## Architecture and implementation

- Write product/architecture docs in Russian; use English for identifiers, API/database fields, and
  commit messages. Put product behaviour in the PRD, implementation details in architecture docs,
  and future-constraining decisions in ADRs.
- Update docs with any changed behaviour, invariant, API contract, or data model. Document the need
  for new infrastructure, major dependencies, or architectural patterns before introducing them.
- Prefer strict TypeScript and shared typed contracts. Generate `packages/api-client` from backend
  OpenAPI; mobile must not import backend DTO or Prisma types.
- Separate mobile UI/client state/server state from domain, persistence, and transport concerns.
  Keep invariants in backend domain/application services and Prisma/transactional SQL in persistence
  adapters, not controllers, domain/application code, or mobile.
- Protect uniqueness, capacity, and concurrent changes with database constraints and transactions.
  Make retryable mutations idempotent.
- Test normal, validation, authorization, retry, and concurrency paths in proportion to risk. Avoid
  speculative abstractions and out-of-scope features.

## Verification

- Before finishing code changes, run relevant root checks: `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- For backend DB/HTTP changes, also run relevant Prisma commands, `pnpm test:e2e`, and
  `pnpm api:generate`; intentional generated API changes must leave mobile type-checking.
- For Expo dependency/routing changes, run
  `pnpm --filter @vmeste/mobile exec expo install --check` and, when possible, a representative
  native bundle/export check.
- For docs-only changes, verify Markdown structure, links, terminology, PRD, and open-question
  consistency. Do not invent undefined commands. Report unrun checks and unrelated failures; treat
  other failures as unresolved.

## Repository hygiene

- Preserve unrelated changes, keep work issue-focused, and never rewrite history or run destructive
  Git commands without explicit authorization.
- When the API changes, commit `packages/api-client/openapi.json` and
  `packages/api-client/src/schema.d.ts`. Do not commit other generated output, local environment
  files, secrets, caches, dependencies, or Expo exports.
- Do not add nested `AGENTS.md` files or repository skills until mobile/backend workflows have
  genuinely different repeated instructions.
