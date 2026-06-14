---
type: Audit
title: Tax Lots Audit
description: Documentation for tax lots audit
tags: [audit]
timestamp: 2026-06-14T00:00:00Z
---

# Tax Lot Foundations Increment Audit

Date: 2026-05-02

## Scope Audited

Implemented:

- Optional holding-level tax lots.
- Lot aggregation validation.
- Deterministic sell trade lot allocation metadata.
- FIFO, LIFO, highest-cost, and lowest-cost allocation modes.
- Fixture, runner, explanation, audit, and documentation updates.

Deferred:

- Jurisdiction-specific tax rules.
- Wash-sale logic.
- Holding-period tax treatment.
- Tax-loss harvesting.
- Optimizer-driven tax-aware sizing.
- Broker/custodian tax-lot integrations.

## Decision Consistency

The implementation follows the PRD and plan:

- Aggregate trade sizing remains unchanged.
- Lot allocation is metadata on sell trades, not an optimizer.
- Cost-based modes require `unitCost`.
- The docs explicitly state that this is generic allocation metadata, not tax advice.

## Test and Fixture Review

Added or updated coverage:

- Valid tax lots aggregate to holding quantity.
- Inconsistent lot quantities fail explicitly.
- FIFO default allocation.
- LIFO allocation.
- Highest-cost and lowest-cost allocation.
- Cost-based modes fail when `unitCost` is missing.
- Scenario runner coverage for `tax_lot_fifo_sell`.
- Explanation and audit output include lot allocation metadata.

## Validation

Final validation commands should pass before this audit is committed:

- `npm test -- --runInBand`
- `npm run build`
- `npm run lint`
- `npm run scenario:run`
- `npm run build && node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`
- `npm run format`

## Residual Risks and Limitations

- Users may still infer tax intent from cost-based modes; docs must keep the no-tax-advice boundary clear.
- Lot allocation does not choose aggregate sell size.
- Missing acquisition dates are sorted deterministically but do not represent tax holding periods.
- No live tax-lot integration, persistence, API, or UI is implemented.

## Result

Audit result: Pass, subject to final validation command results being recorded in the final response.
