---
type: Iteration
title: Holistic Audit Remediation & Hardening (Iteration 109)
description: Implemented the 6-chunk remediation plan from the holistic review, resolving financial domain invariants, SQLite persistence and audit types, orchestrator/scheduler lifecycles, API authentication/RBAC, frontend persona alignment, and documentation synchronization.
tags: [iteration, audit, remediation, core, persistence, orchestrator, api, frontend, documentation]
timestamp: 2026-10-16T15:30:00Z
---

# Iteration 109: Holistic Audit Remediation & Hardening

## Objective
Execute the comprehensive 6-chunk remediation strategy documented in `docs/plans/holistic-review-remediation-plan.md` and formalized in `docs/decisions/0067-holistic-audit-remediation-and-domain-invariants.md`.

## Summary of Completed Work

### Chunk 1: Core Financial Math, Overlays & Simulation Integrity
- **Valuation & Corporate Action Cash Flows**: Solved the dividend double-counting bug in `summarizeCashFlows` (`src/core/valuation.ts`) by identifying corporate action dividend cash flows (`div-`) already reflected in `portfolio.cash` and adjusting starting cash, guaranteeing invariant mathematical parity across memory and SQLite reloads.
- **Deposit Allocation Modes**: Implemented `depositAllocationMode` (`'REBALANCING'`, `'CURRENT_WEIGHT'`, `'FIXED_TARGET'`) deterministically using `decimal.js` in `src/core/trades.ts`.
- **Simulation Lot & State Preservation**: Preserved `taxLots`, `taxJurisdiction`, `taxWrapper`, and state metadata in `simulatePostTrade` (`src/core/simulation.ts`) and removed debug logs.
- **Corporate Action Lot Rounding & Deduplication**: Added residual adjustment to lot quantities after splits and mergers to guarantee exact sum equality with `newHoldingQuantity`, and prefixed converted lot IDs to prevent merger collisions.
- **Float Arithmetic Elimination**: Converted floating-point arithmetic to `decimal.js` across `OpportunisticLossHarvestingOverlay`, `HoldingConcentrationCapOverlay`, `OracleTaxOptimizerAdapter`, `calculateDrift`, `QualityPipeline`, and `FrictionModel`.

### Chunk 2: SQLite State & Audit Persistence Integrity
- **SQLite Schema & Repositories**: Added `universe` column to `Models` and `archetype`/`constraints` to `Portfolios` in `src/db/sqlite.ts` and `ModelRepository.ts`.
- **`SqliteStateManager` Synchronization**: Added `cashBuffer` and pending `CashFlows` selection in `getStatesFilteredByTenant`, populated `submittedBy` on cash-flow persistence in `updatePortfolio`, and persisted `taxJurisdiction` and `taxWrapper`.
- **Policy Route Persistence**: Implemented SQLite write-back for `PUT /api/portfolios/:id/policy` in `src/api/routes/portfolios.ts`.
- **Audit Storage & Types**: Explicitly defaulted audit `type` to `'LIVE_EXECUTION'` / `'EVALUATION'` in `generateAuditRecord` (`src/audit/audit.ts`) so audit status queries return expected records.

### Chunk 3: Orchestrator, Batch Worker & Mandate Scheduler Lifecycle
- **Scheduler & Calendar Strategy Handoff**: Recorded `lastTriggeredRebalanceDate` on `CalendarRebalancingConfig` during `MandateSchedulerService.scanAndEnqueue`, evaluated it in `CalendarRebalanceStrategy.evaluateTrigger`, and cleared it after execution in both `Orchestrator` and `BatchEvaluationWorker`.
- **Scheduler Singleton**: Bound a persistent `MandateSchedulerService` singleton to `app.locals.schedulerService` in `src/api/server.ts`.
- **Execution & Queue Safety**: Enforced `hasOpenOrders` checks via broker adapter before dispatch, checked `circuitBreakerStatus === 'open'` in orchestrator and batch worker loops, and wired `frictionModel` and `indicators` into `BatchEvaluationWorker`.
- **Live State Simulation Guard**: Removed premature live state overwrite from `src/cli/agent.ts`.

### Chunk 4: API Authentication, RBAC & Webhook Hardening
- **Password Hashing**: Implemented `bcrypt` password hashing on `POST /api/admin/users` and `POST /api/users`.
- **Superadmin Resolution**: Updated `checkIsSuperadmin` to accept `role === 'Superadmin'`.
- **Route Authorization & Tenant Isolation**: Attached `forbidViewer` and tenant ownership verification to `POST /api/models/:id/fan-out` and `PUT /api/portfolios/:id/subscription`.
- **Webhook & Rate Limiting**: Hardened `POST /api/webhooks/broker-reports` with `crypto.timingSafeEqual`, raw body verification, and mandatory secret enforcement in production. Increased general API rate limit from 100 to 1,000 req / 15 min.

### Chunk 5: Frontend Persona & API Contract Alignment
- **Persona Routing**: Wired `AssetUniverseTab` into `SuperadminLayout` in `web/src/App.tsx`.
- **API Contract Casing & Filters**: Normalized concentration limit constraint type to canonical `concentration_limit` in `MandateBuilderForm.tsx`, and updated `ComplianceDashboard.tsx` to send `portfolioId` query parameter.
- **User Provisioning & Polling**: Added `Advisor` role option to `TenantManagementTab.tsx`, eliminated React Compiler warnings on `useWatch`, and slowed fallback UI polling from 2s to 15s.

### Chunk 6: OpenAPI, ADR Registry & Documentation Synchronization
- **ADR Registry & Status Updates**: Documented supersession for ADRs 0017, 0025, 0031, 0032, 0039, 0046, 0048, 0053, and 0054 in both individual ADR files and `docs/decisions/index.md`. Fixed phantom `ADR-0085` references in ADR-0060 and ADR-0061. Added missing ADRs 0053–0057 to `BUILD_JOURNEY.md`.
- **Foundational Documentation**: Updated `README.md`, `DEPLOYMENT.md`, `docs/architecture/overview.md`, `docs/guides/`, and `src/api/openapi.ts` to reflect the multi-tenant architecture, signed JWTs, and full endpoint inventory.

## Files Touched
- `src/models/domain.ts`
- `src/core/valuation.ts`
- `src/core/corporate-actions.ts`
- `src/core/simulation.ts`
- `src/core/trades.ts`
- `src/core/evaluation.ts`
- `src/core/overlays.ts`
- `src/core/oracle-adapter.ts`
- `src/core/drift.ts`
- `src/core/quality.ts`
- `src/core/friction.ts`
- `src/db/sqlite.ts`
- `src/db/repositories/ModelRepository.ts`
- `src/orchestrator/sqlite-state.ts`
- `src/orchestrator/scheduler.ts`
- `src/orchestrator/executor.ts`
- `src/orchestrator/loop.ts`
- `src/orchestrator/batch-evaluator.ts`
- `src/strategy/calendar.ts`
- `src/audit/audit.ts`
- `src/audit/storage.ts`
- `src/api/server.ts`
- `src/api/routes/portfolios.ts`
- `src/api/routes/queue.ts`
- `src/api/webhooks/broker-reports.ts`
- `src/api/openapi.ts`
- `src/cli/agent.ts`
- `web/src/App.tsx`
- `web/src/components/MandateBuilderForm.tsx`
- `web/src/components/ComplianceDashboard.tsx`
- `web/src/components/admin/TenantManagementTab.tsx`
- `web/src/App.test.tsx`
- `docs/plans/holistic-review-remediation-plan.md`
- `docs/decisions/0067-holistic-audit-remediation-and-domain-invariants.md`
- `docs/decisions/index.md`
- `BUILD_JOURNEY.md`
- `docs/iterations/2026-10-16-audit-remediation.md`
- `docs/iterations/index.md`
- `docs/log.md`

## Validation
- `./scripts/validate-docs.sh`: Clean OKF validation.
- `npm run lint`: 0 errors, 0 warnings.
- `npm run build`: TypeScript build passes.
- `npm test`: All 46 backend suites / 346 tests pass.
- `npm --workspace=web run lint && npm --workspace=web test -- --run && npm --workspace=web run build`: All frontend tests and builds pass.

&copy; 2026 Johan Hellman. All rights reserved.
