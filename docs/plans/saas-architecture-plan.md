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
A `Mandate` encapsulates exactly *how* a portfolio should behave:
- **`targetAllocation`**: The desired asset weights (e.g., 60% AAPL, 40% MSFT).
- **`rebalancingPolicy`**: The strategy and triggers (e.g., `strategyType: 'threshold'`, `absoluteDriftTolerance: 0.05`).
- **`frictionModel`**: Constraints on trading (e.g., `maxFrictionBps`).

### Model Mandates vs Bespoke Mandates
- **Model Mandate**: A generic, named mandate stored in the database (e.g., `modelId: "AGG_GROWTH"`). It is maintained centrally. 
- **Portfolio Subscription**: A Portfolio has a `subscriptionType` (`'discretionary'` or `'bespoke'`).
  - If `'discretionary'`, the portfolio links to a `modelId` and strictly inherits the Model Mandate. Updating the Model instantly fans out to all subscribed portfolios.
  - If `'bespoke'`, the portfolio has its own unique, non-shared `Mandate`.
  - *(Future)* `'advised'`: Inherits from a Model but requires out-of-band client consent before trade execution.

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
- **`BrokerAdapter` Interface Evolution**: Must be updated to support contextual execution.
  ```typescript
  interface BrokerAdapter {
    getPortfolioState(context: ExecutionContext): Promise<PortfolioState>;
    submitTrades(context: ExecutionContext, proposal: TradeProposal): Promise<void>;
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

### The New Evaluation Loop
1. **Fetch Global Prices**: Retrieve market data once.
2. **Group by Tenant**: Group all active portfolios by `tenantId`.
3. **Resolve Broker Adapter**: For each Tenant, instantiate or retrieve the configured `BrokerAdapter` using their `TenantBrokerConfig`.
4. **Resolve Mandate**: For each Portfolio, fetch its Cohesive Mandate (either traversing the `modelId` or reading the bespoke mandate).
5. **Evaluate & Execute**: Pass the Mandate and the Tenant's `BrokerAdapter` context into the engine.

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

## 6. Execution Slicing Strategy

We will execute this architecture in the following sequence:

* **Tranche 9 (Data Layer & Mandates)**: Update the SQLite schema and Domain models to support Cohesive Mandates, Models, and `subscriptionType`. Prove this offline/in-memory first.
* **Tranche 10 (Multi-Tenancy)**: Introduce the `Tenant` entity, update the Express API to require Tenant-scoped authentication, and group portfolios by Tenant.
* **Tranche 11 (Broker Routing)**: Overhaul the `BrokerAdapter` to accept contextual credentials and map internal portfolios to external `brokerAccountId`s. Integrate the Alpaca B2B Broker API.

&copy; 2026 Johan Hellman. All rights reserved.
