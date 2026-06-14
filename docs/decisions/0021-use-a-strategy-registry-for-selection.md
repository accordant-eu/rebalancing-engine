---
type: Decision Record
title: Use a strategy registry for selection
description: Decision to use a strategy registry for selection
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Use a strategy registry for selection

## Context

The refactoring assessment found that `evaluateRebalance` is the main public orchestration API, but strategy selection was hidden in a switch and supported strategies were not directly discoverable. The next refactor should improve extension clarity without adding new strategy behavior or changing financial outputs.

## Options Considered


1. Keep the switch-based selector.
   - Benefits: Minimal code and already working.
   - Costs: Supported strategies are not exposed as data.
   - Risks: Future additions may keep spreading strategy-selection knowledge through code paths.
   - Reversibility: High.

2. Use a registry of stateless strategy instances.
   - Benefits: Makes supported strategies explicit and easy to inspect; keeps the existing `StrategyInterface`; avoids changing strategy behavior.
   - Costs: Future strategies still require registry updates.
   - Risks: Registry instances must remain stateless or be replaced with factories.
   - Reversibility: High.

3. Introduce a broader strategy execution abstraction with proposal hooks now.
   - Benefits: Prepares for future strategies with custom proposal generation.
   - Costs: Premature abstraction because only threshold boundary mode currently needs special proposal sizing.
   - Risks: Adds interface surface before requirements justify it.
   - Reversibility: Medium.

## Decision

Option 2: Use a registry of stateless strategy instances and expose supported strategy identifiers.

## Rationale

This is the smallest behavior-preserving improvement to strategy-selection clarity. It supports the existing hybrid architecture while deferring proposal hooks until a second strategy needs materially different sizing behavior.

## Implementation Impact


- Code: `src/core/evaluation.ts` now resolves strategies through `STRATEGY_REGISTRY`, exposes `supportedStrategyTypes`, and keeps `selectStrategy` explicit for unsupported identifiers.
- Tests: Added direct `evaluateRebalance` characterization coverage for threshold default behavior, calendar no-trigger metadata, supported strategy listing, and unsupported strategy errors.
- Fixtures: No fixture changes.
- Documentation: Refactoring assessment and build journey record the decision and completed slice.
- Follow-up: Revisit strategy proposal hooks only when another strategy needs proposal behavior that cannot remain cleanly shared.

## Validation

Focused evaluation tests, full Jest suite, TypeScript, ESLint, build, scenario runner, expected-status manifest validation, formatting, and diff whitespace checks should pass before commit.


&copy; 2026 Johan Hellman. All rights reserved.
