# Deployment

## Environments

Three environments exist for this project. Each has a distinct role and owner.

| Environment | Owner | Branch / Ref | URL | Purpose |
|---|---|---|---|---|
| **AntiGravity dev** | AntiGravity | `main` (continuous) | local / AntiGravity sandbox | Primary development |
| **Rufus dev** | Rufus (Accordant AI agent) | `dev` | `https://dev.rebalancing.accordant.eu` | Operational staging, quick fixes |
| **Production** | Rufus | tagged release | `https://rebalancing.accordant.eu` | Live deployment |

Both hosted environments are behind HTTP basic auth while the app uses mock JWT authentication. Auth credentials are provided separately to authorised users.

---

## Architecture

```
GitHub Release (tag)
       │
       ▼
GitHub Actions (deploy.yml)
       │  SSH
       ▼
/srv/rebalancing-engine/        ← git checkout <tag>
       │
       ├── docker compose up -d  (network_mode: host)
       │       └── Express API   →  127.0.0.1:4444
       │
       └── web/dist/             ← built React frontend
               │
              nginx              →  rebalancing.accordant.eu (HTTPS)
               ├── /             →  serves web/dist/
               └── /api/         →  proxied to 127.0.0.1:4444
```

The container runs with `network_mode: host` so the hardcoded `127.0.0.1:4444` bind
in the Express server is reachable from nginx without source modifications.
See [ADR-003](https://github.com/accordant-eu/ops/blob/main/docs/decisions/003-rebalancing-engine-deployment.md)
for the full rationale.

---

## How to trigger a production deployment

**Create a GitHub Release.** That is the signal.

```bash
# Via gh CLI — run this when a version is ready for production
gh release create v0.9.1 \
  --title "v0.9.1" \
  --notes "What changed in this release"
```

Or use the GitHub web UI: Releases → Draft a new release → Publish.

The `deploy.yml` workflow listens for `release: [published]` events. On publish, it SSHes
into the production server, checks out the exact release tag, rebuilds the container,
and brings it up with zero manual intervention.

Push to `main` does **not** trigger a production deploy. You can push freely to `main`
without affecting the live environment.

---

## Required environment variables

The container reads from `/srv/rebalancing-engine/.env` on the server (not committed to the repo).

```
# Alpaca paper trading (required for --live alpaca mode)
APCA_API_KEY_ID=
APCA_API_SECRET_KEY=

# Alpaca Broker API (required for broker adapter)
ALPACA_BROKER_API_KEY=
ALPACA_BROKER_API_SECRET=
APCA_BROKER_URL=https://broker-api.sandbox.alpaca.markets/v1

# Logging
LOG_LEVEL=info
```

See `.env.example` for the full template.

---

## How Rufus reports issues back

If a deployment fails or the application becomes unhealthy post-deploy, Rufus opens a
**GitHub Issue** on this repo, labelled `deployment-feedback`.

Check open issues with that label for operational feedback without needing a human intermediary:

```bash
gh issue list --label deployment-feedback
```

Rufus also monitors GitHub Actions run history. Failed deploy runs are visible at:
`https://github.com/accordant-eu/rebalancing-engine/actions`

---

## Rufus dev environment

`https://dev.rebalancing.accordant.eu` tracks the `dev` branch and deploys automatically
on push to `dev`. Rufus uses this for:
- Verifying infrastructure changes before they affect production
- Quick operational fixes that don't need to go through the full AntiGravity dev cycle

If Rufus makes a `dev`-branch change that should be promoted to `main`, a PR is opened
for AntiGravity to review before it enters the release cycle.

---

## Adding a new scenario or changing the start command

The production container defaults to:

```
node dist/cli/index.js agent start \
  --scenarios tests/fixtures/scenarios.json \
  --scenario-id on_target
```

To change the scenario or flags, update the `CMD` in `docker-compose.yml` and include it
in the next release.
