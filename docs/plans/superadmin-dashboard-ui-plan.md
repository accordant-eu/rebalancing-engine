---
type: Plan
title: Superadmin Dashboard & B2B Provisioning UI Plan
description: Detailed design for exposing the Sysadmin Phase 1 architecture via the web dashboard.
tags: [plan, sysadmin, ui, dashboard, architecture]
timestamp: 2026-06-18T13:42:00Z
---

# Superadmin Dashboard & B2B Provisioning Plan

This plan wraps up Tranche 11 (Sysadmin & B2B Routing) by exposing the newly created architecture via the Superadmin Command Center UI.

## Goal Description

We have implemented multi-tenant broker routing at the database and adapter layer, but currently there is no way for a system administrator to actually provision these tenants, input their API keys, or monitor the orchestrator queue without writing raw SQL. 

This plan details the implementation of the "Superadmin Shell" outlined in Phase 1 of the sysadmin architecture plan (`docs/plans/sysadmin-and-b2b-routing-plan.md`).

## Open Questions for Discussion

1. **Credentials Storage**: Since we are still using SQLite for this iteration, `brokerApiSecret` will be stored in plain text in the database. When we migrate to PostgreSQL (Tranche 12), we should encrypt these credentials at rest. Is storing them in plain text for this local MVP phase acceptable?
2. **Aesthetics**: Do you have any specific design preferences for the System Operations "Pause" button, or should it follow the premium dark-mode aesthetic we currently have?

## Proposed Architecture

### 1. API Layer
We will add a suite of `/api/admin/*` endpoints to the Express server, restricted to the `superadmin` token.

- `GET /api/admin/tenants`: Returns all tenants (masking the API secrets).
- `POST /api/admin/tenants`: Provisions a new tenant, accepting `tenantId`, `name`, `brokerType`, `brokerApiKey`, `brokerApiSecret`, and `brokerBaseUrl`.
- `GET /api/admin/queue`: Returns the current size of the `EvaluationQueue`.
- `POST /api/admin/system/pause` and `POST /api/admin/system/resume`: Toggles a global pause flag on the orchestrator.

### 2. Orchestrator Engine Modifications
To support a global circuit-breaker/pause functionality:
- Add a global `isPaused: boolean` property to the `Orchestrator` class.
- If `isPaused` is true, `onTick` will immediately return without popping from the queue.
- Expose `pause()` and `resume()` methods on the `Orchestrator`.
- Expose a raw query helper in `sqlite-state.ts` to count `EvaluationQueue` rows for the admin endpoint.

### 3. Web Dashboard (React/Vite)
Modify `/web/src/App.tsx` and create new components for the `superadmin` view:

- Add secondary navigation tabs when `tenantToken === 'superadmin'`: 
  - **Fleet View**: The existing multi-tenant heatmap.
  - **Tenant Management**: A new tab for provisioning and managing tenants.
  - **Broker Integration Management**: A dedicated interface for monitoring system-level broker integrations and health.
  - **Rebalancing Models Management**: A global view to manage all investment mandates and models.
  - **System Ops**: A new tab for observability and emergency circuit breaking.

#### Module Details
- **`TenantManagementTab` Component**: 
  - A data table listing all provisioned tenants.
  - Controls to create new tenants, configure their specific B2B routing keys (API Key, Secret, Base URL, mapped broker type), and suspend or activate them.
  - **User Access Management**: Controls to provision individual user accounts (e.g., financial advisors) mapped to specific `tenantId`s, handle their RBAC roles (Admin vs Viewer), and reset their mock-JWT credentials.
- **`BrokerIntegrationTab` Component**:
  - A global view of active broker plugins available to the system (e.g., `ALPACA`, `MOCK`).
  - High-level system statistics such as API call volumes, webhook health, and rate limit monitoring across the fleet.
- **`RebalancingModelsTab` Component**:
  - **Global Mandate Library**: Expose the existing `MandateBuilderForm` at the global level to define "Baseline" models that any tenant can subscribe to, or to inspect bespoke tenant models.
  - **Archetype Configuration Engine**: A dedicated sub-section to expose and manage advanced dynamic strategy parameters (e.g., Static Weights, Efficient Frontier / MPT, VaR Rebalancing, Black-Litterman) as detailed in the exploration plans.
- **`SystemOpsTab` Component**: 
  - A real-time display of the `EvaluationQueue` depth.
  - A master "Pause Orchestrator" / "Resume Orchestrator" toggle switch to act as a global circuit breaker.

## Verification Plan

- Run `npm test` to ensure existing paths are unbroken.
- Log into the dashboard as "System Superadmin".
- Provision a new tenant via the UI with mock broker keys.
- Check the SQLite database to confirm the keys were persisted to the `Tenants` table correctly.
- Trigger an evaluation loop and verify the "System Ops" tab shows queue activity.
- Hit the "Pause Orchestrator" button and verify the queue stops draining.
