---
type: PRD
title: Rebalancing Engine Cash Flows Prd
description: Documentation for rebalancing engine cash flows prd
tags: [prd]
timestamp: 2026-06-14T00:00:00Z
---

# Cash Flows PRD

Date: 2026-05-02

Implementation status: Complete for the selected offline cash-flow foundations scope.

## 1. Background

The completed MVP and deferred-capabilities increment support positive cash as part of portfolio state, but cash movement is implicit. Deposits, withdrawals, and pending flows are not modeled explicitly. Negative cash was previously rejected during proposal generation because there was no explicit withdrawal/deficit funding policy.

## 2. Selected Scope

Selected increment: practical cash-flow foundations.

Included:

- Optional explicit cash-flow records on `PortfolioState`.
- Settled deposits increase available cash before valuation and proposal generation.
- Settled withdrawals reduce available cash before valuation and proposal generation.
- Withdrawal-created cash deficits can be funded by sells through the existing target-reset proposal math.
- Pending cash flows are visible but excluded from valuation and proposal generation.
- Audit/explanation/test/fixture updates for settled and pending flows.

Excluded:

- Scheduled future cash-flow engine.
- Recurring cash-flow generation.
- Household or multi-account cash routing.
- Tax-lot-aware withdrawal funding.
- Optimized sell selection.
- External payment, banking, custody, or execution integrations.

## 3. Decision

Decision: Model explicit offline cash flows as portfolio-state adjustments.

Status: Accepted for this increment.

Context:
The engine already includes `cash` in valuation and can generate cash-aware buys/sells. The missing capability is traceable cash-flow intent. A small increment should add explicit inputs and deterministic semantics without building a banking workflow.

Options considered:

1. Keep only scalar `cash`.
   - Benefits: No code change.
   - Costs: Deposits and withdrawals remain implicit and unauditable.
   - Risks: Users cannot distinguish ordinary cash from flow-driven cash.

2. Add optional cash-flow records to `PortfolioState` and apply settled flows before valuation.
   - Benefits: Small, traceable, deterministic, and compatible with existing valuation/proposal flow.
   - Costs: Assumes `cash` is pre-flow cash when `cashFlows` are supplied.
   - Risks: Callers must avoid double-counting settled flows already reflected in `cash`.

3. Add a separate cash-flow orchestration service.
   - Benefits: Cleaner long-term workflow boundary.
   - Costs: Premature service abstraction for offline fixture scope.
   - Risks: Overbuilds before scheduled/live flow requirements exist.

Preferred option:
Option 2.

Rationale:
This is the smallest useful workflow increment. It makes cash movement explicit and auditable while reusing existing deterministic valuation, proposal, simulation, explanation, and runner paths.

## 4. Functional Requirements

- `PortfolioState.cashFlows` is optional and backward compatible.
- Each cash flow has an ID, direction, amount, status, and optional description/effective date.
- Supported directions are `DEPOSIT` and `WITHDRAWAL`.
- Supported statuses are `SETTLED` and `PENDING`.
- Amounts must be positive.
- Settled deposits increase valuation cash.
- Settled withdrawals decrease valuation cash.
- Pending flows do not affect valuation, trigger, or trade proposal sizing.
- Pending flows must be visible in valuation summary and audit/explanation output.
- If settled withdrawals produce negative available cash, trade proposal generation may sell assets to fund the deficit.
- Raw negative cash without explicit cash-flow context remains invalid for proposal generation.
- If cash flows exceed total portfolio value, valuation must fail explicitly.

## 5. Non-Functional Requirements

- Deterministic output for identical inputs.
- Backward compatibility for fixtures without `cashFlows`.
- Explicit validation over silent fallback behavior.
- No live integrations or banking APIs.
- No tax-specific sell selection.

## 6. Acceptance Criteria

- Existing tests and fixtures continue passing.
- Settled deposit fixture deploys deposit cash deterministically.
- Settled withdrawal fixture funds withdrawal with sells.
- Pending flow fixture excludes pending cash from valuation/proposals and surfaces it in explanation/audit metadata.
- Invalid negative/zero cash-flow amount fails explicitly.
- Full tests, build, lint, scenario runner, manifest validation, and format pass.

## 7. Risks

- Settled flows may be double-counted if upstream already includes them in `cash`.
- Withdrawal funding currently uses target-reset math, not tax-aware or optimizer-aware sell selection.
- Pending-flow semantics are intentionally conservative and may need expansion later.

## 8. Open Questions

- Should a future API use a separate request-level `cashFlows` object instead of embedding flows on `PortfolioState`?
- Should scheduled flows be generated from recurrence rules or supplied as explicit pending/settled events?
- Should withdrawals later support sell priority, tax-lot selection, or cash-only partial funding policies?
