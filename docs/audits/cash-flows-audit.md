---
type: Audit
title: Cash Flows Audit
description: Documentation for cash flows audit
tags: [audit]
timestamp: 2026-06-14T00:00:00Z
---

# Cash Flows Increment Audit

Date: 2026-05-02

## Scope Audited

Implemented:

- Optional explicit cash-flow records on `PortfolioState`.
- Settled deposit and withdrawal valuation adjustments.
- Withdrawal-created cash deficit funding through deterministic sell proposals.
- Pending cash-flow visibility without valuation or proposal sizing impact.
- Fixture, runner, audit, explanation, and documentation updates.

Deferred:

- Scheduled and recurring flow generation.
- Tax-lot-aware withdrawal funding.
- Optimized sell selection.
- Live banking/custody integrations.
- API, UI, and database.

## Decision Consistency

The implementation follows the cash-flow PRD and plan:

- Cash flows are embedded in offline portfolio state for this increment.
- Settled flows adjust available cash before valuation.
- Pending flows are excluded from valuation/proposal sizing and surfaced as warnings.
- Raw negative cash remains invalid; negative available cash is allowed only when caused by an explicit settled withdrawal.

## Test and Fixture Review

Added or updated coverage:

- Settled cash-flow valuation summary.
- Settled withdrawal deficit valuation.
- Invalid cash-flow amount.
- Cash flows exceeding total portfolio value.
- Withdrawal-funded sell proposals.
- Pending cash-flow warnings.
- Pending cash-flow audit metadata and explanation warning text.
- Scenario runner coverage for settled deposit, settled withdrawal, pending flow, and invalid amount fixtures.

## Validation

Final validation commands should pass before this audit is committed:

- `npm test -- --runInBand`
- `npm run build`
- `npm run lint`
- `npm run scenario:run`
- `npm run build && node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`
- `npm run format`

## Residual Risks and Limitations

- `cash` is treated as pre-flow cash when `cashFlows` are supplied; callers must avoid double-counting flows already reflected in cash.
- Withdrawal sell selection uses existing target-reset math, not tax-aware or optimizer-aware lot selection.
- Pending flows are visibility-only and do not trigger recommendations.
- No live money movement, banking integration, persistence, API, or UI is implemented.

## Result

Audit result: Pass, subject to final validation command results being recorded in the final response.


&copy; 2026 Johan Hellman. All rights reserved.
