---
type: Decision
title: Colocate API Server within Live Agent Process
description: Architectural decision to embed the M2M API directly into the orchestrator loop.
tags: [architecture, api, express]
timestamp: 2026-06-14T15:20:00Z
---

# 0045: Colocate API Server within Live Agent Process

Date: 2026-06-14

## Context

Tranche 5 of the v3 MVP requires surfacing the live agent's state to an API-First layer. We had to decide how to expose the `LiveStateManager` and JSONL audit trails to external consumers (like our new Command Center UI or future B2B partners).

## Options Considered

1. **Option 1: Standalone API Microservice.** Build a separate Node.js service that queries a shared PostgreSQL/SQLite database to serve API requests, completely decoupled from the Live Agent's execution process.
2. **Option 2: Embedded API Server.** Spin up a lightweight Express HTTP server directly *inside* the Live Agent's Node.js process, serving responses from the Agent's local memory footprint and file system.

## Decision

We chose **Option 2**. We will colocate the Express API server within the Agent's process, running on a configurable port (defaulting to 4444 to avoid port 3000 conflicts).

## Rationale

Adhering to the "UX-First Thin Slice MVP" methodology (ADR-0043), we are deliberately deferring the introduction of a heavy database (SQLite) until Tranche 8. Because the agent's current state resides purely in memory via the `LiveStateManager`, a separate microservice would have no database to read from. By embedding Express inside the agent, we can instantly access and serve the exact live memory state of the engine with zero latency, proving the UI integration immediately. 

When we eventually transition to a real Database in Tranche 8, we can revisit whether to decouple the API into a separate service to improve scaling and security isolation.

## Implementation Impact

- `express` and `cors` will be added as dependencies to the core engine.
- `src/cli/agent.ts` will be modified to start the Express server asynchronously when the agent boots.
- M2M Partner API read-requests will compete for the same Node.js Event Loop ticks as the core Rebalancing Engine calculations. We must monitor this to ensure heavy API traffic does not block live trade execution.

## Validation

Validation will occur when a frontend client can successfully fetch `GET /api/state` from `localhost:4444` while the agent is actively polling the broker.

&copy; 2026 Johan Hellman. All rights reserved.
