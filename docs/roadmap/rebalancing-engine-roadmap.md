---
type: Roadmap
title: Live Agent v2.0 Roadmap
description: Roadmap to transition the offline calculation core into the Live Agent v2.0 orchestrator
tags: [roadmap, root]
timestamp: 2026-06-14T00:00:00Z
---

# Live Agent v2.0 Roadmap

Date: 2026-06-14

## 1. Executive Summary

The rebalancing engine has successfully reached stability as an offline, deterministic TypeScript calculation core with a first-class file-based CLI. The core engine is mathematically sound, highly tested via synthetic fixtures, and faithfully implements threshold, manual, and calendar strategy clusters.

The project is now officially pivoting from an "offline module" to the **Live Agent v2.0** vision. 

The strategy is to build incrementally, isolating the pure calculation engine from the stateful orchestrator, and validating execution safety via "dry run" and "paper trading" modes before committing real capital.

## 2. Current Capability Baseline

The calculation core is fully implemented for offline use:
- **Threshold & Calendar Rebalancing:** Implemented and tested via `evaluateRebalance`.
- **Full-Reset & Boundary Trade Sizing:** Implemented and deterministically proven.
- **Cash Flow Semantics:** Implemented for explicit offline records and synthetic scheduled/recurring flows.
- **Audit & Explanation:** Immutable JSON audit trails are generated for all calculations.
- **Tax Lot Primitives:** Generic allocation metadata (FIFO/LIFO/etc.) implemented.

**Explicitly Deferred/Out of Scope for Core:**
- Full transaction-cost optimizer (rule-based boundary targeting is sufficient for now).
- Jurisdiction-specific tax advice.

## 3. The Path to Live Agent v2.0 (MVP Tranches)

This roadmap outlines the exact tranches required to wrap the pure engine inside a live, stateful, autonomous orchestrator.

### Tranche 1: Core Engine Readiness (The Final Offline Slice)

Before building the live loop, the calculation core must be adapted to support live semantics without losing its deterministic nature.

- [ ] **Timestamp Traceability:** Add optional `asOf` timestamp metadata to prices.
- [ ] **Fix Audit Timestamps:** Replace hardcoded audit timestamps (Audit finding H-01) with live ones to ensure chronological audit trails.
- [ ] **Cash Flow Realism:** Change scheduled cash flow behavior so they are strictly for *projection/planning* and no longer inflate `availableCash` for actionable trade generation.
- [ ] **CI Pipeline:** Setup GitHub Actions (Audit finding H-02) to ensure the core remains stable as the orchestrator is built around it.

### Tranche 2: Orchestrator Skeleton & Simulation Loop (The "Dry Run" Agent)

Introduce the stateful orchestrator layer, but keep it disconnected from a real broker. It will run in a continuous loop against synthetic streaming data.

- [ ] **Live State Manager:** Build an in-memory store holding current prices, positions, cash, and active cooldown timers.
- [ ] **The Autonomous Loop:** Build a polling or event-driven mechanism that continuously checks for price/position updates and triggers the engine's `evaluateRebalance`.
- [ ] **Debounce & Cooldown Controls:** Implement logic to prevent the engine from re-triggering repeatedly on every tick when a portfolio is oscillating around a threshold boundary.
- [ ] **Dry-Run Execution:** Ensure the agent generates real trade proposals but only logs them or writes them to a file instead of executing.

### Tranche 3: Broker Integration (The "Paper Trading" Agent)

Connect the orchestrator to a live broker API, utilizing their simulated/paper-trading environment. (Target broker to be confirmed, likely Alpaca).

- [ ] **Market Data Sync:** Connect to the broker's real-time or delayed price feed. The orchestrator must handle stale feed detection.
- [ ] **Position & Cash Sync:** Query the broker for factual ledger balances, replacing manual JSON inputs.
- [ ] **Execution Routing:** Translate engine `TradeProposal` objects into actual broker API order submissions (e.g., Market Orders).
- [ ] **Safety Limits:** Implement a hard kill-switch and a "max trades per period" limit to prevent runaway execution bugs in the paper environment.

### Tranche 4: Production Hardening (The "Live Trading" Agent)

Transition to real capital with production-grade monitoring and persistent audits.

- [ ] **Persistent Audit Trail:** Route the engine's immutable JSON audit outputs to a database or secure log sink (essential for regulatory/compliance tracing).
- [ ] **Reconciliation & Fills:** Handle partial fills, update live positions based on execution reports, and reconcile expected vs. actual trade prices.
- [ ] **Alerting:** Integrate notifications (e.g., Slack, Email) for critical agent events, feed failures, or executed trades.

## 4. Risks and Open Questions

- **Repository Structure:** Should the Orchestrator/Agent be a separate package/folder within this monorepo, or an entirely new repository?
- **Broker Target:** Is Alpaca the confirmed target for Tranche 3?
- **Persistence Model:** What persistent store will be used for the Tranche 4 audit trails? (e.g., Postgres, DynamoDB, flat files in S3).
