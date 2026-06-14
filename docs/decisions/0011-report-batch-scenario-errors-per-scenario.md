---
type: Decision Record
title: Report batch scenario errors per scenario
description: Decision to report batch scenario errors per scenario
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Report batch scenario errors per scenario

## Context

Slice 10 adds a batch scenario runner. Existing fixtures intentionally include invalid cases such as missing prices and invalid target allocations, so the runner needs clear batch failure semantics.

## Options Considered


1. Abort the entire batch on the first scenario error.
   - Benefits: Simple control flow.
   - Costs: Hides later scenario results.
   - Risks: Less useful for fixture audit and regression review.
   - Reversibility: High.

2. Return per-scenario success/error results.
   - Benefits: Runs all fixtures, preserves expected invalid-case coverage, and produces complete reviewable output.
   - Costs: Consumers must inspect statuses.
   - Risks: A CI wrapper must decide whether expected errors are acceptable.
   - Reversibility: High; stricter modes can be added later.

3. Skip invalid scenarios.
   - Benefits: Keeps output success-only.
   - Costs: Hides important failure-mode fixtures.
   - Risks: Weakens validation of error behavior.
   - Reversibility: Medium.

## Decision

Option 2: Return per-scenario success/error results.

## Rationale

This best fits the MVP fixture harness because invalid scenarios are intentional and should remain visible without blocking other scenarios from being evaluated.

## Implementation Impact


- Code: Added `runScenarios`, `runScenario`, fixture loading, and CLI output under `src/runner`.
- Tests: Added runner determinism and success/error classification tests.
- Fixtures: Existing invalid fixtures are now part of batch output.
- Documentation: README documents `npm run scenario:run`.
- Follow-up: Final hardening can add an expected-status manifest if batch output becomes a CI gate.

## Validation

Run tests, type-check, lint, build, format, and `npm run scenario:run`.
