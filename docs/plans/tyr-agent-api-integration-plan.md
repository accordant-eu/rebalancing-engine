---
type: plan
title: Týr Agent API Integration Plan
description: Implementation plan for the Týr agent API integration based on Issue #9
timestamp: "2026-06-18T14:24:00Z"
---

# API Enrichment for Týr Agent Integration

This plan details the implementation of requirements defined in GitHub Issue #9 by Rufus to support the Týr autonomous investment analysis agent.

## Goal Description

The Týr agent requires a read-only integration with the rebalancing engine to consume live portfolio states, drift metrics, and execution history. To enable this, we need to publish a machine-readable OpenAPI 3.1 specification, implement missing endpoints, enrich existing ones, and standardise error responses across the API.

> [!NOTE]
> All changes are scoped to the `src/api` module and will not impact core engine logic.

## User Review Required

> [!IMPORTANT]
> - I will add an `openapi.json` spec served natively via Express. Do we want to add `swagger-ui-express` to serve the Swagger UI at `/api/docs` as well? (If yes, we'll need to run `npm install swagger-ui-express`).
> - The `/api/logs` and `/api/portfolios/:id/proposals` endpoints will parse `data/audit-trail.jsonl` per request. For the PoC, parsing this file in memory is acceptable, but for larger files, this may become slow.

## Proposed Changes

---

### API Specification

#### [NEW] `src/api/openapi.ts`
- Export the full OpenAPI 3.1 JSON definition object.
- **Paths**: Document all existing endpoints and the new endpoints required by Týr.
- **Components**: Document explicit data models for `Portfolio`, `Position`, `TradeProposal`, `AuditRecord`, `Model`, `CashFlow`, and `CircuitBreakerState`.
- **Security**: Document the current Mock JWT auth scheme and add notes regarding the future transition to a signed JWT or PKCE scheme.
- **Errors**: Document standardized error response shapes (`{ error: { code, message, details } }`) with standard codes like `UNAUTHORIZED`, `PORTFOLIO_NOT_FOUND`, etc.
- **Events**: Document the audit trail event types (`DRY_RUN_EXECUTION`, `LIVE_EXECUTION`, `CIRCUIT_BREAKER_HALT`, `RECONCILIATION_PAUSE`, `THRESHOLD_BREACH`, `REBALANCE_NOT_DUE`).

---

### Express Server Routes

#### [MODIFY] `src/api/server.ts`
1. **OpenAPI Route**:
   - Add `app.get('/api/docs/openapi.json', ...)` to serve the spec.
2. **Error Handling**:
   - Refactor error responses on the new routes to return the standard format.
3. **New Endpoints**:
   - **`GET /api/portfolios`**: Retrieve all portfolio states for the tenant, calculate a simplified drift summary (e.g. `driftStatus`), and return.
   - **`GET /api/portfolios/:id`**: Return detailed state for a single portfolio, including pending cash flows, circuit breaker status, and the last proposal (fetched from the audit trail).
   - **`GET /api/portfolios/:id/drift`**: Extract the target allocation and policy for the portfolio, then call the core drift calculation engine (`evaluateDrift` or equivalent) to return live relative and absolute drift.
   - **`GET /api/portfolios/:id/proposals`**: Read `data/audit-trail.jsonl`, filter by `accountId`, extract `outputs.tradeProposal`, limit to `N`, and return.
   - **`GET /api/prices`**: Expose `stateManager.getGlobalPrices()` directly.
4. **Endpoint Enrichment**:
   - **`GET /api/logs`**: Update the streaming reader to accept `?portfolioId=`, `?since=`, `?type=`, `?limit=`, and `?offset=`. It will read the file into memory, filter it, apply pagination, and return `{ total, data: [...] }`.

## Verification Plan

### Automated Tests
- Run `npm run test` to verify no existing functionality breaks.
- Ensure the API compiles successfully via `npm run build`.

### Manual Verification
- Access `GET /api/docs/openapi.json` to ensure the schema is valid and correctly formatted.
- Authenticate via `POST /api/auth/login` and simulate the Týr workflow:
  1. `GET /api/portfolios`
  2. `GET /api/portfolios/{id}/drift`
  3. `GET /api/portfolios/{id}/proposals`
  4. `GET /api/logs`
  5. `GET /api/prices`
- Ensure error responses match the required standard.
