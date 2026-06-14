---
type: Decision Record
title: Prioritize calendar and boundary-target strategy slices
description: Decision to prioritize calendar and boundary-target strategy slices
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Provisional
---

# Prioritize calendar and boundary-target strategy slices

## Context

The traceability review found that threshold and manual strategies are implemented, while calendar strategy remains the clearest missing PRD/Meta Paper carry-forward. The review also found that full transaction-cost-aware optimal control is too large for the next iteration, but boundary-target execution is a smaller transaction-cost-aware proof point explicitly supported by the research.

## Options Considered


1. Implement calendar strategy first, then boundary-target threshold execution.
   - Benefits: Calendar is low-complexity, research-backed, and explicitly expected by the PRD/MVP plan; boundary mode proves transaction-cost-aware extensibility next.
   - Costs: Calendar is less attractive than threshold for many automated portfolios.
   - Risks: Calendar date semantics must be specified carefully.
   - Reversibility: High.

2. Implement full transaction-cost-aware optimal control next.
   - Benefits: Strong institutional evidence and high long-term value.
   - Costs: Requires cost models, covariance/risk inputs, optimizer decisions, and explainability controls.
   - Risks: Major overreach for the current offline fixture MVP.
   - Reversibility: Low to medium.

3. Implement tax-aware/direct-indexing next.
   - Benefits: High value for taxable HNW use cases.
   - Costs: Requires tax lots, wash-sale logic, jurisdictional assumptions, and proxy instruments.
   - Risks: High correctness and compliance risk.
   - Reversibility: Low.

4. Implement dynamic/regime/ML next.
   - Benefits: Research upside.
   - Costs: Requires data/model governance and has weak interpretability.
   - Risks: Overfitting and poor auditability.
   - Reversibility: Low.

## Decision

Option 1: Calendar strategy first, then boundary-target threshold execution.

## Rationale

This sequence fills the clearest strategy carry-forward gap and then extends the existing threshold engine toward transaction-cost-aware behavior without claiming full optimal control. It remains deterministic, fixture-testable, and reversible.

## Implementation Impact


- Code: Add calendar strategy after strategy selection/orchestration; add boundary execution mode after policy schema support exists.
- Tests: Add due/not-due calendar fixtures, boundary proposal math, residual drift simulation, and audit/explanation coverage.
- Fixtures: Add `calendar_due`, `calendar_not_due`, and `threshold_boundary_target`.
- Documentation: Keep tax-aware, full optimizer, ML, private-market, and digital-asset work deferred.

## Validation

Calendar must be deterministic from supplied evaluation dates. Boundary targeting must produce lower trade value than full reset and leave post-trade drift inside tolerance bands.


&copy; 2026 Johan Hellman. All rights reserved.
