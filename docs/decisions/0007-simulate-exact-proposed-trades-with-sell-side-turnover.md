---
type: Decision Record
title: Simulate exact proposed trades with sell-side turnover
description: Decision to simulate exact proposed trades with sell-side turnover
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Simulate exact proposed trades with sell-side turnover

## Context

Slice 7 requires post-trade holdings, weights, residual drift, turnover, and reconciliation checks. The engine needs explicit semantics for how simulation applies trades and how turnover is calculated.

## Options Considered


1. Apply proposed quantities exactly and validate reconciliation.
   - Benefits: Deterministic, replayable, and directly tied to proposal output.
   - Costs: Does not model execution slippage, rounding, or partial fills.
   - Risks: Fractional quantities remain a simplification until rounding policy exists.
   - Reversibility: High; execution-aware simulation can be layered later.

2. Recompute ideal post-trade state from targets instead of applying trades.
   - Benefits: Simple for full-reset cases.
   - Costs: Hides proposal mistakes and constraint impacts.
   - Risks: Would miss residual drift from suppressed minimum-size trades.
   - Reversibility: Medium; tests would need to be rewritten around replay semantics.

3. Add execution-style rounding and fill simulation now.
   - Benefits: Closer to real trading.
   - Costs: Requires lot-size, fractional-share, order-type, and execution assumptions outside MVP scope.
   - Risks: Premature complexity and misleading precision.
   - Reversibility: Medium; hard to unwind once consumers depend on rounded behavior.

## Decision

Option 1: Apply proposed quantities exactly and validate reconciliation.

## Rationale

Exact replay is the best MVP trade-off. It proves proposals can be simulated, preserves residual drift from constraints, and avoids premature execution assumptions.

## Implementation Impact


- Code: Added `simulatePostTrade` with post-trade state, valuation, weights, residual drift, and turnover.
- Tests: Added full-reset, cash deployment, suppressed-trade residual drift, oversell rejection, and cash reconciliation tests.
- Fixtures: Existing fixtures are sufficient.
- Documentation: README and build journey now describe Slice 7 simulation.
- Follow-up: Add rounding and execution-fill assumptions only when a later requirement demands them.

## Validation

Run tests, type-check, lint, build, and format after implementation.
