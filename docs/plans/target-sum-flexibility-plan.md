---
type: Plan
title: Target Sum Flexibility (Cash Buffers and Margin)
description: Analysis and proposed options for handling mandates with target allocations summing to < 100% (cash buffers) and > 100% (margin).
timestamp: 2026-06-17T10:00:00Z
---

# Target Sum Flexibility: Cash Buffers and Margin (Tranche C)

Treating cash as an explicit asset target (e.g., `USD`) in the mandate's target allocation causes the engine to generate raw `BUY USD` orders. Alpaca (and most brokers) reject these as invalid equity symbols, since USD is the settlement base currency. Therefore, explicitly adding `USD: 10%` to a mandate's `TargetAllocation` is a flawed approach.

We must natively solve for allocations that sum to something other than exactly 100%.

## Analysis of the Core Math

The core engine mathematics handle target sums natively with extreme elegance, though currently blocked by strict validation guardrails:

**For Sum < 100% (Cash Buffers):**
If the mandate specifies AAPL at 0.8 (80%) and no other assets:
1. `calculateTargetValue` derives the target value as `0.8 * totalPortfolioValue` (TPV).
2. The engine generates trades to bring AAPL exactly to 80% of TPV.
3. It stops trading.
4. The remaining 20% of the portfolio's value naturally sits in `state.cash` without generating any explicit "buy cash" orders.

**For Sum > 100% (Margin):**
If the mandate specifies AAPL at 1.2 (120%):
1. `calculateTargetValue` derives target as `1.2 * TPV`.
2. The engine buys AAPL until it hits 120% TPV.
3. Post-trade cash drops to `-0.2 * TPV`.
4. However, **ADR-0006** and the `simulatePostTradeValuation` logic explicitly crash the engine if negative cash is detected, to prevent unaccounted leverage.

---

## Options for Sum < 100% (Implicit Cash Buffers)

### Option 1A: Relax Validation to Allow `Sum <= 1.0`
We remove the strict `== 1.0` requirement in `validateTargetAllocation` and allow any sum between 0 and 1.0.
- **Pros:** Zero changes required to the domain schema or database. The engine's core math natively supports this today.
- **Cons:** A user might accidentally make a typo (e.g., inputting 0.08 instead of 0.8) and unwittingly leave 92% of their portfolio in cash without explicit intent. 

### Option 1B: Explicit `cashTargetWeight` property (Recommended)
We update the `TargetAllocation` schema to include an explicit `cashBuffer: number` property. The validation rule becomes `sum(targets) + cashBuffer == 1.0`.
- **Pros:** Retains the strict safety guardrail against accidental typos. Intent is mathematically explicit.
- **Cons:** Requires slight schema migration and updates to the UI, but it aligns perfectly with our ethos of explicit, deterministic validation.

---

## Options for Sum > 100% (Margin & Leverage)

### Option 2A: Native Margin Modeling
Remove ADR-0006. Allow post-trade cash to go negative. Add a `marginUtilizationLimit` to constraints.
- **Pros:** Maximum flexibility for sophisticated B2B hedge fund mandates.
- **Cons:** Massive architectural scope. It requires tracking maintenance margin, RegT margin rules, daily interest accrual, margin calls, and complex broker error handling if Alpaca rejects the leverage due to day-trading buying power limitations.

### Option 2B: Strictly Forbid Engine-Level Leverage (Recommended)
Retain ADR-0006. If the sum of target allocations + cash buffer exceeds 1.0, the validation throws an error. If clients want leverage, they must use Leveraged ETFs (e.g., TQQQ, UPRO) within the 100% allocation boundary, rather than borrowing cash directly from the broker via the engine.
- **Pros:** Keeps the engine purely focused on allocation logic, keeping it deterministic, easily auditable, and decoupled from complex credit/margin modeling.
- **Cons:** Prevents direct margin borrowing strategies.

---

## Proposed Changes (Based on Recommendations)

If we proceed with **Option 1B** and **Option 2B**, the implementation plan is as follows:

### 1. Schema & Validation
#### [MODIFY] `src/models/domain.ts`
- Update `TargetAllocation` interface to include an optional `cashBuffer?: number`.
#### [MODIFY] `src/core/drift.ts`
- Update `validateTargetAllocation` to enforce: `sum(targets) + (cashBuffer || 0) == 1.0`.

### 2. UI & User Experience
#### [MODIFY] `web/src/components/MandateBuilderForm.tsx`
- Add an explicit "Cash Buffer (%)" input field under the Target Configuration section.
- Update the client-side validation logic to check `sum(targets) + cashBuffer == 1.0`.

### 3. Tests & Scenarios
#### [MODIFY] `tests/drift.test.ts`
- Add unit tests verifying `validateTargetAllocation` succeeds with valid explicit cash buffers and fails on sums > 1.0.

> [!IMPORTANT]
> **User Review Required:** Do you agree with the recommendation to use an explicit `cashBuffer` property (Option 1B) and to continue forbidding native margin/negative cash (Option 2B)?

&copy; 2026 Johan Hellman. All rights reserved.
