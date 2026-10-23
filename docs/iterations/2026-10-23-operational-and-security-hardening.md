---
type: Iteration
title: Iteration 114 - Operational & Security Hardening (Node 24.22.1 & Cumulative Fill Mapping)
description: Pinned Docker base images to node:24.22.1-bookworm to resolve CVE-2026-111497, aligned Alpaca streamer with cumulative shadow ledger expectations, and merged Vite 8.3.5.
timestamp: 2026-10-23T10:35:00Z
---

# Iteration 114: Operational & Security Hardening (Node 24.22.1 & Cumulative Fill Mapping)

## Summary of Changes

In this iteration, we addressed operational and security feedback from production deployment reviews:

1. **Security & Container Hardening (Issue #139 / CVE-2026-111497)**:
   - Pinned base images in [Dockerfile](file:///Users/johanhellman/Projects/rebalancing-engine/Dockerfile) to `node:24.22.1-bookworm` (builder) and `node:24.22.1-bookworm-slim` (production).
   - Resolves CVE-2026-111497 (Node 24 Brotli decoder out-of-bounds write / RCE) and prevents Docker Hub tag floating regressions.

2. **Domain & Shadow Ledger Reconciliation Alignment (Issue #137 Feedback)**:
   - Updated `AlpacaBrokerStreamer.handleTradeUpdate` in [src/broker/alpaca-streamer.ts](file:///Users/johanhellman/Projects/rebalancing-engine/src/broker/alpaca-streamer.ts) to evaluate `filledQuantity = parseFloat(order.filled_qty || data.qty || '0')` on `fill` events.
   - Prevents multi-tranche executions (e.g. 7-share partial fill followed by 3-share completion) from computing false negative deltas and dropping order completion confirmations.
   - Added automated multi-tranche progression test in [tests/alpaca-streamer.test.ts](file:///Users/johanhellman/Projects/rebalancing-engine/tests/alpaca-streamer.test.ts).

3. **Dependency Maintenance (PR #138)**:
   - Merged Dependabot PR #138 upgrading `vite` in `web/package.json` from `8.2.0` to `8.3.5`.
   - Bumped engine application release to `0.9.2` in [package.json](file:///Users/johanhellman/Projects/rebalancing-engine/package.json) and [package-lock.json](file:///Users/johanhellman/Projects/rebalancing-engine/package-lock.json).

4. **Architectural Record**:
   - Formally documented **[ADR-0070](file:///Users/johanhellman/Projects/rebalancing-engine/docs/decisions/0070-pin-node-24-image-and-cumulative-fill-reconciliation.md)**.

## Verification

- `npx jest tests/alpaca-streamer.test.ts`: All 7 tests passed.
- `npx jest tests/streaming-fills.test.ts`: All 5 tests passed.
- `npm test`: All 47 test suites (371 tests) passed.
- `npm run --prefix web test`: All 3 test suites (8 tests) passed.
- `npm run lint` & `npm run --prefix web lint`: 0 errors, 0 warnings.
- `npm run --prefix web build`: Vite 8.3.5 compiled cleanly.


&copy; 2026 Johan Hellman. All rights reserved.
