---
type: Iteration
title: Iteration 115 - Multi-Custodian Interactive Brokers (IBKR) Adapter & Broker Factory (Slice 4)
description: Implemented IbkrBrokerAdapter, BrokerAdapterFactory, multi-custodian sync, SQLite symbol mappings, and UI support for Interactive Brokers.
timestamp: 2026-10-23T11:05:00Z
---

# Iteration 115: Multi-Custodian Interactive Brokers (IBKR) Adapter & Broker Factory (Slice 4)

## Summary of Changes

In this iteration, we implemented **Slice 4 (Multi-Custodian Broker Adapters)** to support Interactive Brokers (IBKR) alongside Alpaca and Mock brokers:

1. **`IbkrBrokerAdapter` Implementation ([src/broker/ibkr-broker.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/broker/ibkr-broker.ts))**:
   - Implements full `BrokerAdapter` interface targeting the IBKR Client Portal Web API / TWS Gateway.
   - **Positions & Cash**: Queries `/portfolio/{accountId}/summary` (settled cash / total cash value) and `/portfolio/{accountId}/positions/0`. Maps positions using contract IDs (`conid`) or tickers and invokes `translateBrokerSymbolToInstrumentId`.
   - **Market Data Snapshots**: Queries `/iserver/marketdata/snapshot?conids={conids}&fields=31,84,86` extracting last price (field 31) with fallback to bid/ask midpoint.
   - **Trade Submissions**: Submits orders to `/iserver/account/{accountId}/orders` using conids or STK tickers; automatically confirms pre-order warning prompts via `/iserver/reply/{replyId}`.
   - **Order Tracking**: Queries `/iserver/account/orders` for active pending order states (`Submitted`, `PreSubmitted`, `PendingSubmit`, `PendingCancel`) and `/iserver/account/order/status/{orderId}` mapping IBKR statuses to canonical internal statuses.
   - **Telemetry**: Records per-tenant latency and rate limit error metrics via `globalMetrics`.

2. **`BrokerAdapterFactory` ([src/broker/factory.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/broker/factory.ts))**:
   - Encapsulates adapter instantiation dynamically by broker type (`IBKR`, `ALPACA`, `MOCK`).
   - Exported from [src/broker/index.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/broker/index.ts).

3. **Multi-Custodian Service Integration**:
   - **`BrokerSyncService` ([src/broker/sync.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/broker/sync.ts))**: Updated to resolve `BrokerAdapter` instances dynamically via `BrokerAdapterFactory` for both `ALPACA` and `IBKR` tenants.
   - **`EodReconciliationJob` ([src/services/eod-reconciliation.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/services/eod-reconciliation.ts))**: Reconciles holdings against the appropriate custodian adapter per tenant.

4. **Domain & Database Enhancements**:
   - Updated `TenantBrokerConfig` in [src/models/domain.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/models/domain.ts) to explicitly include `'IBKR'`.
   - Seeded baseline IBKR contract IDs (`265598` for AAPL, `272093` for MSFT, `208813719` for GOOG) in [src/db/sqlite.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/db/sqlite.ts).
   - Enabled case-insensitive lookups for `brokerType` and `brokerSymbol` in [src/orchestrator/sqlite-state.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/orchestrator/sqlite-state.ts).

5. **Tenant Management UI ([web/src/components/admin/TenantManagementTab.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/admin/TenantManagementTab.tsx))**:
   - Added Interactive Brokers (IBKR) as a selectable custodian.
   - Tailored form placeholders and credentials for gateway tokens and base URLs.

6. **Architectural Record**:
   - Recorded **[ADR-0071](file:///Users/johanhellman/Projects/rebalancing-engine/docs/decisions/0071-multi-custodian-interactive-brokers-adapter.md)**.

## Verification

- `npx jest tests/ibkr-broker.test.ts`: All 12 unit tests passed.
- `npm test`: All 48 test suites (383 tests) passed.
- `npm run --prefix web test`: All 3 web test suites (8 tests) passed.
- `npm run lint`: 0 errors, 0 warnings.
- `npm run build`: `tsc` compiled cleanly.
- `npm run --prefix web build`: Vite bundle built cleanly.


&copy; 2026 Johan Hellman. All rights reserved.
