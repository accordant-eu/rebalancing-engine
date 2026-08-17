---
type: Iteration
title: Tax-Advantaged Account Wrappers & Policy Routing (ADR-0063)
description: Implemented TaxWrapperType to support UK ISA, UK SIPP, US Traditional IRA, US Roth IRA, US 401(k), and Tax-Exempt wrappers, bypassing spurious tax lockouts and TLH overlays.
tags: [iteration, tax, wrappers, overlays, ira, isa, adr]
timestamp: 2026-08-17T10:30:00Z
---

# Iteration: Tax-Advantaged Account Wrappers & Policy Routing (ADR-0063)

## Objective
Implement first-class Tax Wrappers (`TaxWrapperType`) across domain models, SQLite persistence, and execution overlay resolution pipelines to avoid applying unnecessary capital gains harvesting or wash-sale / B&B trade lockouts to tax-exempt/tax-advantaged accounts (e.g. UK ISA/SIPP, US IRA/401k), formalized in [ADR-0063](../decisions/0063-tax-advantaged-account-wrappers.md).

## Summary of Completed Work

### 1. Domain Models & Helpers
- Defined `TaxWrapperType`:
  - `'TAXABLE' | 'US_TRADITIONAL_IRA' | 'US_ROTH_IRA' | 'US_401K' | 'UK_ISA' | 'UK_SIPP' | 'TAX_EXEMPT'`
- Added `isTaxAdvantagedWrapper(wrapper?: TaxWrapperType | string): boolean` helper function.
- Added `taxWrapper?: TaxWrapperType` to `PortfolioState` and `RebalancingPolicy` (defaulting to `'TAXABLE'`).

### 2. Execution Overlay Resolution Pipeline
- Updated `resolveExecutionOverlays` in [`src/core/evaluation.ts`](../../src/core/evaluation.ts):
  - Automatically bypasses `OpportunisticLossHarvestingOverlay`, `WashSaleLockoutOverlay`, and `UkBedAndBreakfastOverlay` when evaluating tax-advantaged wrappers.
  - Consistently applies universal mandate constraint overlays (`ExclusionListOverlay`, `HoldingConcentrationCapOverlay`) across all account types.

### 3. Persistence & REST API
- Added `taxWrapper` and `taxJurisdiction` columns and automated safe migrations in [`src/db/sqlite.ts`](../../src/db/sqlite.ts) and [`src/orchestrator/sqlite-state.ts`](../../src/orchestrator/sqlite-state.ts).
- Exposed `taxWrapper` in `/api/portfolios` CRUD endpoints and updated OpenAPI specifications in [`src/api/openapi.ts`](../../src/api/openapi.ts).

### 4. Decision Record & Documentation
- Documented [ADR-0063](../decisions/0063-tax-advantaged-account-wrappers.md).
- Updated decisions index, daily iteration archive, and `BUILD_JOURNEY.md`.

## Files Touched
- `src/models/domain.ts` (Modified)
- `src/core/evaluation.ts` (Modified)
- `src/db/sqlite.ts` (Modified)
- `src/orchestrator/sqlite-state.ts` (Modified)
- `src/api/routes/portfolios.ts` (Modified)
- `src/api/openapi.ts` (Modified)
- `tests/overlays.test.ts` (Modified)
- `docs/decisions/0063-tax-advantaged-account-wrappers.md` (Created)
- `docs/decisions/index.md` (Modified)
