# Next-Iteration MVP Audit

Audit date: 2026-05-02

Scope: Next-iteration multi-strategy support for the offline deterministic fixture engine.

Conclusion: The next-iteration MVP is implemented, tested, documented, and reproducible for synthetic offline fixtures. The engine now supports policy-driven strategy selection for threshold, calendar, and manual strategies. Threshold policies support full-reset and boundary-target execution modes.

## Slice Status

| Slice                                                | Status                 | Evidence                                                                         |
| ---------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| 0. Baseline lock and regression safety               | Complete and validated | Existing suite passed before changes; threshold behavior remains covered         |
| 1. Strategy inventory and policy schema extension    | Complete and validated | `RebalancingPolicy.strategyType`, `executionTargetMode`, calendar config         |
| 2. Strategy interface and orchestration layer        | Complete and validated | `src/core/evaluation.ts`, runner now uses `evaluateRebalance`                    |
| 3. Calendar strategy implementation                  | Complete and validated | `src/strategy/calendar.ts`, `tests/calendar-strategy.test.ts`, calendar fixtures |
| 4. Boundary-target threshold execution               | Complete and validated | `src/core/trades.ts`, boundary fixture and trade/simulation tests                |
| 5. Shared explanation and audit extension            | Complete and validated | Strategy and execution target metadata in explanation/audit outputs              |
| 6. Scenario runner multi-strategy support            | Complete and validated | Mixed threshold/calendar/boundary fixtures plus expected-status manifest checks  |
| 7. Documentation, examples, and developer experience | Complete and validated | README, fixture README, build journey updates                                    |
| 8. Next-iteration audit and hardening                | Complete and validated | This report plus full validation checks                                          |

## Final Verification

Commands run:

```bash
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run build
npm run scenario:run
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
npm run format
git diff --check
```

Observed results before final commit:

- Jest: 69 tests passed across 13 suites.
- TypeScript type-check: passed.
- ESLint: passed.
- Build: passed.
- Scenario runner: passed and produced deterministic JSON with nine successful scenario audit records and three expected per-scenario errors for invalid fixtures.
- Expected-status manifest validation: passed with 12 checked scenarios and zero mismatches.
- Format: passed.
- Diff whitespace check: passed.

## Implemented Strategy Coverage

- Threshold/tolerance-band strategy remains the default when `strategyType` is omitted.
- Manual forced rebalance remains available as a strategy module and can now be selected by orchestration.
- Calendar strategy triggers deterministically from caller-supplied `evaluationDate` and `nextRebalanceDate`.
- Threshold boundary-target execution trades to the nearest absolute tolerance boundary instead of fully resetting to target.

## Known Limitations

- Boundary-target execution uses absolute tolerance bands only; relative-boundary targeting is deferred.
- Calendar strategy does not model holidays, business days, persistence windows, or automatic next-date generation.
- Manual strategy has no actor, approval reason, or request metadata.
- Strategy modules still only own trigger evaluation; proposal behavior is selected through policy and shared trade generation.
- Full transaction-cost-aware no-trade-region optimization is not implemented.
- Tax-lot, direct-indexing, wash-sale, and HIFO logic are not implemented.
- Cash-flow support remains limited to positive cash in portfolio state; pending flows, withdrawals, and negative-cash funding are not modeled.
- Numeric calculations still use JavaScript `number`.

## Deferred Decisions

- Whether boundary mode should support relative bands immediately.
- Whether calendar strategy should support frequency-derived next dates or only explicit next-review dates.
- Whether manual forced rebalance is a product-supported strategy or internal operator override.
- Whether strategy-specific proposal hooks should be added before tax-aware or optimizer strategies.
- Decimal arithmetic and rounding policy for production monetary outputs.

## Recommendation

Treat the next-iteration MVP as complete for offline deterministic fixtures. The next safe work is hardening rather than new strategy breadth: decimal/rounding policy evaluation, relative-boundary support if needed, and richer cash-flow semantics for deposits and withdrawals.
