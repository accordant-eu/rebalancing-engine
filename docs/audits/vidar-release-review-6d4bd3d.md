# Vidar Review — Rebalancing Engine (Tag: deploy/2026-06-19-66d3489 to 6d4bd3d)
Date: 2026-06-20

## Verdict
The new endpoints and SSE streaming establish a critical real-time bridge for the Týr Agent, allowing it to transition from polling to reactive event-driven architecture. The JWT refresh token rotation provides necessary session longevity. However, the implementation traded performance and security completeness for speed. Several critical bugs break the circuit breaker state and expose the Node.js event loop to DoS vectors.

## Technical Soundness
- **SSE Stream (Issue #35):** The global event bus listener executes synchronous SQLite lookups to determine tenant ownership for every event emitted. This transforms an asynchronous stream into a synchronous bottleneck, breaking under moderate load.
- **Summary API (Issue #38):** `GET /api/portfolios/summary` re-evaluates all portfolios synchronously on the main thread. This blocks the event loop entirely. Server-side aggregation is the right product move for Týr, but the execution approach is flawed.
- **Circuit Breaker State (Issue #34):** The core executor correctly halts on breach, but `circuitBreakerStatus` is never explicitly set to `'open'` in the SQLite database. Týr and clients cannot query the blocked state via the API.
- **Event Orchestration (Issue #37):** Submitting a pending cashflow does not enqueue the portfolio for re-evaluation, delaying the capital deployment until an unrelated price tick triggers the loop.

## Privacy / Security Claims
- **Auth Hardening Gaps (Issue #36):** `POST /api/auth/login` and `/api/auth/refresh` verify credentials/tokens but fail to check if the underlying `user.status` is `'Active'`. Suspended users retain access indefinitely if they hold valid tokens.
- **Refresh Token Storage:** Refresh tokens are stored in plaintext in the DB. While they are appropriately rotated on use, a database leak immediately exposes active tokens. Hashing them before storage is recommended.

## Risks and Gaps
- **Load-bearing assumption:** The orchestrator loop assumes synchronous evaluation is "fast enough", which leaks into API requests. As the number of bespoke portfolios scales, the single-threaded Node process will stall.
- **Silent failure:** The circuit breaker state mismatch means the orchestrator may attempt to retry failed trades repeatedly if another trigger requeues the portfolio, endlessly throwing without external API visibility.

## Recommendations
1. Patch the `circuitBreakerStatus` omission immediately to ensure the API matches the engine's blocked reality.
2. Refactor the SSE listener to filter events in-memory using tenant data attached to the `SystemEvent` payloads.
3. Remove synchronous `evaluateRebalance` calls from API endpoints. Rely on cached drift states updated asynchronously by the orchestrator.
4. Enforce `user.status === 'Active'` in all authentication handlers.
5. Hash refresh tokens in the database.
