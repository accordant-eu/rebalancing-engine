---
type: Implementation Plan
title: Rebalancing Engine Production Boundary Plan
description: Documentation for rebalancing engine production boundary plan
tags: [plan]
timestamp: 2026-06-14T00:00:00Z
---

# Production Boundary Plan

Date: 2026-05-02

Status: Complete.

## 1. Current Baseline

- The calculation core is deterministic and offline.
- Public usage is through TypeScript functions and the local fixture scenario runner.
- No web server, database, UI, live market-data integration, banking integration, custody integration, or trade-execution integration exists.
- Decimal policy, relative boundary targeting, offline cash flows, generic tax-lot allocation metadata, and optimizer deferral are documented and validated.

## 2. Selected Scope

Document the production boundary and keep production surfaces deferred.

Included:

- PRD for live integrations / API / UI / database deferral.
- Audit report confirming no production infrastructure was added.
- README and build journey updates.
- Full local validation after documentation updates.

Excluded:

- API, UI, database, persistence, and live integration implementation.
- Adapter interfaces without a concrete provider or consumer.
- CI/CD, deployment, authentication, authorization, and secret-management work.

## 3. Slice Plan

### Slice 0 - Baseline Check

- Confirm the optimizer-boundary PR is merged.
- Confirm local branch is clean.
- Confirm current docs identify the engine as offline.

Validation:

- `git status -sb`
- Recent git log inspection.

### Slice 1 - Production Boundary Documentation

- Add the production-boundary PRD.
- Add this implementation plan.
- Update README status and documentation links.
- Update `BUILD_JOURNEY.md` with the production-boundary decision.

Validation:

- Documentation review.
- `npm run format`

### Slice 2 - Audit and Regression Validation

- Add production-boundary audit.
- Run full tests, build, lint, scenario runner, and manifest validation.
- Commit and push the documentation-only slice.

Validation:

- `npm test -- --runInBand`
- `npm run build`
- `npm run lint`
- `npm run scenario:run`
- `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json`

## 4. Dependency Graph

Production boundary documentation depends on the prior deferred-capability slices because it references the current domain baseline:

1. Decimal / rounding policy.
2. Relative-boundary targeting.
3. Offline cash-flow foundations.
4. Generic tax-lot allocation metadata.
5. Optimizer feasibility boundary.
6. Production boundary deferral.

## 5. Testing Strategy

No runtime behavior changes are intended. Validation is regression-oriented:

- Existing unit and integration tests must pass.
- Scenario runner must execute all fixtures.
- Expected-status manifest validation must pass.
- Build, lint, and format must pass.

## 6. Documentation Plan

Update:

- `README.md`
- `BUILD_JOURNEY.md`
- `docs/prd/rebalancing-engine-production-boundary-prd.md`
- `docs/plans/rebalancing-engine-production-boundary-plan.md`
- `docs/audits/production-boundary-audit.md`

## 7. Commit Strategy

Use one focused documentation commit:

- `docs: document production boundary deferral`

Push the branch after validation and open a draft PR.
