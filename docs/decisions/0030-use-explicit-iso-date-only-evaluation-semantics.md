---
type: Decision Record
title: Use explicit ISO date-only evaluation semantics
description: Decision to use explicit iso date-only evaluation semantics
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Use explicit ISO date-only evaluation semantics

## Context

Scheduled events require a deterministic date bound. The engine must not read wall-clock time or infer time zones.

## Options Considered


1. Use top-level `RebalancingPolicy.evaluationDate`, with evaluation input and calendar policy fallback.
   - Benefits: Works for threshold/manual/calendar strategies and explicit file mode.
   - Costs: Adds a policy field that is not strictly a trigger policy.

2. Use only `policy.calendar.evaluationDate`.
   - Benefits: Reuses existing date field.
   - Costs: Couples scheduled flows to calendar strategy.

3. Add a separate mandatory evaluation context file.
   - Benefits: Cleaner conceptual separation.
   - Costs: Larger CLI and fixture change.

## Decision

Option 1.

## Rationale

It is the smallest deterministic interface that works through existing scenario and explicit-file CLI modes. `RebalanceEvaluationInput.evaluationDate` remains available for callers that have an explicit orchestration context.

## Implementation Impact

Date-only validation requires `YYYY-MM-DD`. Due events include `effectiveDate <= evaluationDate`; future events are excluded and warned. Time zones, business-day calendars, and holidays are unsupported.

## Validation

Tests cover before/on/after dates and invalid date-time strings.


&copy; 2026 Johan Hellman. All rights reserved.
