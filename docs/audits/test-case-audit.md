# Test-Case Audit Report: MVP Portfolio Rebalancing Engine

---

## 1. Audit Summary

| Field                               | Value                                                                 |
| ----------------------------------- | --------------------------------------------------------------------- |
| Audit date                          | 2026-04-29                                                            |
| Scope reviewed                      | Slices 1–4: Fixtures, Valuation, Drift Calculation, Threshold Trigger |
| Test command reviewed               | `npm test -- --verbose`                                               |
| Type-check command                  | `npx tsc --noEmit`                                                    |
| Overall quality rating (pre-audit)  | **Needs improvement**                                                 |
| Overall quality rating (post-audit) | **Adequate**                                                          |
| Tests before                        | 14 (across 5 suites)                                                  |
| Tests after                         | 30 (across 6 suites)                                                  |
| Product code changed                | No                                                                    |

**High-level conclusion.** The pre-audit test suite covered the happy paths of Slices 2–4 correctly and the core calculations are mathematically sound. However, the suite had significant gaps: the `min_trade_size_issue` and `positive_cash` fixtures existed but were only partially tested (valuation only, no drift or trigger assertions); the `multiple_assets_out_of_band` fixture had no dedicated test and contained a misleading description; the `holding_outside_universe` test silently ignored the underweight target asset (AAPL); the smoke test was a tautology; and no cash-only or validation edge-case tests existed. No product code bugs were found — all fixes were test/fixture/documentation changes.

---

## 2. Materials Reviewed

**Test files**

- `tests/smoke.test.ts`
- `tests/fixtures.test.ts`
- `tests/valuation.test.ts`
- `tests/drift.test.ts`
- `tests/threshold.test.ts`

**Fixture files**

- `tests/fixtures/scenarios.json`

**Source files (for test-intent verification)**

- `src/models/domain.ts`
- `src/core/valuation.ts`
- `src/core/drift.ts`
- `src/strategy/threshold.ts`
- `src/core/index.ts`

**Documentation**

- `docs/MVP_Implementation_Plan.md`
- `docs/audits/red-team-audit-current.md`
- `BUILD_JOURNEY.md`
- `AGENTS.md`
- `README.md`

**Commands run**

```
npm test -- --verbose
npx tsc --noEmit
```

---

## 3. Test Suite Overview

**Pre-audit:**

- 5 test suites, 14 tests.
- Smoke test: 1 tautological test (always passes).
- Fixtures test: 1 structural schema check.
- Valuation tests: 5 tests covering happy paths + empty/zero portfolio.
- Drift tests: 5 tests covering on-target, one-out-of-band, out-of-universe, target-not-in-holdings, and target sum validation.
- Threshold tests: 2 tests (no-trigger / trigger).

**Missing coverage (pre-audit):**

- `min_trade_size_issue` fixture: drift and trigger never asserted.
- `positive_cash` fixture: drift and trigger never asserted.
- `multiple_assets_out_of_band` fixture: no dedicated test at all; description was inaccurate.
- `holding_outside_universe`: AAPL (target held, severely underweight) silently untested.
- Cash-only portfolio: no test.
- `validateTargetAllocation` edge cases: under-100%, single-asset, float-epsilon, empty.
- Determinism of output ordering: not asserted.
- Smoke test: meaningless.

**How fixtures are used:** Loaded via `fs.readFileSync` + `JSON.parse` at module load time (not per test). This is correct and fast, but means schema failures surface as runtime errors rather than Jest failures. The `fixtures.test.ts` file partially mitigates this by validating structure at the start.

---

## 4. MVP Slice Coverage Matrix

| Slice                             | Expected Behavior                                                                   | Existing Tests (pre-audit)    | Coverage (pre) | Gaps                                                                                                | Recommendation      |
| --------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- | -------------- | --------------------------------------------------------------------------------------------------- | ------------------- |
| **S1 – Fixtures**                 | Valid JSON, all edge-case IDs present, structurally correct                         | `fixtures.test.ts`            | Partial        | Descriptions not validated; `multiple_assets_out_of_band` description inaccurate                    | Fix description ✓   |
| **S2 – Valuation**                | Market value, cash inclusion, missing price abort, zero value                       | `valuation.test.ts` (5 tests) | Good           | No negative-quantity test                                                                           | Deferred (low risk) |
| **S3 – Drift**                    | Absolute + relative drift, out-of-universe, target-not-held, deterministic ordering | `drift.test.ts` (5 tests)     | Partial        | `multiple_assets_out_of_band` untested; AAPL hidden in `holding_outside_universe`; no ordering test | Fixed ✓             |
| **S4 – Threshold Trigger**        | No trigger in-band, trigger + reason string on breach                               | `threshold.test.ts` (2 tests) | Partial        | `min_trade_size_issue` + `positive_cash` never run through trigger; cash-only never tested          | Fixed ✓             |
| **S5 – Trade Proposals**          | Not yet implemented                                                                 | None                          | Not applicable | —                                                                                                   | Implement next      |
| **S6 – Cash Routing / Min Trade** | Not yet implemented                                                                 | None                          | Not applicable | Fixture exists; deferred validations noted                                                          | Add once S5/S6 land |
| **S7 – Post-Trade Simulation**    | Not yet implemented                                                                 | None                          | Not applicable | —                                                                                                   | —                   |
| **S8 – Explanation Output**       | Not yet implemented                                                                 | None                          | Not applicable | —                                                                                                   | —                   |
| **S9 – Audit Record**             | Not yet implemented                                                                 | None                          | Not applicable | —                                                                                                   | —                   |
| **S10 – DFAH Batch Runner**       | Not yet implemented                                                                 | None                          | Not applicable | —                                                                                                   | —                   |

---

## 5. Findings Register

| ID   | Severity | Category        | Finding                                                                                                                       | Evidence                                                                                               | Impact                                                                                    | Recommended action                      | Status              | Fix ref                            |
| ---- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------- | ------------------- | ---------------------------------- |
| T-01 | High     | Test coverage   | `min_trade_size_issue` fixture exists but drift and trigger were never asserted                                               | No test references this scenario in `drift.test.ts` or `threshold.test.ts`                             | A broken drift or trigger path for this fixture would never be caught                     | Add tests                               | **Fixed**           | `tests/edge-cases.test.ts`         |
| T-02 | Medium   | Test coverage   | `positive_cash` fixture: drift and trigger not tested                                                                         | `valuation.test.ts` checks weights only; no drift or trigger test existed                              | Cash-dilution effect on drift and trigger could be silently wrong                         | Add tests                               | **Fixed**           | `tests/edge-cases.test.ts`         |
| T-03 | Medium   | Test coverage   | `holding_outside_universe` test ignores AAPL, which is severely underweight (drift −0.40)                                     | `drift.test.ts` line 111 — only TSLA asserted                                                          | A regression in the "target not fully held" path would not be caught                      | Add AAPL assertion                      | **Fixed**           | `tests/drift.test.ts`              |
| T-04 | Medium   | Test coverage   | `multiple_assets_out_of_band` fixture has no dedicated drift test; description is inaccurate                                  | GOOG weight=0.20, target=0.20 — exactly on target; description said "multiple assets out of band"      | Readers misunderstand the fixture intent; no drift correctness validation                 | Fix description + add test              | **Fixed**           | `scenarios.json` + `drift.test.ts` |
| T-05 | Medium   | Test coverage   | Smoke test is a tautology (`expect(true).toBe(true)`)                                                                         | `tests/smoke.test.ts` line 3                                                                           | Gives false sense of coverage; catches nothing                                            | Replace with structural import test     | **Fixed**           | `tests/smoke.test.ts`              |
| T-06 | Low      | Test coverage   | `validateTargetAllocation` only tested for over-100% and exact 100%; under-100%, empty array, and float-epsilon cases missing | `drift.test.ts` lines 16–38                                                                            | Validation gaps could allow malformed allocations through in edge scenarios               | Add edge-case tests                     | **Fixed**           | `tests/edge-cases.test.ts`         |
| T-07 | Low      | Test coverage   | Cash-only portfolio path (no holdings, cash > 0, target defined) never explicitly tested                                      | Not in any test file                                                                                   | Cash-only case is a valid initialization state; a regression would be invisible           | Add test                                | **Fixed**           | `tests/edge-cases.test.ts`         |
| T-08 | Low      | Test coverage   | No-op rebalance (on-target) only tested via two isolated tests; no end-to-end no-op assertion                                 | `drift.test.ts` + `threshold.test.ts` each test partial chain                                          | A regression in the integration path could be missed                                      | Add end-to-end no-op assertion          | **Fixed**           | `tests/edge-cases.test.ts`         |
| T-09 | Low      | Test coverage   | Deterministic output ordering never explicitly asserted                                                                       | MVP plan mandates determinism; `calculateDrift` does sort but test input order was always alphabetical | Sorting regression would be invisible                                                     | Add ordering test                       | **Fixed**           | `tests/edge-cases.test.ts`         |
| T-10 | Low      | Fixture         | `scenarios.json` has no explanatory comments or README                                                                        | Fixture IDs are clear but mathematical rationale is only in test comments                              | Future contributors may not understand why each scenario exists without referencing tests | Add `tests/fixtures/README.md`          | **Deferred**        | —                                  |
| T-11 | Info     | Test structure  | Tests are flat in `tests/`, not separated into `unit/` / `integration/` as MVP plan proposed                                  | MVP plan section 10 shows `tests/unit/` and `tests/integration/`                                       | No functional impact at this scale; may matter at Slice 10+                               | Reorganize when test count justifies it | **Deferred**        | —                                  |
| T-12 | Info     | Future coverage | `min_trade_size` constraint enforcement (Slice 6) has no placeholder test                                                     | The trigger fires but minimum trade suppression not yet implemented                                    | Gap is intentional but should be documented                                               | Add TODO comment in test                | **Fixed (comment)** | `tests/edge-cases.test.ts`         |

---

## 6. Fixture Review

**Strong fixtures:**

- `on_target`: Clean, symmetric, unambiguous. Good baseline.
- `one_asset_out_of_band`: Clear drift of ±0.10, both assets breach simultaneously. Well-structured for threshold testing.
- `missing_price`: Correctly absent MSFT price; cleanly exercises abort logic.
- `target_allocation_sum_error`: Correct invalid weights (0.5+0.6=1.1); tests error path cleanly.
- `holding_outside_universe`: Good TSLA example with realistic price differential.

**Weak or inaccurate fixtures (corrected):**

- `multiple_assets_out_of_band`: Description said "multiple assets out of band" but GOOG (qty=50, price=100, target=0.20) has current weight 0.20 = target — it is **exactly on target**, not out of band. **Description corrected** to "Portfolio with two assets out of band (AAPL +20%, MSFT -20%) and one on target (GOOG 0%)".

**Missing fixtures (deferred to future slices):**

- Negative cash: Relevant only once Slice 6 (cash routing) is implemented.
- Stale price timestamps: Not modelled in `PriceSnapshot`; deferred until timestamps are added.
- Zero/negative total portfolio value with holdings (negative price): Pathological; low priority.
- Rounding residuals with fractional quantities: Relevant at Slice 7 (post-trade simulation).

**Data hygiene:** All fixture data is fully synthetic. No real identifiers, prices, or account numbers. Fixture account IDs use sequential `acc-N` naming. No sensitive data present.

---

## 7. Calculation Test Review

All expected values were verified by hand. No mathematical errors were found in the test assertions.

| Test                                     | Calculation verified                                                                                 | Result    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------- |
| `on_target` valuation                    | 100×150 + 100×150 = 30000; AAPL weight = 15000/30000 = 0.5                                           | ✓ Correct |
| `on_target` drift                        | Both at 0.5 vs 0.5 → drift = 0.0                                                                     | ✓ Correct |
| `one_asset_out_of_band` drift            | AAPL: 18000/30000=0.6; drift=+0.1. MSFT: 12000/30000=0.4; drift=−0.1                                 | ✓ Correct |
| `positive_cash` valuation                | 50×100+50×100+5000=15000; AAPL weight=5000/15000=0.333                                               | ✓ Correct |
| `positive_cash` drift (added)            | Both instruments: 1/3 vs 0.5 → drift = −1/6 ≈ −0.1667, out of band                                   | ✓ Correct |
| `multiple_assets_out_of_band`            | AAPL: 15000/25000=0.6, drift=+0.2. MSFT: 5000/25000=0.2, drift=−0.2. GOOG: 5000/25000=0.2, drift=0.0 | ✓ Correct |
| `min_trade_size_issue`                   | Total=2000. AAPL: 1050/2000=0.525, drift=+0.025. MSFT: 950/2000=0.475, drift=−0.025                  | ✓ Correct |
| `holding_outside_universe` (TSLA)        | 50×200=10000; total=25000; weight=0.4; drift=+0.4                                                    | ✓ Correct |
| `holding_outside_universe` (AAPL, added) | 100×150=15000; weight=0.6; target=1.0; drift=−0.4                                                    | ✓ Correct |
| `validateTargetAllocation` error message | 0.5+0.6=1.1 → "Total: 110.00%"                                                                       | ✓ Correct |
| Cash-only drift                          | 0 holdings; AAPL weight=0; drift = 0−1.0 = −1.0                                                      | ✓ Correct |
| Float epsilon (0.1+0.2+0.3+0.4)          | IEEE 754 sum ≈ 1.0000000000000002; delta from 1.0 = 2e-16 < 0.0001 epsilon → accepted                | ✓ Correct |

**Precision note.** The current `validateTargetAllocation` epsilon is `0.0001` (1 basis point), which is generous enough for most float arithmetic on sums of 2–10 weights. This is appropriate for MVP. A tighter epsilon or a proper Decimal library should be considered before production use (see deferred gap D-05 in section 9).

---

## 8. Tests Added or Modified

### Files changed

**`tests/smoke.test.ts`** — Replaced

- **Before:** `expect(true).toBe(true)` — caught nothing.
- **After:** 5 structural tests verifying that all core exports are importable, callable, and return the correct TypeScript types.
- **Product code changed:** No.

**`tests/drift.test.ts`** — Extended

- Added AAPL assertion to `handles holding outside universe` (was silently untested).
- Added new test `reports correct per-asset drift for multiple_assets_out_of_band scenario` with per-asset drift and `isOutOfBand` assertions for all three instruments.
- **Product code changed:** No.

**`tests/fixtures/scenarios.json`** — Description corrected

- `multiple_assets_out_of_band` description updated from "Portfolio with multiple assets out of band" to "Portfolio with two assets out of band (AAPL +20%, MSFT -20%) and one on target (GOOG 0%)".
- **Product code changed:** No.

**`tests/edge-cases.test.ts`** — New file (11 tests across 6 describe blocks)

- `min_trade_size_issue` drift and trigger coverage.
- `positive_cash` drift and trigger coverage.
- `on_target` end-to-end no-op path.
- Cash-only portfolio handling.
- `validateTargetAllocation` edge cases (under-100%, single-asset, float-epsilon, empty array).
- Deterministic output ordering assertion.
- **Product code changed:** No.

---

## 9. Gaps Deferred

| ID   | Gap                                | Why deferred                                       | Risk                                             | Recommended future test                                                                 | Target slice |
| ---- | ---------------------------------- | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------ |
| D-01 | `min_trade_size` trade suppression | Slice 6 not implemented                            | Medium — key constraint requirement from PRD     | Assert trade proposal has zero trades when correction value < minimumTradeSize          | S6           |
| D-02 | Cash-preferential routing          | Slice 6 not implemented                            | Medium — PRD requires cash deployed before sells | Assert no sell orders generated when cash fully covers underweights                     | S6           |
| D-03 | Post-trade simulation correctness  | Slice 7 not implemented                            | Medium                                           | Assert before/after delta matches trade proposals exactly                               | S7           |
| D-04 | Turnover calculation               | Slice 7 not implemented                            | Low                                              | Assert turnover = sum of sell values / total portfolio value                            | S7           |
| D-05 | Explanation output completeness    | Slice 8 not implemented                            | Medium                                           | Assert explanation string contains trigger reason, constraint impacts                   | S8           |
| D-06 | Audit record replay                | Slice 9 not implemented                            | High — compliance requirement (MiFID II)         | Assert AuditRecord can be replayed to produce identical TradeProposal                   | S9           |
| D-07 | Negative cash handling             | Slice 6 not implemented                            | Low — negative cash not yet in scope             | Verify engine rejects or handles negative cash gracefully                               | S6           |
| D-08 | Stale price timestamps             | `PriceSnapshot` has no timestamp field             | Low                                              | Add timestamp to PriceSnapshot; assert engine rejects prices older than N hours         | Post-MVP     |
| D-09 | Fixture README                     | Low priority                                       | Low                                              | Add `tests/fixtures/README.md` documenting each scenario                                | Any time     |
| D-10 | Relative drift tolerance trigger   | `relativeDriftTolerance` is optional; never tested | Low                                              | Add fixture with tight relative tolerance; assert trigger fires on relative breach only | S4 follow-up |
| D-11 | DFAH (1000x determinism run)       | Slice 10 not implemented                           | Low (output is deterministic by construction)    | Run engine 1000x on identical input; assert zero variance                               | S10          |

---

## 10. Validation Results

| Command                              | Result                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `npm test -- --verbose` (pre-audit)  | 14/14 passed, 5 suites                                                      |
| `npm test -- --verbose` (post-audit) | **30/30 passed, 6 suites**                                                  |
| `npx tsc --noEmit`                   | No errors                                                                   |
| `npm run lint`                       | Not run — ESLint config is a known deferred item from red-team audit (F-03) |

---

## 11. Recommended Next Steps

1. **Implement Slice 5 (Trade Proposal Generation)** — The core calculation foundation is now solid and well-tested. This is the natural next slice.
2. **Implement Slice 6 (Cash Routing + Minimum Trade)** and immediately add tests from D-01 and D-02.
3. **Add `tests/fixtures/README.md`** documenting each scenario's mathematical intent (D-09). Low effort, high value for future contributors.
4. **Test relative drift tolerance** (D-10) — `relativeDriftTolerance` is in the domain model but never exercised. Add a fixture and tests before S5 to ensure the policy field is properly propagated through the engine.
5. **Evaluate `decimal.js`** before Slice 5 — trade quantities and monetary values are where float arithmetic becomes financially consequential. The MVP plan flagged this; now is the right moment to make the decision before financial outputs (monetary trade values) are introduced.
