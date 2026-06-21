---
type: Reference
title: Live Agent Personas & RBAC
description: Definitions of the key user personas, their roles, and UI/UX needs for the Live Agent Command Center.
tags: [architecture, personas, rbac, ui]
timestamp: 2026-06-20T16:21:00Z
---

# Live Agent Personas & RBAC

This document formally defines the user personas interacting with the Live Agent Rebalancing Engine and Command Center. It serves as the source of truth for Role-Based Access Control (RBAC) and UI/UX design decisions.

## 1. System Personas

### A. Superadmin (Platform / System Ops)
* **Goal:** Ensure the engine is running smoothly, scaling across tenants, and not hitting catastrophic API limits.
* **Scope:** Universal (All Tenants).
* **Role Identifier:** `Admin` (with specific `tenantId` matching `SUPERADMIN_TENANT_ID`).
* **Key Needs:**
  * Monitor global system pulse (background worker loops, event bus latency).
  * Monitor global API health and rate limits.
  * Manage and onboard tenants.
  * Manage universal asset universe.
* **Access Level:** Unrestricted execution capability, including the "Global Kill Switch".

### B. Tenant Admin (Firm-Level Operations)
* **Goal:** Monitor the overall health of their specific advisory firm and manage integrations.
* **Scope:** Firm-wide (All portfolios inside the Tenant).
* **Role Identifier:** `Admin`
* **Key Needs:**
  * Fleet Health overview (Portfolios In-Band vs Breached).
  * Alerting for Circuit Breaker halts and API integration issues.
  * Manage users within their tenant.
  * Configure firm-wide default tolerances and Model Mandates.
* **Access Level:** Full read/write access to all portfolios and settings within their specific `tenantId`. Can assign models and reset circuit breakers globally across the firm.

### C. Portfolio Manager / Advisor (Execution)
* **Goal:** Make tactical decisions on specific portfolios and resolve drift.
* **Scope:** Assigned portfolios (or firm-wide for smaller teams).
* **Role Identifier:** `Advisor` (New role added to schema).
* **Key Needs:**
  * "Action Required" views: Portfolios with the highest drift or pending cash flows.
  * "Near-Misses" visualization (portfolios sitting at the edge of the drift tolerance).
  * Manage assignments of Model Mandates to specific accounts.
* **Access Level:** Read access to firm-wide health. Write access limited to portfolios explicitly assigned to them (or full write access for MVP if assignments are not yet mapped). Can trigger dry-runs and live rebalances, and edit bespoke target weights.

### D. Compliance Officer (Viewer)
* **Goal:** Audit trades and ensure mandates are strictly adhered to.
* **Scope:** Firm-wide (Read-only).
* **Role Identifier:** `Viewer`
* **Key Needs:**
  * Live Trade Feed (SSE stream of executed trades and threshold breaches).
  * Immutable JSONL audit trails and mandate provenance.
  * Circuit breaker status monitoring.
* **Access Level:** Strictly Read-Only. Cannot trigger trades, update mandates, or modify settings.

## 2. UI/UX Dashboard Principles

When developing or extending the Command Center dashboard (`web/src/App.tsx`), developers must respect these persona boundaries:

1. **Progressive Disclosure:** Do not overwhelm Advisors with global API rate limit stats. Conversely, do not force Superadmins to click into an individual portfolio to see system health.
2. **Action-Oriented Views:** List views should prioritize portfolios that require human intervention (e.g., Critical Drift, Halted by Circuit Breaker, Pending Cash Flows).
3. **Immutability of Audit:** Actions taken by Admins and Advisors must flow directly into the event bus and immutable JSON logs for Compliance Viewers.

&copy; 2026 Johan Hellman. All rights reserved.
