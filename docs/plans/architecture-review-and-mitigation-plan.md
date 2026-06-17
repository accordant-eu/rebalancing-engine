---
type: Review
title: Independent Architecture & Code Review
description: An assessment of architectural anti-patterns, bad practices, and a sequenced mitigation plan.
timestamp: 2026-06-17T15:25:00Z
---

# Independent Architecture & Code Review

This document provides an independent assessment of the `rebalancing-engine` codebase following the rapid iteration of Tranches 1-10 and Tranches A-C. It identifies key architectural anti-patterns, evaluates options to address them, and presents a sequenced mitigation plan to ensure the engine remains resilient, scalable, and maintainable.

## 1. Identified Anti-Patterns & Bad Practices

### Issue A: Unsafe Evaluation Loop (Lack of Fault Isolation)
**Location:** `src/orchestrator/loop.ts`
**Description:** The `onTick` orchestrator loop iterates over portfolios and calls `evaluateRebalance` synchronously. If `evaluateRebalance` throws an unhandled exception (e.g., due to malformed target allocations or missing price data), the error propagates up, crashes the entire Node process, and prevents the evaluation of all subsequent portfolios in the queue.
**Anti-Pattern:** Leaky fault boundaries in a multi-tenant event loop.

#### Options:
1. **Option 1 (Try/Catch Wrapper):** Wrap the evaluation logic in a `try/catch` block inside the loop. On error, log the failure to `auditStorage` with a `FAILED` status and `notifications.notify('error')`, then `continue` to the next portfolio.
2. **Option 2 (Worker Threads):** Offload `evaluateRebalance` to a Node.js Worker Thread pool, completely isolating memory and execution faults from the main orchestrator process.

**Proposed Solution:** **Option 1.** Worker threads introduce unnecessary inter-process communication serialization overhead for an MVP. A strict `try/catch` boundary natively protects the loop while keeping latency at zero.

---

### Issue B: Asynchronous Execution & False Cooldowns
**Location:** `src/orchestrator/executor.ts` and `src/orchestrator/loop.ts`
**Description:** The `BrokerExecutor` calls `this.adapter.submitTrades(...)` as a fire-and-forget Promise, catching errors only to log them. However, in `loop.ts`, `stateManager.markTradeExecution` is immediately called synchronously. If the broker API rejects the trade (e.g., insufficient buying power, rate limit), the system incorrectly marks the portfolio as having traded and places it into a cooldown.
**Anti-Pattern:** Unsynchronized State and Side Effects.

#### Options:
1. **Option 1 (Await Execution):** Change `executor.execute` to return a Promise and `await` it in the loop before calling `markTradeExecution`.
2. **Option 2 (State Machine & Webhooks):** Maintain the fire-and-forget speed, but do not update the cooldown until an asynchronous "Order Filled" or "Order Rejected" webhook is received from the broker.

**Proposed Solution:** **Option 1.** Since ADR-0040 explicitly dictates pausing the orchestrator loop during pending orders, awaiting the broker submission natively aligns with our design. It guarantees the cooldown is only applied if the broker successfully accepts the order payload.

---

### Issue C: Monolithic CLI Entry Point (God Object)
**Location:** `src/cli/agent.ts`
**Description:** The `executeAgent` function sets up the SQLite DB, mounts an Express API server, initializes the Orchestrator, and runs a `setInterval` loop to artificially drift prices for testing. 
**Anti-Pattern:** God Object / Mixing Concerns. This drastically reduces testability and makes it impossible to run the API independently from the trading daemon in a containerized microservice architecture.

#### Options:
1. **Option 1 (Complete Microservices):** Split the repo into completely separate Node packages (`@engine/api`, `@engine/orchestrator`).
2. **Option 2 (Modular Entry Points):** Extract the Express app into `src/api/server.ts` and the Mock Ticker into `src/simulator/ticker.ts`. The CLI remains the single orchestrator but cleanly injects these isolated components.

**Proposed Solution:** **Option 2.** We avoid premature microservice complexity while massively improving cohesion and testability.

---

### Issue D: Database Abstraction Leaks
**Location:** `src/orchestrator/sqlite-state.ts`
**Description:** `SqliteStateManager` directly invokes raw `db.prepare()` statements and mixes domain object parsing (e.g., `JSON.parse(policy)`) with database schema management. There is no clear Repository layer. If the schema changes, the orchestration logic breaks.
**Anti-Pattern:** Tight coupling of Domain models with Data Access Layers.

#### Options:
1. **Option 1 (ORM):** Introduce TypeORM or Prisma to abstract the database entirely.
2. **Option 2 (Repository Pattern):** Create lightweight Repository classes (`PortfolioRepository`, `ModelRepository`) that encapsulate the `better-sqlite3` queries and return pure Domain objects to the State Manager.

**Proposed Solution:** **Option 2.** An ORM introduces heavy runtime overhead which conflicts with our requirement for extreme throughput (ADR-0049). A lightweight Repository pattern isolates the SQL without sacrificing speed.

---

## 2. Overall Mitigation Plan & Sequencing

The mitigation plan is sequenced to address critical runtime faults first, followed by structural cleanups. This ensures the engine is mathematically and systemically safe before we worry about code aesthetics.

### Phase 1: Resilience & Correctness (High Priority)
1. **Fix the Event Loop (Issue A):** Add a global `try/catch` barrier inside the `Orchestrator.onTick` loop. Ensure failed evaluations emit a fatal audit record and do not crash the engine.
2. **Fix Execution State (Issue B):** Refactor `Executor.execute` to return a `Promise<boolean>`. Await it in `onTick`. Only trigger `markTradeExecution` if the broker submission succeeds.

### Phase 2: Structural Refactoring (Medium Priority)
3. **Deconstruct the Monolith (Issue C):** 
   - Extract `setupExpressApp` to `src/api/server.ts`.
   - Extract the artificial price drifter to `src/simulator/ticker.ts`.
   - Update `agent.ts` to strictly handle dependency injection and CLI argument parsing.

### Phase 3: Data Access Abstraction (Low Priority)
4. **Implement Repository Pattern (Issue D):**
   - Create `src/db/repositories/ModelRepository.ts` and `PortfolioRepository.ts`.
   - Refactor `SqliteStateManager` to use these repositories, removing all raw SQL from the orchestration layer.

## 3. Plan Review & Consistency Check

- **Logical Sequencing:** Yes. Fixing the event loop and execution state (Phase 1) ensures that the system is safe to run in production *today*. Refactoring the CLI (Phase 2) makes it easier to write tests for the API, which paves the way for safely refactoring the database layer (Phase 3).
- **Internal Consistency:** The proposed solutions respect existing Architectural Decision Records (e.g., keeping SQLite for throughput [ADR-0049], keeping the synchronous evaluation loop [ADR-0040]). 
- **Backwards Compatibility:** None of these changes require modifying the core math (`src/core/`) or the UI (`web/`). The API contracts remain identical.
