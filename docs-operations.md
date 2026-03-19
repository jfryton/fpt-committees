# Operations Notes

## Deployment model

- Frontend deploys from `apps/web` to GitHub Pages.
- Backend runs on a Proxmox LXC with Postgres.

## Current backend deployment

- Proxmox CT: `135`
- Backend IP: `192.168.2.135`
- API bind: `0.0.0.0:3000`
- Systemd unit: `fpt-committees-api.service`
- App root: `/opt/fpt-committees`
- Env file: `/etc/fpt-committees/api.env`
- Database: `fpt_committees`
- Database role: `fptcomm`

## Setup checklist

1. Copy `.env.example` to `.env` for the API.
2. Provision Postgres and set `DATABASE_URL`.
3. Set a strong `SESSION_SECRET` and `ACCESS_LINK_PEPPER`.
4. Set `INITIAL_ADMIN_TOKEN` for first-run bootstrap access.
5. Point `APP_BASE_URL` at the final GitHub Pages URL.
6. Expose the API over HTTPS and configure CORS to the frontend origin.

## Reverse proxy handoff

- Upstream target: `http://192.168.2.135:3000`
- Health check: `http://192.168.2.135:3000/health`
- Configure your public API hostname to proxy to that upstream.
- Once the final public frontend hostname is decided, update:
  - `APP_BASE_URL`
  - `CORS_ORIGIN`

## Bootstrap access

- The current backend env includes an `INITIAL_ADMIN_TOKEN` for first-run access.
- Generate the first admin URL as:
  - `https://jfryton.github.io/fpt-committees/#/?token=<INITIAL_ADMIN_TOKEN>`
- After bootstrapping the first admin and creating normal grants, rotate or remove that token from `/etc/fpt-committees/api.env` and restart the service.

## GitHub publication

- Create a repository and push this monorepo root.
- Enable GitHub Pages using GitHub Actions.
- Update the frontend base URL if the repo name changes.
