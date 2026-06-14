---
type: DecisionRecord
title: ADR-0049 Use better-sqlite3 for Persistent State Management
description: Transition from in-memory Map scaling to relational SQLite for Tranche 8.
timestamp: 2026-06-14T20:00:00Z
---

# Context
In Tranche 7, we scaled the Orchestrator to evaluate multiple portfolios sequentially by introducing a `MultiPortfolioStateManager` that held state in a `Map<string, LiveState>`. This allowed us to build the initial Fleet Dashboard UI. 

However, to scale to 10,000+ portfolios safely, holding all state in memory is unsustainable. We need a persistent relational layer to manage `Portfolios`, `Holdings`, `TaxLots`, and `TargetAllocations`. Additionally, we need a reliable way to simulate this scale locally (a `seed` capability).

# Options considered
1. **PostgreSQL**: Production grade, but introduces a heavy external daemon dependency. Too heavy for a local "agent" execution environment at this MVP stage.
2. **In-Memory Store (Redis)**: Good for cache, but lacks relational querying capabilities which will be needed for the eventual Model fan-out (Tranche 9).
3. **Embedded SQLite (`better-sqlite3`)**: Runs in the same process, requires zero external setup, provides full SQL querying, and handles multi-GB datasets with millisecond latency.

# Decision
We will adopt **SQLite via `better-sqlite3`** as the persistent state foundation for the Live Agent. We will build `SqliteStateManager` implementing the `LiveStateManager` interface, replacing `MultiPortfolioStateManager` for both live and dry-run modes.

# Rationale
- SQLite strictly enforces our schema while remaining completely self-contained.
- `better-sqlite3` is extremely fast and synchronous, aligning perfectly with the tight Orchestrator loop without creating a complex asynchronous web of promises just to fetch a portfolio.
- It enables the creation of an `agent seed` CLI tool capable of injecting thousands of synthetic portfolios directly into the database in milliseconds.

# Implementation impact
- Adds `better-sqlite3` as a dependency.
- Introduces `src/db/sqlite.ts` and schema initialization.
- Converts the Orchestrator to read and write from SQLite via `SqliteStateManager`.

# Validation
- Seeded 1,000 portfolios using the `basic_threshold_breach` fixture in 65ms.
- Ran the `agent start` dry-run loop over all 1,000 portfolios, correctly generating and logging thousands of rule-based dry-run trades without crashing the process or blocking the thread indefinitely.
