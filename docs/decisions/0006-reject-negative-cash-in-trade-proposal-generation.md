---
type: Decision Record
title: Reject negative cash in trade proposal generation
description: Decision to reject negative cash in trade proposal generation
tags: [architecture, cash-flow]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Reject negative cash in trade proposal generation

## Context

Negative cash becomes meaningful once cash-aware trade proposal logic exists. The MVP has no withdrawal workflow, margin model, or deficit-funding policy, so negative cash cannot be reliably interpreted.

## Options Considered


1. Treat negative cash as a hard error during trade proposal generation.
   - Benefits: Prevents ambiguous funding behavior and forces upstream reconciliation.
   - Costs: Cannot generate proposals for cash-deficit accounts yet.
   - Risks: Some real-world accounts with pending sweeps would require preprocessing.
   - Reversibility: High; a later withdrawal/deficit policy can add explicit behavior.

2. Ignore negative cash and continue.
   - Benefits: Simple and permissive.
   - Costs: Produces unreliable proposals because funding is understated.
   - Risks: Silent bad recommendations.
   - Reversibility: Low; consumers may rely on unsafe behavior.

3. Automatically sell overweight assets to cover negative cash.
   - Benefits: Moves toward a cash-deficit workflow.
   - Costs: Adds withdrawal/deficit funding semantics not in the current slice.
   - Risks: Premature execution policy and possible tax/cost implications.
   - Reversibility: Medium; would likely need redesign when withdrawal requirements are known.

## Decision

Option 1: Treat negative cash as a hard error during trade proposal generation.

## Rationale

This follows the project bias toward explicit validation over silent fallback behavior. It avoids inventing withdrawal or margin semantics before they are in scope.

## Implementation Impact


- Code: `generateTradeProposal` throws on negative cash.
- Tests: Added negative-cash proposal test.
- Fixtures: No persistent negative-cash fixture added; the behavior is tested inline because negative cash is invalid for Slice 6 proposals.
- Documentation: Fixture README documents the negative-cash assumption.
- Follow-up: Revisit if withdrawal handling or deficit funding becomes an MVP or post-MVP requirement.

## Validation

Run tests, type-check, lint, build, and format after implementation.
