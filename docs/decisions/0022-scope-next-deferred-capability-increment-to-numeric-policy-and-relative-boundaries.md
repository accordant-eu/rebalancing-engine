---
type: Decision Record
title: Scope next deferred-capability increment to numeric policy and relative boundaries
description: Decision to scope next deferred-capability increment to numeric policy and relative boundaries
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted for next increment
---

# Scope next deferred-capability increment to numeric policy and relative boundaries

## Context

The original offline deterministic MVP and next-iteration multi-strategy MVP are implemented, tested, documented, committed, and pushed. Remaining work is post-MVP: decimal / rounding policy, relative-boundary targeting, richer cash flows, tax lots, full optimizer, and live integrations / API / UI / database. The next increment needs to improve correctness and usefulness without blindly expanding into incoherent or production-heavy scope.

## Options Considered


1. Correctness and policy semantics increment: decimal / rounding policy plus relative-boundary targeting.
   - Benefits: Addresses financial correctness and extends existing boundary mode using already available relative drift concepts.
   - Costs: Requires numeric helper and serialization decisions before adding user-facing workflows.
   - Risks: Decimal migration can cause small output changes if rounding boundaries are unclear.
   - Reversibility: High if public interfaces remain number-based for now.

2. Practical portfolio workflow increment: decimal / rounding policy plus richer cash flows.
   - Benefits: Directly improves real portfolio workflow usefulness.
   - Costs: Cash-flow semantics affect valuation, trigger logic, proposal funding, warnings, explanations, and audit records at once.
   - Risks: Could silently encode withdrawal or pending-flow assumptions too early.
   - Reversibility: Medium.

3. Tax-aware foundations increment: decimal / rounding policy plus basic tax-lot primitives.
   - Benefits: Opens taxable-account workflows.
   - Costs: Requires lot data structures and sell-selection policy decisions.
   - Risks: Easy to imply jurisdiction-specific tax advice or optimizer behavior.
   - Reversibility: Medium.

4. Multi-capability expansion increment: decimal policy, relative boundaries, richer cash flows, and limited tax lots.
   - Benefits: Broad post-MVP progress.
   - Costs: Too many domain surfaces change at once.
   - Risks: High architecture and testing risk.
   - Reversibility: Low-medium.

5. Productionization increment: API wrapper, persistence layer, and integration boundaries.
   - Benefits: Makes the engine easier to expose externally.
   - Costs: Adds infrastructure before domain behavior is stable enough.
   - Risks: Security, operational, and testing burden without current product need.
   - Reversibility: Medium.

## Decision

Option 1: Implement numeric policy and relative-boundary targeting first.

## Rationale

Numeric policy is the clearest correctness prerequisite for any later financial workflow. Relative-boundary targeting is the smallest coherent strategy-policy extension because trigger logic already calculates relative drift and execution already has boundary mode. Richer cash flows should be the next separate workflow increment after numeric and boundary semantics are stable. Tax lots, optimizer, and production surfaces remain deferred because they need clearer objectives and larger domain decisions.

## Implementation Impact


- Code: Add explicit numeric/rounding helpers, deterministic audit serialization rounding, and relative boundary band mode.
- Tests: Add precision-sensitive tests, deterministic serialization tests, and relative-boundary trade/fixture coverage.
- Fixtures: Add a relative-boundary scenario and manifest entry.
- Documentation: Add deferred-capabilities PRD and MVP plan; update README, fixture docs, audit report, and this build journey as slices complete.
- Follow-up: Reassess richer cash flows after this increment is validated.

## Validation

Run the full test suite, TypeScript build, ESLint, scenario runner, manifest validation, and formatting before each focused commit.
