---
type: Plan
title: Friction Optimization (Mocked TCO)
description: Plan to integrate the Friction Penalty Function into the Orchestrator loop
tags: [planning, friction-optimization]
timestamp: 2026-06-20T17:55:00Z
---

# Friction Optimization (Mocked TCO) Implementation Plan

## Objective
Update the Live Agent orchestrator to utilize the `FrictionModel` and `DriftReductionIndicator`. This will ensure the engine only generates executable trades when the mathematical benefit (drift reduction utility) strictly outweighs the estimated Total Cost of Ownership (TCO) friction.

## Current State
1. `src/core/friction.ts` contains `PercentageSlippageModel` and `FixedFeeModel`.
2. `src/core/quality.ts` contains `DriftReductionIndicator` and `DriftUtilityTranslator` which calculate `netUtilityBps = improvementBps - tcoBps`.
3. `src/orchestrator/loop.ts` evaluates the `DriftReductionIndicator` but does **not** pass a `FrictionModel` into `evaluateRebalance()`. Thus, `estimatedTco` is always 0, defeating the optimization.

## Proposed Changes

### 1. Hardcode Mocked Slippage Model (MVP)
Per the `v3-exploration` roadmap, we will start with a purely mocked model to prove the pipeline works before fetching dynamic Level 2 spread data.
- **File:** `src/orchestrator/loop.ts`
- **Action:** Instantiate `const frictionModel = new PercentageSlippageModel(5);` (representing a standard 5 bps slippage friction). Pass this model into `evaluateRebalance({ frictionModel, ... })`.

### 2. Parameterize Utility Translator
- **File:** `src/orchestrator/loop.ts`
- **Action:** Instead of calling `new DriftUtilityTranslator()`, pass the tenant's configured conversion rate: `new DriftUtilityTranslator(currentState.policy.driftUtilityConversionRate ?? 1.0)`. This allows the agent to treat 1 bps of TCO as equally painful to 10 bps of drift, if configured.

### 3. Record ADR
- **File:** `docs/decisions/0054-mocked-friction-model-for-tco-optimization.md`
- **Action:** Formally record the decision to use a mocked `PercentageSlippageModel(5)` for the Orchestrator's execution loop as the first Friction Optimization pass.

### 4. Tests
- **File:** `tests/integration.test.ts`
- **Action:** Verify no existing orchestrator tests break. Ensure the `DriftReductionIndicator` correctly filters out economically irrational trades (e.g., micro-adjustments where the 5 bps slippage outweighs the drift benefit).

## Verification
- We will verify by running `npm run test` and validating that tests pass.
- We will run the Live Agent dry-run `npm run cli -- start --scenarios tests/fixtures/scenarios.json --scenario-id positive_cash` to ensure trades are still proposed properly when mathematically justified.

&copy; 2026 Johan Hellman. All rights reserved.
