---
type: Iteration
title: Iteration 117 - SaaS Commercial Funnel, Interactive Marketing Sandbox & White-Label Theming (Slice 6)
description: Implemented interactive public sandbox simulation, self-serve partner onboarding, dynamic white-label theming, and merged Dependabot PR #141 (ADR-0073).
timestamp: 2026-10-23T18:10:00Z
---

# Iteration 117: SaaS Commercial Funnel, Interactive Marketing Sandbox & White-Label Theming (Slice 6)

## Summary of Changes

In this iteration, we implemented **Slice 6 (SaaS Commercial Funnel & White-Label Theming)** from [v3-exploration.md §10](file:///Users/johanhellman/Projects/rebalancing-engine/docs/roadmap/v3-exploration.md#10-commercialization-funnel--white-label-theming) and merged Dependabot PR #141 (Vitest patch update), completing the self-serve partner acquisition and custom firm portal pipeline:

1. **Dependabot PR #141 Merged**:
   - Merged PR #141 (`vitest` 4.1.10 -> 4.1.11) via squash merge into `main` (`commit b1c8183ae2adb5cea056e0c5a48d79c996596989`).
   - Cleanly rebased local working tree with zero conflicts.

2. **Domain Models & SQLite Schema ([src/models/domain.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/models/domain.ts) & [src/db/sqlite.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/db/sqlite.ts))**:
   - Defined `TenantBranding` domain interface (`portalTitle?`, `logoUrl?`, `primaryColor?`, `accentColor?`, `supportEmail?`, `customCss?`).
   - Extended `Tenant` with `branding?: TenantBranding`.
   - Added migration to `Tenants` table in SQLite for `branding TEXT`.
   - Implemented `getTenantBranding(tenantId)` and `updateTenantBranding(tenantId, branding)` in `SqliteStateManager` and `State` interface.

3. **Backend API Endpoints ([src/api/server.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/api/server.ts))**:
   - `POST /api/public/sandbox/simulate`: Unauthenticated public simulator evaluating custom cash, holdings, targets, drift tolerance, slippage, and leverage against core math via `evaluateRebalance({ policy: { strategyType: 'manual' } })`. Outputs initial equity, drift reduction %, turnover rate %, friction/TCO in currency and bps, and proposed order book.
   - `POST /api/public/onboarding`: Zero-touch self-serve onboarding route. Provisions tenant partition, creates initial administrator user, generates a secure production M2M API key (`sk_live_...`), configures chosen broker adapter (`MOCK`, `ALPACA`, `IBKR`), and seeds a default 60/40 balanced growth model mandate and starter portfolio.
   - `GET /api/public/branding`: Public route for fetching tenant branding or system default.
   - `GET /api/tenant/branding` & `PUT /api/tenant/branding`: Tenant-scoped branding retrieval and update (admin-protected).
   - `GET /api/admin/tenants/:tenantId/branding` & `PUT /api/admin/tenants/:tenantId/branding`: Superadmin branding management endpoints.

4. **Frontend Components & Dynamic Theming**:
   - [web/src/components/MarketingSandboxModal.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/MarketingSandboxModal.tsx): Interactive sandbox allowing prospects to test custom portfolios, adjust slippage and drift bands, toggle leverage, and view deterministic rebalance outcomes.
   - [web/src/components/PartnerOnboardingModal.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/PartnerOnboardingModal.tsx): 3-step self-serve partner onboarding modal with slug collision prevention, initial admin password validation, execution custodian selection, color pickers, and live M2M key generation.
   - [web/src/components/SharedWorkspaceLayout.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/SharedWorkspaceLayout.tsx): Projects tenant brand name, custom logo, and injects `--tenant-primary` CSS variable for firm white-labeling across advisor, compliance, and tenant admin dashboards.
   - [web/src/components/admin/TenantManagementTab.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/admin/TenantManagementTab.tsx): Added white-label branding editing controls and visual color badges.
   - [web/src/App.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/App.tsx): Added "Live Sandbox" and "Partner Sign-Up" action cards to unauthenticated login view, pre-fills login credentials upon successful partner provisioning, and passes branding props to all persona layouts.

5. **Test Coverage & Verification**:
   - [tests/saas-commercial-funnel.test.ts](file:///Users/johanhellman/Projects/rebalancing-engine/tests/saas-commercial-funnel.test.ts): 10 backend integration tests covering sandbox math, target validation, leverage support, self-serve onboarding, slug conflict handling, password rules, and branding endpoints.
   - [web/src/commercial-funnel.test.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/commercial-funnel.test.tsx): 4 frontend unit and integration tests verifying modal interactions, onboarding flows, and CSS variable injection in layouts.
   - Verified all 50 backend test suites (402 tests) and all 4 frontend test suites (12 tests) pass cleanly.
   - Verified both backend `tsc` and frontend `vite build` compile with 0 errors.

## Decisions Made

- [ADR-0073: SaaS Commercial Funnel, Interactive Marketing Sandbox, Zero-Touch Partner Onboarding, and White-Label Theming](file:///Users/johanhellman/Projects/rebalancing-engine/docs/decisions/0073-saas-commercial-funnel-and-white-label-theming.md) (Accepted).

## Verification Results

- `npm test`: 50 test suites passed, 402 tests passed.
- `npm run --prefix web test`: 4 test suites passed, 12 tests passed.
- `npm run lint`: 0 errors, 0 warnings.
- `npm run build && npm run --prefix web build`: Clean production builds.

&copy; 2026 Johan Hellman. All rights reserved.
