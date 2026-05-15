# PM Kanban — Backend API

NestJS **REST API** for authentication, users (admin), and **Kanban tasks**. Persistence uses **Prisma** with **PostgreSQL**. **Redis** backs cache, Bull queues, and rate limiting.

---

## Table of contents

- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Scripts](#scripts)
- [API surface](#api-surface)
- [Database & Prisma](#database--prisma)
- [Security & operations](#security--operations)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| Tool | Version | Notes |
|------|---------|--------|
| **Node.js** | 20.x or newer | Enforced via `engines` in `package.json` |
| **npm** | 10+ | Or compatible package manager |
| **PostgreSQL** | 14+ recommended | Prisma datasource |
| **Redis** | 6+ | Cache, Bull, throttler storage |

Optional: **Docker** — see `docker-compose.postgres.yml` for a local Postgres example (adjust credentials to match `DATABASE_URL`).

---

## Environment variables

Copy the template and edit values **before** running migrations or the server:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | HTTP listen port (default `3000` in example). |
| `NODE_ENV` | Yes | `development` / `production` (affects logging and integrations). |
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma. |
| `JWT_SECRET` | Yes | Strong secret for signing access tokens. **Rotate in production.** |
| `JWT_EXPIRES_IN` | Yes | Token TTL (e.g. `1h`). |
| `REDIS_HOST` / `REDIS_PORT` | Yes | Redis for cache, Bull, and throttler. |
| `CORS_ORIGINS` | No | Comma-separated allowed browser origins. If unset, CORS may be permissive — **set explicitly in production.** |
| Mail (`MAIL_*`) | No | Outbound email (see `src/config/mail.config.ts`). |
| Sentry (`SENTRY_*`) | No | Error monitoring (optional). |
| `ADMIN_*` | No | Used by `prisma/seed.ts` when seeding the first admin. |

**Never commit** `.env` or real secrets. `.env.example` is the single source of template keys.

---

## Local setup

```bash
cd Backend
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, Redis, etc.

# Apply migrations and generate Prisma Client (prisma/generated is gitignored)
npx prisma migrate dev

# Optional: seed default admin (see prisma/seed.ts)
npx prisma db seed

# Run API with hot reload
npm run start:dev
```

- **Base URL**: `http://localhost:<PORT>/api`
- **OpenAPI (Swagger UI)**: `http://localhost:<PORT>/api/docs`
- **Health**: Terminus-based checks are registered under the app’s health module (see `src/health/`).

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run start:dev` | Development server (watch). |
| `npm run build` | `prisma generate` + Nest compile to `dist/`. |
| `npm run start:prod` | Run compiled app: `node dist/src/main`. |
| `npm run lint` | ESLint with auto-fix (local dev). |
| `npm run lint:ci` | ESLint **without** fix — use in CI. |
| `npm test` | Unit tests (Jest). |
| `npm run test:e2e` | End-to-end tests (Supertest). |
| `npm run test:cov` | Coverage report. |

### Continuous integration (recommended)

```bash
npm ci
npm run lint:ci
npm test
npm run build
```

---

## API surface

Global prefix: **`/api`**. Responses are wrapped by a global interceptor where applicable; see controllers and Swagger for exact shapes.

### Authentication

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- JWT: `Authorization: Bearer <access_token>`

### Users (admin)

- `GET /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id`, `DELETE /api/users/:id`  
- Admin-only routes are enforced in guards / services — verify with a non-admin token in Swagger.

### Tasks (Kanban)

All task routes require a valid JWT.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/tasks` | Create task. Creator is derived from JWT. |
| `GET` | `/api/tasks` | Paginated list with filters (`status`, `priority`, `creatorId`, `assigneeId`, `page`, `limit`). |
| `GET` | `/api/tasks/:id` | Task by id. |
| `PATCH` | `/api/tasks/:id/status` | Status-only update (`TODO` \| `IN_PROGRESS` \| `DONE`). |
| `PATCH` | `/api/tasks/:id` | Partial update; **do not** send `status` here — use `/status`. |
| `DELETE` | `/api/tasks/:id` | Delete task. |

**Authorization (summary)**

- **View**: creator, assignee, or `ADMIN`.
- **Edit / delete**: creator or `ADMIN`.
- **Change status**: creator, assignee, or `ADMIN`.

Non-admin list queries are scoped to tasks the user created or is assigned to, even when filters are applied.

### List query parameters (`GET /api/tasks`)

- **Filters**: `status`, `priority`, `creatorId`, `assigneeId` (combinable).
- **Pagination**: `page` (default `1`), `limit` (default `20`, max `100`).

---

## Database & Prisma

- **Schema**: `prisma/schema.prisma`
- **Migrations**: `prisma/migrations/`
- **Generated client**: `prisma/generated/` (ignored by Git — created by `prisma generate` on install/build).

After pulling changes that touch the schema:

```bash
npx prisma migrate dev
```

**Production** (reviewed migrations only):

```bash
npx prisma migrate deploy
```

---

## Security & operations

- **Helmet** and **compression** are enabled in `main.ts`.
- **Validation**: global `ValidationPipe` with `whitelist` and `transform`.
- **Rate limiting**: Redis-backed throttler (see app module) — tune limits for production load.
- **Bull / mail**: Queue workers expect Redis; configure mail env vars or disable flows that require SMTP in environments without mail.
- **Sentry**: optional; set `SENTRY_DSN` and related vars from `.env.example`.
- **Bull Board**: Admin UI for queues is mounted behind admin middleware — restrict network access in production.

**Production checklist**

- [ ] Strong `JWT_SECRET`, correct `JWT_EXPIRES_IN`
- [ ] `DATABASE_URL` points to production DB; run `migrate deploy`
- [ ] `CORS_ORIGINS` lists only trusted front-end origins
- [ ] Redis reachable and secured (password / VPC)
- [ ] `NODE_ENV=production`
- [ ] Log aggregation and uptime monitoring configured outside this repo

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `PrismaClientInitializationError` | Wrong `DATABASE_URL` or DB not running. |
| Redis connection errors | `REDIS_HOST` / `REDIS_PORT` or firewall. |
| 401 on all task routes | Missing/expired JWT or wrong `Authorization` header. |
| Migrations out of sync | Run `migrate dev` locally or `migrate deploy` in the target environment. |
| Empty `prisma/generated` after clone | Run `npx prisma generate` or `npm run build`. |

---

## License

`UNLICENSED` (private / internal). Update `package.json` if you redistribute.
