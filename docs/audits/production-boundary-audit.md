# Production Boundary Audit

Date: 2026-05-02

## Scope

Audited the remaining live integrations / API / UI / database deferred capability after decimal policy, relative-boundary targeting, cash-flow foundations, generic tax-lot allocation, and optimizer feasibility were addressed.

## Conclusion

The repository should remain an offline deterministic calculation core for now.

No production API, UI, database, persistence layer, live market-data integration, broker/custodian integration, banking integration, or execution integration was added.

## Findings

- The engine is already useful as a deterministic library/CLI-style core with fixture-driven validation.
- Production surfaces would require decisions that are not calculation-core concerns: authentication, authorization, tenancy, persistence, audit retention, secrets, deployment, monitoring, external-provider contracts, data freshness, reconciliation, and failure handling.
- Adding an API or database now would likely freeze wire and persistence contracts before decimal-string policy, consumer shape, and retention requirements are known.
- Adding adapter scaffolding without a selected provider would create speculative abstractions.
- The existing scenario runner remains the right executable boundary for current validation.

## Decisions Checked

- Production boundary PRD: live integrations / API / UI / database remain deferred.
- Production boundary plan: documentation-only slice with regression validation.
- Build journey: decision log records the deferral and revisit criteria.
- README: current status and documentation links describe the offline boundary.

## Validation

Validation passed before commit:

- `npm run format`
- `npm test -- --runInBand`: 15 suites passed, 98 tests passed.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run scenario:run`
- `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`: 18 scenarios checked, 0 mismatches.

## Residual Risk

- There is still no hosted API, persistent audit store, UI, or live integration path.
- Production suitability is intentionally not claimed.
- A future productionization increment must define concrete consumers, security model, persistence model, provider contracts, and operational controls before code is added.

## Recommendation

Treat the post-MVP domain/correctness increment as complete for the assessed deferred items. The next coherent technical step is either scheduled/recurring cash-flow semantics or productionization PRD work with concrete consumer and operational requirements.
