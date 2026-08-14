---
type: Iteration Log
title: Iteration Log 2026-08-14 - Corporate Actions Processor & Lot Basis Recalculation Engine
description: Implemented automated, deterministic corporate actions processing for stock splits (forward/reverse), cash dividends, and ticker mergers with mathematical tax-lot basis preservation and SQLite persistence.
tags: [iteration, corporate-actions, tax-lots, splits, dividends, mergers, basis-preservation]
timestamp: 2026-08-14T20:20:00Z
---

# Iteration Log: 2026-08-14 (Corporate Actions Processor & Tax Lot Basis Recalculation Engine)

## Theme: Live Trading Readiness & Domain Integrity – Corporate Actions Processing

### Overview
This iteration implemented an automated, deterministic corporate actions processing engine for portfolio management. The engine handles **Stock Splits** (forward and reverse), **Cash Dividends**, and **Ticker Mergers / Conversions** while strictly preserving tax-lot cost basis invariance ($Q \times C = \text{const}$) without rounding leakage.

### Key Accomplishments
1. **ADR-0060 Adoption**:
   - Recorded [ADR-0060](file:///Users/johanhellman/Projects/rebalancing-engine/docs/decisions/0060-corporate-actions-processor.md) documenting the architecture for corporate actions processing, basis preservation, and atomic database persistence.
2. **Core Corporate Actions Processor (`src/core/corporate-actions.ts`)**:
   - Defined `SplitCorporateAction`, `DividendCorporateAction`, `MergerCorporateAction`, and unified `CorporateAction` types.
   - Implemented `applyCorporateActionToPortfolio` and `applyCorporateActions`:
     - **Forward / Reverse Stock Splits**: Adjusts holding share quantities and updates each tax lot's quantity ($quantity \times ratio$) and unit cost ($unitCost \div ratio$) using exact decimal arithmetic.
     - **Cash Dividends**: Automatically credits portfolio cash ($amountPerShare \times quantity$) and appends settled `CashFlow` records.
     - **Mergers / Conversions**: Converts holdings and tax lots from original symbol to target symbol via `conversionRatio` and credits cash-in-lieu.
3. **SQLite State Persistence Integration**:
   - Extended `SqliteStateManager` in `src/orchestrator/sqlite-state.ts`:
     - Updated `registerPortfolio` and `updatePortfolio` to persist and synchronize individual `TaxLots`.
     - Added `applyCorporateAction(action: CorporateAction)` executing atomic multi-table updates (`Holdings`, `TaxLots`, `Portfolios`, `CashFlows`) across all affected accounts.
     - Updated `getAccountState` and `getStatesFilteredByTenant` to query and attach tax lots to holdings.
4. **Comprehensive Test Suite (`tests/core/corporate-actions-processor.test.ts`)**:
   - 7 unit and integration tests covering:
     - 2:1 forward split: doubles shares, halves unit cost, preserves individual lot basis.
     - 1:4 reverse split: quarter shares, quadruples unit cost, preserves individual lot basis.
     - Cash dividend crediting and cash-flow generation.
     - Mergers and stock conversions with cash in lieu.
     - Evaluation date filtering in batch processing.
     - End-to-end SQLite state persistence and reloading.

### Quality Assurance & Verification
- `npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors.
- `npm test`: 42 test suites, 298 tests passing cleanly.

### Files Touched
- `src/core/corporate-actions.ts`
- `src/core/index.ts`
- `src/services/corporate-actions.ts`
- `src/orchestrator/sqlite-state.ts`
- `tests/core/corporate-actions-processor.test.ts`
- `docs/decisions/0060-corporate-actions-processor.md`
- `docs/decisions/index.md`
- `docs/iterations/2026-08-14-corporate-actions.md`
- `docs/iterations/index.md`
- `docs/log.md`
- `BUILD_JOURNEY.md`

&copy; 2026 Johan Hellman. All rights reserved.
