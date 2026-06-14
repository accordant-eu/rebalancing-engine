---
type: Decision Record
title: Suppress below-minimum trades with structured warnings
description: Decision to suppress below-minimum trades with structured warnings
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Suppress below-minimum trades with structured warnings

## Context

Slice 6 introduces minimum trade-size constraints. The engine needs to decide whether below-minimum trades should be errors, silently removed, or visible non-blocking adjustments.

## Options Considered


1. Throw an error when a proposed trade is below `minimumTradeSize`.
   - Benefits: Prevents uneconomic proposals from being missed.
   - Costs: Blocks otherwise useful recommendations.
   - Risks: A small residual trade could prevent a portfolio review entirely.
   - Reversibility: Medium; callers would need to change error handling later.

2. Suppress below-minimum trades and emit structured warnings.
   - Benefits: Keeps the proposal usable while preserving auditability and explainability.
   - Costs: Residual drift remains and must be surfaced later.
   - Risks: Consumers must read warnings, not only trades.
   - Reversibility: High; warning schema can be extended without breaking core calculations.

3. Silently drop below-minimum trades.
   - Benefits: Simplest output.
   - Costs: Hides financial decision-making.
   - Risks: Violates auditability and explainability expectations.
   - Reversibility: Low; hidden behavior is hard to diagnose later.

## Decision

Option 2: Suppress below-minimum trades and emit structured warnings.

## Rationale

This is deterministic, MVP-compatible, and auditable. It avoids blocking the proposal while making the constraint impact explicit for future simulation, explanation, and audit records.

## Implementation Impact


- Code: `TradeProposal` now includes `warnings`; `generateTradeProposal` applies the global `minimumTradeSize` when a policy is supplied.
- Tests: Added coverage for the `min_trade_size_issue` fixture suppressing two small trades and emitting warnings.
- Fixtures: Existing fixture remains valid and is documented in `tests/fixtures/README.md`.
- Documentation: README and build journey now describe Slice 6 behavior.
- Follow-up: Slice 7 should quantify residual drift after suppressed trades; Slice 8/9 should include warnings in explanations and audit records.

## Validation

Run tests, type-check, lint, build, and format after implementation.


&copy; 2026 Johan Hellman. All rights reserved.
