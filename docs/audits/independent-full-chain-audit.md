---
type: Audit
title: Independent Full Chain Audit
description: Documentation for independent full chain audit
tags: [audit]
timestamp: 2026-06-14T00:00:00Z
---

# Independent Full-Chain Audit

**Date:** 2026-05-02
**Branch:** `feature/scheduled-recurring-cash-flows`
**Auditor role:** Independent review — no code authored in this session
**Scope:** All 10 audit passes: research-to-implementation traceability, PRD/plan alignment, architecture, financial correctness, security/privacy, CLI, test quality, reliability, documentation/DX, deferred scope and roadmap risk

---

## 1. Executive Summary

The rebalancing engine is a well-structured, deterministic, offline TypeScript calculation core. All implemented slices deliver on their stated goals: the Meta Paper's threshold and boundary-target strategy clusters are faithfully implemented; the cash-flow expansion pipeline is mathematically sound; the CLI surface is appropriately scoped; and audit/explanation outputs are deterministically generated from calculation results. No critical defects were found.

Two high-severity operational gaps were identified: hardcoded creation timestamps undermine the temporal integrity of the audit trail, and the absence of a CI workflow means regressions can only be caught manually. The scenario count in the roadmap document is stale by eight scenarios. A Date.parse() timezone hazard exists in the calendar strategy that could produce incorrect trigger behavior in non-UTC environments. All other findings are low-risk or informational.

**Overall assessment:** Fit for continued offline development. Not yet fit for production use (known and correctly deferred). The findings are proportional to the scope of an offline MVP in active development; none represent fundamental design errors.

---

## 2. Materials Reviewed

| Material | Location |
|---|---|
| Meta-Paper Synthesis | `docs/Portfolio Rebalancing Meta-Paper Synthesis.md` |
| PRD and Architecture Vision | `docs/Rebalancing Engine_ PRD, Architecture, Vision.md` |
| MVP Implementation Plan | `docs/MVP_Implementation_Plan.md` |
| Next-Iteration PRD | `docs/prd/rebalancing-engine-next-iteration-prd.md` |
| Scheduled Cash-Flow PRD | `docs/prd/scheduled-recurring-cash-flow-prd.md` |
| Scheduled Cash-Flow MVP Plan | `docs/plans/scheduled-recurring-cash-flow-mvp-plan.md` |
| Roadmap | `docs/roadmap/rebalancing-engine-roadmap.md` |
| Strategy Traceability | `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md` |
| Final MVP Audit | `docs/audits/final-mvp-audit.md` |
| Next-Iteration Audit | `docs/audits/next-iteration-mvp-audit.md` |
| Scheduled Cash-Flow Audit | `docs/audits/scheduled-recurring-cash-flow-audit.md` |
| Domain Model | `src/models/domain.ts` |
| Core modules | `src/core/{numeric,valuation,drift,trades,evaluation,cash-flows,simulation}.ts` |
| Strategy modules | `src/strategy/{threshold,calendar,manual}.ts` |
| Audit/Explanation | `src/audit/audit.ts`, `src/explanation/explanation.ts` |
| Scenario Runner | `src/runner/scenario-runner.ts` |
| CLI modules | `src/cli/{input,commands,validation,render,parser,index}.ts` |
| Tests | `tests/*.test.ts`, `tests/cash-flows.test.ts` |
| Fixtures | `tests/fixtures/scenarios.json`, `tests/fixtures/scenario-expectations.json` |
| Fixture README | `tests/fixtures/README.md` |
| AGENTS.md | `AGENTS.md` |
| Package config | `package.json`, `tsconfig.json` |
| BUILD_JOURNEY.md | `BUILD_JOURNEY.md` |

Command outputs verified:
- `npm test -- --runInBand` (all 26 scenarios in batch, 5 expected errors)
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `node dist/cli.js batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json`
- `node dist/cli.js inspect scenarios --scenarios tests/fixtures/scenarios.json`

---

## 3. Research-to-Implementation Traceability Matrix

| Strategy Cluster | Meta Paper | PRD | MVP Plan | Implementation | Test Coverage | Status |
|---|---|---|---|---|---|---|
| Threshold / tolerance-band | Yes — primary cluster | MVP scope | Slices 3–6 | `ThresholdStrategy`, `calculateDrift`, epsilon guard | Strong — unit + fixture + edge cases | Implemented, well-tested |
| Calendar-based due-date | Yes — cluster 1 archetype | Phase 6 post-MVP | Slice 11 (next-iteration) | `CalendarRebalanceStrategy` | Good — due/not-due fixtures | Implemented; see M-01 for timezone edge case |
| Boundary-target execution | Yes — Vanguard/Donohue-Yip "rebalance to edge" | Future / deferred | Deferred → next-iteration | `ExecutionTargetMode`, `calculateTargetValue` | Adequate — boundary + relative-boundary fixtures | Implemented for absolute and relative bands |
| Manual forced rebalance | Not in taxonomy — implied | Implied | Slice 11 | `ManualRebalanceStrategy` | Adequate | Implemented; not in Meta Paper taxonomy |
| Cash-flow routing (deposits, withdrawals) | Cross-cutting design point | MVP: settled/pending flows | Slice 6 | `summarizeCashFlows`, `generateTradeProposal` | Good | Positive cash, withdrawal funding; scheduled flows covered |
| Scheduled / recurring cash flows | Not explicit in paper — planning concept | Next iteration | Scheduled cash-flow plan | `applyCashFlowSchedules`, expansion in `evaluateRebalance` | Strong — 7 unit tests + 8 CLI fixtures | Implemented: monthly, quarterly, annual, dedup |
| Transaction-cost-aware optimal control | Yes — cluster 2 (full) | Later / deferred | Excluded | Not implemented | N/A | Correctly deferred; boundary mode is partial proxy |
| Tax-aware / direct indexing | Yes — cluster 3 | Later / deferred | Excluded | Generic lot metadata only (`SellSelectionMode`, `allocateSellLots`) | N/A | Tax primitive only; no HIFO optimization |
| Dynamic / ML / regime-switching | Yes — cluster 4 | Excluded from MVP | Excluded | Not implemented | N/A | Correctly deferred |
| Factor / style calendar reconstitution | Yes — archetype | Not explicit | N/A | Not implemented | N/A | Calendar module could support; deferred |
| Hybrid monitoring frequency | Yes — cross-cutting | Implied | Implied | Structural support via strategy dispatch | N/A | Not a gap; no scheduling cadence needed for offline engine |

**Traceability verdict:** Research-to-implementation coverage is faithful for the implemented scope. All deferred clusters are documented in the roadmap. The one unplanned addition (ManualRebalanceStrategy) is harmless but outside the Meta Paper taxonomy.

---

## 4. PRD and Roadmap Alignment

### PRD alignment

| PRD requirement | Status | Evidence |
|---|---|---|
| Offline, deterministic calculation core | Met | No system time reads; `resolveEvaluationDate` requires explicit date |
| Threshold strategy, full reset to target | Met | `ThresholdStrategy`, `generateTradeProposal` full-reset path |
| Cash-aware proposal generation | Met | `summarizeCashFlows`, `availableCash` in proposal sizing |
| Minimum trade-size filtering with warnings | Met | `applyMinimumTradeSize`, structured `ProposalWarning` |
| MiFID II-style audit trail | Met (offline) | `generateAuditRecord` with inputs + outputs serialized |
| Explainability output | Met | `generateExplanation` assembled from calculation facts |
| Strategy extensibility via `StrategyInterface` | Met | Registry pattern in `evaluation.ts` |
| No OMS, tax-lot HIFO, stochastic optimizer | Met | Correctly deferred; primitives only |
| No system time reads | Met | `evaluationDate` always from caller |

### Roadmap alignment gaps

| Gap | Severity | Detail |
|---|---|---|
| Scenario count in roadmap says "18 synthetic scenarios" | High (stale) | Actual count is 26; roadmap has not been updated since scheduled cash-flow addition |
| `final-mvp-audit.md` says "decimal arithmetic remains deferred" | Info | Now addressed; Decimal.js is implemented |
| Calendar strategy listed as deferred in `final-mvp-audit.md` | Info | Now implemented |

---

## 5. Architecture Findings

### Strengths

- **Strategy pattern cleanly isolated.** Strategies implement `StrategyInterface` and are registered in `STRATEGY_REGISTRY`. Adding a new strategy requires one file and one registry entry.
- **Pipeline is linear and unambiguous.** `evaluateRebalance` in `evaluation.ts` is the single orchestration point: schedule expansion → valuation → drift → trigger → proposal → simulation → explanation → audit. No hidden side paths.
- **Decimal.js internalized correctly.** Public interfaces remain `number`-based. All intermediate calculations use `Decimal`. Output is rounded at the audit/explanation boundary via `roundAuditRecordOutputs`.
- **Audit inputs preserve original state.** The original `portfolioState` (including `cashFlowSchedules`) is stored in `auditRecord.inputs`; the effective state (with expanded cash flows) is used for calculation only. This is the correct separation for reproducibility.

### Weaknesses

- **`roundAuditNumber` uses key-name detection (fragile).** `audit.ts` routes numbers to `roundMoney`, `roundQuantity`, `roundWeight`, etc. by matching on key names (`cash`, `quantity`, `weight`, `drift`, `turnover`). A new field that happens to share a name with an existing category gets the wrong rounding without a compile-time warning. A type-tagged wrapper or explicit rounding at the point of calculation would be more robust.
- **`buildCashFlowProposalWarnings` and `buildCashFlowScheduleProposalWarnings` live in `trades.ts`.** These warning builders are conceptually explanation-layer concerns. Their presence in `trades.ts` weakens module cohesion. This is a low-priority cleanup, not a correctness issue.
- **Strategy unused parameter style is inconsistent.** `ManualRebalanceStrategy` uses `void state; void drift; void policy;` while `ThresholdStrategy` prefixes unused parameters with `_`. This is cosmetic but increases cognitive noise when extending.

---

## 6. Financial Correctness Findings

### Verified correct

- **Full-reset net-cash invariant.** Algebraically: the sum of all sell proceeds minus buy costs equals the starting available cash when all weights sum to 100%. This is a mathematical identity. Verified by inspection of `generateTradeProposal`.
- **Boundary mode does not produce negative post-trade cash.** Verified by constructing a three-asset boundary case (A=10%, B=10%, C=80%; targets=[40%, 40%, 20%]; tolerance=5%). Boundary mode produced BUY A 250, BUY B 250, SELL C 550, post-trade cash = +50. The residual cash (rather than zero) is the expected behavior for boundary execution: assets at or near boundary do not trade to exact target.
- **Month-end clamping in `addMonths`.** Monthly recurrence from 2026-01-31 correctly produces 01-31, 02-28, 03-31, 04-30. The function clamps to the last day of the target month. Leap-year behavior (2024-02-29 → 2025-02-28) also verified via test coverage.
- **MAX_GENERATED_OCCURRENCES guard.** The `MAX_GENERATED_OCCURRENCES_PER_SCHEDULE = 1200` cap correctly throws rather than silently truncating when a schedule generates too many events.
- **Schedule deduplication.** Generated event ID `schedule:<scheduleId>:<effectiveDate>` correctly matches against existing `cashFlows` records, preventing double-counting. Verified by `scheduled_cash_flow_already_settled` fixture.
- **Negative-cash rejection is correct for the MVP scope.** The engine correctly rejects proposals where available cash is negative unless caused by an explicit settled withdrawal. The simulation layer then validates `postTradeCash >= -EPSILON`.
- **EPSILON guard on breach detection.** `drift.ts` uses `toDecimal(drift).abs().minus(tolerance).gt(CALCULATION_EPSILON)` rather than a simple `>=` comparison. This prevents float-residual false triggers when drift is exactly at the boundary.
- **Out-of-universe assets.** Holdings not in the target allocation are assigned `targetWeight = 0` and `relativeDrift = 1` (100%). They generate SELL proposals for full liquidation. Correct per PRD.

### Potential issue found

- **`Date.parse()` in `CalendarRebalanceStrategy.parseIsoDate` is timezone-sensitive (M-01).** `Date.parse('2026-05-02')` returns midnight UTC in Node.js (per ECMA-262), but the behavior for non-ISO strings is undefined and the code relies on this being a consistently UTC operation. If a caller ever passes a datetime string like `'2026-05-02T00:00:00'` (without `Z`), Node.js parses it as **local time**, which could cause a trigger decision to be off by up to 24 hours. Current fixtures use ISO date-only strings so the immediate risk is contained, but the code does not validate that inputs are date-only before passing them to `Date.parse`.

---

## 7. Security and Privacy Findings

### Findings

- **Path traversal in CLI output paths (M-05, low practical risk).** `writeOutputIfRequested` in `commands.ts` calls `fs.writeFileSync(path.resolve(cwd, outputPath), ...)` without restricting the output path to a safe directory. In the current offline CLI used by developers on their own machines, this is a negligible risk. If the CLI were wrapped in a server or service, this could become a path traversal vector. Should be documented.
- **No secrets, credentials, or personal data in fixtures.** All fixture account IDs, instrument IDs, prices, and quantities are synthetic. Correctly handled per `AGENTS.md`.
- **`.env` and `dist/` correctly gitignored.** `.gitignore` excludes build artifacts and secret files.
- **No network calls, no live market data.** The engine is entirely offline; no attack surface from external data sources.
- **`JSON.parse` without schema validation on file inputs.** `readJsonFile` in `input.ts` parses user-supplied files with `JSON.parse` but does not validate structure before passing to the engine. The engine validates at calculation time and throws explicit errors, so this is defense-in-depth rather than a security issue. For production contexts, schema validation at the CLI boundary would be more robust.

---

## 8. CLI Findings

### Strengths

- Verb subcommand structure (`run`, `validate`, `batch`, `inspect`) is clear and extensible.
- `--scenario -` stdin support is correctly implemented for `run` and `validate` only; rejected for explicit input mode.
- Batch mode writes per-scenario output files deterministically; `--force` flag controls overwrite behavior.
- `validate` correctly uses the deterministic engine path (not a separate schema-only validator), preventing divergence.
- Exit codes are consistent: 0 = success, 1 = engine error or batch failure, 2 = usage error.

### Findings

- **`CLI_CREATED_AT` is hardcoded to `'2026-05-02T00:00:00.000Z'` (H-01, shared with runner).** Every `validate` command output carries this timestamp regardless of when it is run.
- **No path restriction on `--output` or `--output-dir` (M-05).** See Security section.
- **`--localstorage-file` warning appears 13 times per test run.** This appears to be a Jest / Node.js version interaction and is cosmetic, but it adds noise to CI-like output. Not a CLI code issue.

---

## 9. Test Quality Findings

### Strengths

- 26 fixture scenarios cover the full scenario matrix including error paths.
- `scenario-expectations.json` manifest prevents silent regressions in error-path behavior (`errorIncludes` field verifies error message content, not just status).
- `cash-flows.test.ts` independently covers schedule expansion logic with 7 focused unit tests.
- Boundary mode correctness is verified via dedicated `threshold_boundary_target` and `threshold_relative_boundary_target` fixtures.
- Tax-lot FIFO allocation has a dedicated `tax_lot_fifo_sell` fixture.
- CLI test suite covers 27 scenarios including help, usage errors, stdin, batch, inspection, strict mode, and output-to-file.

### Gaps

- **Calendar strategy timezone behavior is not tested.** There is no test that passes a non-UTC datetime string to the calendar strategy to verify that `Date.parse()` is behaving as expected. The current date-only string fixtures are safe, but the edge case is not covered.
- **`loadScenarioFixture` has no error handling (M-03).** Called via `npm run scenario:run`, a missing or malformed file throws a raw `ENOENT` or `SyntaxError` to the user. The CLI's `readJsonFile` handles this correctly; the runner's direct `fs.readFileSync` does not.
- **No test for the `MAX_GENERATED_OCCURRENCES_PER_SCHEDULE` guard.** The guard exists and is correct, but no test exercises it.
- **No test for `roundAuditNumber` with an unknown key name.** The fallback behavior (what happens when a new JSON field is added that is not in the switch) is not tested.

---

## 10. Reliability Findings

### Strengths

- Determinism is the primary design constraint and is upheld: no system time reads, no random seeds, stable sort in `calculateDrift`, deterministic cash-flow expansion.
- Post-trade simulation validates: price consistency, quantity reconciliation, cash reconciliation, oversell prevention.
- `CALCULATION_EPSILON` guards prevent float-residual false triggers.
- All error paths use typed throws with explicit messages, not generic runtime exceptions.

### Gaps

- **No CI workflow (H-02).** There is no `.github/` directory. The test suite is comprehensive, but it runs only when a developer remembers to invoke it. A pull-request CI check would catch regressions before merge.
- **`RUNNER_CREATED_AT` and `CLI_CREATED_AT` are hardcoded (H-01).** `src/runner/scenario-runner.ts:12` sets `RUNNER_CREATED_AT = '2026-05-02T00:00:00.000Z'` and `src/cli/validation.ts:6` sets `CLI_CREATED_AT = '2026-05-02T00:00:00.000Z'`. Every audit record carries a creation timestamp frozen at these values, making it impossible to determine when a run actually occurred from the audit output alone.
- **`loadScenarioFixture` bare JSON.parse (M-03).** `src/runner/scenario-runner.ts` calls `JSON.parse(fs.readFileSync(filePath, 'utf8'))` with no try/catch. Contrast with `readJsonFile` in `src/cli/input.ts` which correctly handles `ENOENT` and `SyntaxError`. An error in the module-level `npm run scenario:run` path surfaces as an uncaught exception rather than a structured error message.

---

## 11. Documentation Findings

### Strengths

- `tests/fixtures/README.md` accurately describes all 26 scenarios and their expected outcomes.
- `docs/guides/` contains user guide, developer guide, strategy extension guide — all aligned with observed CLI behavior.
- `docs/architecture/overview.md` describes the pipeline accurately.
- `BUILD_JOURNEY.md` decision log is comprehensive and traceable.
- AGENTS.md governance rules are clear and appropriate for AI-assisted development.

### Gaps

- **Roadmap scenario count is stale (H-03).** `docs/roadmap/rebalancing-engine-roadmap.md` states "18 synthetic scenarios currently documented" but the actual count is 26 (confirmed by `inspect scenarios` output and `scenarios.json`).
- **`final-mvp-audit.md` contains two stale statements (I-01).** It states "Numeric calculations use JavaScript `number`; decimal arithmetic remains deferred" and lists calendar strategy as deferred — both are now implemented.
- **No published JSON Schema for scenario input format.** Users must infer the schema from TypeScript interfaces or example fixtures. This is a documented deferral but worth tracking.
- **No GitHub issue templates.** Issue creation is manual and unguided.

---

## 12. Deferred Scope Findings

All major deferred items are correctly identified and documented in the roadmap. No deferred capability has been accidentally partially implemented in a way that creates hidden assumptions.

| Deferred item | Risk | Assessment |
|---|---|---|
| Full transaction-cost-aware optimizer | Correctly deferred | No optimizer-specific code or scaffolding introduced |
| Jurisdiction-specific tax handling | Correctly deferred | `SellSelectionMode` and `allocateSellLots` are allocation metadata only; no tax math |
| API / UI / database / persistence | Correctly deferred | No HTTP handlers, no schema migrations, no ORM dependencies |
| Live market data / banking / custody / execution integration | Correctly deferred | No external network calls anywhere in the codebase |
| CI workflow | Deferred by omission, not by design | No GitHub Actions; represents operational risk |
| Schema-only JSON validator | Explicitly deferred | `validate` uses engine path; documented as intentional |
| Business-day calendars / holidays | Correctly deferred | Calendar strategy uses explicit date comparison only |
| Weekly / custom recurrence | Correctly deferred | `invalid_recurring_cash_flow` fixture enforces this boundary |

---

## 13. Findings Register

| ID | Severity | Area | Title | Evidence | Impact | Suggested Remediation | Labels |
|---|---|---|---|---|---|---|---|
| H-01 | High | Audit Trail | Hardcoded creation timestamps in runner and CLI validation | `src/runner/scenario-runner.ts:12`, `src/cli/validation.ts:6` | Audit records cannot be used to determine when a run occurred; temporal ordering of audit records is impossible | Replace with `new Date().toISOString()` or inject timestamp as parameter; update affected test assertions | `audit`, `reliability`, `correctness` |
| H-02 | High | Operations | No CI workflow | Absence of `.github/` directory | Regressions caught only if developer manually runs tests before merge | Add GitHub Actions workflow: `npm ci && npm test && npx tsc --noEmit && npm run lint` | `ci`, `operations`, `reliability` |
| H-03 | High | Documentation | Stale scenario count in roadmap | `docs/roadmap/rebalancing-engine-roadmap.md` states "18 synthetic scenarios" | Readers get a false picture of test coverage; incorrect count may appear in future external communications | Update roadmap count to 26; add note that the count is maintained in `tests/fixtures/scenarios.json` | `documentation`, `roadmap` |
| M-01 | Medium | Financial Correctness | Calendar strategy `Date.parse()` is timezone-sensitive | `src/strategy/calendar.ts:39-43` | Non-UTC datetime strings produce local-time comparisons; trigger decision could be wrong by up to 24 hours in non-UTC environments | Validate that calendar date strings are ISO date-only (YYYY-MM-DD) before parsing; or parse with a date-only arithmetic approach that avoids `Date.parse` entirely | `calendar`, `correctness`, `timezone` |
| M-02 | Medium | Test Noise | `--localstorage-file` warning appears 13 times per test run | Jest/Node.js version interaction | Clutters test output; increases signal-to-noise ratio for CI failures | Investigate Jest or Node.js version; suppress or resolve the source of the warning | `testing`, `dx` |
| M-03 | Medium | Reliability | `loadScenarioFixture` has no error handling | `src/runner/scenario-runner.ts:94` | Bare `ENOENT` or `SyntaxError` thrown to user in `npm run scenario:run` mode; inconsistent with CLI's structured errors | Wrap `JSON.parse(fs.readFileSync(...))` in try/catch; emit a structured message and exit non-zero | `reliability`, `dx` |
| M-04 | Medium | Package | Package version `1.0.0` implies production readiness | `package.json` | May mislead consumers about stability; `1.0.0` conventionally implies stable public API | Change to `0.x.0` pre-release versioning (e.g., `0.9.0`) until a production consumer and stability commitment exist | `package`, `documentation` |
| M-05 | Medium | Security | No path restriction on CLI output paths | `src/cli/commands.ts` `writeOutputIfRequested`, `writeBatchScenarioOutputsIfRequested` | Path traversal risk if CLI is wrapped in a service; negligible risk for local-only use | Document as known limitation; restrict output paths to a safe directory before any server-side use | `security`, `cli` |
| L-01 | Low | Code Quality | Inconsistent unused parameter style | `src/strategy/manual.ts` vs `src/strategy/threshold.ts` | Minor cognitive noise when extending strategies | Standardize to `_paramName` TypeScript convention across all strategy implementations | `code-quality` |
| L-02 | Low | Architecture | `roundAuditNumber` key-name detection is fragile | `src/audit/audit.ts` | New fields silently get wrong rounding if they share names with existing categories | Add an explicit map of field path → rounding function; or apply rounding at the point of calculation | `audit`, `architecture` |
| L-03 | Low | Architecture | Cash-flow warning builders live in `trades.ts` | `src/core/trades.ts` | `buildCashFlowProposalWarnings` and `buildCashFlowScheduleProposalWarnings` are explanation-layer concerns; trades module is larger than necessary | Move warning builder functions to `explanation.ts` or a dedicated `warnings.ts` | `architecture`, `code-quality` |
| I-01 | Info | Documentation | `final-mvp-audit.md` contains stale statements | `docs/audits/final-mvp-audit.md` | Confusing to readers; suggests Decimal.js and calendar strategy are still deferred | Update audit to note that both are now implemented | `documentation` |
| I-02 | Info | Operations | No GitHub issue templates | `.github/` absent | Issue creation is unguided | Add `bug_report.md` and `feature_request.md` issue templates when CI is added | `github`, `dx` |
| I-03 | Info | Operations | `dist/` exists on disk (correctly gitignored) | `.gitignore` | Stale build artifacts can cause confusion about whether the installed binary is current | Document `npm run build` in developer guide as a required step before running the CLI binary directly | `documentation`, `dx` |

---

## 14. Issue-Ready Remediation Backlog

### Issue 1 — H-01: Replace hardcoded creation timestamps with live timestamps

**Title:** `RUNNER_CREATED_AT` and `CLI_CREATED_AT` are frozen at `2026-05-02T00:00:00.000Z`

**Description:**
Every audit record produced by `npm run scenario:run` or `rebalance validate` carries the same creation timestamp regardless of when the run occurred. This makes it impossible to order runs chronologically or to verify that an audit record is recent.

**Files:** `src/runner/scenario-runner.ts:12`, `src/cli/validation.ts:6`

**Suggested fix:** Replace the constant with `new Date().toISOString()` at call time, or pass it as an injectable parameter so tests can supply a deterministic value.

**Acceptance criteria:** Running `rebalance run` twice several seconds apart produces two audit records with different `createdAt` timestamps; all existing tests pass with deterministic injected timestamps.

**Labels:** `bug`, `audit`, `reliability`

---

### Issue 2 — H-02: Add GitHub Actions CI workflow

**Title:** No CI — tests run only on developer request

**Description:**
There is no `.github/workflows/` directory. The test suite has 26 fixture scenarios, extensive unit tests, and a type-safe build, but none of these checks run automatically on push or pull request.

**Suggested workflow steps:**
1. `npm ci`
2. `npm test -- --runInBand`
3. `npx tsc --noEmit`
4. `npm run lint`

**Labels:** `ci`, `operations`, `enhancement`

---

### Issue 3 — H-03: Update roadmap scenario count from 18 to 26

**Title:** Roadmap states "18 synthetic scenarios" but 26 are implemented

**Description:**
`docs/roadmap/rebalancing-engine-roadmap.md` contains a stale reference to "18 synthetic scenarios currently documented." The actual count is 26 (verified by `rebalance inspect scenarios`). The gap of 8 scenarios represents the scheduled/recurring cash-flow additions from the most recent increment.

**Labels:** `documentation`, `roadmap`

---

### Issue 4 — M-01: Calendar strategy `Date.parse()` timezone hazard

**Title:** `CalendarRebalanceStrategy.parseIsoDate` uses `Date.parse()`, which is timezone-sensitive for non-date-only strings

**Description:**
`src/strategy/calendar.ts` calls `Date.parse(dateString)` to convert calendar dates to timestamps for comparison. For ISO date-only strings (`YYYY-MM-DD`), Node.js parses as midnight UTC per ECMA-262. However, if a caller passes a datetime string without a `Z` suffix (e.g., `'2026-05-02T00:00:00'`), Node.js parses as local time. The trigger decision (`evaluationTime >= nextRebalanceTime`) could then be wrong by up to 24 hours.

**Suggested fix:** Validate that calendar date inputs match `^\\d{4}-\\d{2}-\\d{2}$` before parsing, and throw an explicit error if a datetime string is supplied. This matches the pattern already used in `cash-flows.ts`.

**Labels:** `bug`, `calendar`, `correctness`

---

### Issue 5 — M-03: `loadScenarioFixture` lacks error handling for missing/malformed files

**Title:** `npm run scenario:run` throws raw `ENOENT` or `SyntaxError` for bad file paths

**Description:**
`src/runner/scenario-runner.ts` calls `JSON.parse(fs.readFileSync(filePath, 'utf8'))` without a try/catch. The CLI's equivalent `readJsonFile` handles `ENOENT`, `SyntaxError`, and empty input with structured error messages and clean exit codes. The runner module should apply the same pattern.

**Labels:** `bug`, `reliability`, `dx`

---

## 15. Recommended Remediation Sequence

Priority order reflects blast radius, cost, and dependency order:

1. **H-01 (hardcoded timestamps)** — One-line change with high audit-trail impact. Make timestamps live or injectable. Update test assertions to use injected values.
2. **H-03 (stale roadmap count)** — Documentation-only, two-minute fix. Do it alongside any documentation PR.
3. **M-01 (calendar timezone)** — Add a date-only format validation guard before `Date.parse`. Model this on the existing `effectiveDate` validation in `cash-flows.ts`. No logic change needed.
4. **M-03 (runner error handling)** — Wrap `fs.readFileSync` / `JSON.parse` in a try/catch; emit a structured message. Reuse the pattern from `readJsonFile`.
5. **H-02 (CI)** — Requires a GitHub Actions YAML file. Implement after the above fixes so the CI baseline is clean from day one.
6. **L-01 (unused parameter style)** — Standardize `_param` convention in `manual.ts`. Cosmetic; batch with the next strategy-layer change.
7. **L-02 (roundAuditNumber fragility)** — Audit-only refactor; tackle when a new output field is added.
8. **L-03 (warning builders in trades.ts)** — Module-cohesion cleanup; tackle when the explanation layer is extended.
9. **M-04 (package version)** — Change `1.0.0` to `0.9.0` at the point when a changelog or semver policy is adopted.
10. **M-05 (path traversal documentation)** — Document as known limitation in CLI security section; enforce programmatically before any server-side use.

---

## 16. GitHub Issue Recommendation

Issues 1–5 above are ready to file. Recommended labels per issue:

| Issue | Priority | Labels |
|---|---|---|
| Replace hardcoded timestamps | P1 | `bug`, `audit`, `reliability` |
| Add CI workflow | P1 | `ci`, `operations`, `enhancement` |
| Update roadmap scenario count | P2 | `documentation` |
| Calendar Date.parse timezone guard | P2 | `bug`, `calendar`, `correctness` |
| Runner error handling | P2 | `bug`, `reliability`, `dx` |

Issues 6–10 (L-01 through M-05) are low-priority cleanup tasks suitable for a `tech-debt` label and a future cleanup sprint.

---

## 17. Final Audit Conclusion

The rebalancing engine delivers correctly on its stated scope: a deterministic, offline, cash-aware portfolio rebalancing core with threshold, calendar, and boundary-target strategy implementations, scheduled/recurring cash-flow expansion, tax-lot primitives, a complete CLI surface, and a comprehensive fixture regression suite.

No critical defects were found. The two high-severity operational gaps — hardcoded audit timestamps and absent CI — are both straightforward to remediate and neither undermines the mathematical correctness of the engine. The single financial correctness risk (calendar timezone) is contained to a specific class of non-standard inputs and will be eliminated by a one-line input validation guard.

The architecture is coherent, the deferred scope is correctly bounded, and the documentation reflects observed behavior with only minor staleness. The engine is ready for continued offline capability development and is appropriately positioned as pre-production software.

**Recommended first actions (in order):** fix H-01 timestamps, fix H-03 roadmap count, add M-01 date-only validation guard, add M-03 runner error handling, then introduce CI.
