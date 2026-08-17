---
type: Iteration
title: PR Merges, Dependency Upgrades & State Representation Simplifications (#109)
description: Merged open Dependabot PRs (#98-#102) and resolved/merged PR #111 implementing discriminated unions for TriggerResult and ProposalWarning.
tags: [iteration, dependabot, maintenance, refactor, domain-model, discriminated-unions]
timestamp: 2026-08-17T09:42:00Z
---

# Iteration: PR Merges, Dependency Upgrades & State Representation Simplifications (#109)

## Objective
Triage and merge all open Pull Requests that can be cleanly integrated into `main`, including automated Dependabot updates and the codebase data structure simplifications proposed in Issue #109.

## Summary of Completed Work

### 1. Dependabot Upgrades Merged
- **[PR #98](https://github.com/accordant-eu/rebalancing-engine/pull/98)**: Bumped `typescript-eslint` from `8.65.0` to `8.66.0`.
- **[PR #99](https://github.com/accordant-eu/rebalancing-engine/pull/99)**: Bumped `better-sqlite3` from `13.0.2` to `13.0.3`.
- **[PR #100](https://github.com/accordant-eu/rebalancing-engine/pull/100)**: Bumped `framer-motion` from `12.43.0` to `13.0.0`.
- **[PR #101](https://github.com/accordant-eu/rebalancing-engine/pull/101)**: Bumped `@types/bcryptjs` from `2.4.6` to `3.0.0`.
- **[PR #102](https://github.com/accordant-eu/rebalancing-engine/pull/102)**: Bumped `@testing-library/user-event` from `14.6.1` to `14.6.3`.

### 2. State Representation Simplifications (#109, PR #111)
- Refactored `TriggerResult` into a strict discriminated union:
  - `{ isTriggered: false }`
  - `{ isTriggered: true; reason: string; strategyType: RebalancingStrategyType; metadata?: Record<string, string | number | boolean | null> }`
- Refactored `ProposalWarning` into a discriminated union keyed by `code` enforcing specific required payloads (including newly integrated overlay warning codes `TRADE_SUPPRESSED_BY_OVERLAY` and `TRADE_RESIZED_BY_OVERLAY`).
- Resolved merge conflict between PR #111 and overlay changes on `main`, removed temporary migration script `refactor.py`, and merged [PR #111](https://github.com/accordant-eu/rebalancing-engine/pull/111).
- Closed superseded/redundant [PR #110](https://github.com/accordant-eu/rebalancing-engine/pull/110) and closed Issue [#109](https://github.com/accordant-eu/rebalancing-engine/issues/109).

### 3. Verification & Repository Health
- All 45 backend test suites (327 tests) pass cleanly.
- All web frontend vitest suites (2 tests) pass cleanly and build bundle compiles.
- Zero TypeScript compiler errors across backend and frontend.

## Files Touched
- `src/models/domain.ts` (Modified)
- `src/strategy/calendar.ts` (Modified)
- `src/strategy/tax-aware-us.ts` (Modified)
- `src/strategy/threshold.ts` (Modified)
- `src/api/routes/portfolios.ts` (Modified)
- `src/audit/audit.ts` (Modified)
- `src/cli/render.ts` (Modified)
- `src/explanation/explanation.ts` (Modified)
- `package.json` / `package-lock.json` / `web/package.json` (Modified)
- Tests across `tests/` directory (Modified)
