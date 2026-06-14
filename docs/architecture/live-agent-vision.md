---
type: Architecture
title: Live Agent Vision
description: Documentation for live agent vision
tags: [architecture]
timestamp: 2026-06-14T00:00:00Z
---

# Live Agent Vision

Date: 2026-06-14

Status: Directional vision. Not a PRD or implementation plan.

## 1. Context

The rebalancing engine was built as an offline deterministic calculation core with synthetic fixtures and a CLI. However, the project's direction is toward a **live autonomous agent** connected to a real-time broker, not a permanently offline module.

This document captures the emerging architectural vision based on owner feedback. It should inform future design decisions and help avoid choices that conflict with the live-agent direction.

## 2. Target Operating Model

The engine would run as part of an autonomous agent pipeline:

- Connected to a **real-time price feed** (streaming from broker or market data provider).
- Receiving **live position and cash state** from the broker API.
- **Continuously monitoring** portfolio drift against target allocations.
- **Automatically generating trade proposals** when strategy triggers fire.
- **Executing trades** against the broker via API.
- **Reconciling fills** and updating state.

The assumed execution model is **low-latency, instant execution** at retail scale with liquid assets (e.g., ETFs, stocks via a broker like Alpaca).

## 3. Pipeline Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION / AGENT                     │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌────────┐ │
│  │  Price    │   │ Position │   │  Account  │   │ Event  │ │
│  │  Feed     │   │  Sync    │   │  Events   │   │ Bus    │ │
│  │ (stream)  │   │ (broker) │   │ (deposits,│   │        │ │
│  │           │   │          │   │  fills)   │   │        │ │
│  └────┬─────┘   └────┬─────┘   └─────┬─────┘   └───┬────┘ │
│       │              │               │              │      │
│       ▼              ▼               ▼              │      │
│  ┌─────────────────────────────────────────┐        │      │
│  │         LIVE STATE MANAGER              │        │      │
│  │  • Current prices (with timestamps)     │        │      │
│  │  • Current positions (from broker)      │        │      │
│  │  • Cash balance (from broker)           │        │      │
│  │  • Pending orders                       │        │      │
│  │  • Cooldown / debounce state            │        │      │
│  └────────────────┬────────────────────────┘        │      │
│                   │                                  │      │
│                   ▼                                  │      │
│  ┌─────────────────────────────────────────┐        │      │
│  │         REBALANCING ENGINE (core)       │◄───────┘      │
│  │  • Valuation                            │               │
│  │  • Drift calculation                    │               │
│  │  • Strategy evaluation (threshold,      │               │
│  │    calendar, manual, scheduled flows)   │               │
│  │  • Trade proposal generation            │               │
│  │  • Audit + explanation                  │               │
│  └────────────────┬────────────────────────┘               │
│                   │                                         │
│                   ▼                                         │
│  ┌─────────────────────────────────────────┐               │
│  │         EXECUTION LAYER                 │               │
│  │  • Order submission (broker API)        │               │
│  │  • Fill monitoring                      │               │
│  │  • Partial fill handling                │               │
│  │  • Post-trade reconciliation            │               │
│  │  • Failure / retry logic                │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │         SAFETY & CONTROLS               │               │
│  │  • Cooldown timer (don't retrigger)     │               │
│  │  • Max trades per period                │               │
│  │  • Kill switch                          │               │
│  │  • Alerting / notifications             │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## 4. How Each Concern Changes

### Prices

| Aspect | Current (offline) | Live agent |
| --- | --- | --- |
| Source | Static JSON file | Streaming feed from broker/provider |
| Freshness | No timestamp metadata | Naturally maintained by feed; stale feed = orchestrator alert |
| Valuation vs execution | Same price for both | Same price for both (instant execution assumption) |
| Feed health | N/A | Orchestrator detects stale/dead feeds |

In the live model, the orchestrator maintains price state and knows when each price was last updated. The engine receives current best prices and calculates. Price timestamps are recorded in the audit trail for traceability, but staleness enforcement belongs in the orchestrator, not the engine.

### Positions and Cash

| Aspect | Current (offline) | Live agent |
| --- | --- | --- |
| Holdings | User-provided JSON | Broker-reported, including pending orders |
| Cash balance | User-provided number | Broker-reported, factual |
| Scheduled cash flows | Expanded into available cash (with warnings) | Planning/projection only; broker reports actual arrivals |
| Pending orders | Not modeled | Must be tracked — they lock cash and affect sizing |

Key principle: **the engine should not make assumptions about what happened outside its visibility boundary.** If the input says cash is X, that is what the engine should use. Scheduled flows are valuable for simulation and projection, but should not inflate available cash for actionable rebalancing recommendations.

### Strategy Triggers

| Strategy | Current (offline) | Live agent |
| --- | --- | --- |
| Threshold | One-shot evaluation | Continuous — re-evaluate on price/position changes, debounced |
| Calendar | Explicit input dates | Real wall-clock time, managed by orchestrator |
| Manual | Explicit trigger flag | User/operator command through agent interface |
| Cooldown | N/A | Essential — prevent over-trading on threshold oscillation |

New concern: **debounce/rate-limiting.** When prices oscillate around a threshold band edge, the engine should not retrigger on every tick. A cooldown timer (e.g., "don't rebalance again within N minutes") is an orchestrator responsibility.

### Trade Execution

| Aspect | Current (offline) | Live agent |
| --- | --- | --- |
| Output | JSON proposal | Actual order submission to broker |
| Order types | Not modeled | Market orders initially; limit orders later |
| Partial fills | Not modeled | Must handle — update position, re-evaluate |
| Failure | Not modeled | Retry, alert, or abort depending on failure type |
| Reconciliation | Simulation replays exact quantities | Compare expected vs actual fill prices |

### Audit Trail

The audit trail becomes even more critical in the live model. It must trace the full chain:

1. What price state triggered the evaluation?
2. What was the drift measurement?
3. What strategy fired?
4. What trade proposals were generated?
5. What orders were submitted to the broker?
6. What fills came back?
7. What is the reconciled post-trade state?

## 5. Impact on Engine Architecture

The core calculation logic (valuation, drift, threshold comparison, trade proposal generation) remains **pure and stateless**. It takes state in and produces proposals out. This does not change.

What is new is the **orchestration layer** around the engine:

- Maintains live state (prices, positions, pending orders, cooldowns)
- Calls the engine on state changes
- Handles execution against the broker
- Manages cooldowns, rate limiting, and safety controls
- Provides persistent audit logging
- Detects and handles feed/connection failures

The engine remains a function; the agent is the loop.

## 6. Implications for Current Decisions

This vision informs several near-term choices:

1. **Scheduled cash flows** should be projection/planning tools, not inputs to current trade proposals. The broker reports actual cash. (Decision recorded 2026-06-14.)
2. **Price timestamps** (`asOf`) should be added for audit traceability, but staleness enforcement belongs in the orchestrator. (Decision recorded 2026-06-14.)
3. **Weekly recurrence** should be supported for scheduled flows, matching real broker contribution schedules. (Decision recorded 2026-06-14.)
4. **Schema-only validation** remains deferred — the engine-path validation is sufficient and the orchestrator will handle input assembly. (Decision recorded 2026-06-14.)
5. The **production boundary deferral** (no API/UI/database) remains valid — the agent/orchestrator is a separate system that calls the engine, not something built inside it.

## 7. What This Document Is Not

This is not a PRD, an implementation plan, or a commitment to build the agent layer now. It is a directional vision that should prevent current engine work from making choices that conflict with the eventual operating model.

The engine's current value is in its deterministic calculation core, its test coverage, and its CLI. These remain useful as the offline development and regression interface even after a live agent exists.

## 8. Open Questions for Future Work

- What broker API is the primary target? (Alpaca is the likely first integration.)
- Should the orchestrator be a separate repository or part of this one?
- What persistence model should the agent use for audit trails?
- What alerting/notification channels should the agent support?
- How should the agent handle multi-portfolio monitoring?
- What safety limits should be configurable (max trade size, max trades per day, etc.)?
- Should the engine support a "dry run" mode where it generates proposals but the orchestrator does not execute them?
