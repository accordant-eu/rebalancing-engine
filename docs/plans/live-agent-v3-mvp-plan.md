---
type: Plan
title: Live Agent v3.0 MVP Plan
description: Slice-by-slice implementation plan for translating the v3 exploration concepts into the Live Agent.
tags: [plan, v3, live-agent]
timestamp: 2026-06-14T14:55:00Z
---

# Live Agent v3.0 MVP Plan

Date: 2026-06-14
Status: DRAFT / PENDING REVIEW

## 1. Objective

To translate the concepts mapped out in `docs/roadmap/v3-exploration.md` into concrete, iterative development tranches. We will use a "slice-by-slice" approach, ensuring the engine remains functional, testable, and demonstrable at the end of each tranche.

---

## 2. Sequencing Overview

The sequence prioritizes foundational data architecture first (Multi-portfolio SQLite), core calculation enhancements second (Friction), followed by macro-observability (Command Center), and finally Enterprise features (Models and Multi-Tenancy).

### Tranche 5: The Multi-Portfolio Foundation (SQLite MVP)
Before we can scale or build a dashboard, the agent must be able to manage more than one portfolio at a time without network latency.
- **Goal:** Shift from a single `LiveStateManager` holding JSON in memory to a persistent, queried state.
- **Action 1:** Introduce `better-sqlite3` (synchronous, in-memory/WAL capable) as our state foundation.
- **Action 2:** Define a minimal schema: `Portfolios`, `Assets`, `TaxLots`, and `TargetAllocations`.
- **Action 3:** Refactor the Orchestrator loop to query active portfolios and evaluate them sequentially (or via worker threads).
- **Action 4:** Build a CLI tool (`agent seed`) to generate 1,000 synthetic portfolios into the local database for load testing.
- **Exit Criteria:** The agent boots up, loads 1,000 portfolios, and continuously evaluates their drift safely without crashing.

### Tranche 6: Friction Optimization (TCO & Slippage)
With thousands of portfolios, we must prevent the agent from destroying wealth via micro-churn.
- **Goal:** Introduce explicit and implicit cost models to the pure evaluation core.
- **Action 1:** Inject a `FrictionModel` interface into the `core/trades.ts` pipeline.
- **Action 2:** Implement a mocked `FixedFeeModel` (e.g., $1 per trade) and a `PercentageSlippageModel` (e.g., 5 bps spread).
- **Action 3:** Implement the Penalty Function: Before emitting a `TradeProposal`, the engine compares the estimated friction cost against the monetary value of reducing the drift. If Cost > Benefit, the trade is rejected.
- **Exit Criteria:** Unit tests prove that a portfolio perfectly on the boundary line does not trade if the TCO penalty outweighs the drift benefit.

### Tranche 7: The Command Center Dashboard (MVP)
With 1,000 portfolios being evaluated safely, we need macro-observability.
- **Goal:** Provide a high-level systemic view of agent health.
- **Action 1:** Embed a lightweight HTTP server (e.g., Express) within the Agent to expose read-only API routes querying the SQLite database and the JSONL audit trails.
- **Action 2:** Create a `/web` package containing a React/Vite UI.
- **Action 3:** Build a dashboard displaying a Global Health Heatmap (drift distribution) and a "Near-Miss" table.
- **Exit Criteria:** A user can navigate to `localhost:3000` while the Agent is running and watch aggregate drift scores update in real-time as prices tick.

### Tranche 8: Mandate Propagation & Model Portfolios
Transitioning from individual mandates to a scalable SaaS paradigm.
- **Goal:** Update 1,000 portfolios securely via a single model change.
- **Action 1:** Add `Models` to the SQLite schema and link `Portfolios` via a `model_id` foreign key.
- **Action 2:** Write the propagation "fan-out" function. When a `Model`'s target allocation changes, immediately clone the new targets to all linked portfolios.
- **Action 3:** Implement Queueing constraints: Triggering a Model change across 1,000 portfolios will cause massive simultaneous drift. Ensure the Orchestrator evaluates these asynchronously so we don't blow up the Broker API rate limits.
- **Exit Criteria:** Updating a Model via CLI correctly triggers a throttled wave of evaluations across the linked portfolios.

### Tranche 9: Enterprise Operations & SaaS Readiness
The final hardening phase for production.
- **Goal:** Implement the fail-safes required for an enterprise deployment.
- **Action 1:** Write an EOD Reconciliation CLI job that fetches the broker's "Settled Ledger" and compares it to the internal SQLite state, flagging unmatched balances.
- **Action 2:** Implement Tenant Isolation: Refactor the schema to strictly require `tenant_id` on all tables.
- **Action 3:** Establish the RBAC framework around the API to separate sysadmin operations from mandate modifications.
- **Exit Criteria:** The system successfully passes an audit proving Firm A cannot query or alter Firm B's portfolio mandates.

---

## 3. Risks & Open Questions
- **Dependency Acceptance:** Is `better-sqlite3` acceptable as the core dependency for Tranche 5?
- **Monorepo Complexity:** Adding a `/web` package for the UI in Tranche 7 will transition this project into a full monorepo. Should we set up `npm workspaces` now?


&copy; 2026 Johan Hellman. All rights reserved.
