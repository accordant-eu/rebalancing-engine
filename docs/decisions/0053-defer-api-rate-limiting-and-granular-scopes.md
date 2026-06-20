---
type: Decision Record
title: Defer API Rate Limiting, Granular Scopes, and Standardized Error Backoffs
description: Defer implementing strict API usage constraints until post-MVP live trading
tags: [architecture, security, api]
timestamp: 2026-06-20T17:35:00Z
status: Deferred
supersedes: 
---

# Defer API Rate Limiting, Granular Scopes, and Standardized Error Backoffs

## Context

During the Vidar Audit review and the subsequent resolution of Issues #34–#38, it became clear that while we have secured the baseline Authentication endpoints (JWT + Refresh Tokens, Active status checks), the Týr API lacks systemic abuse prevention and granular access controls. 

Specifically, the following are missing:
1. **Rate Limiting:** No Token Bucket or sliding window limits to prevent an agent or UI from spamming the Orchestrator and starving the execution loop.
2. **Granular Auth Scopes:** All authenticated sessions rely purely on RBAC (Tenant vs Admin). We lack OAuth-style scopes (e.g., `read:drift` vs `write:mandates`) for programmatic API keys.
3. **Error Semantics & Backoffs:** Standardized error formats with `Retry-After` HTTP headers are not fully implemented, leaving client agents without clear backoff heuristics during system saturation.

## Options Considered

### Option 1: Implement Full API Gateway Constraints Now
- **Benefits:** Maximizes security and stability before touching any live broker APIs.
- **Costs:** High implementation overhead. Requires introducing a caching layer (like Redis) for distributed rate-limiting, and rewriting the JWT issuance pipeline to support bitmask/array scopes.
- **Risks:** Delays the core objective of paper trading and friction optimization.
- **Reversibility:** Low reversibility; once consumers rely on specific error schemas or scope names, changing them breaks integrations.

### Option 2: Defer until Tranche 4 (Production Hardening)
- **Benefits:** Keeps the MVP lean. Allows us to focus on the core rebalancing algorithm (Friction Penalty Function) and Alpaca Paper Trading (Tranche 3).
- **Costs:** The system remains vulnerable to denial-of-service (DoS) from misconfigured internal agents during the testing phase.
- **Risks:** If we move to real capital without these, a bug in the Týr Agent could DDoS the Orchestrator, causing missed rebalance sweeps.
- **Reversibility:** High. We can layer rate-limiting middleware (like `express-rate-limit`) over the existing Express routes later without changing the core business logic.

## Decision

**Option 2 is selected.** We will defer API Rate Limiting, Granular Auth Scopes, and Standardized Error Backoffs until **Tranche 4 (Production Hardening)**.

## Rationale

The project is currently pivoting from an offline engine to a live agent. Our immediate priority is ensuring the agent makes correct trading decisions (Friction Optimization) and successfully routes them to a sandbox broker (Alpaca Integration). Since the environment is currently restricted to internal testing and paper trading, the risk of a malicious DDoS is zero, and the risk of accidental DoS from our own agent is acceptable for the MVP phase. 

We will revisit this decision before committing real capital (Tranche 4).

## Implementation Impact

- **Code:** No immediate changes to `server.ts`. 
- **Tests:** N/A.
- **Documentation:** This ADR serves as the formal record of the known gap identified in GitHub Issue #40.

## Follow-up

- Revisit during Tranche 4 planning.
- Evaluate standard middleware (e.g., `express-rate-limit`) for Node.js vs. pushing rate limiting to an external ingress/API Gateway.


&copy; 2026 Johan Hellman. All rights reserved.
