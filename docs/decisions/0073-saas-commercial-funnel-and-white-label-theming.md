---
type: Decision Record
title: SaaS Commercial Funnel, Interactive Marketing Sandbox, Zero-Touch Partner Onboarding, and White-Label Theming
description: Implements zero-touch self-serve onboarding, public sandbox rebalance simulation, and customizable white-label branding per tenant.
tags: [commercial, saas, onboarding, sandbox, theming, white-label, v3]
timestamp: 2026-10-23T18:05:00Z
status: Accepted
---

# SaaS Commercial Funnel, Interactive Marketing Sandbox, Zero-Touch Partner Onboarding, and White-Label Theming

## Context

Per the commercialization strategy in `docs/roadmap/v3-exploration.md §10`, the Accordant B2B Rebalancing Engine needed a frictionless commercial adoption funnel to convert prospective institutional partners (wealth managers, fintechs, family offices) into active tenants.

Prior to Slice 6, provisioning a new tenant required manual database interventions or superadmin API operations. Prospective partners had no way to test the deterministic core engine with custom cash/holdings/targets without acquiring live API credentials or signing an enterprise contract. Furthermore, enterprise wealth managers require their own branded client portal (portal title, brand logos, custom CSS primary and accent color schemes) to present the advisor desk under their firm identity.

## Options Considered

### Option 1: External Static Landing Page with Mocked Calculator
- **Benefits:** Fast to assemble; decouples marketing site from core engine code.
- **Costs:** Creates divergence between the marketing calculator and the true mathematical core (`evaluateRebalance`, TCO friction models, drift bands); requires duplicate maintenance.
- **Risks:** Prospects see results that do not reflect actual engine execution.
- **Reversibility:** High.

### Option 2: Native Unauthenticated Commercial Funnel & Core-Backed Sandbox (Chosen)
- **Benefits:**
  - Evaluates live simulations against the canonical domain mathematical invariants using `evaluateRebalance({ policy: { strategyType: 'manual' } })`.
  - Provides zero-touch self-serve onboarding (`POST /api/public/onboarding`) generating the tenant partition, initial admin account, default 60/40 model, initial portfolio, and production M2M API key (`sk_live_...`).
  - Supports white-label portal theming (`TenantBranding`) stored in SQLite and projected into `SharedWorkspaceLayout` via dynamic CSS properties (`--tenant-primary`) and brand banners.
  - Keeps all domain logic deterministic and fully tested across backend and browser UI.
- **Costs:** Requires whitelisting public marketing endpoints (`/api/public/sandbox/simulate`, `/api/public/onboarding`, `/api/public/branding`) in the API server before JWT authentication checks.
- **Risks:** Public endpoints could experience spam; mitigated by strict input validation, length constraints, and slug collision prevention.
- **Reversibility:** High.

## Decision

We chose **Option 2**. We implement:
1. **Public Sandbox Simulation**: `POST /api/public/sandbox/simulate` accepts arbitrary cash, holdings, targets, drift tolerance, slippage, and leverage flags, evaluating them against pure domain math with comprehensive KPI outputs (initial equity, drift reduction %, turnover rate %, friction/TCO).
2. **Zero-Touch Self-Serve Onboarding**: `POST /api/public/onboarding` creates the tenant, seeds an admin user, generates a secure M2M API key (`sk_live_...`), and initializes a baseline mandate.
3. **White-Label Portal Theming**: `TenantBranding` persisted in SQLite `Tenants` table (`branding` column) with public query (`GET /api/public/branding`), tenant-scoped updates (`GET/PUT /api/tenant/branding`), and superadmin management (`GET/PUT /api/admin/tenants/:tenantId/branding`). Dynamic theming is applied to `SharedWorkspaceLayout` via `--tenant-primary` and brand headers.
4. **Interactive UI Modals**: `MarketingSandboxModal` and `PartnerOnboardingModal` wired directly into `App.tsx` on the unauthenticated login screen.

## Rationale

This directly closes the commercial gap outlined in the V3 roadmap without introducing external dependencies or drift between marketing promises and actual engine behavior. Prospects immediately witness the speed, determinism, and TCO optimization of the engine in the sandbox and can onboard in seconds.

## Implementation Impact

- **Code:**
  - [src/models/domain.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/models/domain.ts): Added `TenantBranding` interface and updated `Tenant` model.
  - [src/db/sqlite.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/db/sqlite.ts): Added `branding TEXT` column migration to SQLite schema.
  - [src/orchestrator/state.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/orchestrator/state.ts) & [src/orchestrator/sqlite-state.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/orchestrator/sqlite-state.ts): Added `getTenantBranding` and `updateTenantBranding`.
  - [src/api/server.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/api/server.ts): Added public sandbox, self-serve onboarding, and tenant branding REST routes.
  - [web/src/types.ts](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/types.ts): Added `TenantBranding` and updated `Tenant`.
  - [web/src/components/MarketingSandboxModal.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/MarketingSandboxModal.tsx): Interactive marketing sandbox modal.
  - [web/src/components/PartnerOnboardingModal.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/PartnerOnboardingModal.tsx): Self-serve partner onboarding modal.
  - [web/src/components/SharedWorkspaceLayout.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/SharedWorkspaceLayout.tsx): Dynamic white-label layout theming.
  - [web/src/App.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/App.tsx): Commercial funnel exploration buttons, branding integration, and layout wiring.
- **Tests:**
  - [tests/saas-commercial-funnel.test.ts](file:///Users/johanhellman/Projects/rebalancing-engine/tests/saas-commercial-funnel.test.ts): 10 backend integration tests covering simulation, validation, leverage, self-serve signup, collision rejection, and branding endpoints.
  - [web/src/commercial-funnel.test.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/commercial-funnel.test.tsx): 4 frontend unit and integration tests verifying modal interactions and theming.

## Follow-up

1. Operator handoff when deploying to staging/production.
2. In future tranches, integrate optional automated billing (Stripe Connect) and domain CNAME mapping for custom white-label hostnames.

&copy; 2026 Johan Hellman. All rights reserved.
