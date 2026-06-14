---
type: Decision Record
title: Use `decimal.js` internally with explicit output rounding
description: Decision to use `decimal.js` internally with explicit output rounding
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Use `decimal.js` internally with explicit output rounding

## Context

The deferred-capabilities PRD selected numeric precision and rounding policy as the first implementation slice. Existing code used JavaScript `number` arithmetic directly, which produced binary floating-point artifacts in drift, valuation, simulation, scenario output, and audit records. The engine still needs backward-compatible number-based public interfaces in this increment.

## Options Considered


1. Keep JavaScript `number` arithmetic and only round display output.
   - Benefits: Smallest code change and no dependency.
   - Costs: Internal calculations still carry avoidable binary artifacts.
   - Risks: Undermines the correctness goal of the deferred slice.
   - Reversibility: High.

2. Use `decimal.js` internally while keeping public interfaces number-based.
   - Benefits: Improves arithmetic determinism and preserves compatibility with fixtures and callers.
   - Costs: Adds a runtime dependency and still converts outputs to numbers.
   - Risks: A later production API may need decimal strings for exact wire contracts.
   - Reversibility: Medium.

3. Convert all public monetary, quantity, and weight fields to decimal strings.
   - Benefits: Stronger production-grade wire precision.
   - Costs: Broad breaking API and fixture change.
   - Risks: Premature migration before API/integration requirements exist.
   - Reversibility: Low-medium.

## Decision

Option 2: Use `decimal.js` internally with explicit output rounding boundaries.

## Rationale

This option materially improves calculation correctness without breaking the existing MVP public shape. It also creates a central numeric policy that can later support decimal-string APIs if production integrations require them.

## Implementation Impact


- Dependency: Added `decimal.js`.
- Code: Added `src/core/numeric.ts`; valuation, drift, trade proposal, simulation, threshold explanation formatting, and audit serialization use the central numeric helpers.
- Tests: Added precision-sensitive valuation/trade tests and deterministic rounded audit serialization coverage.
- Documentation: README, deferred-capabilities PRD/plan, and build journey document the policy.
- Follow-up: Revisit decimal string inputs/outputs before live API or database work.

## Validation

Jest, TypeScript build, ESLint, scenario runner, and manifest validation pass after implementation.


&copy; 2026 Johan Hellman. All rights reserved.
