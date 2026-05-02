# Scheduled and Recurring Cash-Flow Audit

Date: 2026-05-02

## Scope

Audited the offline scheduled/recurring cash-flow increment. This audit covers deterministic file-based domain behavior, fixtures, CLI exposure, explanation, and audit output.

Out of scope remains unchanged: no banking, payment initiation, custody movement, execution integration, API, UI, database, persistence, live market data, tax advice, jurisdiction-specific tax handling, or full optimizer.

## Implemented Behavior

- Optional `PortfolioState.cashFlowSchedules` models one-off scheduled and recurring cash-flow inputs.
- `SETTLED` and `PENDING` cash-flow records remain backward compatible.
- `SCHEDULED` means a one-off dated plan; `RECURRING` means a rule that produces dated scheduled events.
- `effectiveDate` and `evaluationDate` are ISO date-only `YYYY-MM-DD` strings.
- Evaluation date is resolved from explicit evaluation input, top-level `policy.evaluationDate`, or `policy.calendar.evaluationDate`.
- Events with `effectiveDate <= evaluationDate` are expanded into schedule-derived `SETTLED` cash-flow records in an internal portfolio copy.
- Future events are excluded from valuation/proposal sizing and surfaced through warnings, explanation, and audit metadata.
- Recurrence supports `MONTHLY`, `QUARTERLY`, and `ANNUAL`; weekly/custom recurrence is rejected.
- Generated IDs use `schedule:<cashFlowScheduleId>:<effectiveDate>`.
- If a generated ID already exists in explicit `cashFlows`, the generated event is reported as already represented and not double counted.

## Validation Coverage

- Unit tests cover date validation, one-off before/on/after evaluation date, monthly/quarterly/annual recurrence, end-date and occurrence-count bounds, invalid structure, and already represented generated events.
- Evaluation tests cover scheduled deposits, scheduled withdrawals, future scheduled flows, proposal effects, explanation, and audit metadata.
- Fixture and runner tests cover valid and invalid synthetic scheduled-flow scenarios.
- CLI tests cover `validate`, `run --format json`, `batch`, `inspect scenarios`, invalid recurrence, and strict mode for future scheduled-flow warnings.

## CLI Audit

- `rebalance validate` validates scheduled/recurring inputs through the deterministic engine path.
- `rebalance run` applies due schedules from input files and renders schedule metadata.
- `rebalance batch` runs the expanded fixture manifest and expectation file.
- `rebalance inspect scenarios` marks schedule-bearing scenarios.
- `rebalance inspect policies` lists `evaluationDate`.
- No schedule-creation flags were added; scenario/portfolio/policy files remain the audited source of financial inputs.

## Known Limitations

- No weekly/custom recurrence.
- No business-day, holiday, or market-calendar adjustment.
- No analysis window beyond evaluation-date-bounded expansion.
- Future schedules are currently warnings, so `--strict` treats them as failures.
- Public domain inputs remain number-based; decimal-string API contracts remain deferred.
- CLI validation is engine-path validation, not a standalone schema-only validator.

## Audit Conclusion

The scheduled/recurring cash-flow increment is implemented for the repository's offline deterministic MVP scope. The implementation is deterministic, uses synthetic fixtures only, preserves existing cash-flow behavior, avoids production integrations, and exposes the behavior through the CLI.
