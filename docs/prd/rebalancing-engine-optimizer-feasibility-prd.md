---
type: PRD
title: Rebalancing Engine Optimizer Feasibility Prd
description: Documentation for rebalancing engine optimizer feasibility prd
tags: [prd]
timestamp: 2026-06-14T00:00:00Z
---

# Optimizer Feasibility PRD

Date: 2026-05-02

Implementation status: Complete as a feasibility and deferral increment.

## 1. Background

The engine now supports deterministic rule-based rebalancing with threshold, calendar, manual, boundary targeting, explicit cash flows, and generic tax-lot allocation metadata. A full optimizer remains a deferred post-MVP capability.

## 2. Scope Decision

Selected scope: optimizer feasibility and deferral boundary.

Included:

- Assess whether a full optimizer should be implemented now.
- Document why optimizer objectives and solver dependencies remain deferred.
- Confirm current deterministic proposal generation remains the active proposal engine.
- Document future optimizer prerequisites and extension criteria.

Excluded:

- Solver dependencies.
- Objective-function implementation.
- Constraint programming.
- Tax-aware optimization.
- Multi-account or household optimization.
- Stochastic control/no-trade-region optimizer.

## 3. Decision

Decision: Defer full optimizer and avoid adding a solver abstraction now.

Status: Accepted.

Context:
The engine has practical deterministic proposal generation, boundary targeting, cash-flow handling, and tax-lot allocation metadata. A full optimizer would require clear objectives, constraints, explainability expectations, and solver selection. Those requirements are not yet specific enough to justify code.

Options considered:

1. Implement a solver-backed optimizer now.
   - Benefits: More powerful constraint handling.
   - Costs: Requires objective and dependency decisions before requirements are clear.
   - Risks: Explainability, determinism, and dependency risk.

2. Add a generic optimizer interface without implementation.
   - Benefits: Signals future extensibility.
   - Costs: Premature abstraction likely to be wrong.
   - Risks: Creates unused public surface and migration burden.

3. Keep deterministic rule-based proposals and document optimizer prerequisites.
   - Benefits: Preserves clear behavior and avoids unnecessary dependency risk.
   - Costs: Does not solve complex multi-constraint optimization yet.
   - Risks: Future optimizer work still needs a new PRD.

Preferred option:
Option 3.

Rationale:
This is the safest next step. The current proposal path is deterministic, auditable, tested, and explainable. Optimizer work should wait until objectives, constraints, and acceptable dependency choices are explicit.

## 4. Future Optimizer Prerequisites

Before implementation, a future optimizer PRD should define:

- Objective function, such as minimize turnover, minimize tracking error, minimize transaction cost, or balance multiple objectives.
- Constraint set, such as minimum trades, cash bounds, tax-lot constraints, no-buy/no-sell lists, allocation bounds, and turnover limits.
- Whether optimization is single-account, multi-account, or household-level.
- Whether tax lots are constraints, preferences, or an objective input.
- Explainability requirements for rejected alternatives and chosen solution.
- Determinism and reproducibility requirements.
- Solver dependency policy and fallback behavior.

## 5. Acceptance Criteria

- Full optimizer remains explicitly deferred.
- No solver dependency is added.
- README and build journey reflect the active proposal engine boundary.
- Existing tests, build, lint, scenario runner, manifest validation, and format pass.
