---
type: Decision Record
title: Generalized Trade Optimizer Interface and External Tax-Aware Module
description: Establish a unified TradeOptimizerInterface abstraction layer and pluggable external US tax-aware optimizer contract
tags: [architecture, strategy, trade-generation, tax-optimization]
timestamp: 2026-08-10T16:39:00Z
status: Accepted
---

# ADR-0058: Generalized Trade Optimizer Interface and External Tax-Aware Module

## Context

The engine currently separates evaluation into valuation, drift calculation, trigger evaluation (`StrategyInterface`), trade proposal generation, execution overlays, quality indicators, and audit logging. However, trade proposal generation was previously handled as a single monolithic function (`generateTradeProposal`).

Double Finance's `oracle` project demonstrates the value of specialized, tax-aware trade generation algorithms (lot-level TLH, wash sale prevention, factor models) for US taxable portfolios. Rewriting complex Mixed-Integer Linear Programming (MILP) solvers in TypeScript would bloat the core engine, while hardcoding US tax assumptions would break international compatibility (e.g., Germany FIFO or UK Average Cost Basis).

We need a clean architectural boundary that allows trade generation algorithms to be modularized and plugged in dynamically.

## Options Considered

### Option 1: Hardcode Tax-Aware Logic inside `generateTradeProposal`
- **Benefits:** Keeps trade generation in a single file.
- **Costs:** Creates a bloated, tight-coupled monolith with conditional branches for every jurisdiction and optimization strategy.
- **Risks:** High risk of regression and broken abstractions.
- **Reversibility:** Low.

### Option 2: Introduce `TradeOptimizerInterface` and Pluggable Registry (Chosen)
- **Benefits:** Cleanly decouples **WHEN** to rebalance (`StrategyInterface`) from **WHAT** trades to generate (`TradeOptimizerInterface`). Allows synchronous in-memory TypeScript optimizers (`StandardRuleBasedTradeGenerator`) and asynchronous external solver adapters (`ExternalTaxAwareTradeGenerator` calling Oracle) to share the exact same overlay, quality, circuit breaker, and audit pipelines.
- **Costs:** Slight architectural indirection.
- **Risks:** Minimal risk; preserves backward compatibility by defaulting to the standard rule-based optimizer.
- **Reversibility:** High.

## Decision

We establish `TradeOptimizerInterface` as the core trade generation abstraction:
1. `RebalancingPolicy.optimizerType` specifies which trade optimizer to invoke (defaulting to `'standard_rule_based'`).
2. `TradeOptimizerRegistry` resolves the configured trade optimizer.
3. `TradeOptimizerInterface.generateProposal(context)` returns `Promise<TradeProposal> | TradeProposal`.
4. `TaxAwareUsTradeGenerator` is added as a pluggable strategy for US taxable accounts, validating `taxJurisdiction === 'US'` and delegating to an external solver contract when configured.

## Implementation Impact

- **Code:** Created `src/core/trade-optimizer.ts`, added `StandardRuleBasedTradeGenerator` and `TaxAwareUsTradeGenerator`, updated `src/models/domain.ts` and `src/core/evaluation.ts`.
- **Tests:** Added `tests/core/trade-optimizer.test.ts` and `tests/strategy/tax-aware-us-optimizer.test.ts`.
- **Documentation:** Updated `docs/decisions/index.md` and `BUILD_JOURNEY.md`.

## Follow-up

Tranche 2 will build the concrete HTTP adapter (`OracleTaxOptimizerAdapter`) to communicate with an external Python Oracle microservice for live paper trading.


&copy; 2026 Johan Hellman. All rights reserved.
