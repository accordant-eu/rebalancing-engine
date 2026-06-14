---
type: Decision Record
title: Defer production surfaces until concrete consumers and operations are defined
description: Decision to defer production surfaces until concrete consumers and operations are defined
tags: [architecture]
timestamp: 2026-05-02T00:00:00Z
status: Accepted
---

# Defer production surfaces until concrete consumers and operations are defined

## Context

The engine now has deterministic strategy selection, decimal-backed calculations, boundary targeting, offline cash-flow handling, generic tax-lot allocation metadata, explanations, audit records, scenario fixtures, and documented optimizer deferral. The remaining live integrations / API / UI / database capability would move the project from a calculation core into production delivery and operations.

## Options Considered


1. Implement an API wrapper now.
   - Benefits: Gives external callers an immediate service boundary.
   - Costs: Requires wire contracts, versioning, authentication assumptions, deployment choices, and error-shape decisions.
   - Risks: Premature contracts may conflict with future decimal-string, persistence, or consumer requirements.
   - Reversibility: Medium; published API contracts are harder to change than internal TypeScript interfaces.

2. Add database-backed persistence now.
   - Benefits: Starts an audit-retention path.
   - Costs: Requires schema, migration, retention, privacy, and operational decisions.
   - Risks: Persistence shape could harden before audit consumers, retention rules, and deletion requirements are known.
   - Reversibility: Medium; data migrations and compatibility concerns accumulate quickly.

3. Add adapter scaffolding for future providers.
   - Benefits: Names future integration boundaries.
   - Costs: Creates unused abstractions around unknown broker, custodian, banking, market-data, and execution contracts.
   - Risks: Interfaces are likely to be wrong without a real provider and consumer.
   - Reversibility: High-medium; removing unused abstractions is possible but creates churn.

4. Keep the engine offline/library/CLI oriented and document production prerequisites.
   - Benefits: Preserves deterministic, testable domain behavior and avoids infrastructure/security risk.
   - Costs: No hosted or persistent product surface is available yet.
   - Risks: Future productionization still needs a dedicated PRD and plan.
   - Reversibility: High; production surfaces can be added once concrete requirements exist.

## Decision

Option 4. Keep live integrations, API, UI, and database deferred while documenting the production boundary and revisit criteria.

## Rationale

The calculation core has enough domain breadth to remain useful without production infrastructure. API, UI, database, and live integrations require concrete consumer, security, provider-contract, deployment, monitoring, and regulatory decisions that are not yet specified. Documenting the boundary now prevents overclaiming production readiness while avoiding speculative architecture.

## Implementation Impact


- Code: No runtime behavior or dependencies change.
- Tests: Existing tests and scenario fixtures remain the regression gate.
- Fixtures: No fixture shape changes.
- Documentation: Add production-boundary PRD, plan, and audit; update README and this build journey.
- Developer workflow: Continue validating through local tests, build, lint, scenario runner, and manifest validation.

## Validation

Run format, full Jest suite, TypeScript build, ESLint, scenario runner, and expected-status manifest validation. Confirm no application framework, database dependency, live-integration dependency, or production runtime surface was added.


&copy; 2026 Johan Hellman. All rights reserved.
