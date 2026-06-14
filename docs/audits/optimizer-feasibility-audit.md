---
type: Audit
title: Optimizer Feasibility Audit
description: Documentation for optimizer feasibility audit
tags: [audit]
timestamp: 2026-06-14T00:00:00Z
---

# Optimizer Feasibility Audit

Date: 2026-05-02

## Scope Audited

Audited the remaining full optimizer deferred capability after decimal policy, relative-boundary targeting, cash-flow foundations, and generic tax-lot allocation were implemented.

## Finding

The repository should not add a full optimizer yet.

Reasons:

- Objective functions are not yet selected.
- Constraint sets are not yet specified.
- Solver dependency policy is not yet justified.
- Explainability requirements for optimized recommendations are not yet defined.
- Existing deterministic proposal generation remains useful and auditable.

## Decision

Full optimizer remains deferred. No solver dependency or generic optimizer interface was added.

## Future Revisit Criteria

Revisit optimizer implementation when at least one concrete use case requires multiple simultaneous constraints that deterministic rule-based proposal generation cannot handle, and when objective functions and explainability requirements are documented.

## Validation

Final validation commands should pass before this audit is committed:

- `npm test -- --runInBand`
- `npm run build`
- `npm run lint`
- `npm run scenario:run`
- `npm run build && node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`
- `npm run format`
