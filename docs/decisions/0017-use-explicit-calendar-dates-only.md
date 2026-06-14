---
type: Decision Record
title: Use explicit calendar dates only
description: Decision to use explicit calendar dates only
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted for MVP
---

# Use explicit calendar dates only

## Context

Calendar strategy was the clearest missing Meta Paper/PRD carry-forward, but full scheduling semantics can quickly expand into business calendars, holidays, persistence windows, frequency-derived dates, and system-clock behavior.

## Options Considered


1. Use system time to decide whether a rebalance is due.
   - Benefits: Simple for runtime operation.
   - Costs: Non-deterministic tests and audit replay.
   - Risks: Violates deterministic fixture requirements.
   - Reversibility: Medium.

2. Require caller-supplied `evaluationDate` and `nextRebalanceDate`.
   - Benefits: Deterministic, auditable, and fixture-friendly.
   - Costs: Caller must calculate the next date.
   - Risks: Date-generation responsibility is deferred.
   - Reversibility: High.

3. Implement frequency-derived next dates, holidays, and business-day rolling now.
   - Benefits: More complete calendar behavior.
   - Costs: Adds date policy complexity not needed for the proof point.
   - Risks: Premature assumptions and extra test surface.
   - Reversibility: Medium.

## Decision

Option 2: Require caller-supplied dates.

## Rationale

This proves calendar strategy support while preserving deterministic replay and keeping date-policy assumptions outside the calculation core.

## Implementation Impact


- Code: `CalendarRebalanceStrategy` reads `policy.calendar.evaluationDate` and `policy.calendar.nextRebalanceDate`.
- Tests: Added due, not-due, missing-config, runner, and audit coverage.
- Fixtures: Added `calendar_due` and `calendar_not_due`.
- Documentation: Calendar limitations are documented.

## Validation

Calendar due/not-due tests and mixed scenario runner tests pass.


&copy; 2026 Johan Hellman. All rights reserved.
