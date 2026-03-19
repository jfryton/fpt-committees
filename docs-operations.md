# Operations Notes

## Deployment model

- Frontend deploys from `apps/web` to GitHub Pages.
- Backend runs on a Proxmox LXC with Postgres.

## Setup checklist

1. Copy `.env.example` to `.env` for the API.
2. Provision Postgres and set `DATABASE_URL`.
3. Set a strong `SESSION_SECRET` and `ACCESS_LINK_PEPPER`.
4. Set `INITIAL_ADMIN_TOKEN` for first-run bootstrap access.
5. Point `APP_BASE_URL` at the final GitHub Pages URL.
6. Expose the API over HTTPS and configure CORS to the frontend origin.

## GitHub publication

- Create a repository and push this monorepo root.
- Enable GitHub Pages using GitHub Actions.
- Update the frontend base URL if the repo name changes.
