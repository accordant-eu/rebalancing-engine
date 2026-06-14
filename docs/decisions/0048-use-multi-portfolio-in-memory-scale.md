---
type: DecisionRecord
title: "Use MultiPortfolioStateManager for in-memory scaling mock"
description: "Decision to refactor LiveStateManager to support multiple asynchronous portfolios in memory before migrating to SQLite."
timestamp: 2026-06-14T19:05:00Z
---

# Use MultiPortfolioStateManager for in-memory scaling mock

## Context

In Tranche 7, the Live Agent needed to prove it could scale horizontally to evaluate multiple portfolios without blocking or intermingling state. Before taking on the infrastructure burden of a relational database (SQLite, Tranche 8), we needed a deterministic way to prove the Orchestrator loop could handle a "fleet" of accounts.

## Options considered

1. **Array of Orchestrators:** Spin up one `Orchestrator` per account.
2. **MultiPortfolioStateManager (In-Memory Maps):** Refactor the existing state manager to hold `Map<string, LiveState>` and `Map<string, number>` (for cooldowns), maintaining a single Orchestrator loop that iterates over all accounts.

## Decision

We will use **Option 2 (MultiPortfolioStateManager)**.

## Rationale

Option 2 perfectly mimics the pattern we will eventually use for SQLite. A single `Orchestrator` looping over records fetched from a data store is far more resource-efficient than instantiating thousands of discrete Orchestrator classes. It also allows us to cleanly share a single `globalPriceSnapshot` across all portfolios, simulating a unified price feed broadcast.

## Implementation impact

- Renamed `LiveStateManager` to `MultiPortfolioStateManager`.
- Updated `Orchestrator.onTick` to iterate over all registered `accountId`s, applying cooldowns and math per account.
- Updated `src/cli/agent.ts` dry-run mode to load the first 5 scenarios from fixtures and tick their prices asynchronously.
- Updated Command Center Dashboard (`web/src/App.tsx`) to implement a two-level Fleet View (Heatmap Grid -> Drill-down).

## Validation

- Unit tests across `tests/orchestrator.test.ts` updated to register an `accountId` and verified that triggers execute correctly per-account.
- Web UI confirms successful JSON parsing and heatmap rendering of multiple parallel portfolio drifts.

&copy; 2026 Johan Hellman. All rights reserved.
