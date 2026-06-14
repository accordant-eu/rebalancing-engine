---
type: Guide
title: Adding Rebalancing Strategies
description: Documentation for adding rebalancing strategies
tags: [guide]
timestamp: 2026-06-14T00:00:00Z
---

# Adding Rebalancing Strategies

Date: 2026-05-02

This guide explains how to add or extend rebalancing strategies in this repository. It is repository-specific and assumes the current TypeScript architecture.

## Strategy Architecture Overview

Strategies are trigger modules. They decide whether a rebalance should happen and explain why. They do not own valuation, drift calculation, trade sizing, post-trade simulation, explanations, audit serialization, or CLI rendering.

Current strategies:

- `threshold`: implemented in [src/strategy/threshold.ts](../../src/strategy/threshold.ts). Triggers when one or more drift measurements are outside absolute or relative tolerance bands.
- `calendar`: implemented in [src/strategy/calendar.ts](../../src/strategy/calendar.ts). Triggers when caller-supplied evaluation date reaches the configured next rebalance date.
- `manual`: implemented in [src/strategy/manual.ts](../../src/strategy/manual.ts). Always triggers when selected.

The strategy contract is `StrategyInterface` in [src/models/domain.ts](../../src/models/domain.ts):

```ts
export interface StrategyInterface {
  evaluateTrigger(
    state: PortfolioState,
    drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult;
}
```

Strategies are selected by `policy.strategyType` in [src/core/evaluation.ts](../../src/core/evaluation.ts). Omitted strategy defaults to `threshold`.

```ts
const STRATEGY_REGISTRY: Record<RebalancingStrategyType, StrategyInterface> = {
  threshold: new ThresholdStrategy(),
  manual: new ManualRebalanceStrategy(),
  calendar: new CalendarRebalanceStrategy(),
};
```

What belongs in a strategy module:

- Trigger condition evaluation.
- Strategy-specific trigger reason.
- Strategy-specific trigger metadata.
- Validation that is inherently strategy-specific, such as calendar config presence.

What belongs in shared core logic:

- Valuation and cash-flow treatment.
- Target allocation validation.
- Drift measurement.
- Trade proposal sizing.
- Minimum-trade suppression.
- Tax-lot allocation metadata.
- Post-trade simulation.
- Explanation construction.
- Audit record construction.

Trigger logic and trade proposal logic are deliberately separate. A triggered strategy currently flows into shared `generateTradeProposal`, where policy fields such as `executionTargetMode`, `boundaryBandMode`, and `sellSelectionMode` determine proposal behavior. Add strategy-specific proposal hooks only after a documented decision shows that shared proposal logic cannot represent the behavior.

Explanations and audit records must reflect strategy behavior through existing outputs:

- `TriggerResult.strategyType`
- `TriggerResult.reason`
- `TriggerResult.metadata`
- `TradeProposal.executionTargetMode`
- `TradeProposal.boundaryBandMode`
- Warnings and post-trade simulation output

## When to Add a New Strategy

Add a new strategy when the trigger semantics are meaningfully different from existing strategies and cannot be expressed as a policy option on an existing strategy.

Prefer another change when:

- A tolerance parameter changes threshold behavior: add or extend a policy option.
- Trade sizing changes while trigger logic stays the same: add or extend a proposal mode.
- A constraint suppresses or reshapes trades: add a shared constraint in core proposal logic.
- A scenario only demonstrates existing behavior: add a fixture, not a strategy.
- The behavior needs live data, optimizer objectives, tax advice, or production integration: defer to PRD/roadmap until prerequisites are defined.
- The strategy only changes explanation text without calculation impact: update explanation/audit behavior, not strategy selection.

## Required Design Decision

Before adding a strategy, document a decision in `BUILD_JOURNEY.md` or a relevant PRD/plan using the project decision structure.

Required content:

- Strategy name and stable strategy ID.
- Strategy purpose and user problem.
- Evidence or rationale from PRD, roadmap, stakeholder request, or fixture gap.
- Required inputs.
- Trigger behavior.
- Proposal behavior.
- Policy schema changes.
- Output changes.
- Explanation changes.
- Audit changes.
- CLI exposure.
- Tests and fixtures.
- Compatibility with existing strategies.
- Backward-compatibility considerations.

Minimum decision template:

```md
Decision: Add <strategy-id> strategy

Status: Proposed
Date: YYYY-MM-DD

Context:
<Why this strategy is needed and what current behavior cannot express.>

Options considered:

1. Add a new strategy.
2. Extend an existing strategy/policy.
3. Add a proposal mode or constraint.
4. Defer.

Preferred option:
<Chosen option.>

Rationale:
<Trade-off explanation.>

Implementation impact:
<Domain, strategy registry, core, CLI, fixtures, tests, docs, audit, explanation.>

Validation:
<Commands and test coverage required.>
```

## Step-by-Step Implementation Checklist

1. Review PRD and roadmap alignment.
2. Add or update PRD/plan if the strategy is substantial.
3. Record the strategy decision in the decision log.
4. Add or update domain and policy types in `src/models/domain.ts`.
5. Implement the strategy module in `src/strategy`.
6. Export the strategy from `src/strategy/index.ts`.
7. Register the strategy in `STRATEGY_REGISTRY` in `src/core/evaluation.ts`.
8. Reuse shared valuation, drift, cash-flow, trade, and simulation logic.
9. Add or update explanation behavior only from output fields.
10. Add or update audit metadata.
11. Add synthetic fixtures in `tests/fixtures/scenarios.json`.
12. Update `tests/fixtures/scenario-expectations.json`.
13. Update `tests/fixtures/README.md`.
14. Add strategy unit tests.
15. Add policy validation or evaluation tests.
16. Add fixture/scenario runner tests.
17. Add CLI validate/run/batch/inspect tests.
18. Ensure `inspect strategies` exposes the strategy or document why not.
19. Update CLI, user, developer, and strategy docs.
20. Update README if the capability is user-facing.
21. Update `BUILD_JOURNEY.md`.
22. Run full checks.
23. Commit with a focused message.

## Strategy Implementation Template

Illustrative only. Do not copy this as production logic without a real strategy decision and tests.

```ts
import {
  DriftMeasurement,
  PortfolioState,
  RebalancingPolicy,
  StrategyInterface,
  TriggerResult,
} from '../models/domain';

export class ExampleStrategy implements StrategyInterface {
  evaluateTrigger(
    state: PortfolioState,
    drift: DriftMeasurement[],
    policy: RebalancingPolicy,
  ): TriggerResult {
    void state;

    const conditionMet = drift.some((measurement) => measurement.isOutOfBand);

    return {
      isTriggered: conditionMet,
      reason: conditionMet ? 'Example strategy condition was met.' : null,
      strategyType: 'example',
      metadata: {
        // Keep metadata deterministic and audit-safe.
        evaluatedInstrumentCount: drift.length,
      },
    };
  }
}
```

Corresponding type and registry changes:

```ts
export type RebalancingStrategyType = 'threshold' | 'manual' | 'calendar' | 'example';
```

```ts
const STRATEGY_REGISTRY: Record<RebalancingStrategyType, StrategyInterface> = {
  threshold: new ThresholdStrategy(),
  manual: new ManualRebalanceStrategy(),
  calendar: new CalendarRebalanceStrategy(),
  example: new ExampleStrategy(),
};
```

Fixture shape:

```json
{
  "id": "example_strategy_triggered",
  "description": "Synthetic example for the example strategy.",
  "portfolioState": { "accountId": "acc-example", "cash": 0, "holdings": [] },
  "targetAllocation": { "targets": [] },
  "priceSnapshot": { "prices": {} },
  "policy": {
    "strategyType": "example",
    "absoluteDriftTolerance": 0.05,
    "minimumTradeSize": 100
  }
}
```

That fixture is structurally illustrative only; a real fixture must satisfy target-allocation and price requirements for the behavior under test.

## Testing Requirements for New Strategies

Required tests:

- Strategy unit tests for trigger true and trigger false cases.
- Policy validation tests for required strategy-specific fields.
- Evaluation tests proving strategy selection and metadata.
- No-op behavior tests when the strategy should not trigger.
- Edge-case tests for missing inputs, invalid dates, zero targets, cash-flow interactions, or other relevant boundaries.
- Fixture/scenario tests using synthetic data.
- Scenario expectation manifest coverage.
- CLI `validate`, `run`, `batch`, and `inspect strategies` tests.
- Explanation tests when reason, metadata, warnings, or output text changes.
- Audit tests when output structure or metadata changes.
- Backward-compatibility regression tests proving existing threshold/calendar/manual fixtures still behave as expected.

Useful commands:

```bash
npm test -- --runInBand tests/evaluation.test.ts tests/cli.test.ts tests/scenario-runner.test.ts
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run scenario:run
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
```

## CLI Requirements for New Strategies

Every new engine strategy must be exposed through the CLI or intentionally not exposed with a documented rationale.

Required CLI work when exposed:

- `inspect strategies` lists the strategy.
- Scenario/policy input supports the strategy ID.
- `validate` runs valid and invalid strategy scenarios.
- `run` produces summary, pretty, and JSON output without special hidden flags.
- `batch` handles the strategy in manifest runs and expectation validation.
- JSON output includes any new strategy metadata in audit output.
- Pretty/summary output stays accurate if trigger or proposal semantics differ.
- Help/reference documentation is updated.
- CLI tests cover inspect, validate, run, and batch behavior.

Avoid CLI strategy overrides unless a dedicated decision explains how override metadata remains audit-safe. The current project rule is that scenario and policy input files are the source of truth.

## Anti-Patterns

Avoid:

- Duplicating valuation or drift logic inside a strategy.
- Duplicating trade-sizing or simulation logic inside a strategy.
- Adding hidden CLI overrides that are not visible in audit inputs or outputs.
- Adding strategy-specific behavior directly into generic modules without a decision.
- Changing financial semantics without tests and documentation.
- Adding unsupported post-MVP features under a strategy label.
- Using real client data in fixtures.
- Leaving a strategy out of `inspect strategies` without documented rationale.
- Updating code without updating CLI docs, user docs, developer docs, fixture docs, tests, and `BUILD_JOURNEY.md`.
- Making explanations diverge from calculation outputs.
- Adding broad strategy abstractions before a concrete second use case exists.
