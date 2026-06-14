---
type: PRD
title: Rebalancing Engine Next Iteration Prd
description: Documentation for rebalancing engine next iteration prd
tags: [prd]
timestamp: 2026-06-14T00:00:00Z
---

# Rebalancing Engine Next-Iteration PRD

Date: 2026-05-02

## 1. Title

Generic Portfolio Rebalancing Engine: Multi-Strategy Strategy Selection and First Missing Strategies

## 2. Background and Context

The current MVP supports an offline deterministic calculation core for threshold/tolerance-band rebalancing with cash-aware full-reset trade proposals. It includes valuation, current weights, drift calculation, threshold trigger evaluation, minimum-trade suppression warnings, post-trade simulation, deterministic explanations, replayable audit records, synthetic fixtures, and a batch scenario runner. It also includes a manual forced-rebalance trigger as a second strategy proof point.

The Meta Paper identifies broader strategy families beyond the current MVP: calendar-based rebalancing, threshold/hybrid rebalancing, transaction-cost-aware optimal control, tax-aware/direct-indexing rebalancing, and dynamic/regime-switching/machine-learning rebalancing. It also emphasizes cash-flow routing and target-versus-boundary execution as practical cross-strategy capabilities.

The next iteration is needed because the current MVP proves deterministic threshold behavior but does not yet support explicit strategy selection, calendar rebalancing, or transaction-cost-aware boundary execution. The previous PRD already anticipated a generic multi-strategy engine; this PRD converts the next missing strategy gaps into a sliceable product scope.

## 3. Product Objective

Extend the rebalancing engine from an offline threshold-focused MVP into a multi-strategy rebalancing engine capable of selecting explicit strategy modules, preserving current threshold behavior, adding calendar rebalancing, and introducing a first transaction-cost-aware boundary-target execution mode without implementing full optimization or tax-lot systems.

## 4. Strategy Scope

### Included Strategies

| Strategy/capability                 | Description                                                                                 | Why included                                                                  | Expected value                                                       | Required inputs                                                                | Required outputs                                                        | Dependencies                                              | MVP proof point                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Explicit strategy selection         | `RebalancingPolicy` declares which strategy should evaluate the scenario.                   | Required for credible multi-strategy support.                                 | Prevents hard-coded runner behavior and improves audit traceability. | Strategy identifier, existing policy fields.                                   | Strategy metadata in trigger/explanation/audit.                         | Policy schema and runner/orchestrator.                    | Existing threshold fixtures produce same results with explicit strategy metadata. |
| Threshold/tolerance-band default    | Preserve current threshold behavior.                                                        | Backward compatibility and core MVP value.                                    | Existing users and tests remain stable.                              | Portfolio, prices, target, tolerance policy.                                   | Trigger/proposal/simulation/explanation/audit.                          | Current MVP core.                                         | Existing test suite remains passing.                                              |
| Calendar-based rebalancing          | Trigger based on supplied evaluation date and schedule policy.                              | Explicitly identified by Meta Paper and PRD; low-complexity missing strategy. | Proves real second research-backed strategy.                         | Evaluation date, frequency or next review date, target allocation.             | Trigger result, full-reset proposal, explanation/audit metadata.        | Strategy selection and deterministic date handling.       | Due-date fixture triggers; non-due fixture does not.                              |
| Boundary-target threshold execution | Under proportional-cost policy, trade to nearest tolerance boundary instead of full target. | First transaction-cost-aware behavior without full stochastic optimizer.      | Reduces turnover and demonstrates execution target flexibility.      | Tolerance bands, execution target mode, cost mode/proportional-cost indicator. | Partial trade proposal, residual drift, explanation and audit metadata. | Policy schema, proposal-generation extension, simulation. | Fixture shows lower trade value than full reset and post-trade drift inside band. |

### Deferred Strategies

- Full transaction-cost-aware no-trade-region optimization.
- Tax-aware/direct-indexing/tax-lot rebalancing.
- Dynamic/regime-switching/machine-learning strategies.
- Factor/style-specific reconstitution beyond generic calendar scheduling.
- Private-market denominator-effect handling.
- Digital-asset extreme-volatility policy.
- Full withdrawal/negative-cash funding strategy.

## 5. Target Users and Use Cases

Product and engineering users:

- Configure strategy identifiers and policy fields in fixtures or future API requests.
- Validate that existing threshold policies remain backward compatible.

Portfolio managers:

- Review threshold, calendar, and boundary-target recommendations from a consistent output contract.
- Compare full-reset and boundary-target behavior for proportional-cost accounts.

Advisers/operators:

- Review deterministic explanations showing why a recommendation fired and what residual drift remains.

Batch scenario users:

- Run mixed strategy fixtures through one scenario runner.
- Inspect per-scenario audit records and deterministic errors.

Future API consumers:

- Depend on stable strategy identifiers and output metadata before live API endpoints are added.

## 6. Functional Requirements

### Shared Requirements

- The engine must accept a policy-level strategy identifier.
- The engine must preserve the current threshold behavior when no strategy identifier is supplied or when `threshold` is supplied.
- The engine must evaluate strategies through a common internal strategy contract.
- The engine must include strategy metadata in trigger, explanation, and audit outputs.
- The engine must produce deterministic outputs from identical inputs.
- The engine must continue to support synthetic JSON fixture execution.
- The scenario runner must support multiple strategy policies in the same fixture file.
- Validation errors must remain explicit and per-scenario in the runner.
- No strategy may use system time directly; dates must come from input metadata.

### Strategy-Specific Requirements

Threshold strategy:

- Must continue to evaluate absolute and relative drift.
- Must continue to support no-trigger monitoring behavior.
- Must continue to support full-reset proposal generation as the default execution mode.

Calendar strategy:

- Must support deterministic due/not-due trigger evaluation from input date metadata.
- Must not require drift breach to trigger in its initial form.
- Must reuse existing proposal, simulation, explanation, and audit functions.
- Must explain the schedule condition that caused or prevented the trigger.

Boundary-target execution mode:

- Must be selectable by policy for threshold strategies.
- Must calculate trade amounts that move breached assets to the nearest acceptable band boundary.
- Must leave residual drift intentionally and surface that residual in simulation and explanation.
- Must not claim to be full optimal control.
- Must initially support liquid long-only assets and static prices only.

### Deferred Requirements

- Tax lots, HIFO, wash-sale rules, and proxy security selection.
- Covariance matrices, utility functions, stochastic programming, and optimizer dependencies.
- Live market data, OMS routing, REST API, database persistence, and UI.
- Multi-currency conversion.
- Regulatory suitability scoring.

## 7. Non-Functional Requirements

- Determinism: identical inputs must produce identical outputs.
- Reproducibility: audit records must contain enough context to replay strategy decisions.
- Testability: each strategy must have unit tests, fixture tests, and runner coverage.
- Extensibility: adding a new strategy must not require rewriting valuation, drift, simulation, explanation, or audit code.
- Explainability: strategy trigger reason and execution target mode must be human-readable.
- Auditability: strategy identifier, policy snapshot, trigger, proposal, simulation, warnings, and explanation must be serialized.
- Minimal dependency footprint: no optimizer, decimal, database, web server, or scheduling dependency unless separately justified.
- Backward compatibility: current threshold fixtures and public exports should continue to work.
- Migration clarity: any added policy fields must have defaults or fixture updates.

## 8. Domain Model and Interface Impact

Expected changes:

- `RebalancingPolicy`: add explicit strategy identifier, execution target mode, and optional calendar schedule metadata.
- Strategy identifiers: define stable values such as `threshold`, `manual`, and `calendar`.
- `TriggerEvaluation` / `TriggerResult`: include strategy identifier and optional trigger metadata.
- `TradeProposal`: may include execution target mode and strategy/execution metadata.
- `Explanation`: include strategy-specific trigger and residual-drift explanation.
- `AuditRecord`: include strategy metadata and execution target mode in serialized output.
- Scenario fixtures: add mixed strategy examples and expected-status metadata if introduced.
- CLI/scenario runner: use policy-driven strategy selection instead of hard-coded threshold.
- Tests: add strategy conformance tests and regression tests for existing threshold behavior.

## 9. Architecture Decision

Architecture pattern:

- Hybrid approach: common calculation core, pluggable strategy modules, and a light orchestration/registry layer.

Rationale:

- The existing common core is already tested and should remain stable.
- Strategy-specific trigger behavior should remain isolated.
- The runner and future API workflows need a single orchestration path for strategy selection, audit metadata, and explanation wiring.
- Separate endpoints are premature because the repository currently has no API layer.
- A fully policy-driven single engine would accumulate conditionals and weaken strategy traceability.

Alternatives considered:

- Wrapper/meta-orchestration only.
- Separate endpoints/interfaces per strategy.
- Common strategy interface only.
- Policy-driven single engine.

Implications:

- Add a strategy registry/selector.
- Keep direct pure-function tests for valuation, drift, trades, and simulation.
- Add orchestration tests for end-to-end strategy behavior.
- Evolve the strategy interface only when proposal targeting requires it.

How it supports future strategies:

- Tax-aware and optimizer strategies can later own proposal adjustment logic without rewriting the common core.
- Calendar, manual, and threshold can share valuation, drift, proposal, simulation, explanation, and audit outputs.

## 10. MVP Boundary for Next Iteration

In scope:

- Strategy identifiers and policy schema extension.
- Backward-compatible threshold execution.
- Calendar strategy.
- Boundary-target execution mode for threshold policies.
- Mixed-strategy fixtures and scenario runner support.
- Explanation and audit metadata.
- Documentation and decision-log updates.

Out of scope:

- Full tax-lot optimization.
- Production execution integration.
- Live market data integration.
- Full UI.
- Database persistence.
- Advanced optimizer.
- Machine-learning strategy logic.
- Regulatory suitability engine.
- Multi-currency.
- Tax jurisdiction logic.
- Full household or multi-account optimization.

## 11. Acceptance Criteria

- Existing threshold tests pass unchanged or with only additive metadata expectations.
- A policy can explicitly select threshold, manual, or calendar strategy.
- The scenario runner no longer hard-codes threshold for all scenarios.
- Calendar strategy triggers deterministically on due input dates and does not trigger on non-due dates.
- Boundary-target threshold mode generates smaller trades than full reset for a breached proportional-cost fixture.
- Boundary-target post-trade simulation leaves assets inside tolerance bands and explains residual drift.
- Audit records include strategy identifier, execution target mode, and policy snapshot.
- Explanations identify strategy-specific trigger rationale.
- Mixed strategy fixtures run deterministically.
- Documentation describes included and deferred strategies.
- No live integration, optimizer, tax, UI, or database dependency is introduced.

## 12. Risks and Mitigations

| Risk                                                     | Impact                            | Mitigation                                                                             |
| -------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| Strategy policy schema is too broad or too narrow.       | Future migrations become awkward. | Start with explicit enum-like identifiers and minimal optional strategy config.        |
| Calendar date semantics are ambiguous.                   | Incorrect trigger behavior.       | Use input evaluation date and documented frequency/next-date rules; avoid system time. |
| Boundary targeting is mistaken for full optimal control. | Product overclaim.                | Name it threshold boundary-target mode and document full optimizer as deferred.        |
| Residual drift appears as a bug.                         | User confusion.                   | Explain and audit residual drift as intentional under boundary mode.                   |
| Existing threshold behavior regresses.                   | MVP instability.                  | Baseline regression tests before feature slices.                                       |
| Strategy interface expands prematurely.                  | Over-engineering.                 | Evolve only when boundary proposal behavior requires it.                               |

## 13. Open Questions

| Question                                                      | Default assumption                                           | Blocking?                               |
| ------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Which calendar frequencies are required first?                | Quarterly plus explicit next-review date.                    | Blocks calendar implementation detail.  |
| Should calendar trigger ignore drift completely?              | Yes for first implementation.                                | No, if documented.                      |
| Should boundary targeting support relative bands immediately? | Start with absolute bands; add relative support if low-risk. | No for first proof point.               |
| Should manual be a product-supported strategy?                | Treat as internal/proof strategy until explicitly accepted.  | No.                                     |
| Should decimal arithmetic be adopted before boundary mode?    | Revisit but do not add by default.                           | Potentially blocks production, not MVP. |


&copy; 2026 Johan Hellman. All rights reserved.
