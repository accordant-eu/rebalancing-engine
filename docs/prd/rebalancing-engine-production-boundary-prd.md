# Production Boundary PRD

Date: 2026-05-02

Implementation status: Complete as a deferral and boundary increment.

## 1. Background

The engine is an offline deterministic TypeScript calculation core. It now supports policy-selected strategies, decimal-backed calculations, absolute and relative boundary targeting, explicit offline cash flows, generic tax-lot allocation metadata, deterministic explanations, audit records, and fixture-driven scenario validation.

The remaining production-surface deferred capability is live integrations / API / UI / database. This capability is intentionally broader than a calculation feature because it introduces operational, security, regulatory, persistence, deployment, and external-service concerns.

## 2. Scope Decision

Selected scope: production boundary deferral.

Included:

- Assess whether live integrations, API, UI, or database should be implemented now.
- Document why those surfaces remain out of scope for the current engine.
- Clarify that the supported delivery model remains offline library/CLI-style execution with synthetic fixtures.
- Define prerequisites for future productionization work.

Excluded:

- REST, GraphQL, RPC, or SDK API wrapper.
- Database schema, migration tooling, persistence layer, or audit-store implementation.
- Broker, custodian, banking, market-data, OMS, or trade-execution integrations.
- UI, dashboard, or hosted application shell.
- Authentication, authorization, tenancy, secret management, deployment, monitoring, or incident-response infrastructure.

## 3. Decision

Decision: Keep live integrations, API, UI, and database deferred; preserve the offline calculation core boundary.

Status: Accepted.

Context:
The domain core has become more useful and explicit, but it is still validated through deterministic fixtures and local scenario runs. A production surface would require non-domain decisions about user identity, data custody, market-data freshness, execution permissions, persistence contracts, audit retention, operational controls, and regulatory posture. Those decisions are not necessary to validate the current calculation engine.

Options considered:

1. Implement an API wrapper now.
   - Benefits: Easier external invocation.
   - Costs: Introduces request/response contracts, versioning, auth assumptions, and deployment choices.
   - Risks: Premature wire contracts may conflict with future decimal-string, persistence, or integration requirements.

2. Add a database-backed audit store now.
   - Benefits: More realistic audit retention path.
   - Costs: Requires schema, migration, retention, privacy, and operational decisions.
   - Risks: Persistence model could harden before production consumers and retention requirements are known.

3. Add integration adapter scaffolding without live connections.
   - Benefits: Signals intended boundaries.
   - Costs: Creates unused abstractions around unknown provider contracts.
   - Risks: Adapter interfaces may be wrong once a real broker, custodian, bank, or market-data provider is selected.

4. Keep the offline core and document future production prerequisites.
   - Benefits: Preserves deterministic, testable domain behavior and avoids infrastructure risk.
   - Costs: No external service boundary is available yet.
   - Risks: Future productionization still needs a dedicated PRD and implementation plan.

Preferred option:
Option 4.

Rationale:
The current project value is in deterministic calculation semantics, auditability, and testable domain policy behavior. Production surfaces should be designed around concrete consumers, data contracts, security requirements, and operational responsibilities. Adding them now would create architecture before the product boundary is known.

## 4. Future Production Prerequisites

Before implementation, a future productionization PRD should define:

- Primary consumer: library caller, batch job, hosted API, internal app, or external product.
- Input and output wire contracts, including whether decimal values are transmitted as strings.
- Persistence needs for inputs, outputs, audit records, explanations, scenario runs, and user actions.
- Data classification, retention, privacy, and deletion requirements.
- Authentication, authorization, tenancy, and secret-management requirements.
- Market-data, custody, banking, and execution-provider responsibilities.
- Freshness, retry, idempotency, reconciliation, and failure-mode behavior.
- Regulatory and compliance boundaries, including whether the system gives recommendations or only computes proposals.
- Deployment, monitoring, logging, and incident-response expectations.
- CI/CD and environment promotion model.

## 5. Acceptance Criteria

- Live integrations, API, UI, and database remain explicitly deferred.
- No application framework, database dependency, or live-integration dependency is added.
- README and build journey describe the current offline/library/CLI boundary.
- Existing tests, build, lint, scenario runner, manifest validation, and format pass.
