---
type: Plan
title: B2B SaaS Architecture Plan
description: Detailed Domain & Architecture plan for Mandates, Multi-tenancy, and Broker Connections
tags: [plan, saas, multi-tenancy, mandates, architecture]
timestamp: 2026-06-14T20:30:00Z
---

# B2B SaaS Architecture Plan (Mandates & Multi-Tenancy)

Date: 2026-06-14
Status: DRAFT / PENDING EXECUTION

This document maps out the domain model and architecture required to transition the standalone Orchestrator into a true Enterprise SaaS multi-tenant system. It covers Mandate cohesion, Broker mapping, and Multi-tenancy scope.

## 1. Mandate Cohesion (Domain Expansion)

Currently, target weights (`TargetAllocations`) and rules (`RebalancingPolicy`) are disjointed. We need to unify them into a cohesive `Mandate`.

### The `Mandate` Entity
A `Mandate` encapsulates exactly *how* a portfolio should behave. It is a materialized, self-contained record:
- **`targetAllocation`**: Sophisticated target definitions. Beyond simple instrument weights, this may include hierarchical asset-class targets, boundary/drift tolerances per-asset, fixed-quantity lockups (for out-of-band assets), and explicit cash reserve targets.
- **`rebalancingPolicy`**: The strategy and triggers (e.g., `strategyType: 'threshold'`, `absoluteDriftTolerance: 0.05`).
- **`frictionModel`**: Constraints on trading (e.g., `maxFrictionBps`).

### Model Mandates vs Bespoke Mandates (Pub/Sub Model)
- **Model Mandate**: A generic, named mandate maintained centrally by an author (e.g., `modelId: "AGG_GROWTH"`).
- **Portfolio Subscription**: A Portfolio has a `subscriptionType` (`'discretionary'` or `'bespoke'`).
  - **Weak Coupling via Pub/Sub**: Portfolios do *not* tightly couple to a Model via a runtime SQL `JOIN`. Instead, every portfolio stores a full, materialized copy of its Mandate.
  - If `'discretionary'`, the portfolio subscribes to a `modelId`. When the author publishes a Model update, an async pub/sub job cascades the changes, explicitly overwriting the local mandate of all subscribed portfolios. This ensures a portfolio's state is fully self-contained and auditable at any point in time.
  - If `'bespoke'`, the portfolio has its own unique Mandate and ignores published model updates.
  - *(Future)* `'advised'`: Subscribes to a Model, but the pub/sub cascade generates a "proposed mandate update" requiring out-of-band client consent before mutating the portfolio's active mandate.

---

## 2. Multi-Tenancy & Broker Connections

To serve multiple B2B partners, the system must separate data and broker execution paths by Tenant.

### The `Tenant` Entity
Represents an advisory firm or partner using the SaaS.
- **`tenantId`**: Unique identifier.
- **`apiKeys`**: Scoped keys used by the Tenant to access our API securely.

### Broker Connection Mapping
Each Tenant brings their own broker relationship (or utilizes a segregated master account).
- **`TenantBrokerConfig`**: Stores the Tenant's specific broker credentials (e.g., Alpaca B2B Broker API keys).
- **`BrokerAdapter` Interface Evolution**: Must be updated to support contextual execution and asynchronous feedback.
  ```typescript
  interface BrokerAdapter {
    getPortfolioState(context: ExecutionContext): Promise<PortfolioState>;
    submitTrades(context: ExecutionContext, proposal: TradeProposal): Promise<void>;
    // Asynchronous order confirmations and fill streams
    subscribeToFills(context: ExecutionContext, callback: (fill: ExecutionFill) => void): void;
  }
  ```
  Where `ExecutionContext` contains the Tenant's broker credentials and the specific `brokerAccountId`.

---

## 3. Portfolio to Account Mapping

The Orchestrator must understand the topology of Portfolios -> Tenants -> Broker Accounts.

### The `Portfolio` Entity Evolution
The SQLite `Portfolios` table expands significantly:
- `accountId`: Our internal system ID.
- `tenantId`: The B2B partner who owns this portfolio.
- `brokerAccountId`: The external ID at the broker (e.g., Alpaca sub-account ID).
- `modelId`: Link to the Model Mandate (if `subscriptionType === 'discretionary'`).
- `subscriptionType`: The governance model.

---

## 4. Architectural Impact on the Orchestrator

Currently, the `Orchestrator` loops over all portfolios sequentially and uses a single global `AlpacaAdapter`.

### The New Evaluation Loop (Event-Driven)
Rather than a blind sequential polling loop, the Orchestrator should transition to an event-driven model:
1. **Price Event Streams**: Subscribe to live market data events (e.g., WebSockets). A price change event wakes up the Orchestrator to evaluate affected portfolios.
2. **Group by Tenant**: Group the affected portfolios by `tenantId`.
3. **Resolve Broker Adapter**: For each Tenant, retrieve the configured `BrokerAdapter` using their `TenantBrokerConfig`.
4. **Resolve Mandate**: For each Portfolio, read its self-contained, materialized Mandate from the database.
5. **Evaluate & Execute**: Pass the Mandate and the Tenant's `BrokerAdapter` context into the engine.
6. **Execution Reconciliation**: Listen to the `BrokerAdapter.subscribeToFills()` stream to asynchronously reconcile broker executions back into the local SQLite ledger.

---

## 5. Web Dashboard Impact (Tenant Portals)

The current global observability dashboard (`/web`) must evolve into a tenant-aware portal.

### Tenant Access & Scoping
- **Authentication**: The UI must support logging in as a specific `Tenant`. The frontend will hold the tenant's authentication context and append the necessary `x-api-key` or JWT to all API requests.
- **Data Isolation**: The API routes (`/api/state`, `/api/logs`) will filter responses strictly to the authenticated `tenantId`, ensuring B2B partners only see their own fleet.

### Management Capabilities
Beyond read-only observability, the dashboard must expose write capabilities for tenants:
- **Model Management**: UI to create, edit, and delete Model Mandates.
- **Portfolio Overrides**: UI to manually edit bespoke allocations for portfolios with `subscriptionType === 'bespoke'`, or to change a portfolio's subscription type.

---

## 6. Execution Slicing Strategy (MVP Approach)

To adhere strictly to our MVP "thin vertical slice" principles, we avoid building massive backend schema changes in a vacuum. Each tranche must deliver a demonstrable, verifiable increment of value—ideally visible in the Command Center.

* **Tranche 9 (Model Management UX)**: Implement the Cohesive Mandate and Model hierarchy in the database and API. Crucially, build the UI to visualize this: allow the user to create a Model in the dashboard, assign a portfolio to `discretionary` subscription, and watch the Orchestrator instantly update the portfolio's target allocations. This proves the core domain logic end-to-end.
* **Tranche 10 (SaaS Tenant Partitioning)**: Introduce the `Tenant` entity and API keys. Update the dashboard to require tenant context (e.g., a login or tenant-switcher). Prove that the UI and API strictly isolate data, so Tenant A cannot see Tenant B's portfolios, even while the engine evaluates them all concurrently in dry-run mode.
* **Tranche 11 (B2B Broker Routing)**: Finally, with the domain logic and tenant partitioning proven safely offline/dry-run, overhaul the `BrokerAdapter`. Integrate the Alpaca B2B Broker API to map internal portfolios to external sub-accounts and execute real trades contextually per tenant.

&copy; 2026 Johan Hellman. All rights reserved.
