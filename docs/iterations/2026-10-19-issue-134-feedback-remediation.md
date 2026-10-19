---
type: Iteration
title: Issue 134 Feedback Remediation & Container Healthchecks (Iteration 111)
description: Implemented unauthenticated /health endpoints, Docker HEALTHCHECK, default tenant seeding, and dry-run circuit breaker reset addressing Issue #134 post-deploy feedback (ADR-0068).
tags: [iteration, operations, api, healthcheck, container, docker, testing, slice-1]
timestamp: 2026-10-19T08:52:00Z
---

# Iteration 111: Issue 134 Feedback Remediation & Container Healthchecks

## Objective
Execute Slice 1 of the implementation plan, resolving the post-deployment feedback reported in [Issue #134](https://github.com/accordant-eu/rebalancing-engine/issues/134):
1. Resolve container healthcheck 401s on `GET 127.0.0.1:4444/health`.
2. Resolve spurious `circuitBreakerStatus is open` logs on seeded dry-run portfolios caused by missing default tenant broker configuration.
3. Add native Docker `HEALTHCHECK` and document the staging environment pipeline.

## Summary of Completed Work

### 1. Public Healthcheck Endpoints & Docker Liveness
- **Express Routes**: Mounted `GET /health` and `GET /api/health` returning `{ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }` with HTTP 200 without requiring JWT authentication.
- **OpenAPI Documentation**: Added `/health` and `/api/health` path definitions to `src/api/openapi.ts`.
- **Dockerfile Liveness**: Added `EXPOSE 4444` and a native Node `http.get` `HEALTHCHECK` directive in `Dockerfile` to enable automated container health monitoring.

### 2. Tenant Seeding & Dry-Run Circuit Breaker Reset
- **Default Tenant Seeding**: Seeded `default` tenant (`brokerType: 'MOCK'`) alongside `tenant-baseline` in `src/db/sqlite.ts` during `initDb()`.
- **Dry-Run Scenario Boot**: Configured `src/cli/agent.ts` to assign `tenant-baseline` to loaded scenario portfolios and automatically reset any leftover `circuitBreakerStatus === 'open'` state on startup.
- **Strict Guard Preservation**: Maintained strict circuit-breaking invariants when tenant broker configurations are missing in production.

### 3. Documentation & Staging Advisory
- **Decision Record**: Recorded [ADR-0068](../decisions/0068-unauthenticated-healthcheck-and-dry-run-tenant-fallback.md).
- **Deployment Guide**: Updated `DEPLOYMENT.md` with container health check documentation and an explicit warning regarding staging workflow `.github/workflows/deploy-dev.yml` path separation on the `ops` branch.
- **Version Bump**: Bumped application release version to `0.9.1` in `package.json` and `package-lock.json`.

## Files Touched
- `src/api/server.ts`
- `src/api/openapi.ts`
- `src/db/sqlite.ts`
- `src/cli/agent.ts`
- `Dockerfile`
- `package.json`
- `package-lock.json`
- `tests/api.test.ts`
- `tests/orchestrator.test.ts`
- `DEPLOYMENT.md`
- `docs/decisions/0068-unauthenticated-healthcheck-and-dry-run-tenant-fallback.md`
- `docs/decisions/index.md`
- `docs/iterations/2026-10-19-issue-134-feedback-remediation.md`
- `docs/iterations/index.md`
- `docs/log.md`
- `BUILD_JOURNEY.md`

## Validation
- `npm test`: All 46 backend suites / 362 tests passed.
- `npm --workspace=web test -- --run`: All web Vitest tests passed.
- `npm run lint && npm --workspace=web run lint`: All ESLint checks passed with 0 errors, 0 warnings.
- `npm run build`: TypeScript build passed cleanly.
- `./scripts/validate-docs.sh`: Clean OKF validation passed.

&copy; 2026 Johan Hellman. All rights reserved.
