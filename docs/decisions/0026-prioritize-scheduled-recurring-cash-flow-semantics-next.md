---
type: Decision Record
title: Prioritize scheduled/recurring cash-flow semantics next
description: Decision to prioritize scheduled/recurring cash-flow semantics next
tags: [architecture, cash-flow]
timestamp: 2026-05-02T00:00:00Z
status: Accepted for planning
---

# Prioritize scheduled/recurring cash-flow semantics next

## Context

The repository has completed the offline deterministic MVP, the multi-strategy iteration, decimal-backed numeric policy, relative-boundary targeting, explicit settled/pending cash-flow foundations, generic tax-lot allocation metadata, optimizer deferral, production-boundary deferral, and a documented CLI. The latest feedback identifies remaining limitations: no scheduled/recurring cash-flow workflow, no full optimizer, no jurisdiction-specific tax handling or tax advice, and no API/UI/database/persistence/live/integration surfaces.

## Options Considered


1. Build scheduled/recurring cash-flow semantics next.
   - Benefits: Extends implemented cash-flow foundations, improves practical portfolio workflows, remains deterministic/offline, and can be covered by fixtures and CLI tests.
   - Costs: Requires careful date, recurrence, pending/scheduled/realized terminology, and anti-double-counting decisions.
   - Risks: Users may infer banking/payment behavior unless the boundary is explicit.
   - Reversibility: High if the model is additive and optional.

2. Draft a dedicated productionization PRD next.
   - Benefits: Clarifies API, security, persistence, and operational requirements before infrastructure work.
   - Costs: Less immediate domain capability unless concrete consumers are known.
   - Risks: Without real consumer requirements, it may remain abstract.
   - Reversibility: High as documentation, lower once code starts.

3. Draft or implement an optimizer PRD next.
   - Benefits: Addresses complex constraints and transaction-cost optimization.
   - Costs: Requires objective functions, constraints, solver policy, fallback behavior, and explainability decisions not yet defined.
   - Risks: Premature solver abstractions can reduce auditability and increase dependency risk.
   - Reversibility: Medium.

4. Draft or implement a tax-aware PRD next.
   - Benefits: Useful for taxable-account workflows.
   - Costs: Requires jurisdictional, legal, and product input.
   - Risks: Tax advice boundary is high risk.
   - Reversibility: Medium-low if public semantics are published.

5. Stop at roadmap cleanup with no next increment.
   - Benefits: Low risk and clarifies backlog.
   - Costs: Does not move the engine forward after a clear adjacent domain gap was identified.
   - Reversibility: High.

## Decision

Option 1. Use scheduled/recurring cash-flow semantics as the next implementation increment, preceded by Slice 0 baseline verification and Slice 1 terminology/decision lock.

## Rationale

Scheduled and recurring cash flows are the closest unimplemented domain capability to existing code. They can be implemented offline with synthetic scenarios, make current cash-flow behavior more useful, preserve deterministic auditability, and avoid full optimizer, tax, and production infrastructure risk.

## Implementation Impact


- Code: Future slices should add optional schedule/recurrence types, deterministic expansion, and valuation/proposal integration.
- CLI: Future slices must update `validate`, `run`, `batch`, `inspect`, help text, outputs, examples, and CLI tests.
- Tests: Future slices must add engine, runner, fixture, audit/explanation, and CLI coverage.
- Fixtures: Add synthetic scheduled/recurring deposit and withdrawal scenarios plus invalid schedule scenarios.
- Documentation: Roadmap, PRD, implementation plan, README, fixture docs, CLI docs, and this build journey must stay aligned.

## Validation

This planning slice creates roadmap and planning documents only. Implementation validation remains the existing documentation/build/test gate; schedule behavior must not be claimed implemented until code, fixtures, CLI, and tests exist.


&copy; 2026 Johan Hellman. All rights reserved.
