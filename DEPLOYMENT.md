# Deployment

## Ownership

| Scope | Owner |
|---|---|
| Feature development, `main` branch | AntiGravity |
| Dev environment (`ops.rebalancing.accordant.eu`) | Rufus |
| Production environment (`rebalancing.accordant.eu`) | Rufus |

Production is entirely Rufus's responsibility. AntiGravity's scope ends at `main`.

---

## Environments

| Environment | Branch | URL | Auth |
|---|---|---|---|
| AntiGravity dev | local / AntiGravity sandbox | — | — |
| Rufus dev | `dev` | `https://ops.rebalancing.accordant.eu` | HTTP basic auth |
| Production | `main` (reviewed) | `https://rebalancing.accordant.eu` | HTTP basic auth |

Both hosted environments are behind HTTP basic auth at the ingress/reverse proxy layer,
while internal application sessions use signed HMAC-SHA256 JWT tokens with refresh token
rotation and bcrypt password hashing. Auth credentials are provided separately to authorised users.

---

## Architecture

```
/srv/rebalancing-engine/         ← git checkout of reviewed main commit
       │
       ├── docker compose up -d  (network_mode: host)
       │       └── Express API   →  127.0.0.1:4444
       │
       └── web/dist/             ← built React frontend
               │
              nginx              →  rebalancing.accordant.eu (HTTPS)
               ├── /             →  serves web/dist/ (static)
               └── /api/         →  proxied to 127.0.0.1:4444
```

The container runs with `network_mode: host` so the hardcoded `127.0.0.1:4444` bind
in the Express server is reachable from nginx on the host without source modifications.
See [ADR-003](https://github.com/accordant-eu/ops/blob/main/docs/decisions/003-rebalancing-engine-deployment.md).

---

## Database Migrations & Seeding

The application uses an embedded SQLite database (`data/state.db`) for state management. **No manual SQL migrations or database seeding scripts are required for production.**

When the Express server boots up, the `initDb()` function is automatically called. This function natively handles:
1. **Schema Initialization:** Running `CREATE TABLE IF NOT EXISTS` for all necessary tables (e.g. `Assets`, `Tenants`, `TenantApiKeys`).
2. **Baseline Seeding:** Using `INSERT OR IGNORE` to automatically populate the global `Assets` universe with the necessary composite IDs (e.g. `US0378331005:XNAS:USD`).
3. **Superadmin Creation:** Seeding the initial Superadmin user and the default `tenant-baseline` using the `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` environment variables.

> [!TIP]
> The command `npm run cli agent seed` is strictly for generating thousands of synthetic test portfolios in the development environment and should **not** be run in production.

---

## Release cycle

### 1. AntiGravity signals readiness

When a version on `main` is considered production-ready, open a GitHub Issue:

- **Label:** `release-ready`
- **Title:** e.g. `Release ready: [brief description of what changed]`
- **Body:** any relevant notes — breaking changes, new env vars needed, migration steps

That's it. No releases to create, no tags to push, no CI to watch. Prod is Rufus's problem.

### 2. Rufus reviews and verifies

Rufus pulls `main` to the dev environment and verifies the app runs correctly.
If anything looks wrong, a `deployment-feedback` issue is opened (see below).

### 3. Rufus deploys to production

Rufus triggers the `deploy.yml` workflow manually via `workflow_dispatch`, specifying
the ref to deploy (defaults to `main`). The workflow SSHes into the server, checks out
the ref, rebuilds the container, and brings it up.

An audit trail of every production deployment is in the Actions tab:
`https://github.com/accordant-eu/rebalancing-engine/actions`

---

## How Rufus reports issues back

If a deployment fails, or the app behaves incorrectly post-deploy, Rufus opens a
**GitHub Issue** on this repo labelled `deployment-feedback`.

Check that label when something seems off — no human relay needed:

```bash
gh issue list --label deployment-feedback
```

Issues will include the deployed ref, the symptom, and any relevant logs.

---

## Required environment variables

The container reads from `.env` on the server (never committed to the repo).
See `.env.example` for the full template. Key variables:

```
SUPERADMIN_EMAIL         # Initial Superadmin user email
SUPERADMIN_PASSWORD      # Initial Superadmin user password
SUPERADMIN_TENANT_ID     # Default superadmin tenant (e.g. tenant-baseline)
JWT_SECRET               # Random secret for signing access JWT tokens
JWT_REFRESH_SECRET       # Random secret for signing refresh tokens
ALPACA_WEBHOOK_SECRET    # Secret for validating Alpaca webhook signatures
APCA_API_KEY_ID          # Alpaca paper trading key
APCA_API_SECRET_KEY      # Alpaca paper trading secret
ALPACA_BROKER_API_KEY    # Alpaca broker API key
ALPACA_BROKER_API_SECRET # Alpaca broker API secret
REBALANCING_DB_PATH      # SQLite database file path (defaults to data/state.db)
LOG_LEVEL                # defaults to info
```

If new environment variables are needed in a release, note them in the `release-ready` issue.
Rufus will ensure they are set on the server before deploying.

---

## Staging Environment & Health Checks

### Staging Pipeline (`ops` branch)
Rufus maintains an `ops` branch for staging verification before production.

> [!WARNING]
> Staging workflow `.github/workflows/deploy-dev.yml` on the `ops` branch must target an isolated staging directory (e.g. `/srv/rebalancing-engine-staging` using `docker-compose.dev.yml`) rather than the production path `/srv/rebalancing-engine` to avoid port and container namespace collisions with production.

### Container Health Checks
The Express server exposes public, unauthenticated health check endpoints for container orchestrators, Docker `HEALTHCHECK`, load balancers, and reverse proxy monitoring:
* `GET /health`: Returns `{ status: 'ok', uptime: <seconds>, timestamp: <iso_time> }` with HTTP 200 without requiring JWT authentication.
* `GET /api/health`: Equivalent endpoint under the `/api/` prefix.

---

## Rufus's dev branch

Rufus maintains an `ops` branch for operational use: infrastructure changes, quick fixes,
and staging verification before production. This branch auto-deploys to
`ops.rebalancing.accordant.eu` on push.

If a change on `dev` or `ops` is worth incorporating into `main`, Rufus opens a PR for
AntiGravity to review before it enters the development cycle.
