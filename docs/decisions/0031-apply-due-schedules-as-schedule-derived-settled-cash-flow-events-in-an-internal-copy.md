---
type: Decision Record
title: Apply due schedules as schedule-derived settled cash-flow events in an internal copy
description: Decision to apply due schedules as schedule-derived settled cash-flow events in an internal copy
tags: [architecture, cash-flow]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Apply due schedules as schedule-derived settled cash-flow events in an internal copy

## Context

Due scheduled flows should affect valuation and proposals consistently with settled cash-flow behavior without mutating the caller's original portfolio state.

## Options Considered


1. Append generated `SETTLED` cash flows to an internal portfolio copy.
   - Benefits: Reuses existing cash-flow valuation/proposal behavior and preserves original inputs.
   - Costs: Requires source metadata and double-count prevention.

2. Add a third `CashFlowStatus` such as `SCHEDULED` to `cashFlows`.
   - Benefits: Single array.
   - Costs: Blurs pending/scheduled/applicable status and risks accidental valuation inclusion.

3. Recalculate available cash separately from `cashFlows`.
   - Benefits: Avoids generated records.
   - Costs: Duplicates cash-flow math and weakens audit traceability.

## Decision

Option 1.

## Rationale

It is deterministic, traceable, and consistent with existing settled withdrawal/deposit proposal behavior. Generated IDs use `schedule:<cashFlowScheduleId>:<effectiveDate>`; matching explicit cash-flow IDs are treated as already represented to avoid double counting.

## Implementation Impact

Added `src/core/cash-flows.ts`, integrated expansion in `evaluateRebalance`, and included `cashFlowScheduleSummary` in audit/explanation/CLI output.

## Validation

Tests cover due deposits, due withdrawals, future schedules, recurring expansion, and already-settled/double-count behavior.


&copy; 2026 Johan Hellman. All rights reserved.
