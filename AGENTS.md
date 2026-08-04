# AGENTS.md

## Project

«Вместе» is a mobile application for finding and creating local activities. The repository is a
`pnpm` workspace with a React Native/Expo mobile client, a NestJS/Fastify backend, PostgreSQL with
Prisma, and a generated OpenAPI client. The accepted stack and repository structure are fixed in
architecture documents and ADRs; update those sources before changing a foundational choice.

## Sources of truth

Read the relevant source documents before making changes:

1. `docs/product/prd.md` — accepted product requirements and MVP boundaries.
2. `docs/product/open-questions.md` — decisions that are still unresolved.
3. `docs/architecture/` — accepted system, mobile, backend, API, and data-model design.
4. `docs/adr/` — individual architecture decisions and their rationale.
5. GitHub Issues — delivery scope, acceptance criteria, and deferred work.

If these sources conflict, do not silently choose one. Report the conflict and update the appropriate source as part of the same approved change.

## Current delivery boundary

The target boundary of the first working skeleton includes:

- registration and sign-in with email and password;
- private date of birth with server-side 18+ validation;
- optional public display of calculated age, disabled by default;
- a city selected from the supported list and a free-text meeting-place description;
- event creation, listing, details, editing, and cancellation;
- automatic participation and organizer-approved applications;
- the «Мои активности» area for participation, applications, and created events;
- one profile or event image stored by the API in local `MEDIA_ROOT` storage.

Treat GitHub Issues and the root `README.md` as the source of truth for what is already implemented;
do not infer that every target capability above exists in code.

Do not add deferred features to the current skeleton unless the relevant issue is explicitly in
scope. Deferred features include email verification and password recovery, push and email
notifications, maps and precise geolocation, reports, blocking, moderation tooling, and migration
of image storage to Amazon S3.

## Product invariants

- The organizer is always a participant and counts toward event capacity.
- Pending applications do not reserve capacity.
- A user cannot have duplicate active participation or duplicate pending applications for one event.
- A pending application can be withdrawn before the event starts.
- An approved participant leaves through the normal cancellation flow.
- When the final place is taken, remaining pending applications are rejected automatically.
- Rejected applications are not restored automatically if a place later becomes available.
- Joining, applying, approving, rejecting, and withdrawing must be safe under retries and concurrent requests.
- No participation changes are accepted after an event starts or after it is cancelled.

## Privacy and security

- A date of birth is private data. Never return it in public profile or participant APIs.
- Expose only a calculated age when the user has explicitly enabled age visibility.
- Enforce the 18+ rule on the backend; client-side validation is not sufficient.
- Never commit secrets, access tokens, production credentials, or real user data.
- Validate authorization and resource ownership on the backend for every protected action.
- Document any new personal data, visibility rule, or retention rule in the PRD and data model.

## Architecture and documentation

- Write product and architecture documentation in Russian. Use English for code identifiers, API fields, database names, and commit messages.
- Record decisions that constrain future implementation in an ADR.
- Keep product behaviour in the PRD and technical implementation details in architecture documents; avoid duplicating large sections between them.
- Update documentation in the same change when behaviour, an invariant, an API contract, or the data model changes.
- Do not introduce a new infrastructure service, major dependency, or architectural pattern without documenting why it is needed.

## Implementation rules

- Prefer strict TypeScript and shared typed contracts between the mobile client and backend.
- Generate `packages/api-client` from backend OpenAPI metadata; mobile code must not import backend
  DTO or Prisma types directly.
- Keep mobile UI, client state, server state, domain logic, persistence, and transport concerns separated.
- Keep business invariants in backend domain or application services, not only in route handlers or mobile screens.
- Keep direct Prisma and transactional SQL access in backend persistence adapters, not in
  controllers, application/domain code, or mobile code.
- Use database constraints and transactions where they protect uniqueness, capacity, and concurrent participation changes.
- Make mutating API operations idempotent where retries can occur.
- Add tests for normal, validation, authorization, retry, and concurrency paths in proportion to risk.
- Avoid speculative abstractions and features outside the active issue.

## Verification

- Before finishing, run the relevant root checks: `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- For backend database or HTTP changes, also run the relevant Prisma commands, `pnpm test:e2e`, and
  `pnpm api:generate`. Generated API changes must be intentional and mobile must still type-check.
- For Expo dependency or routing changes, run
  `pnpm --filter @vmeste/mobile exec expo install --check` and a representative native bundle/export
  check when the environment permits it.
- Do not invent commands when the project has not defined them. State what could and could not be
  verified.
- For documentation-only changes, check Markdown structure, links, terminology, and consistency with the PRD and open questions.
- Treat failing checks as unresolved unless the failure is demonstrably unrelated and is reported clearly.

## Repository hygiene

- Preserve unrelated user changes and keep each change focused on its issue.
- Commit the generated `packages/api-client/openapi.json` and `packages/api-client/src/schema.d.ts`
  when the API contract changes. Do not commit other generated files, local environment files,
  secrets, dependency caches, or Expo export output.
- Do not rewrite shared history or use destructive Git commands without explicit authorization.
- Do not create nested `AGENTS.md` files or repository-specific skills until the mobile and backend workflows contain genuinely different, repeated instructions.
