---
type: PRD
title: Rebalancing Engine Tax Lots Prd
description: Documentation for rebalancing engine tax lots prd
tags: [prd]
timestamp: 2026-06-14T00:00:00Z
---

# Tax Lot Foundations PRD

Date: 2026-05-02

Implementation status: Complete for the selected generic tax-lot foundations scope.

## 1. Background

The engine now supports deterministic valuation, strategy selection, boundary targeting, numeric policy, and explicit offline cash flows. Sell trades are still aggregate instrument-level recommendations. This increment adds generic tax-lot allocation metadata, and the engine does not provide tax advice or jurisdiction-specific optimization.

## 2. Selected Scope

Selected increment: limited tax-lot foundations.

Included:

- Optional tax-lot records on holdings.
- Validation that lot quantities aggregate to holding quantity when lots are supplied.
- Deterministic lot allocation metadata for sell trades.
- Generic sell selection modes: FIFO, LIFO, highest cost, lowest cost.
- Explanation, audit, fixtures, and tests for lot-aware sell allocation.

Excluded:

- Jurisdiction-specific tax rules.
- Wash-sale logic.
- Short-term/long-term tax treatment.
- Tax-loss harvesting.
- HIFO as tax advice.
- Optimizer-based tax-aware proposal sizing.
- Broker/custodian tax-lot integrations.

## 3. Decision

Decision: Add generic lot-aware sell allocation metadata without changing aggregate trade sizing.

Status: Accepted for this increment.

Context:
The current proposal engine computes instrument-level sell quantities. A full tax-aware strategy would require jurisdiction, holding-period, gain/loss, and objective-function decisions. The safe next step is to preserve aggregate sell sizing and add optional deterministic lot allocation details when lot data is available.

Options considered:

1. Keep tax lots fully deferred.
   - Benefits: No tax semantics risk.
   - Costs: Sell recommendations remain less practical and less auditable.

2. Add optional lot data and deterministic sell allocation metadata only.
   - Benefits: Improves traceability and creates future extension points without making tax claims.
   - Costs: Does not optimize taxes or change aggregate sell size.

3. Add tax optimization or HIFO as default.
   - Benefits: More realistic for taxable accounts.
   - Costs: Implies tax advice and requires jurisdiction/objective assumptions.

Preferred option:
Option 2.

Rationale:
This adds useful foundations while staying generic, deterministic, testable, and reversible. It avoids claiming tax optimization and keeps the existing proposal engine intact.

## 4. Functional Requirements

- Holdings may include optional `taxLots`.
- Each lot has a lot ID, quantity, optional acquisition date, and optional unit cost.
- When lots are present, lot quantities must sum to holding quantity within calculation tolerance.
- `RebalancingPolicy.sellSelectionMode` is optional and defaults to FIFO when lot allocation is needed.
- Supported sell selection modes are FIFO, LIFO, highest cost, and lowest cost.
- Sell trade proposals include `lotAllocations` when lots are available for the sold instrument.
- Buy trades do not include lot allocations.
- Lot allocation must not sell more than available lot quantity.
- If a sell trade requires lots but supplied lots are insufficient or inconsistent, fail explicitly.

## 5. Non-Functional Requirements

- Deterministic lot ordering.
- Backward compatibility for holdings without lots.
- No tax advice language in code or docs.
- No optimizer or new heavy dependency.

## 6. Acceptance Criteria

- Existing tests and fixtures continue passing.
- FIFO and LIFO allocation are tested.
- Highest-cost and lowest-cost allocation are tested.
- Inconsistent lot quantity fails explicitly.
- Scenario runner covers at least one lot-aware sell fixture.
- README and fixture docs state that lot allocation is generic and not tax advice.

## 7. Risks

- Users may interpret cost-based selection as tax advice.
- Unit cost may be missing for cost-based modes.
- Aggregate trade sizing may not minimize taxes because it remains strategy-driven.

Mitigations:

- Document explicitly that this is generic lot allocation, not tax optimization.
- Fail if cost-based modes are requested and unit cost is missing.
- Keep aggregate trade sizing unchanged.


&copy; 2026 Johan Hellman. All rights reserved.
