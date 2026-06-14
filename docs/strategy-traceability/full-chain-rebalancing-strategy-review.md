---
type: Research
title: Full Chain Rebalancing Strategy Review
description: Documentation for full chain rebalancing strategy review
tags: [research, traceability]
timestamp: 2026-06-14T00:00:00Z
---

# Full-Chain Rebalancing Strategy Review

Date: 2026-05-02

Post-implementation update: The next-iteration MVP plan derived from this review has now been implemented for the offline deterministic fixture scope. Calendar strategy support, threshold boundary-target execution, policy-driven strategy selection, strategy metadata, mixed-strategy runner fixtures, and expected-status runner manifest validation are complete. Remaining gaps in this document should be read as post-MVP backlog unless a later PRD expands the active slice scope.

## 1. Executive Summary

The current engine is an offline, deterministic TypeScript MVP that implements threshold/tolerance-band rebalancing, manual forced rebalancing, calendar due-date rebalancing, no-trigger monitoring behavior, and threshold boundary-target execution. It includes cash-aware trade proposals, minimum-trade warnings, post-trade simulation, deterministic explanations, audit records, fixtures, a batch scenario runner, and expected-status runner manifest validation.

The Portfolio Rebalancing Meta Paper identifies five primary strategy clusters: calendar-based rebalancing, threshold/hybrid rebalancing, transaction-cost-aware optimal control, tax-aware/direct-indexing rebalancing, and dynamic/regime-switching/machine-learning rebalancing. It also identifies cash-flow routing and target-versus-boundary execution as practical design implications that cut across strategies.

Implemented and tested:

- Threshold/tolerance-band trigger logic.
- Cash-aware full-reset trade proposals.
- Threshold boundary-target execution.
- Calendar due-date strategy.
- Minimum trade-size suppression with structured warnings.
- Manual forced rebalance trigger.
- No-rebalance/monitoring-only behavior when threshold drift is in band.

Partially implemented or structurally supported:

- Hybrid threshold monitoring is structurally represented by threshold evaluation plus batch scenario runner, but no schedule/monitoring cadence is modeled.
- Cash-flow-aware routing is implemented for positive cash in full-reset proposals, but withdrawals, pending flows, negative cash funding, and flow-specific policies are not modeled.
- Strategy modules are supported by `StrategyInterface` and policy-driven orchestration. Strategy-specific proposal hooks beyond boundary execution remain deferred.

Missing:

- Full transaction-cost-aware no-trade-region optimization.
- Tax-aware and direct-indexing/tax-lot logic.
- Dynamic/regime-aware/ML strategies.
- Factor/style calendar reconstitution semantics.
- Private-market denominator-effect handling.
- Digital-asset extreme-volatility policy.

Key architectural implication: the next iteration should not add isolated one-off endpoints or bury strategy behavior inside an increasingly broad policy object. The preferred direction is a hybrid architecture: preserve the common calculation core, add explicit strategy identifiers and a common strategy module contract, and introduce a light orchestration layer that selects strategy modules and records strategy metadata in outputs.

Recommended next iteration focus:

1. Baseline lock and explicit strategy policy schema.
2. Strategy module/orchestration support with backward compatibility.
3. Calendar strategy as the first missing strategy because the PRD explicitly calls it out and the MVP plan originally named it as the second-strategy proof point.
4. Boundary-target execution mode for proportional-cost threshold policies as a small transaction-cost-aware proof point, not full stochastic optimal control.

Main risks are overstating implemented strategy breadth, adding optimization complexity before policy metadata exists, and continuing with hard-coded runner strategy selection.

## 2. Materials Reviewed

Documents:

- `AGENTS.md`
- `README.md`
- `BUILD_JOURNEY.md`
- `docs/Portfolio Rebalancing Meta-Paper Synthesis.md`
- `docs/Rebalancing Engine_ PRD, Architecture, Vision.md`
- `docs/MVP_Implementation_Plan.md`
- `docs/audits/red-team-audit-current.md`
- `docs/audits/test-case-audit.md`
- `docs/audits/final-mvp-audit.md`
- `tests/fixtures/README.md`

Source:

- `src/models/domain.ts`
- `src/core/valuation.ts`
- `src/core/drift.ts`
- `src/core/trades.ts`
- `src/core/simulation.ts`
- `src/strategy/threshold.ts`
- `src/strategy/manual.ts`
- `src/explanation/explanation.ts`
- `src/audit/audit.ts`
- `src/runner/scenario-runner.ts`

Tests and fixtures:

- `tests/fixtures/scenarios.json`
- `tests/fixtures.test.ts`
- `tests/valuation.test.ts`
- `tests/drift.test.ts`
- `tests/threshold.test.ts`
- `tests/manual-strategy.test.ts`
- `tests/trades.test.ts`
- `tests/simulation.test.ts`
- `tests/explanation.test.ts`
- `tests/audit.test.ts`
- `tests/scenario-runner.test.ts`
- `tests/edge-cases.test.ts`
- `tests/smoke.test.ts`

Commands/repository evidence:

- `git status --short --branch`
- `git log --oneline -8`
- `rg --files`
- Targeted `rg`, `sed`, and `nl -ba` reads of docs, source, tests, and fixtures.

## 3. Meta Paper Strategy Inventory

| Strategy                                              | Description                                                                                                         | Evidence strength                                               | Key benefits                                                                       | Key limitations                                                                                             | Required capabilities                                                                              | Implementation complexity                                          | Best-fit use cases                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Calendar-based rebalancing                            | Rebalance at fixed dates regardless of drift magnitude.                                                             | High for risk control; weak for return enhancement.             | Operational simplicity, governance predictability, behavioral discipline.          | Path dependency; trades unnecessarily in quiet markets; can miss intra-period dislocations.                 | Calendar/schedule metadata, current valuation, target allocation, proposal generation.             | Low.                                                               | Institutions with governance calendars; manual/self-directed accounts; factor reconstitution schedules. |
| Threshold/tolerance-band and hybrid rebalancing       | Trigger only when absolute or relative drift breaches a configured band; hybrid adds frequent monitoring.           | Very high.                                                      | Reduces unnecessary trades, maintains risk guardrails, allows intra-band momentum. | Requires monitoring; relative bands can over-trigger small allocations and under-trigger large allocations. | Valuation, drift, absolute/relative tolerances, trigger explanation, proposal generation.          | Medium.                                                            | Wealth platforms, robo-advisors, multi-asset portfolios.                                                |
| Transaction-cost-aware optimal control                | Compute a no-trade region and trade only when utility gain exceeds explicit costs.                                  | High in quantitative finance and operations research.           | Minimizes transaction-cost drag; supports boundary targeting.                      | Requires covariance estimates, cost models, optimization, and strong explainability controls.               | Cost model, execution target modes, covariance/risk inputs, optimizer or boundary model.           | High to very high.                                                 | Large institutional portfolios, trading desks, sovereign wealth funds.                                  |
| Tax-aware/direct-indexing rebalancing                 | Use tax lots, HIFO selection, loss harvesting, wash-sale avoidance, and gain deferral to maximize after-tax wealth. | Very high for taxable HNW/direct-indexing use cases.            | Produces tax alpha through deferral and character benefits.                        | Jurisdiction-specific, lot-intensive, complex, and dependent on tax law.                                    | Tax lots, cost basis, holding periods, wash-sale rules, proxy securities, tracking-error controls. | Very high.                                                         | Taxable HNW accounts, family offices, SMA/direct-indexing platforms.                                    |
| Dynamic/regime-switching/machine-learning rebalancing | Adapt bands or targets using predictive regime signals or ML/RL models.                                             | Emerging.                                                       | Potentially balances mean reversion and momentum better than static rules.         | Overfitting risk, low interpretability, difficult auditability.                                             | Regime inputs, model governance, backtesting, explanation controls, policy safeguards.             | Very high.                                                         | Quant funds and research settings.                                                                      |
| Cash-flow-aware routing                               | Route deposits to underweight assets and withdrawals from overweight assets before secondary market trading.        | High as a practical implication from institutional research.    | Reduces turnover, taxes, and bid/ask friction.                                     | Needs explicit cash-flow semantics; withdrawal and pending-flow behavior can be complex.                    | Cash balances, flow direction, under/overweight ranking, proposal generation.                      | Medium.                                                            | Advisory platforms, wealth portfolios, retirement accounts.                                             |
| Boundary execution target                             | Under proportional costs, trade only to the nearest band boundary rather than full target.                          | High as a design implication from Vanguard/Donohue-Yip.         | Reduces immediate trade size and friction while restoring acceptable risk.         | Leaves intentional residual drift; requires explanation and policy controls.                                | Execution target modes, band-boundary math, residual drift simulation, audit metadata.             | Medium for threshold boundary mode; high for full optimal control. | Taxable/proportional-cost accounts and institutional portfolios.                                        |
| Factor/style calendar reconstitution                  | Rebalance factor portfolios at monthly/quarterly intervals aligned to factor half-life.                             | Medium to high as an archetype, not a primary taxonomy cluster. | Controls factor decay and turnover.                                                | Requires factor target model updates and factor-specific research assumptions.                              | Calendar semantics, model versioning, strategy metadata.                                           | Medium.                                                            | Systematic factor portfolios.                                                                           |
| Denominator-effect/private-market handling            | Use asymmetric/wide bands and cash/proxy routing when private assets have stale prices and poor liquidity.          | Research gap.                                                   | Avoids forced private-market sales during public-market dislocations.              | Requires illiquid asset metadata, stale pricing policy, proxy mapping.                                      | Liquidity flags, asymmetric bands, cash/proxy routing, stale-price controls.                       | High.                                                              | Endowments, pensions, private-market-heavy portfolios.                                                  |
| Digital-asset extreme-volatility policy               | Specialized bands and tax-aware handling for very volatile assets.                                                  | Research gap.                                                   | Could prevent destructive churn in volatile allocations.                           | Needs specialized volatility and tax-lot modeling.                                                          | Asset-specific band calibration, tax-lot handling, risk controls.                                  | High.                                                              | Crypto-inclusive portfolios.                                                                            |

## 4. Research-to-PRD Traceability

| Strategy                               | Present in Meta Paper?                 | Present in PRD?                   | PRD treatment                                                        | Evidence/reference                                                        | Gap or comment                                                                    |
| -------------------------------------- | -------------------------------------- | --------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Calendar-based                         | Yes                                    | Yes                               | Baseline future strategy module.                                     | Meta Paper lines 65-79; PRD lines 81 and 121.                             | Not included in MVP scope.                                                        |
| Threshold/hybrid                       | Yes                                    | Yes                               | MVP strategy and core architecture.                                  | Meta Paper lines 81-95; PRD lines 83 and 97.                              | PRD expects absolute and relative tolerance support.                              |
| Transaction-cost-aware optimal control | Yes                                    | Yes                               | Later-stage module; boundary targeting must be supported eventually. | Meta Paper lines 97-111; PRD lines 85 and 101.                            | Full optimization excluded from MVP.                                              |
| Tax-aware/direct indexing              | Yes                                    | Yes                               | Later-stage; holdings should eventually support tax-lot granularity. | Meta Paper lines 113-127; PRD lines 87 and 101.                           | Excluded from MVP.                                                                |
| Dynamic/regime/ML                      | Yes                                    | Yes                               | Future/later-stage, explicitly excluded from MVP.                    | Meta Paper lines 129-143; PRD line 101.                                   | No near-term product requirements.                                                |
| Cash-flow routing                      | Yes                                    | Yes                               | Core MVP trade generation behavior.                                  | Meta Paper lines 204-213; PRD lines 89, 97, and 129.                      | PRD includes cash balances, but pending flows and withdrawals remain future work. |
| Boundary execution                     | Yes                                    | Yes                               | Future execution target capability.                                  | Meta Paper lines 107 and 208-213; PRD lines 85 and 121.                   | PRD requires target execution to be configurable eventually.                      |
| Factor/style calendar                  | Yes, as archetype                      | Implied                           | Calendar module can support this later.                              | Meta Paper lines 243-248; PRD lines 81 and 125.                           | No factor-specific model semantics in PRD.                                        |
| Denominator/private-market             | Yes, research gap                      | Omitted or implicitly excluded    | Not in MVP scope.                                                    | Meta Paper lines 251-255; PRD line 97 limits MVP to liquid public assets. | Should remain deferred.                                                           |
| Digital assets                         | Yes, research gap                      | Omitted                           | Not in MVP.                                                          | Meta Paper lines 256-257; PRD MVP is liquid long-only public securities.  | Should remain deferred.                                                           |
| Manual forced rebalance                | Not as primary taxonomy                | Implied by manual review workflow | Manual review/approval mentioned, not a research strategy.           | PRD line 97 manual review workflow.                                       | Implemented as extensibility proof point, not research carry-forward.             |
| No-rebalance/monitoring-only           | Implied by threshold/no-trade concepts | Implied                           | No trigger when in band; audit/explanation should still show result. | Meta Paper lines 101 and 83; PRD lines 125 and 137.                       | Implemented as no-trigger result, not named strategy.                             |

## 5. PRD-to-MVP Plan Traceability

| Strategy                               | PRD treatment                           | MVP plan treatment                                | MVP / post-MVP / excluded / omitted                       | Evidence/reference                              | Gap or comment                                                      |
| -------------------------------------- | --------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Calendar-based                         | Future baseline module.                 | Slice 11 second strategy proof point.             | Planned MVP proof point, later changed in implementation. | PRD line 81; MVP plan lines 147-151.            | Actual second strategy is manual, not calendar.                     |
| Threshold/hybrid                       | MVP strategy.                           | Core MVP slices 3-6.                              | MVP.                                                      | PRD line 97; MVP plan lines 21-24 and 51-54.    | Implemented.                                                        |
| Transaction-cost-aware optimal control | Later-stage; boundary targeting future. | Explicitly excluded; later abstractions deferred. | Excluded/post-MVP.                                        | PRD line 101; MVP plan lines 65-69 and 171-173. | Boundary mode is a good next small slice.                           |
| Tax-aware/direct indexing              | Deferred.                               | Explicitly excluded.                              | Excluded/later-stage.                                     | PRD lines 87 and 101; MVP plan lines 65-66.     | Missing by design.                                                  |
| Dynamic/regime/ML                      | Excluded from MVP.                      | Explicitly excluded.                              | Excluded/later-stage.                                     | PRD line 101; MVP plan line 23.                 | Missing by design.                                                  |
| Cash-flow routing                      | MVP trade-generation behavior.          | Slice 6.                                          | MVP.                                                      | PRD line 129; MVP plan lines 117-121.           | Implemented for positive cash.                                      |
| Boundary execution                     | Future execution target capability.     | Deferred until after second strategy proof point. | Post-MVP.                                                 | PRD line 121; MVP plan lines 171-173.           | Missing.                                                            |
| Manual forced rebalance                | Manual review workflow implied.         | Not planned as strategy.                          | Omitted from MVP plan, implemented as proof point.        | PRD line 97; `src/strategy/manual.ts`.          | Useful proof point, but it does not satisfy calendar carry-forward. |
| No-rebalance/monitoring-only           | Implied.                                | Implied by no-trigger threshold validation.       | MVP.                                                      | MVP plan lines 105-109.                         | Implemented via `TriggerResult.isTriggered = false`.                |

## 6. MVP Plan-to-Implementation Traceability

| Strategy                               | Planned status   | Observed implementation status                                                                            | Code evidence                                                             | Test evidence                                                                    | Fixture evidence                                                                      | Documentation evidence                      | Confidence level                                            | Gap or comment                                                                         |
| -------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Threshold/tolerance-band               | MVP scope        | Implemented and tested.                                                                                   | `src/strategy/threshold.ts`; `src/core/drift.ts`; `src/models/domain.ts`. | `tests/threshold.test.ts`, `tests/drift.test.ts`, `tests/edge-cases.test.ts`.    | `one_asset_out_of_band`, `multiple_assets_out_of_band`, `positive_cash`, `on_target`. | README, final MVP audit.                    | High.                                                       | Relative tolerance exists in policy/drift but is less visible in strategy explanation. |
| Hybrid monitoring                      | MVP concept      | Structurally supported but not implemented as scheduling/cadence.                                         | `src/runner/scenario-runner.ts` batch runner.                             | `tests/scenario-runner.test.ts`.                                                 | Batch fixtures.                                                                       | README scenario runner docs.                | Medium.                                                     | No monitoring interval, clock, or schedule policy.                                     |
| Cash-flow routing                      | MVP scope        | Partially implemented. Positive cash is included and can fund buys; withdrawals/pending flows are absent. | `src/core/trades.ts`; `src/core/valuation.ts`.                            | `tests/trades.test.ts`, `tests/simulation.test.ts`, `tests/edge-cases.test.ts`.  | `positive_cash`.                                                                      | Fixture README, final MVP audit.            | High for positive cash; low for broader cash-flow strategy. | Not a standalone strategy.                                                             |
| Minimum trade constraints              | MVP scope        | Implemented and tested.                                                                                   | `src/core/trades.ts`; `src/models/domain.ts`.                             | `tests/trades.test.ts`, `tests/explanation.test.ts`, `tests/simulation.test.ts`. | `min_trade_size_issue`.                                                               | Final MVP audit.                            | High.                                                       | Global minimum only.                                                                   |
| Calendar-based                         | Planned Slice 11 | Not implemented.                                                                                          | None.                                                                     | None.                                                                            | None.                                                                                 | Final audit says calendar remains deferred. | High.                                                       | Main carry-forward gap.                                                                |
| Manual forced rebalance                | Not planned      | Implemented and tested.                                                                                   | `src/strategy/manual.ts`.                                                 | `tests/manual-strategy.test.ts`, `tests/smoke.test.ts`.                          | Uses existing fixtures only.                                                          | README, final MVP audit.                    | High.                                                       | It proves interface reuse but is not a Meta Paper strategy cluster.                    |
| Boundary execution                     | Deferred         | Not implemented.                                                                                          | `generateTradeProposal` full-resets to target.                            | Tests assert full-reset behavior.                                                | Current fixtures expect target reset.                                                 | Final audit limitations.                    | High.                                                       | Needed before transaction-cost-aware policy can be claimed.                            |
| Transaction-cost-aware optimal control | Excluded         | Documented only.                                                                                          | None.                                                                     | None.                                                                            | None.                                                                                 | PRD/MVP plan only.                          | High.                                                       | Full no-trade-region optimization should remain later-stage.                           |
| Tax-aware/direct indexing              | Excluded         | Documented only.                                                                                          | No tax-lot model.                                                         | None.                                                                            | None.                                                                                 | PRD/MVP plan/final audit.                   | High.                                                       | Requires lot-level model and tax rules.                                                |
| Dynamic/regime/ML                      | Excluded         | Documented only.                                                                                          | None.                                                                     | None.                                                                            | None.                                                                                 | PRD/MVP plan only.                          | High.                                                       | Should remain deferred.                                                                |
| No-rebalance/monitoring-only           | Implied          | Implemented and tested as no-trigger output.                                                              | `src/strategy/threshold.ts`; `src/explanation/explanation.ts`.            | `tests/threshold.test.ts`, `tests/explanation.test.ts`.                          | `on_target`.                                                                          | README.                                     | High.                                                       | Not exposed as explicit recommendation mode.                                           |

## 7. Implemented Strategy Assessment

### Threshold/Tolerance-Band Rebalancing

What is implemented:

- `RebalancingPolicy` supports `absoluteDriftTolerance`, optional `relativeDriftTolerance`, and `minimumTradeSize`.
- `calculateDrift` computes current weight, target weight, absolute drift, relative drift, and `isOutOfBand`.
- `ThresholdStrategy.evaluateTrigger` triggers when any drift row is out of band.
- `generateTradeProposal` produces deterministic full-reset BUY/SELL proposals.
- `applyMinimumTradeSize` suppresses below-minimum trades with structured warnings.
- `simulatePostTrade`, `generateExplanation`, and `generateAuditRecord` preserve replayability.

How it works:

1. Value holdings and cash from a `PortfolioState` and `PriceSnapshot`.
2. Calculate current weights and drift against `TargetAllocation`.
3. Evaluate threshold trigger from precomputed drift.
4. Generate full-reset trades to target dollar values.
5. Suppress below-minimum trades and surface warnings.
6. Simulate post-trade state and serialize explanation/audit outputs.

Inputs required:

- Portfolio holdings and cash.
- Target allocation.
- Price snapshot.
- Rebalancing policy with tolerances and minimum trade size.

Outputs produced:

- Drift measurements.
- Trigger result.
- Trade proposal.
- Post-trade simulation.
- Explanation.
- Audit record.

Tests/fixtures validating it:

- `tests/threshold.test.ts`
- `tests/drift.test.ts`
- `tests/trades.test.ts`
- `tests/simulation.test.ts`
- `tests/explanation.test.ts`
- `tests/audit.test.ts`
- `tests/scenario-runner.test.ts`
- `tests/fixtures/scenarios.json`

Known limitations:

- Strategy selection is not in policy.
- Scenario runner always uses `ThresholdStrategy`.
- Trade generation full-resets to target and cannot target band boundaries.
- No per-asset tolerances or per-asset minimums.
- Uses JavaScript `number`.
- Fractional quantities are allowed.

Match to PRD/Meta Paper:

- Strong match for MVP threshold and cash-aware tolerance-band intent.
- Partial match for hybrid monitoring because no monitoring cadence is represented.
- Does not satisfy optimal-control or boundary-targeting requirements.

### Manual Forced Rebalance

What is implemented:

- `ManualRebalanceStrategy` always returns `isTriggered: true` and the reason `Manual rebalance requested.`
- It reuses shared valuation, proposal, simulation, and explanation logic.

Inputs required:

- Same shared inputs as threshold, though the trigger ignores state, drift, and policy.

Outputs produced:

- Trigger result plus shared proposal/simulation/explanation outputs.

Tests/fixtures validating it:

- `tests/manual-strategy.test.ts`
- `tests/smoke.test.ts`

Known limitations:

- Not selectable by scenario runner or policy.
- Not part of the Meta Paper taxonomy.
- No manual request metadata, actor, timestamp, or approval reason.

Match to PRD/Meta Paper:

- It supports a manual review/forced-rebalance workflow and proves strategy extensibility.
- It does not replace the missing calendar strategy that the PRD and MVP plan identified.

### No-Rebalance/Monitoring-Only Behavior

What is implemented:

- Threshold strategy returns `isTriggered: false` and `reason: null` when all assets are in band.
- Explanation reports that no rebalance was triggered.
- Scenario runner emits an audit record for no-trigger scenarios.

Known limitations:

- There is no explicit recommendation mode such as `MONITOR_ONLY`.
- Trade proposal generation can still be called independently; orchestration should eventually condition proposal generation on trigger semantics or policy.

## 8. Missing and Partial Strategy Assessment

| Strategy                               | What is missing                                                                     | Why it matters                                                             | Dependencies                                                 | Complexity     | Risks                                      | Include next iteration?   | Priority |
| -------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- | ------------------------------------------ | ------------------------- | -------- |
| Calendar-based                         | Strategy module, date/schedule policy, runner fixtures, explanation/audit metadata. | Explicitly carried from Meta Paper and PRD; easiest real missing strategy. | Strategy identifiers, policy schema, clock/evaluation date.  | Low to medium. | Ambiguous date semantics.                  | Yes.                      | P1       |
| Boundary-target threshold execution    | Execution target mode and band-boundary trade sizing.                               | Introduces first transaction-cost-aware behavior without full optimizer.   | Explicit policy schema, drift/band math, simulation updates. | Medium.        | Residual drift must be clearly explained.  | Yes.                      | P1       |
| Strategy selection/orchestration       | Policy cannot select strategy; runner hard-codes threshold.                         | Multi-strategy support cannot scale without this.                          | Strategy identifiers, registry, audit metadata.              | Medium.        | Over-abstraction.                          | Yes.                      | P0       |
| Cash-flow routing expansion            | Pending deposits/withdrawals, withdrawal sourcing, negative cash funding.           | Meta Paper emphasizes cash flows as lowest-friction rebalancing.           | Cash-flow model, flow direction, policy controls.            | Medium.        | Inventing withdrawal semantics too early.  | Near-term follow-up.      | P2       |
| Transaction-cost-aware optimal control | Cost model, no-trade region, optimizer, covariance/risk inputs.                     | Important institutional strategy.                                          | Boundary mode first, risk/cost schemas.                      | High.          | Black-box behavior, bad estimates.         | No, defer full optimizer. | P3       |
| Tax-aware/direct indexing              | Tax lots, basis, holding period, wash-sale, proxies, tax jurisdictions.             | High value for taxable HNW.                                                | Lot model, account tax profile, regulatory/tax assumptions.  | Very high.     | Incorrect tax outputs.                     | No, defer.                | P4       |
| Dynamic/regime/ML                      | Regime data, model governance, backtesting, explainability.                         | Research direction only.                                                   | Historical datasets, model ops, validation framework.        | Very high.     | Overfitting and poor auditability.         | No.                       | P5       |
| Factor/style                           | Factor model reconstitution semantics.                                              | Useful use case for calendar strategy.                                     | Calendar strategy and model versioning.                      | Medium.        | Factor assumptions outside current domain. | Later.                    | P4       |
| Private-market denominator effect      | Liquidity/stale pricing/asymmetric bands/proxy rebalancing.                         | Relevant to institutional portfolios.                                      | Asset liquidity metadata and stale pricing policy.           | High.          | False precision.                           | Later.                    | P4       |
| Digital assets                         | Extreme volatility and tax-lot policy.                                              | Niche and risky.                                                           | Tax-lot and volatility policy.                               | High.          | Destructive churn.                         | Later/defer.              | P5       |

## 9. Architectural Options for Multi-Strategy Support

### Option A - Wrapper / Meta-Orchestration Layer

Benefits:

- Central place for strategy selection, audit metadata, explanation assembly, and runner/API workflow.
- Keeps source strategies small.
- Can preserve existing calculation functions.

Costs:

- Adds an engine workflow abstraction not currently present.
- Risk of becoming a broad service layer too early.

Risks:

- If too powerful, it may hide strategy-specific assumptions.

MVP fit:

- Good if kept light.

Long-term fit:

- Good as the place to coordinate household, account type, and workflow-specific choices later.

Testability:

- Strong; orchestration can be tested through fixtures.

Extensibility:

- Strong when combined with a registry.

Complexity:

- Medium.

### Option B - Separate Endpoints / Interfaces per Strategy

Benefits:

- Simple to expose and reason about for early demos.
- Each strategy can have tailored request/response shapes.

Costs:

- Duplicates valuation, audit, simulation, and explanation wiring.
- Makes cross-strategy batch runner behavior harder.

Risks:

- Encourages divergent contracts and weak traceability.

MVP fit:

- Weak for this repository because there is no API layer yet.

Long-term fit:

- Weak as the primary architecture; can exist later as adapters.

Testability:

- Moderate, but duplicated test harnesses are likely.

Extensibility:

- Weak to medium.

Complexity:

- Low initially, high over time.

### Option C - Common Strategy Interface with Pluggable Modules

Benefits:

- Matches current `StrategyInterface`.
- Keeps strategy-specific trigger logic isolated.
- Easy to add calendar strategy.

Costs:

- Current interface only evaluates triggers; proposal adjustment and explanation additions are not covered.

Risks:

- If unchanged, boundary-target and tax-aware strategies will leak into core proposal generation.

MVP fit:

- Strong.

Long-term fit:

- Strong if evolved carefully.

Testability:

- Strong via conformance tests.

Extensibility:

- Strong.

Complexity:

- Low to medium.

### Option D - Policy-Driven Single Engine

Benefits:

- One entry point and one mental model.
- Simple for configuration consumers.

Costs:

- Complex conditional logic accumulates in one engine.
- Harder to test each strategy independently.

Risks:

- Strategy behavior becomes implicit and less auditable.

MVP fit:

- Medium for threshold/calendar, weak for advanced strategies.

Long-term fit:

- Weak as the primary implementation model.

Testability:

- Medium.

Extensibility:

- Medium to weak.

Complexity:

- Medium initially, high over time.

### Option E - Hybrid Approach

Common calculation core plus pluggable strategy modules plus a light orchestration layer.

Benefits:

- Preserves validated valuation/drift/proposal/simulation/audit functions.
- Gives policy an explicit `strategyType`.
- Allows orchestration to select modules and record metadata.
- Avoids separate endpoints and avoids overloading a single policy interpreter.
- Supports calendar and boundary-target slices without committing to a full optimizer.

Costs:

- Requires small domain model changes and compatibility handling.
- Requires strategy conformance tests.

Risks:

- The strategy interface must evolve beyond trigger-only at the point proposal targeting becomes strategy-specific.

MVP fit:

- Strong.

Long-term fit:

- Strong.

Testability:

- Strong.

Extensibility:

- Strong.

Complexity:

- Medium and controllable.

### Architecture Decision

Decision: Use a hybrid multi-strategy architecture: common calculation core, pluggable strategy modules, and a light orchestration layer.

Status: Accepted for next iteration.

Date: 2026-05-02

Context:

The MVP already has reusable valuation, drift, trade, simulation, explanation, and audit functions plus a trigger-only `StrategyInterface`. The next iteration needs calendar strategy and transaction-cost-aware boundary behavior without implementing full tax or stochastic optimization.

Options considered:

- Wrapper/meta-orchestration layer.
- Separate endpoints/interfaces per strategy.
- Common strategy interface with pluggable modules.
- Policy-driven single engine.
- Hybrid approach.

Preferred option:

Option E: Hybrid approach.

Rationale:

This is the smallest architecture that makes strategy selection explicit while preserving the validated core. It supports the next two strategy proof points and keeps future tax/optimizer work decoupled.

Trade-offs:

- Adds orchestration and policy metadata now.
- Defers full strategy-specific proposal hooks until boundary-target work requires them.
- Avoids API endpoint decisions until there is an API surface.

Reversibility:

High. The registry/orchestrator can remain an internal adapter and the current pure functions can continue to be called directly.

Implementation impact:

- Add strategy identifiers to `RebalancingPolicy`.
- Add strategy metadata to trigger/explanation/audit output.
- Add a strategy registry or selector.
- Update scenario fixtures and runner to select the configured strategy.
- Keep existing threshold behavior as backward-compatible default.

Validation approach:

- Baseline regression tests for existing threshold fixtures.
- Strategy conformance tests.
- Calendar strategy fixtures.
- Boundary-target fixtures.
- Audit replay tests including strategy metadata.

## 10. Recommended Next-Iteration Strategy Scope

### Next-Iteration MVP Scope

| Strategy/capability                     | Why it belongs                                                     | Dependencies                               | Expected proof point                                                              | Required tests                                                     | Documentation impact             |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------- |
| Explicit strategy selection             | Required for any multi-strategy claim.                             | Policy schema, registry, runner updates.   | Same threshold outputs with explicit strategy metadata.                           | Backward compatibility, runner selection, audit metadata.          | PRD, plan, README, fixture docs. |
| Calendar-based strategy                 | Meta Paper and PRD carry-forward; low-complexity missing strategy. | Schedule/date policy, evaluation date.     | Calendar fixture triggers on due date and not otherwise.                          | Calendar unit tests, scenario tests, explanation/audit tests.      | Strategy docs and decision log.  |
| Boundary-target execution for threshold | First transaction-cost-aware proof point without full optimizer.   | Execution target mode, band-boundary math. | Proportional-cost policy trades to band edge and leaves explained residual drift. | Proposal math, simulation residual drift, audit/explanation tests. | Policy docs and fixtures.        |

### Near-Term Follow-Up

- Pending cash-flow model with deposits and withdrawals.
- Per-instrument/per-account tolerances and minimum trade sizes.
- Decimal/rounding policy decision.
- Gross trade value reporting in addition to sell-side turnover.

### Later-Stage

- Full transaction-cost-aware no-trade-region optimizer.
- Tax-aware/direct-indexing/tax-lot support.
- Factor/style reconstitution beyond generic calendar.
- Private-market denominator-effect support.

### Explicitly Deferred

- ML/regime-aware strategy logic.
- Production execution integration.
- Live market data integration.
- UI.
- Database persistence.
- Multi-currency.
- Regulatory suitability engine.

## 11. Risks, Assumptions, and Open Questions

Risks:

- Strategy-selection risk: policy schema could be too narrow for later strategies.
- Architecture risk: trigger-only strategy interface may become insufficient once proposal targeting varies by strategy.
- Product risk: calendar strategy is easy to implement but less strongly recommended than threshold for general portfolios.
- Calculation risk: boundary targeting can leave residual drift that must be explicit.
- Testing risk: fixtures need expected strategy outcomes, not only valid input shapes.
- Documentation risk: "cash-aware" may be mistaken for full cash-flow strategy support.

Assumptions:

- Existing TypeScript/Node.js stack remains in place.
- Existing threshold behavior must remain the default for backward compatibility.
- No live integrations are introduced in the next iteration.
- Calendar strategy uses supplied evaluation dates, not system time.
- Boundary-target execution is limited to threshold bands and does not claim full optimal control.

Open questions requiring human input:

- What calendar frequencies should be supported first: monthly, quarterly, annually, or explicit next-review date?
- Should calendar strategy trigger even when the portfolio is in band, or should it optionally require minimum drift?
- Should boundary targeting use absolute bands only in the first slice, or support relative bands immediately?
- Should strategy identifiers be enum strings in policy fixtures or typed discriminated unions?
- Is manual strategy a supported product strategy or only a development proof point?

## 12. Recommendation

Recommended next architecture:

- Hybrid architecture with common core functions, pluggable strategy modules, and a light orchestration/registry layer.

Recommended implementation sequence:

1. Lock current MVP regression behavior.
2. Add explicit strategy identifiers and audit metadata.
3. Update runner/orchestrator to select strategy from policy with threshold as backward-compatible default.
4. Implement calendar strategy.
5. Implement threshold boundary-target execution mode.
6. Extend explanations, audit records, fixtures, and docs.

First next-iteration slice:

- Baseline lock and policy schema extension for explicit strategy selection.

What should not be implemented yet:

- Full optimal control optimizer.
- Tax-lot/direct-indexing engine.
- ML/regime-aware models.
- Live market data or execution integrations.
- UI or persistence.
