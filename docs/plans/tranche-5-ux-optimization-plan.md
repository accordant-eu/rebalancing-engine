---
type: Plan
title: "Tranche 5: UX & Persona Optimization Roadmap"
description: "Implementation plan for transitioning the Command Center to a role-based SaaS dashboard."
timestamp: "2026-07-01T12:00:00Z"
---

# Tranche 5: UX & Persona Optimization Roadmap

This document outlines the proposed roadmap for Tranche 5, which focuses heavily on UI/UX improvements to the Command Center (`web/src/App.tsx`). The goal is to evolve the currently flat, developer-centric UI into a role-based, production-ready SaaS dashboard aligned with our established persona definitions (`docs/architecture/personas.md`).

## Architectural Decisions

- **Role Data Model:** We will implement a formal `Users` table in SQLite (`userId`, `tenantId`, `role`, `passwordHash`). This establishes true RBAC and enables Tenant Admins to manage real users, moving beyond the mocked login of previous MVP phases.
- **Design System:** We will adopt **Tailwind CSS**. This provides rapid styling capabilities essential for assembling the varied dashboard layouts required by different personas without introducing heavy JS component libraries.

---

## Proposed Roadmap (Slices)

- [ ] **Slice 0: Foundation (Tailwind & Users Table)**
  - [ ] Initialize Tailwind CSS within the `web` Vite project.
  - [ ] Add the `Users` table to `src/db/sqlite.ts` schema and update `/api/auth/login` to query real credentials.
  - [ ] Seed default persona users (Superadmin, Tenant Admin, Advisor, Compliance Officer) for immediate testing.

- [ ] **Slice 1: Persona-Specific Layouts & Navigation**
  - [ ] Physically separate the UX based on the user's logged-in persona, adhering to "Progressive Disclosure".
  - [ ] **Advisors:** Remove all Admin tabs and the docked JSONL Audit Tail. Create a clean, focused sidebar navigation.
  - [ ] **Compliance Officers:** Introduce a dedicated read-only role that defaults to a new "Audit & Compliance" view, hiding execution buttons.
  - [ ] **Tenant Admins / Superadmins:** Move system operations (Tenant Management, Global Models, Broker Integrations) into a dedicated "Settings / Administration" nested layout, rather than cluttering the primary top navigation.

- [ ] **Slice 2: The Advisor "Action Inbox" (Fleet Dashboard Revamp)**
  - [ ] Rebuild the Fleet Dashboard from a generic grid into two distinct views:
    - [ ] **Action Required Inbox:** Surfacing portfolios currently breached, halted by circuit breakers, or with pending cash deposits.
    - [ ] **Near-Misses:** Portfolios approaching drift limits.
  - [ ] Update the Detailed Portfolio View to allow Advisors to actually *edit* Bespoke target weights and drift tolerances directly via the UI, replacing the current read-only display.

- [ ] **Slice 3: Tenant Admin "Fleet Health" Insights**
  - [ ] Implement a Firm Overview dashboard featuring aggregate metrics (e.g., Donut charts for "Portfolios In-Band vs Breached", Total AUM tracked, Broker API status).
  - [ ] Allow Tenant Admins to set firm-wide defaults (e.g., default slippage, default drift tolerance) that cascade down to newly created bespoke portfolios.

- [ ] **Slice 4: The Compliance Data Explorer**
  - [ ] Remove the raw JSON text dump at the bottom of the screen.
  - [ ] Build a dedicated "Audit Explorer" route containing a searchable, paginated data table.
  - [ ] Allow filtering by `accountId`, `eventType` (e.g., THRESHOLD_BREACH, LIVE_EXECUTION), and date range, querying the new `/api/logs` SQLite backend.

- [ ] **Slice 5: Superadmin "System Pulse" (Stretch)**
  - [ ] Add live metrics to the `SystemOpsTab`: Event Bus latency, Broker API rate limit consumption gauges, and memory/CPU usage of the Node process.

---

## Verification Plan

### Automated Tests
- [ ] Extend UI unit tests (if any) or API tests to ensure Role-Based Access Control (RBAC) correctly rejects Advisor tokens attempting to access Admin endpoints (e.g., `/api/sysops`).

### Manual Verification
- [ ] Log in sequentially as `Advisor`, `Tenant Admin`, `Compliance Officer`, and `Superadmin` to verify layout isolation and capability boundaries.
