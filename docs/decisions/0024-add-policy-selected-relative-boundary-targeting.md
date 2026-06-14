---
type: Decision Record
title: Add policy-selected relative boundary targeting
description: Decision to add policy-selected relative boundary targeting
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Add policy-selected relative boundary targeting

## Context

The next deferred-capabilities increment selected relative-boundary targeting after numeric policy. The engine already calculated relative drift and supported threshold boundary execution, but boundary sizing only used absolute bands. The implementation needed to preserve absolute-boundary behavior while allowing policies to opt into relative boundaries.

## Options Considered


1. Keep only absolute boundary execution.
   - Benefits: No behavior change.
   - Costs: Leaves selected policy semantics unimplemented.
   - Risks: Relative drift can trigger a rebalance but cannot drive boundary-sized execution.
   - Reversibility: High.

2. Add `boundaryBandMode?: "absolute" | "relative"` as a threshold boundary execution option.
   - Benefits: Backward-compatible default, explicit policy shape, and small implementation surface.
   - Costs: Relative mode remains tied to threshold boundary execution rather than becoming a broader optimizer.
   - Risks: Callers must understand that trigger tolerances and boundary sizing are related but distinct policy fields.
   - Reversibility: High.

3. Replace existing tolerance fields with a larger tolerance-band schema.
   - Benefits: Cleaner long-term schema for combining absolute and relative tolerances.
   - Costs: Breaking fixture/API migration for limited immediate value.
   - Risks: Premature schema churn.
   - Reversibility: Medium.

## Decision

Option 2: Add policy-selected relative boundary targeting.

## Rationale

This is the smallest coherent extension of the existing boundary mode. Absolute boundary remains the default for backward compatibility. Relative boundary mode requires an explicit `relativeDriftTolerance`, uses `targetWeight +/- targetWeight * relativeDriftTolerance`, and rejects zero-target instruments that require a boundary trade because relative bands are undefined around zero.

## Implementation Impact


- Code: Added `BoundaryBandMode`, `RebalancingPolicy.boundaryBandMode`, trade proposal/audit metadata, and relative boundary sizing validation.
- Tests: Added unit coverage for relative boundary trades, missing tolerance, zero-target invalid behavior, simulation, explanation, audit metadata, fixtures, and runner manifest.
- Fixtures: Added `threshold_relative_boundary_target`.
- Documentation: README, fixture docs, deferred-capabilities PRD/plan, and build journey now describe relative-boundary behavior.
- Follow-up: Richer cash flows remain the next likely practical workflow increment.

## Validation

Jest, TypeScript build, ESLint, scenario runner, and 13-entry manifest validation pass after implementation.
