# FPT Committees

Committee directory with a GitHub Pages frontend and a self-hosted backend on Proxmox/LXC.

## Workspaces

- `apps/web`: React SPA/PWA for committee browsing, editing, and admin tasks.
- `apps/api`: Fastify API with access-link auth, sessions, and committee storage.
- `packages/shared`: Shared TypeScript types and helpers.

## Current implementation

- `GitHub Pages` friendly frontend using hash routing, React, TanStack Router, TanStack Query, and PWA install/update support.
- `Fastify` API using revocable access links that exchange into secure session cookies.
- `viewer`, `editor`, and `admin` grants with immediate revocation checks.
- Bilingual EN/FR committee fields and UI.
- Seeded in-memory backend data for local development.

## Commands

```bash
npm install
npm run build
npm run typecheck
```

## Local development

1. Copy [apps/api/.env.example](/Users/jeff/fpt-committees/apps/api/.env.example) into your shell environment or `.env`.
2. Start the API:

```bash
npm run dev --workspace @fpt-committees/api
```

3. In another shell, start the frontend:

```bash
npm run dev --workspace @fpt-committees/web
```

4. On API startup, copy the printed bootstrap admin access link into your browser to create the first admin session.
