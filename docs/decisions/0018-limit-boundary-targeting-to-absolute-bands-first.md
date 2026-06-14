---
type: Decision Record
title: Limit boundary targeting to absolute bands first
description: Decision to limit boundary targeting to absolute bands first
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted for MVP
---

# Limit boundary targeting to absolute bands first

## Context

The traceability review recommended boundary-target execution as the smallest transaction-cost-aware proof point. The existing drift model supports both absolute and relative tolerance breaches, but boundary execution can become ambiguous when multiple tolerances apply.

## Options Considered


1. Implement absolute-band boundary targeting first.
   - Benefits: Deterministic, easy to explain, and directly testable.
   - Costs: Relative-boundary policies remain deferred.
   - Risks: Users may expect relative tolerance to influence boundary mode immediately.
   - Reversibility: High.

2. Implement absolute and relative boundary targeting together.
   - Benefits: More complete tolerance support.
   - Costs: Requires policy decisions when absolute and relative boundaries conflict.
   - Risks: Larger blast radius and possible hidden assumptions.
   - Reversibility: Medium.

3. Defer all boundary targeting until full optimal control.
   - Benefits: Avoids partial transaction-cost-aware behavior.
   - Costs: Misses a small, high-value proof point.
   - Risks: Strategy architecture remains trigger-only longer.
   - Reversibility: High.

## Decision

Option 1: Implement absolute-band boundary targeting first.

## Rationale

Absolute-band boundary mode demonstrates reduced-turnover execution while keeping the math explicit and auditable. Full optimal control and relative-boundary conflict resolution remain later-stage decisions.

## Implementation Impact


- Code: `generateTradeProposal` supports `executionTargetMode: "boundary"` and trades breached positions to `targetWeight +/- absoluteDriftTolerance`.
- Tests: Added boundary trade sizing and post-trade residual drift tests.
- Fixtures: Added `threshold_boundary_target`.
- Documentation: Boundary mode is documented as not full optimal control.

## Validation

Boundary fixture produces lower sell-side turnover than full reset and leaves post-trade drift inside absolute tolerance.


&copy; 2026 Johan Hellman. All rights reserved.
