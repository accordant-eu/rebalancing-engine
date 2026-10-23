---
type: Decision Record
title: Direct Margin and Leveraged Mandates with Maintenance Buffer Constraints
description: Permitted controlled negative cash and target allocations exceeding 100% on margin-enabled portfolios, bounded by initial leverage limits and maintenance margin buffers, superseding ADR-0006 for margin accounts.
tags: [architecture, margin, leverage, mandate, risk-management, simulation]
timestamp: 2026-10-23T11:30:00Z
status: Accepted
supersedes: ADR-0006 (for margin-enabled portfolios)
---

# Direct Margin and Leveraged Mandates with Maintenance Buffer Constraints

## Context

In standard wealth management models, portfolios are unleveraged cash accounts where the target allocation weights sum to exactly 1.0 (100%) and trade proposals strictly prohibit negative cash balances, as codified in [ADR-0006](0006-reject-negative-cash-in-trade-proposal-generation.md).

However, modern institutional advisory mandates and active wealth strategies frequently deploy direct margin borrowing or leveraged benchmark tracking (e.g., 1.5x - 2.0x long equity mandates, cash deficit financing for liquidity management, and hedge strategies). As outlined in [v3-exploration.md §9](file:///Users/johanhellman/Projects/rebalancing-engine/docs/roadmap/v3-exploration.md#9-advanced-mandate-primitives--leverage), the engine requires formal support for leveraged mandates while preserving strict domain safeguards:
1. Standard accounts must remain strictly unleveraged (sum of weights = 1.0, non-negative cash invariant).
2. Leveraged mandates must enforce regulatory and mandate-specific initial leverage caps (e.g. Reg T maximum of 2.0x / 200%).
3. Proposal generation and post-trade simulation must prevent immediate margin calls and enforce maintenance margin thresholds ($NAV \ge MMR \times GAV$, typically 25%).
4. The system must emit proactive margin warnings (`MARGIN_BUFFER_BREACH`) when post-trade equity approaches maintenance requirements within an advisory buffer (e.g. 10% excess cushion).

## Options Considered

### Option 1: Implicit / Unconstrained Negative Cash Allowance
- **Benefits:** Minimal validation changes; simply remove the negative cash checks.
- **Costs:** Completely breaks the domain invariant for cash accounts, risks catastrophic portfolio liquidation, provides zero safety bounds on leverage, and violates [Rule 7 (Data and Domain Integrity)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#7-data-and-domain-integrity).
- **Risks:** Unacceptable risk of insolvent trade recommendations.
- **Reversibility:** Low.

### Option 2: Isolated Derivative / Synthetic Overlay Layer
- **Benefits:** Keeps the cash core untouched by handling leverage entirely through synthetic instruments or swaps.
- **Costs:** High architectural complexity; does not satisfy direct cash-borrowing margin mandates common with custodians like Interactive Brokers.
- **Risks:** Premature abstraction for straightforward direct margin accounts.
- **Reversibility:** Medium.

### Option 3: Explicit Policy-Gated Margin & Maintenance Margin Invariants (Selected)
- **Benefits:**
  - Extends `RebalancingPolicy` with `allowLeverage?: boolean`, `maxLeverageRatio?: number` (default 2.0), `maintenanceMarginRequirement?: number` (default 0.25), and `marginExcessBuffer?: number` (default 0.10).
  - Target allocation validation (`validateTargetAllocation`) accepts `policy`: enforces $\sum w_i = 1.0$ for standard portfolios, and permits $\sum w_i \in (1.0, \text{maxLeverageRatio}]$ when `allowLeverage` is true.
  - Trade generation (`generateTradeProposal`) and simulation (`simulatePostTrade`) evaluate post-trade solvency ($NAV > 0$) and maintenance margin equity ($NAV \ge MMR \times GAV$).
  - Rejects proposals that would induce an immediate margin call ($NAV < MMR \times GAV$).
  - Emits structured proposal warning `MARGIN_BUFFER_BREACH` when post-trade equity fails to maintain the safety buffer ($NAV < (MMR + \text{marginExcessBuffer}) \times GAV$).
  - Fully backward compatible: existing standard mandates remain protected by ADR-0006's cash non-negativity check.
- **Costs:** Moderate additions to trade generator and simulation validation logic.
- **Risks:** Low; explicit policy opt-in ensures no accidental leverage.
- **Reversibility:** High.

## Decision

We chose **Option 3**. We updated `RebalancingPolicy` to support explicit leverage configuration, enhanced target allocation validation to allow controlled leverage up to `maxLeverageRatio`, adapted `generateTradeProposal` and `simulatePostTrade` to manage margin balances, maintenance margin requirements, and buffer breach warnings, updated the REST API schemas, and exposed leverage parameters in the Command Center Mandate Builder UI.

This decision supersedes [ADR-0006](0006-reject-negative-cash-in-trade-proposal-generation.md) strictly when `policy.allowLeverage === true`. For all unleveraged portfolios, ADR-0006 remains in full effect.

## Rationale

This approach strictly adheres to [Rule 2 (Decision Discipline)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#2-decision-discipline) and [Rule 7 (Data and Domain Integrity)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#7-data-and-domain-integrity). It treats financial risk intentionally, provides mathematical precision for solvency and maintenance margin calculations, and offers clear, deterministic auditability via structured proposal warnings.

## Implementation Impact

- **Core Models:**
  - `src/models/domain.ts` & `web/src/types.ts`: Added `allowLeverage`, `maxLeverageRatio`, `maintenanceMarginRequirement`, `marginExcessBuffer` to `RebalancingPolicy`. Added `MARGIN_BUFFER_BREACH` to `ProposalWarning`.
- **Domain Logic:**
  - `src/core/drift.ts`: `validateTargetAllocation` validates target weight sums against policy leverage settings.
  - `src/core/trades.ts`: `generateTradeProposal` permits controlled negative cash under `allowLeverage`, calculates post-trade GAV and NAV, enforces maintenance margin solvency, and emits `MARGIN_BUFFER_BREACH` warnings.
  - `src/core/simulation.ts`: `simulatePostTrade` supports negative cash when enabled and enforces maintenance margin safety.
- **API & UI:**
  - `src/api/server.ts`: Added margin policy fields to model creation/validation schema.
  - `web/src/components/MandateBuilderForm.tsx`: Added UI controls for leverage toggle, maximum leverage ratio, and margin excess buffer.
- **Tests:**
  - `tests/margin-leverage.test.ts`: Added 9 unit and integration tests covering allocation validation, trade generation, margin call rejection, buffer warning emission, simulation, and end-to-end evaluation.

## Validation

All 49 backend test suites (392 tests), 3 web test suites (8 tests), type checking (`tsc`), and production builds passed with 0 errors and 0 lint warnings.

&copy; 2026 Johan Hellman. All rights reserved.
