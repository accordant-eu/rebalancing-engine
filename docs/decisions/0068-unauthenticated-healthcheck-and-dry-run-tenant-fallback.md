---
type: Decision Record
title: Unauthenticated Health Check and Default Tenant Seeding for Container Reliability
description: Introduce unauthenticated /health and /api/health endpoints with Docker HEALTHCHECK and seed default tenant to prevent dry-run circuit breaker lockouts.
tags: [architecture, operations, security, api, container, healthcheck]
timestamp: 2026-10-19T08:50:00Z
status: Accepted
---

# Unauthenticated Health Check and Default Tenant Seeding for Container Reliability

## Context

Following the production deployment of `main` @ `761dbd1` (v0.9.0), operational feedback recorded in Issue #134 surfaced two critical operational issues:
1. **Health Check Probing 401**: External container orchestrators, Docker `HEALTHCHECK`, and reverse proxy probes querying `GET 127.0.0.1:4444/health` received `401 Unauthorized`. The application had no dedicated `/health` route, and Express authentication middleware required a valid Bearer JWT for all unlisted routes.
2. **Spurious Circuit Breaker Trips on Seeded Dry-Run Portfolios**: The orchestrator logged `circuitBreakerStatus is open on the seeded dry-run portfolios`. When the dry-run CLI or test scenarios initialize portfolios with `tenantId: undefined` or `'default'`, `SqliteStateManager.getTenantBrokerConfig('default')` returned `null` because only `tenant-baseline` was seeded in `Tenants`. This triggered the strict broker-config circuit breaker guard (`updateCircuitBreakerStatus(accountId, 'open')`), persisting an open circuit breaker state in SQLite and preventing evaluations across container restarts.

## Options Considered

### Option 1: Require Authenticated Probes & Keep Manual Tenant Seeding
- **Benefits:** No modifications to Express auth middleware or database initialization.
- **Costs:** Standard infrastructure health checks (Docker, Kubernetes, AWS ALB, uptime monitors) do not have dynamic access to rotating signed JWT tokens. Requires manual operator SQL scripts to seed missing tenants.
- **Risks:** Broken automated container restarts and health detection.
- **Reversibility:** Low.

### Option 2: Dedicated Public `/health` Endpoints, Docker HEALTHCHECK, and Default Tenant Seeding (Chosen)
- **Benefits:**
  - Standardized, unauthenticated `GET /health` and `GET /api/health` returning JSON `{ status: 'ok', uptime: process.uptime(), timestamp: ... }`.
  - Native Docker `HEALTHCHECK` in `Dockerfile` verifying container liveness via Node's internal `http.get`.
  - Automatic `INSERT OR IGNORE` seeding of `default` tenant (`brokerType: 'MOCK'`) alongside `tenant-baseline` in `initDb()`.
  - Automatic reset of leftover `circuitBreakerStatus === 'open'` on dry-run portfolio startup.
- **Costs:** Minimal additions to `src/api/server.ts`, `src/db/sqlite.ts`, `src/cli/agent.ts`, and `Dockerfile`.
- **Risks:** Negligible. Health check endpoints leak no private financial data or secrets.
- **Reversibility:** High.

## Decision

We adopt **Option 2**:
1. Mount unauthenticated `GET /health` and `GET /api/health` in `src/api/server.ts` before authentication middleware, documented in `src/api/openapi.ts`.
2. Configure Docker `HEALTHCHECK` using Node `http.get` on `http://127.0.0.1:4444/health`.
3. Seed `default` tenant (`brokerType: 'MOCK'`) alongside `tenant-baseline` during `initDb()` in `src/db/sqlite.ts`.
4. Update `src/cli/agent.ts` to assign `tenant-baseline` to loaded scenario portfolios and reset leftover open circuit-breaker states on dry-run boots.

## Rationale

Container health checks must be lightweight, reliable, and unauthenticated to enable automated zero-downtime deployments and self-healing restarts. Seeding `default` in SQLite ensures synthetic and fixture-based portfolios have valid mock broker configurations without tripping production circuit breakers.

## Implementation Impact

- **Code:** `src/api/server.ts`, `src/api/openapi.ts`, `src/db/sqlite.ts`, `src/cli/agent.ts`, `Dockerfile`.
- **Tests:** `tests/api.test.ts` (unauthenticated 200 checks), `tests/orchestrator.test.ts` (clean evaluation without circuit breaking).
- **Documentation:** `DEPLOYMENT.md`, `BUILD_JOURNEY.md`, `docs/decisions/index.md`, `docs/iterations/2026-10-19-issue-134-feedback-remediation.md`.

## Follow-up

- Signal readiness via GitHub Issue #135 for release `v0.9.1`.
- Operator Rufus to update `.github/workflows/deploy-dev.yml` on `ops` to target an isolated staging directory.


&copy; 2026 Johan Hellman. All rights reserved.
