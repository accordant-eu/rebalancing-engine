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

To adhere strictly to MVP principles, we must avoid "bottom-up waterfall" engineering. Instead of building a massive SQLite backend before anyone sees value, we will build "thin vertical slices." We prioritize the Command Center UX and Core Engine Friction *first*, mocking the multi-portfolio data layer until persistence is strictly necessary.

### Tranche 5: The Command Center Dashboard (UX-First MVP)
Before scaling to thousands of portfolios, we must prove we can observe what the Live Agent is doing *right now*.
- **Goal:** Surface the agent's internal state to a macro-observability dashboard.
- **Action 1:** Embed a lightweight HTTP server (e.g., Express) inside the Agent to expose read-only API routes querying the existing `LiveStateManager` and JSONL audit trails.
- **Action 2:** Create a `/web` package containing a React/Vite UI.
- **Action 3:** Build the UI to visualize the active portfolio's drift, threshold "near-misses," and live execution logs.
- **Exit Criteria:** A user can navigate to `localhost:3000` while the Agent is running and watch the portfolio drift and trade logs update in real-time.

### Tranche 6: Friction Optimization (TCO & Slippage)
Before we scale out, we must prevent the core engine from generating wealth-destroying micro-churn.
- **Goal:** Introduce explicit and implicit cost models to the pure evaluation core.
- **Action 1:** Inject a `FrictionModel` interface into the `core/trades.ts` pipeline.
- **Action 2:** Implement a mocked `FixedFeeModel` (e.g., $1 per trade) and a `PercentageSlippageModel`.
- **Action 3:** Implement the Penalty Function: If estimated Cost > Benefit, the trade is rejected.
- **Exit Criteria:** The Dashboard (from Tranche 5) explicitly highlights trades that were *suppressed* due to TCO penalties.

### Tranche 7: The Multi-Portfolio Mock (In-Memory Scale)
We prove the Orchestrator can handle multiple portfolios without yet taking on database dependencies.
- **Goal:** Transition the Orchestrator loop from evaluating 1 portfolio to evaluating $N$ portfolios asynchronously.
- **Action 1:** Refactor `LiveStateManager` to hold an array of 5-10 synthetic portfolios in memory.
- **Action 2:** Refactor the Orchestrator loop to evaluate the array sequentially or via `Promise.all`.
- **Action 3:** Update the Dashboard to aggregate these 5-10 portfolios into a "Global Health Heatmap".
- **Exit Criteria:** The dashboard successfully aggregates and visualizes multiple portfolios running concurrently.

### Tranche 8: The SQLite Foundation (Data Persistence)
Once the UI and the multi-portfolio loop are proven in memory, we swap the mock for a real database to scale to 10,000+.
- **Goal:** Shift from the in-memory array to a queried relational state.
- **Action 1:** Introduce `better-sqlite3`.
- **Action 2:** Define the schema: `Portfolios`, `Assets`, `TaxLots`, and `TargetAllocations`.
- **Action 3:** Build a CLI tool (`agent seed`) to generate 1,000 synthetic portfolios into SQLite for load testing.
- **Exit Criteria:** The agent boots up, loads 1,000 portfolios from disk, and the Dashboard remains highly responsive.

### Tranche 9: Mandates, Models & Enterprise SaaS
The final hardening phase for production.
- **Goal:** Implement SaaS fan-out mechanics and EOD reconciliations.
- **Action 1:** Add `Models` to SQLite and write the "fan-out" queue to update linked portfolios when a model changes.
- **Action 2:** Write an EOD Reconciliation CLI job that fetches the broker's "Settled Ledger" to catch unmatched balances.
- **Exit Criteria:** Updating a Model via CLI correctly triggers a throttled wave of evaluations across 1,000 linked portfolios.

---

## 3. Risks & Open Questions
- **Dependency Acceptance:** Is `better-sqlite3` acceptable as the core dependency for Tranche 5?
- **Monorepo Complexity:** Adding a `/web` package for the UI in Tranche 7 will transition this project into a full monorepo. Should we set up `npm workspaces` now?


&copy; 2026 Johan Hellman. All rights reserved.
