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

## Proposed Roadmap (Vertical MVP Slices)

*Instead of horizontal technical layers (e.g., doing all layouts first, then all data), we will build end-to-end vertical slices focused on delivering immediate value to one persona at a time.*

- [ ] **Slice 1: The Advisor Workspace MVP (Highest Value)**
  - *Goal:* Deliver a focused, distraction-free environment for the person actually managing the portfolios.
  - Initialize Tailwind CSS (technical enabler).
  - Implement the `Users` table and wire up a real `Advisor` login.
  - Build the Advisor Layout (sidebar, no sysadmin tabs).
  - Build the "Action Required" Inbox (surfacing portfolios that are breached or halted).

- [ ] **Slice 2: The Compliance Explorer MVP**
  - *Goal:* Deliver immediate auditability to the Compliance Officer.
  - Wire up a real `Compliance` login (read-only RBAC).
  - Build the dedicated "Audit & Compliance" view with a searchable data table querying the existing SQLite `/api/logs`.
  - Remove the global JSONL text dump from the bottom of the app.

- [ ] **Slice 3: The Tenant Admin MVP**
  - *Goal:* Allow firm owners to see fleet health and manage their users.
  - Wire up a real `Tenant Admin` login.
  - Build the Firm Overview dashboard (aggregate metrics like "Portfolios In-Band vs Breached").
  - Add basic User Management UI so they can provision new Advisors.

- [ ] **Slice 4: Superadmin Pulse & Settings (Stretch)**
  - *Goal:* Clean up the platform owner's view.
  - Consolidate Global Models, Asset Universe, and Broker Integrations into a clean Settings layout.
  - Add live metrics to the System Ops tab (Event Bus latency, API rate limits).

---

## Verification Plan

### Automated Tests
- [ ] Extend UI unit tests (if any) or API tests to ensure Role-Based Access Control (RBAC) correctly rejects Advisor tokens attempting to access Admin endpoints (e.g., `/api/sysops`).

### Manual Verification
- [ ] Log in sequentially as `Advisor`, `Tenant Admin`, `Compliance Officer`, and `Superadmin` to verify layout isolation and capability boundaries.
