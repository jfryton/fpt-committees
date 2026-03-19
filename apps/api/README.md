# API Workspace

Fastify backend for the FPT committees directory with PostgreSQL + Drizzle ORM.

## Features

- Revocable access-link grants with `viewer`, `editor`, and `admin` roles.
- Session cookie exchange from a bearer access link.
- Immediate revocation checks on every authenticated API request.
- Committee-scoped permissions.
- Bilingual committee fields.
- CSV import endpoint for admin users.
- Audit logging endpoint for admin users.
- PostgreSQL-backed data store through Drizzle ORM.

## Environment

Copy `.env.example` into your environment.

Important variables:

- `APP_BASE_URL`: GitHub Pages frontend URL used when generating access links.
- `SESSION_SECRET`: cookie signing secret.
- `ACCESS_LINK_PEPPER`: server-side pepper applied before token hashing.
- `CORS_ORIGIN`: allowed frontend origin for local or production use.
- `ACCESS_LINK_PEPPER`: hash pepper for access-link tokens (also used as initial bootstrap token hash if no grants exist).

## Scripts

- `npm run dev --workspace @fpt-committees/api`
- `npm run typecheck --workspace @fpt-committees/api`
- `npm run build --workspace @fpt-committees/api`
- `npm run drizzle:generate --workspace @fpt-committees/api`
- `npm run drizzle:push --workspace @fpt-committees/api`

## API surface

- `GET /health`
- `GET /auth/session`
- `POST /auth/exchange`
- `POST /auth/logout`
- `GET /committees`
- `GET /committees/:committeeId`
- `PUT /committees/:committeeId`
- `GET /grants`
- `POST /grants`
- `POST /grants/:grantId/revoke`
- `POST /imports/committees`
- `GET /audit-logs`
