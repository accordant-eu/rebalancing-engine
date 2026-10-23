---
type: Decision Record
title: Pin Node 24 Image to 24.22.1 and Cumulative Fill Reconciliation Alignment
description: Pinned Docker base images to node:24.22.1-bookworm to resolve CVE-2026-111497 and aligned Alpaca trade stream filled quantity mapping with cumulative shadow ledger expectations.
tags: [security, docker, node24, broker, streaming, reconciliation, cve]
timestamp: 2026-10-23T10:35:00Z
status: Accepted
supersedes: none
---

# Pin Node 24 Image to 24.22.1 and Cumulative Fill Reconciliation Alignment

## Context

Two operational items arose from production operations and security monitoring:
1. **CVE-2026-111497 (Node 24 Brotli RCE / Issue #139)**:
   Node.js released security release 24.22.1 addressing an out-of-bounds write in the Brotli decoder. While operator Rufus rebuilt the live container on the production host, [Dockerfile](Dockerfile) used floating tags (`node:24-bookworm` / `node:24-bookworm-slim`), leaving future builds vulnerable to silent tag floats or regressions.
2. **Cumulative Fill Quantity Mapping (Issue #137 deployment review)**:
   In [src/broker/alpaca-streamer.ts](src/broker/alpaca-streamer.ts), `handleTradeUpdate` on `fill` events evaluated `filledQuantity = parseFloat(data.qty || order.filled_qty || '0')`. In Alpaca's WebSocket trade stream, `data.qty` represents the incremental size of the execution tranche, whereas `SqliteStateManager.processExecutionReport` expects cumulative `filledQuantity` to compute `deltaFilled = newFilled - previousFilled`. When an order filled across multiple tranches (e.g., 7 partial then 3 completion on a 10-share order), evaluating `data.qty` resulted in `3 - 7 = -4`, causing the completion fill to be rejected as an invalid quantity regression.

## Options Considered

### Option 1: Unpinned Docker Tag with Streamer Tranche Accumulator
- **Benefits:** Keeps Dockerfile on generic major version.
- **Costs:** Docker builds remain non-reproducible; stateful tranche accumulator in the streamer duplicates logic already managed by `SqliteStateManager`.
- **Risks:** Unpinned Docker tags expose production to upstream container regressions.
- **Reversibility:** High.

### Option 2: Pinned Base Images (24.22.1) and Streamer Preferring `order.filled_qty` (Selected)
- **Benefits:**
  - Guarantees exact runtime immutability against CVE-2026-111497.
  - Aligns Alpaca trade updates with webhook behavior (both prefer `order.filled_qty`, the official cumulative field).
  - Eliminates false-positive fill drops during multi-tranche executions.
- **Costs:** Requires updating Dockerfile when new Node security patches are published.
- **Risks:** Minimal; tested against existing native modules (`better-sqlite3`).
- **Reversibility:** High.

## Decision

We chose **Option 2**. We pinned `Dockerfile` to `node:24.22.1-bookworm` (builder) and `node:24.22.1-bookworm-slim` (production), updated `AlpacaBrokerStreamer.handleTradeUpdate` to prefer `order.filled_qty` across all fill events, and merged Dependabot's Vite 8.3.5 upgrade (PR #138).

## Rationale

This decision directly satisfies [Rule 1 (Repository Stewardship)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#1-repository-stewardship), [Rule 6 (Security and Privacy)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#6-security-and-privacy), and [Rule 7 (Data and Domain Integrity)](file:///Users/johanhellman/Projects/rebalancing-engine/AGENTS.md#7-data-and-domain-integrity). Financial ledgers must never drop trade completion events due to payload schema mismatches.

## Implementation Impact

- **Code:**
  - `Dockerfile`: Pinned builder and production images to `node:24.22.1-bookworm` and `node:24.22.1-bookworm-slim`.
  - `src/broker/alpaca-streamer.ts`: Updated `fill` event parser to prefer `order.filled_qty || data.qty`.
  - `package.json` & `package-lock.json`: Bumped version to `0.9.2`; merged Vite 8.3.5 in `web/package.json`.
- **Tests:**
  - `tests/alpaca-streamer.test.ts`: Added multi-tranche execution test verifying cumulative filled quantity reporting across partial and final fills.
- **Documentation:**
  - Updated `docs/decisions/index.md`, `docs/log.md`, `docs/iterations/2026-10-23-operational-and-security-hardening.md`, and `BUILD_JOURNEY.md`.
  - Closes Issue #139.

## Follow-up

- Proceed to Slice 4: Multi-Custodian Broker Adapters (Interactive Brokers / IBKR).


&copy; 2026 Johan Hellman. All rights reserved.
