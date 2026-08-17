---
type: Decision Record
title: Tax-Advantaged Account Wrappers & Policy Routing
description: Introduced TaxWrapperType to differentiate taxable from tax-exempt/tax-advantaged accounts (ISA, SIPP, IRA, 401k) and bypass unnecessary tax lockouts and harvesting overlays.
tags: [decision, architecture, tax, overlays, domain-model, compliance]
timestamp: 2026-08-17T10:30:00Z
status: Accepted
---

# ADR-0063: Tax-Advantaged Account Wrappers & Policy Routing

## Context

In multi-tenant wealth management and portfolio rebalancing, accounts operate under distinct legal tax wrappers:
1. **Taxable Accounts:** (Individual, Joint, Corporate) Subject to capital gains tax; require tax-loss harvesting (TLH) and statutory trade restrictions such as US Wash Sale rules (30-day window) and UK HMRC Bed-and-Breakfasting rules (30-day repurchase matching).
2. **Tax-Advantaged / Tax-Exempt Accounts:** (UK Individual Savings Accounts [ISA], UK Self-Invested Personal Pensions [SIPP], US Traditional IRAs, US Roth IRAs, US 401(k)s, and Tax-Exempt Endowments/Trusts). These wrappers have zero capital gains liability on trading events.

Previously, `rebalancing-engine` evaluated tax overlays and harvesting based solely on `taxJurisdiction` (e.g. `'US'` or `'UK'`). Consequently, if an advisor configured tax overlays on a tenant portfolio that represented an IRA or ISA, the engine would attempt to harvest artificial capital losses (which provide no tax benefit in an exempt account while incurring trading fees and turnover) or suppress valid rebalancing trades due to wash-sale / B&B lockouts where zero tax liability existed.

## Options Considered

### Option 1: First-Class `TaxWrapperType` on Portfolio State & Policy (Chosen)
- **Benefits:** Explicit, type-safe, domain-driven differentiation across all jurisdictions. `resolveExecutionOverlays` automatically skips tax-specific overlays (`OpportunisticLossHarvestingOverlay`, `WashSaleLockoutOverlay`, `UkBedAndBreakfastOverlay`) for tax-advantaged accounts while preserving universal mandate constraints (`ExclusionListOverlay`, `HoldingConcentrationCapOverlay`).
- **Costs:** Requires updating domain models, persistence tables, and API serializers.
- **Risks:** Low; defaults cleanly to `'TAXABLE'` for full backward compatibility.
- **Reversibility:** High.

### Option 2: Advisor-Managed Overlay Configuration per Account
- **Benefits:** No new domain types; advisors simply omit tax overlays from the `policy.executionOverlays` array.
- **Costs:** Error-prone; places the compliance burden on frontend users and B2B callers to manually orchestrate overlay combinations, risking accidental tax lockout application on tax-exempt accounts.
- **Risks:** High operational risk of misconfiguration in automated batch model fan-outs.
- **Reversibility:** Medium.

## Decision

We adopt **Option 1**:
1. Define `TaxWrapperType`:
   ```typescript
   export type TaxWrapperType =
     | 'TAXABLE'
     | 'US_TRADITIONAL_IRA'
     | 'US_ROTH_IRA'
     | 'US_401K'
     | 'UK_ISA'
     | 'UK_SIPP'
     | 'TAX_EXEMPT';
   ```
2. Implement helper `isTaxAdvantagedWrapper(wrapper?: TaxWrapperType | string): boolean`.
3. In `resolveExecutionOverlays`, conditionally apply tax overlays (`TLH`, `WashSale`, `UkBedAndBreakfast`) only when `isTaxAdvantagedWrapper` is `false`. Universal mandate constraints (`ExclusionListOverlay`, `HoldingConcentrationCapOverlay`) continue to apply to all accounts.
4. Persist `taxWrapper` in SQLite `Portfolios` table with default `'TAXABLE'`, and expose it across REST API endpoints and OpenAPI schemas.

## Rationale

- **Financial Integrity:** Eliminates spurious turnover and false-positive wash-sale trade lockouts on retirement and ISA accounts.
- **Traceability & Determinism:** Account wrapper status is immutably stamped and auditable.
- **Backward Compatibility:** All existing portfolios and fixtures without explicit wrappers default to `'TAXABLE'`.

## Implementation Impact

- **Code:**
  - `src/models/domain.ts`: Added `TaxWrapperType`, `isTaxAdvantagedWrapper`, and properties on `PortfolioState` and `RebalancingPolicy`.
  - `src/core/evaluation.ts`: Updated `resolveExecutionOverlays` and evaluation callers to respect account tax wrapper status.
  - `src/db/sqlite.ts` & `src/orchestrator/sqlite-state.ts`: Added column and state hydration for `taxWrapper`.
  - `src/api/routes/portfolios.ts` & `src/api/openapi.ts`: Exposed `taxWrapper` in GET/PUT endpoints and OpenAPI definitions.
- **Tests:**
  - `tests/overlays.test.ts`: Added test suite validating bypass of TLH and wash-sale/B&B lockouts on US/UK tax-advantaged accounts while enforcing exclusion lists and concentration caps.
- **Documentation:**
  - `docs/decisions/index.md`: Added ADR-0063.
  - `BUILD_JOURNEY.md` & `docs/log.md`: Logged decision and iteration summary.

## Follow-up

- In future tranches, surface wrapper selection in the Command Center UI model/account creation wizard.


&copy; 2026 Johan Hellman. All rights reserved.
