---
type: Decision Record
title: Use hybrid multi-strategy architecture next
description: Decision to use hybrid multi-strategy architecture next
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted for next iteration
---

# Use hybrid multi-strategy architecture next

## Context

The full-chain strategy traceability review found that the current MVP has a tested common calculation core and trigger-only strategy modules, but `RebalancingPolicy` does not select a strategy and the scenario runner hard-codes `ThresholdStrategy`. The next iteration needs real multi-strategy support without implementing full tax, optimizer, live-data, or execution systems.

## Options Considered


1. Wrapper/meta-orchestration layer only.
   - Benefits: Centralizes strategy selection and workflow metadata.
   - Costs: Can become too broad if it owns strategy logic.
   - Risks: May hide strategy assumptions.
   - Reversibility: High if kept internal.

2. Separate endpoints or interfaces per strategy.
   - Benefits: Simple for isolated demos.
   - Costs: Duplicates valuation, simulation, explanation, and audit wiring.
   - Risks: Divergent contracts and weaker cross-strategy traceability.
   - Reversibility: Medium.

3. Common strategy interface with pluggable modules only.
   - Benefits: Matches the current `StrategyInterface`.
   - Costs: Current interface only handles triggers, not proposal targeting.
   - Risks: Boundary-target, tax-aware, and optimizer logic could leak into core helpers.
   - Reversibility: High.

4. Policy-driven single engine.
   - Benefits: One entry point for consumers.
   - Costs: Encourages large conditional logic inside one engine.
   - Risks: Strategy behavior becomes implicit and harder to audit.
   - Reversibility: Medium.

5. Hybrid approach: common calculation core plus pluggable strategy modules plus a light orchestration layer.
   - Benefits: Preserves validated core functions while making strategy selection explicit and testable.
   - Costs: Requires policy metadata, a selector/registry, and orchestration tests.
   - Risks: Strategy interface evolution must be controlled.
   - Reversibility: High because the orchestrator can remain an internal adapter.

## Decision

Option 5: Hybrid approach.

## Rationale

This is the smallest architecture that supports explicit strategy selection, calendar strategy, and boundary-target threshold behavior while preserving the validated MVP core. It avoids premature API endpoint design and avoids concentrating all future strategy behavior in one policy interpreter.

## Implementation Impact


- Code: Future slices should add strategy identifiers to `RebalancingPolicy`, a selector/registry, and a light evaluation orchestrator.
- Tests: Add strategy selection, conformance, runner, explanation, and audit tests.
- Fixtures: Add mixed strategy fixtures.
- Documentation: Reflect the architecture in the next-iteration PRD and MVP plan.
- Follow-up: Revisit the strategy interface when proposal targeting becomes strategy-specific.

## Validation

The next iteration should first prove backward-compatible threshold behavior, then add calendar and boundary-target fixtures through the shared runner.


&copy; 2026 Johan Hellman. All rights reserved.
