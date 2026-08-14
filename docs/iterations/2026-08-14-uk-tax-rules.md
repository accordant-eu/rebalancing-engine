---
type: Iteration Log
title: Iteration Log 2026-08-14 - UK Tax Rules & Bed-and-Breakfasting Overlay
description: Implemented HMRC-compliant UK Capital Gains Tax rules, including Section 104 average-cost holding pools and the 30-day Bed-and-Breakfasting execution overlay.
tags: [iteration, uk-tax, bed-and-breakfast, section-104, overlays]
timestamp: 2026-08-14T19:28:00Z
---

# Iteration Log: 2026-08-14 (UK Tax Rules & Bed-and-Breakfasting Overlay)

## Theme: Multi-Jurisdiction Expansion – UK Capital Gains & Section 104 Pooling

### Overview
This iteration implemented HMRC-compliant UK Capital Gains Tax rules for portfolio rebalancing. We introduced the **Section 104 Holding Pool** average-cost model for UK lot allocation and created the **`UkBedAndBreakfastOverlay`** to detect and suppress tax-loss harvesting claims subject to the statutory 30-day repurchase rule.

### Key Accomplishments
1. **ADR-0059 Adoption**:
   - Recorded [ADR-0059](file:///Users/johanhellman/Projects/rebalancing-engine/docs/decisions/0059-uk-bed-and-breakfasting-overlay.md) outlining the architectural rationale for keeping the trade sizing engine modular and using execution overlays for regional tax law enforcement.
2. **Section 104 Average Cost Holding Pool**:
   - Added `SECTION_104` to `SellSelectionMode` in `src/models/domain.ts`.
   - Created `src/core/uk-tax.ts` with `calculateSection104Pool` and `allocateSection104SellLots` to calculate pooled weighted average unit costs across all historical lots.
   - Updated `allocateSellLots` in `src/core/trades.ts` to seamlessly support `SECTION_104` allocations.
3. **UK 30-Day Bed-and-Breakfast Execution Overlay**:
   - Implemented `UkBedAndBreakfastOverlay` in `src/core/overlays.ts`.
   - Checks proposed trades and recent holding lot acquisitions within a 30-day window ($0 \le \Delta \text{days} \le 30$).
   - Suppresses artificial loss-harvesting trades that trigger same-day or 30-day repurchase matching, emitting structured `UK_BED_AND_BREAKFAST_LOCKOUT` warnings.
   - Wired `UkBedAndBreakfastOverlay` resolution into `evaluateRebalance` and `evaluateRebalanceAsync` in `src/core/evaluation.ts`.
4. **Comprehensive Test Suite**:
   - Created `tests/uk-tax.test.ts` (10 unit & integration tests) covering Section 104 pooling math, calendar day calculations, 30-day B&B lockout suppression, same-day trade matching, and full `evaluateRebalance` integration.

### Quality Assurance & Verification
- `npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors.
- `npm test`: 41 test suites, 291 tests passing cleanly.

### Files Touched
- `src/models/domain.ts`
- `src/core/uk-tax.ts`
- `src/core/overlays.ts`
- `src/core/trades.ts`
- `src/core/evaluation.ts`
- `src/core/index.ts`
- `tests/uk-tax.test.ts`
- `docs/decisions/0059-uk-bed-and-breakfasting-overlay.md`
- `docs/decisions/index.md`
- `docs/iterations/2026-08-14-uk-tax-rules.md`
- `docs/iterations/index.md`
- `docs/log.md`
- `BUILD_JOURNEY.md`

&copy; 2026 Johan Hellman. All rights reserved.
