---
type: Decision Record
title: Multi-Custodian Interactive Brokers (IBKR) Adapter and Broker Factory
description: Implemented IbkrBrokerAdapter supporting Interactive Brokers Client Portal Web API / TWS Gateway and BrokerAdapterFactory for multi-custodian tenant routing.
tags: [architecture, broker, ibkr, multi-custodian, saas, multi-tenancy]
timestamp: 2026-10-23T11:00:00Z
status: Accepted
supersedes: none
---

# Multi-Custodian Interactive Brokers (IBKR) Adapter and Broker Factory

## Context

As the rebalancing engine expands into institutional wealth management and European jurisdictions ([v3-exploration.md §8](file:///Users/johanhellman/Projects/rebalancing-engine/docs/roadmap/v3-exploration.md#8-multi-tenancy--saas-architecture)), multi-tenancy requires support for multiple custodians beyond Alpaca. Specifically, wealth advisory tenants require custody and execution routing via Interactive Brokers (IBKR) using the IBKR Client Portal Web API / TWS Gateway.

Prior to this change:
- `AlpacaBrokerAdapter` was the sole live implementation of `BrokerAdapter`.
- `BrokerSyncService` and `EodReconciliationJob` hardcoded checks for `config.brokerType === 'ALPACA'` and instantiated `AlpacaBrokerAdapter` directly.
- The web UI tenant management form only allowed selecting `MOCK` or `ALPACA`.

## Options Considered

### Option 1: Hardcoded Conditional Branching in Every Service
- **Benefits:** Minimal structural refactoring.
- **Costs:** Creates tight coupling and scattered `if/else` checks across `BrokerSyncService`, `EodReconciliationJob`, and CLI runners whenever a new custodian is introduced.
- **Risks:** High probability of missing a service when adding future custodians.
- **Reversibility:** Low.

### Option 2: Dedicated `IbkrBrokerAdapter` with `BrokerAdapterFactory` (Selected)
- **Benefits:**
  - Implements standard `BrokerAdapter` interface: `getPortfolioState`, `getPrices`, `submitTrades`, `hasOpenOrders`, `getOrderStatus`.
  - Supports IBKR contract specification: translates symbols to IBKR contract IDs (conids) or exchange tickers, and handles order warning confirmation reply prompts (`/iserver/reply/{replyId}`).
  - Encapsulates adapter resolution behind `BrokerAdapterFactory.getAdapter(brokerType)`, making `BrokerSyncService` and `EodReconciliationJob` custodian-agnostic.
  - Seeds canonical IBKR conid mappings in SQLite and supports case-insensitive broker symbol resolution.
  - Exposes IBKR as a first-class custodian in the Command Center UI.
- **Costs:** Additional adapter implementation and unit tests to maintain.
- **Risks:** Low; adapters are stateless and execute per-tenant with isolated credentials.
- **Reversibility:** High.

## Decision

We chose **Option 2**. We implemented `IbkrBrokerAdapter` in [src/broker/ibkr-broker.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/broker/ibkr-broker.ts), introduced `BrokerAdapterFactory` in [src/broker/factory.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/broker/factory.ts), updated `BrokerSyncService` and `EodReconciliationJob` to resolve adapters dynamically, seeded default IBKR conids in SQLite, and added Interactive Brokers to the tenant management UI.

## Rationale

This decision aligns directly with [Rule 3 (Implementation Discipline)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#3-implementation-discipline) and [Rule 7 (Data and Domain Integrity)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#7-data-and-domain-integrity). Separating domain evaluation from custodian-specific API schemas ensures the engine core remains pure and testable across diverse institutional wealth platforms.

## Implementation Impact

- **Code:**
  - `src/broker/ibkr-broker.ts`: Implemented `IbkrBrokerAdapter` for IBKR Client Portal Web API.
  - `src/broker/factory.ts`: Introduced `BrokerAdapterFactory`.
  - `src/broker/index.ts`: Exported `IbkrBrokerAdapter` and `BrokerAdapterFactory`.
  - `src/broker/sync.ts`: Refactored `BrokerSyncService` to use `BrokerAdapterFactory` and support `ALPACA` and `IBKR`.
  - `src/services/eod-reconciliation.ts`: Enabled multi-custodian EOD reconciliation.
  - `src/models/domain.ts`: Updated `TenantBrokerConfig` with `'IBKR'`.
  - `src/db/sqlite.ts`: Added default IBKR conid mappings for baseline assets.
  - `src/orchestrator/sqlite-state.ts`: Enabled case-insensitive `brokerType` and `brokerSymbol` lookups.
  - `web/src/components/admin/TenantManagementTab.tsx`: Added Interactive Brokers (IBKR) option and credential inputs.
- **Tests:**
  - `tests/ibkr-broker.test.ts`: Added 12 tests covering portfolio state extraction, market data snapshots, trade submissions with reply confirmations, open order detection, and status mapping.
- **Documentation:**
  - Updated `docs/decisions/index.md`, `docs/log.md`, `docs/iterations/2026-10-23-multi-custodian-ibkr-adapter.md`, and `BUILD_JOURNEY.md`.

## Follow-up

- Proceed to Slice 5: Direct Margin & Leveraged Mandates ([target-sum-flexibility-plan.md](file:///Users/johanhellman/Projects/rebalancing-engine/docs/plans/target-sum-flexibility-plan.md)).


&copy; 2026 Johan Hellman. All rights reserved.
