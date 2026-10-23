---
type: Iteration
title: Iteration 116 - Direct Margin & Leveraged Mandates (Slice 5)
description: Permitted controlled negative cash and target allocations exceeding 100% on margin-enabled portfolios, bounded by initial leverage limits and maintenance margin buffers (ADR-0072).
timestamp: 2026-10-23T11:40:00Z
---

# Iteration 116: Direct Margin & Leveraged Mandates (Slice 5)

## Summary of Changes

In this iteration, we implemented **Slice 5 (Direct Margin & Leveraged Mandates)** from [v3-exploration.md §9](file:///Users/johanhellman/Projects/rebalancing-engine/docs/roadmap/v3-exploration.md#9-advanced-mandate-primitives--leverage), formally supporting leverage and direct margin borrowing while enforcing strict mathematical risk controls and maintenance margin cushions:

1. **Policy Domain Enhancements ([src/models/domain.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/models/domain.ts) & [web/src/types.ts](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/types.ts))**:
   - Added margin and leverage parameters to `RebalancingPolicy`:
     - `allowLeverage?: boolean`: Controls whether portfolio can employ margin borrowing and target $>1.0$ allocation.
     - `maxLeverageRatio?: number`: Initial leverage cap (default 2.0x / Reg T standard).
     - `maintenanceMarginRequirement?: number`: Minimum equity percentage of Gross Asset Value (GAV) (default 0.25).
     - `marginExcessBuffer?: number`: Advisory buffer above maintenance margin before triggering warnings (default 0.10).
   - Added `MARGIN_BUFFER_BREACH` to `ProposalWarning` enum for auditability.

2. **Target Allocation Validation ([src/core/drift.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/core/drift.ts))**:
   - Updated `validateTargetAllocation(target, policy?)` to validate leverage constraints.
   - For standard portfolios (`!allowLeverage`), strictly enforces the 100% sum invariant ($\sum w_i = 1.0$).
   - For leveraged mandates (`allowLeverage: true`), permits target weight sums exceeding 1.0 up to `maxLeverageRatio`, throwing an error if total allocation exceeds the configured ceiling.

3. **Trade Proposal Generation ([src/core/trades.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/core/trades.ts))**:
   - Supersedes [ADR-0006](file:///Users/johanhellman/Projects/rebalancing-engine/docs/decisions/0006-reject-negative-cash-in-trade-proposal-generation.md) strictly for margin-enabled portfolios (`allowLeverage: true`). Unleveraged accounts remain strictly protected against negative cash.
   - Computes estimated post-trade Gross Asset Value (GAV) and Net Asset Value (NAV).
   - Rejects trade proposals that would cause portfolio insolvency ($NAV \le 0$) or trigger an immediate maintenance margin call ($NAV < MMR \times GAV$).
   - Emits structured `MARGIN_BUFFER_BREACH` warning when post-trade equity drops below the excess cushion ($NAV < (MMR + \text{marginExcessBuffer}) \times GAV$).

4. **Post-Trade Simulation ([src/core/simulation.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/core/simulation.ts))**:
   - Updated `simulatePostTrade` to allow negative cash balances when `allowLeverage` is active.
   - Evaluates post-trade portfolio equity against maintenance margin requirements and enforces maintenance margin safety.

5. **API & Command Center Web UI Integration**:
   - [src/api/server.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/api/server.ts): Supported `allowLeverage`, `maxLeverageRatio`, and `marginExcessBuffer` in model creation and validation routes.
   - [web/src/components/MandateBuilderForm.tsx](file:///Users/johanhellman/Projects/rebalancing-engine/web/src/components/MandateBuilderForm.tsx): Added interactive UI controls for margin borrowing, max leverage ratio (up to 3.0x), and margin excess safety buffer percentage.

6. **Architectural Decision Record**:
   - Recorded **[ADR-0072: Direct Margin and Leveraged Mandates with Maintenance Buffer Constraints](file:///Users/johanhellman/Projects/rebalancing-engine/docs/decisions/0072-direct-margin-and-leveraged-mandates.md)**.

## Verification & Testing

- Added `tests/margin-leverage.test.ts` covering 9 comprehensive test scenarios:
  - Standard policy rejecting $>1.0$ weight sums.
  - Leveraged policy accepting $>1.0$ weight sums up to `maxLeverageRatio`.
  - Rejection of target allocations exceeding `maxLeverageRatio`.
  - Non-leveraged proposal rejecting negative cash (retaining ADR-0006 protection).
  - Leveraged proposal permitting negative cash (borrowing) to achieve leveraged target.
  - Rejection of proposals triggering immediate maintenance margin calls.
  - Emission of `MARGIN_BUFFER_BREACH` proposal warnings when buffer is breached.
  - Correct simulation of post-trade negative cash and margin equity in `simulatePostTrade`.
  - End-to-end evaluation via `evaluateRebalance` generating leveraged proposals.
- Full test suites: 49 backend test suites (392 tests) and 3 web test suites (8 tests) passing 100% green.
- ESLint: 0 warnings, 0 errors.
- Build: Both backend and frontend production bundles compiled cleanly.

&copy; 2026 Johan Hellman. All rights reserved.
