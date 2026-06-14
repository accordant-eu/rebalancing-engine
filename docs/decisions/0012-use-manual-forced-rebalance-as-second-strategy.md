---
type: Decision Record
title: Use manual forced rebalance as second strategy
description: Decision to use manual forced rebalance as second strategy
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Use manual forced rebalance as second strategy

## Context

Slice 11 needs a second strategy proof point to validate architecture extensibility. The plan suggested a calendar strategy, but any simple second trigger mode can prove shared core reuse if it remains isolated from valuation, drift, proposal, simulation, explanation, and audit logic.

## Options Considered


1. Calendar strategy.
   - Benefits: Mentioned in the MVP plan and common in rebalancing workflows.
   - Costs: Requires date/time inputs, schedule policy semantics, and deterministic clock handling.
   - Risks: Introduces premature temporal policy decisions.
   - Reversibility: Medium; date fields would become part of public strategy inputs.

2. Manual forced-rebalance strategy.
   - Benefits: Proves Strategy extensibility with minimal new domain assumptions.
   - Costs: Less sophisticated than calendar scheduling.
   - Risks: Does not validate date/time handling.
   - Reversibility: High; calendar can still be added later.

3. Cash-flow trigger strategy.
   - Benefits: Closely related to cash-aware MVP behavior.
   - Costs: Requires cash-flow event modeling not currently present.
   - Risks: Premature expansion of input schema.
   - Reversibility: Medium.

## Decision

Option 2: Manual forced-rebalance strategy.

## Rationale

Manual forced rebalance is the smallest useful proof point. It validates that strategies can differ only in trigger logic while reusing shared core workflow functions.

## Implementation Impact


- Code: Added `ManualRebalanceStrategy` and strategy barrel exports.
- Tests: Added manual strategy tests proving trigger behavior and reuse of shared proposal, simulation, and explanation logic.
- Fixtures: Existing fixtures are sufficient.
- Documentation: README and build journey now list the second strategy.
- Follow-up: Calendar strategy can be added post-MVP once date/time policy is specified.

## Validation

Run tests, type-check, lint, build, format, and `npm run scenario:run`.


&copy; 2026 Johan Hellman. All rights reserved.
