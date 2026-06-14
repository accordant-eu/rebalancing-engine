---
type: Decision Record
title: Default omitted strategy policy to threshold
description: Decision to default omitted strategy policy to threshold
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Default omitted strategy policy to threshold

## Context

The repository already has fixtures, tests, docs, and callers that rely on threshold behavior without a strategy selector. The next iteration adds explicit strategy identifiers, but existing MVP behavior must remain stable.

## Options Considered


1. Require `strategyType` on every policy immediately.
   - Benefits: Forces explicit configuration.
   - Costs: Breaks all existing fixtures and callers.
   - Risks: Creates unnecessary migration churn for no behavioral gain.
   - Reversibility: Medium.

2. Default omitted `strategyType` to `threshold`.
   - Benefits: Preserves existing behavior while enabling explicit strategy selection.
   - Costs: A policy can still be implicit.
   - Risks: Consumers may rely on defaults longer than intended.
   - Reversibility: High; strict validation can be added later.

3. Infer strategy from other policy fields.
   - Benefits: Reduces one field in simple cases.
   - Costs: Hidden behavior and ambiguous policies.
   - Risks: Violates auditability and explicit decision discipline.
   - Reversibility: Low.

## Decision

Option 2: Default omitted `strategyType` to `threshold`.

## Rationale

This keeps the next iteration backward compatible and makes the default strategy explicit in code and docs without forcing fixture churn.

## Implementation Impact


- Code: Strategy selector resolves missing strategy to threshold.
- Tests: Existing threshold tests remain valid; runner tests cover mixed explicit strategies.
- Fixtures: Existing threshold fixtures can remain concise; new fixtures use explicit strategy fields.
- Documentation: Fixture README documents the default.

## Validation

Existing threshold tests and scenario runner tests pass with omitted strategy type.
