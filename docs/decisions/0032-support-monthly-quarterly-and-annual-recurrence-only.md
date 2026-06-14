---
type: Decision Record
title: Support monthly, quarterly, and annual recurrence only
description: Decision to support monthly, quarterly, and annual recurrence only
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Support monthly, quarterly, and annual recurrence only

## Context

The MVP needs recurring contribution and withdrawal semantics without a broad scheduling engine.

## Options Considered


1. One-off schedules only.
   - Benefits: Smallest implementation.
   - Costs: Does not satisfy recurring-flow objective.

2. Monthly, quarterly, and annual recurrence.
   - Benefits: Covers common contribution/withdrawal planning while remaining deterministic.
   - Costs: Requires month-end rules and recurrence validation.

3. Weekly/custom intervals and business-day adjustment.
   - Benefits: Broader scheduling expressiveness.
   - Costs: Adds calendar semantics outside current MVP scope.

## Decision

Option 2.

## Rationale

Monthly/quarterly/annual are enough for the current offline planning increment. Weekly/custom recurrence, holidays, and business-day rules remain deferred.

## Implementation Impact

`recurrence.frequency` supports `MONTHLY`, `QUARTERLY`, and `ANNUAL`; optional `endDate` and `occurrenceCount` can bound expansion further, while evaluation date bounds open-ended recurrence.

## Validation

Unit tests cover monthly month-end clamping, quarterly expansion, annual leap-day clamping, end-date behavior, and unsupported frequency rejection.
