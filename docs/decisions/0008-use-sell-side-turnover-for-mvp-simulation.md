---
type: Decision Record
title: Use sell-side turnover for MVP simulation
description: Decision to use sell-side turnover for mvp simulation
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Use sell-side turnover for MVP simulation

## Context

The MVP needs a turnover estimate. Prior test-audit notes proposed `turnover = sum of sell values / total portfolio value`, while other definitions such as gross traded value are also reasonable.

## Options Considered


1. Sell-side turnover: sum of SELL estimated values divided by starting total portfolio value.
   - Benefits: Aligns with prior audit note and highlights secondary-market liquidation volume.
   - Costs: Buy-only cash deployment has zero turnover even though trades occur.
   - Risks: Consumers may confuse turnover with gross trade volume.
   - Reversibility: Medium; a future field can add gross traded value if needed.

2. Gross turnover: sum of all BUY and SELL estimated values divided by starting total portfolio value.
   - Benefits: Captures all operational trading activity.
   - Costs: Counts cash deployment as turnover, which weakens cash-aware comparison.
   - Risks: Could overstate rebalancing friction.
   - Reversibility: Medium; changing semantics later would affect reports.

3. Lower-of-buys-or-sells turnover.
   - Benefits: Common in fund reporting contexts.
   - Costs: Less intuitive for proposal simulation and cash-flow scenarios.
   - Risks: Harder to explain in MVP output.
   - Reversibility: Medium.

## Decision

Option 1: Sell-side turnover.

## Rationale

This aligns with the existing audit recommendation and the MVP focus on minimizing unnecessary sales when cash can be deployed.

## Implementation Impact


- Code: `simulatePostTrade` reports `turnover` as sell value over starting total portfolio value.
- Tests: Full-reset turnover and buy-only cash deployment turnover are explicitly tested.
- Fixtures: No fixture changes required.
- Documentation: Build journey records the semantic choice.
- Follow-up: Add a separate `grossTradeValue` or `grossTradeRatio` later if reporting requires it.

## Validation

Run tests, type-check, lint, build, and format after implementation.


&copy; 2026 Johan Hellman. All rights reserved.
