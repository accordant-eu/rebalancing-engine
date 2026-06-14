---
type: Decision Record
title: Mark active MVP slice sets complete
description: Decision to mark active mvp slice sets complete
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Mark active MVP slice sets complete

## Context

After implementing the original MVP and the next-iteration multi-strategy MVP, the user requested continuing until the full set of slices defined in the MVP approach had been implemented. Repository inspection showed that the remaining items were documented post-MVP deferrals, while some historical docs and TODO comments still described completed capabilities as future work.

## Options Considered


1. Treat deferred post-MVP items as additional implicit MVP slices.
   - Benefits: Pushes more capability into the engine immediately.
   - Costs: Expands scope beyond the accepted PRD and MVP plans.
   - Risks: Adds production assumptions for decimal arithmetic, optimization, tax lots, cash-flow workflows, live integrations, and APIs without fresh requirements.
   - Reversibility: Medium.

2. Treat the active slice sets as complete and reconcile stale documentation/tests.
   - Benefits: Preserves the documented scope boundary, removes ambiguity, and keeps deferred work behind explicit future decisions.
   - Costs: Does not add new strategy breadth beyond the current MVP slice set.
   - Risks: Future readers may still consult historical audits without reading the current completion note.
   - Reversibility: High.

3. Create a new MVP expansion plan immediately for all deferred strategies.
   - Benefits: Gives a path for broader post-MVP work.
   - Costs: Planning work without a current implementation ask or product decision.
   - Risks: Prematurely prioritizes large features that were intentionally deferred.
   - Reversibility: High.

## Decision

Option 2: Treat the active original MVP and next-iteration MVP slice sets as complete for offline deterministic fixtures, then reconcile stale documentation and old TODO comments.

## Rationale

The implemented behavior satisfies the slice plans as written. Production precision, tax lots, optimizers, richer cash flows, APIs, UI, persistence, and live integrations are meaningful future products, but they are not unfinished slices in the accepted MVP approach.

## Implementation Impact


- Code: No new strategy behavior; updated trade proposal comments to match current behavior.
- Tests: Converted stale edge-case TODO comments into executable assertions for already implemented proposal behavior.
- Fixtures: No fixture schema change.
- Documentation: Added explicit completion evidence and removed stale future-scope references for completed manifest/calendar/minimum-trade work.
- Follow-up: Start a new scoped plan before implementing deferred post-MVP capabilities.

## Validation

The final validation gate should rerun format, Jest, type-check, lint, build, scenario runner, manifest validation, and diff whitespace checks.


&copy; 2026 Johan Hellman. All rights reserved.
