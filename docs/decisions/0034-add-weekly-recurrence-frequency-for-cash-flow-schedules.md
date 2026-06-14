---
type: Decision Record
title: Add weekly recurrence frequency for cash-flow schedules
description: Decision to add weekly recurrence frequency for cash-flow schedules
tags: [architecture, cash-flow]
timestamp: 2026-06-14T00:00:00Z
status: Accepted for next increment
---

# Add weekly recurrence frequency for cash-flow schedules

## Context

The engine supports monthly, quarterly, and annual recurrence for scheduled cash flows. The owner uses a broker that supports weekly contributions, making this a real-world gap.

## Options Considered


1. Keep only monthly/quarterly/annual.
   - Benefits: No implementation change.
   - Costs: Cannot model weekly contribution schedules.
   - Risks: Reduces usefulness for real broker workflows.
   - Reversibility: High.

2. Add weekly recurrence.
   - Benefits: Covers common broker-supported contribution frequency.
   - Costs: Additional date arithmetic and edge-case tests.
   - Risks: May open the door to business-day/holiday questions.
   - Reversibility: High.

3. Add weekly and custom intervals.
   - Benefits: Maximum scheduling flexibility.
   - Costs: Custom intervals add significant complexity.
   - Risks: Premature calendar semantics.
   - Reversibility: Medium.

## Decision
 Option 2.

## Rationale

Weekly is a concrete real-world frequency the owner needs. Custom intervals add complexity without a confirmed use case. Business-day and holiday semantics remain deferred.

## Implementation Impact

- Code: Add `WEEKLY` to recurrence frequency enum; add weekly expansion logic.
- Tests: Add weekly recurrence expansion, edge-case, and month-boundary tests.
- Fixtures: Add weekly contribution scenario.
- CLI: Validation and output rendering should accept weekly schedules.

## Validation

Implement and test alongside existing recurrence frequencies.
