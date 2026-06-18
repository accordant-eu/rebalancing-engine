---
type: Plan
title: Sysadmin & B2B Broker Routing Plan (Tranche 11)
description: Architecture for managing tenants, global system operations, and B2B contextual broker routing
tags: [plan, sysadmin, architecture, b2b, broker]
timestamp: 2026-06-18T00:00:00Z
---

# Sysadmin & B2B Broker Routing Architecture

This document defines the architectural strategy for transitioning the Rebalancing Engine into a true multi-tenant system executing real capital contextually (Tranche 11).

## 1. System Administration (Superadmin)

Operating a B2B SaaS requires a "Superadmin" layer that governs the system independently of any specific tenant.

### 1.1 Tenant Provisioning
- **Concept**: Tenants are advisory firms using the engine. They cannot self-register. They must be provisioned via a secure out-of-band process by the Superadmin.
- **Data Model**: The `Tenants` table will be expanded to store `brokerType`, `brokerApiKey`, `brokerApiSecret`, and `brokerBaseUrl`.
- **API Boundary**: A dedicated `POST /api/admin/tenants` endpoint (secured via a Superadmin JWT or private network) will handle provisioning and credential injection.

### 1.2 System Operations & Observability
- **Circuit Breakers**: The existing `CircuitBreaker` currently monitors gross trade value. It must be updated to operate at the `tenantId` level, with a global Superadmin override capable of pausing the entire orchestration loop across all tenants (e.g., during a market flash crash).
- **Execution Queues**: The `EvaluationQueue` processes portfolios event-by-event. A Superadmin endpoint `GET /api/admin/queue` must expose the depth and latency of this queue to monitor system degradation (a precursor to scaling out to PostgreSQL).

## 2. B2B Contextual Broker Routing (Tranche 11)

Currently, `AlpacaBrokerAdapter` reads `process.env.ALPACA_BROKER_API_KEY` globally. This is fatal in a multi-tenant setup.

### 2.1 The `ExecutionContext`
The `BrokerAdapter` interface must be refactored to accept an `ExecutionContext` on every operation.

```typescript
export interface TenantBrokerConfig {
  brokerType: 'ALPACA' | 'MOCK';
  brokerApiKey: string;
  brokerApiSecret: string;
  brokerBaseUrl?: string;
}

export interface ExecutionContext {
  tenantId: string;
  brokerConfig: TenantBrokerConfig;
}
```

### 2.2 Updating the Orchestrator
During `orchestrator.onTick`:
1. Pop `accountId` from `EvaluationQueue`.
2. Load the `Portfolio` and resolve its `tenantId`.
3. Load the `Tenant` record from SQLite to retrieve the `TenantBrokerConfig`.
4. Instantiate or retrieve the appropriate `BrokerAdapter` (e.g., `AlpacaBrokerAdapter` or `MockBrokerAdapter`) initialized with the Tenant's specific credentials.
5. Execute the portfolio evaluation and pass the `ExecutionContext` to `BrokerAdapter.submitTrades`.

### 2.3 Order Execution (Alpaca B2B)
When executing a trade via Alpaca's B2B Broker API:
- The HTTP request uses the `TenantBrokerConfig` (the advisory firm's master keys) for Basic Auth.
- The payload must specify the `accountId` (the specific retail client sub-account UUID).
- To support this cleanly, the `Portfolios` table must add a `brokerAccountId` column to map our internal ID to Alpaca's sub-account ID.

### 2.4 Asynchronous Fills (Deferred Complexity)
Alpaca provides trade execution confirmations asynchronously via WebHooks or Server-Sent Events (SSE). 
For this MVP slice, we will implement a synchronous poll-based reconciliation (using `hasOpenOrders`) to guarantee safety before writing the complex WebSocket ingestion infrastructure.

## 3. SQLite Schema Updates

```sql
-- Expand Tenants Table
ALTER TABLE Tenants ADD COLUMN brokerType TEXT DEFAULT 'MOCK';
ALTER TABLE Tenants ADD COLUMN brokerApiKey TEXT;
ALTER TABLE Tenants ADD COLUMN brokerApiSecret TEXT;
ALTER TABLE Tenants ADD COLUMN brokerBaseUrl TEXT;

-- Expand Portfolios Table
ALTER TABLE Portfolios ADD COLUMN brokerAccountId TEXT;
```

&copy; 2026 Johan Hellman. All rights reserved.
