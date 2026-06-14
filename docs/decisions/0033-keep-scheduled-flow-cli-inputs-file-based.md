---
type: Decision Record
title: Keep scheduled-flow CLI inputs file-based
description: Decision to keep scheduled-flow cli inputs file-based
tags: [architecture, cli]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Keep scheduled-flow CLI inputs file-based

## Context

The CLI is the first-class offline interface, but financial inputs should remain auditable.

## Options Considered


1. Add schedule creation flags.
   - Benefits: Convenient ad hoc demos.
   - Costs: Hidden overrides can diverge from audited input files.

2. Keep schedules in scenario/portfolio/policy files and expose validation/output/inspection only.
   - Benefits: Preserves auditability and works with batch fixtures.
   - Costs: Users must edit JSON files.

## Decision

Option 2.

## Rationale

This matches existing strategy and cash-flow CLI discipline. `validate`, `run`, `batch`, `inspect scenarios`, and `inspect policies` expose the behavior without creating unaudited overrides.

## Implementation Impact

Updated CLI help, scenario inspection, policy field inspection, summary/pretty/JSON rendering, and CLI tests.

## Validation

CLI tests cover valid scheduled run JSON, invalid recurrence validation, strict future-schedule warning behavior, batch expectation count, and scenario inspection.

**Implemented scope:** Domain model, validation, schedule expansion, engine integration, warnings, explanation, audit output, synthetic fixtures, runner expectations, CLI behavior, README, CLI docs, PRD, plan, roadmap, fixture docs, and scheduled-flow audit.

**Out of scope preserved:** Banking/payment initiation, custody cash movement, execution integration, API, UI, database, persistence, live market data, tax advice, jurisdiction-specific tax handling, full optimizer, business-day calendars, holiday calendars, weekly/custom recurrence, and contribution/withdrawal amount recommendations.

**Validation during implementation:** Focused tests passed with `npm test -- --runInBand tests/cash-flows.test.ts tests/evaluation.test.ts`; expanded focused suite passed with `npm test -- --runInBand tests/cash-flows.test.ts tests/evaluation.test.ts tests/scenario-runner.test.ts tests/fixtures.test.ts tests/cli.test.ts`.

**Final validation:** `npm test` passed with 138 tests across 17 suites; `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed; `npm run scenario:run` passed; expected-status validation passed with 26 checked scenarios; CLI smoke commands passed for scheduled validation, recurring-withdrawal JSON run, batch expectations, and scenario inspection.

**Recommended next step:** Run final full validation, commit focused changes, and push the feature branch if all gates pass.


&copy; 2026 Johan Hellman. All rights reserved.
