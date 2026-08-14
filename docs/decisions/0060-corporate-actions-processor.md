---
type: Decision Record
title: Corporate Actions Processing and Tax Lot Basis Recalculation Engine
description: Implement automated, deterministic corporate actions processing for stock splits, cash dividends, and mergers with tax-lot basis preservation and SQLite state synchronization.
tags: [architecture, corporate-actions, tax-lots, splits, dividends]
timestamp: 2026-08-14T20:17:00Z
status: Accepted
---

# Corporate Actions Processing and Tax Lot Basis Recalculation Engine

## Context

In an autonomous live rebalancing engine, unannounced or unprocessed corporate actions (such as forward/reverse stock splits, cash dividends, and ticker mergers) introduce catastrophic drift estimation errors:
- If a 4-for-1 forward stock split occurs and the market price drops by 75% on the ex-date before the broker share position is updated, the engine perceives the holding as severely underweight and generates massive erroneous BUY orders.
- While ADR-0085 established a pre-trade circuit breaker (`CorporateActionCircuitBreaker`) to pause trading on ex-dates, the engine previously lacked an automated mechanism to process corporate actions into `PortfolioState` and adjust tax-lot cost bases.

## Options Considered

### Option 1: Rely entirely on EOD Broker Reconciliation to catch split adjustments
- **Benefits:** Minimal new code.
- **Costs:** Creates a full trading day lag where accounts are locked or out of sync; does not update tax lot historical basis accurately if the broker only provides aggregated positions.
- **Risks:** High operational friction and missed trading opportunities.
- **Reversibility:** High.

### Option 2: Dedicated Core Corporate Actions Engine with Basis Preservation (Chosen)
- **Benefits:**
  - **Mathematical Basis Invariance**: When a forward or reverse split occurs, each tax lot's quantity and unit cost are adjusted ($quantity \times ratio$, $unitCost \div ratio$), ensuring the aggregate cost basis ($Q \times C$) is strictly preserved.
  - **Cash Dividend Processing**: Automatically credits cash distributions to portfolio cash on payment dates and logs settled cash-flow events.
  - **Ticker Mergers / Conversions**: Converts holdings and lots to target tickers with conversion ratios and cash-in-lieu handling.
  - **Atomic Persistence**: Updates `Holdings`, `TaxLots`, and `Cash` in SQLite state in a single transaction.
- **Costs:** Requires adding corporate action domain types and a dedicated core processing module.
- **Risks:** Low; pure deterministic logic.
- **Reversibility:** High.

## Decision

We adopt **Option 2**:
1. Implement `src/core/corporate-actions.ts` providing `applyCorporateActionToPortfolio` and `applyCorporateActions`.
2. Support `SPLIT`, `DIVIDEND` / `CASH_DIVIDEND`, and `MERGER` action types.
3. Integrate processing with `SqliteStateManager` to atomically persist adjusted positions and lots.
4. Enhance `CorporateActionService` to coordinate circuit breaking and execution.

## Implementation Impact

- **Code:**
  - `src/core/corporate-actions.ts`: Core processing logic and basis calculations.
  - `src/core/index.ts`: Export corporate action utilities.
  - `src/services/corporate-actions.ts`: Extended service with processor integration.
  - `src/orchestrator/sqlite-state.ts`: Add `applyCorporateAction` database transaction.
- **Tests:** Add `tests/core/corporate-actions-processor.test.ts` covering splits, dividends, mergers, basis invariance, and SQLite persistence.
- **Documentation:** Register ADR-0060 in `docs/decisions/index.md` and log iteration in `BUILD_JOURNEY.md`.

## Follow-up

- Ingest live corporate actions feeds from broker webhooks/APIs alongside mock seeding.

&copy; 2026 Johan Hellman. All rights reserved.
