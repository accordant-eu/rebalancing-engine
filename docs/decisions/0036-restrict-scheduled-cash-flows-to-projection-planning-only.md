---
type: Decision Record
title: Restrict scheduled cash flows to projection/planning only
description: Decision to restrict scheduled cash flows to projection/planning only
tags: [architecture, cash-flow]
timestamp: 2026-06-14T00:00:00Z
status: Accepted
---

# Restrict scheduled cash flows to projection/planning only

## Context

The current implementation expands due scheduled cash flows into available cash for trade proposals, with warnings. The owner questioned whether the engine should make assumptions about money that hasn't confirmed arrived.

## Options Considered


1. Keep current behavior: expand due schedules into cash and warn.
   - Benefits: Useful for offline planning scenarios.
   - Costs: Makes assumptions about external events.
   - Risks: Could drive incorrect trade proposals if scheduled cash didn't actually arrive.

2. Restrict scheduled flows to projection/planning only.
   - Benefits: Engine only uses confirmed data; no assumptions about what happened outside its boundary.
   - Costs: Requires behavioral change; planning/simulation must be a separate mode or output section.
   - Risks: Existing fixtures and tests will need updating.

## Decision
 Option 2.

## Rationale

The owner's principle: "If the input says Cash X, that's what the engine should assume." In the live-agent model, the broker reports actual cash balance. Scheduled flows remain useful for projection/simulation but should not inflate available cash for actionable recommendations.

## Implementation Impact

- Code: Change `evaluateRebalance` to exclude due scheduled flows from available cash for proposals; add projection/simulation output section.
- Tests: Update scheduled-flow tests to reflect new behavior.
- Fixtures: Update scheduled-flow fixtures and expectations.
- CLI: Update output rendering for projection vs actionable sections.


&copy; 2026 Johan Hellman. All rights reserved.
