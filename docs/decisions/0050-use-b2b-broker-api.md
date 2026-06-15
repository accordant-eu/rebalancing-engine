---
type: decision
title: Use B2B Broker API for Execution
description: Transition from a 1-to-1 retail adapter to a 1-to-many B2B broker architecture
timestamp: 2026-06-15T00:00:00Z
---

# Use B2B Broker API for Execution

## Context
The project initially integrated with Alpaca via the retail Trading API (`@alpacahq/alpaca-trade-api`), which only supported a 1-to-1 mapping between the agent and a single account. To support the Multi-Tenant SaaS vision (Tranche 10+), the Rebalancing Engine must be able to route trades and query state for multiple independent sub-accounts using a single set of B2B credentials.

Additionally, the `@alpacahq/alpaca-trade-api` package was flagged by Dependabot for prototype pollution and is retail-oriented.

## Options Considered
1. **Option A (SDK)**: Use the official `alpaca-py` or `broker-fastapi-backend` (requires Python or heavy infrastructure, incompatible with our pure TS stack).
2. **Option B (Native HTTP)**: Implement a native `fetch`-based adapter in TypeScript specifically tailored to the endpoints we need, using Alpaca's Broker API with Basic Authentication.

## Decision
We chose **Option B**. We uninstalled `@alpacahq/alpaca-trade-api`, removed it from the `package.json`, and implemented a lightweight, native `AlpacaBrokerAdapter` that interfaces directly with the Alpaca Broker API via standard `fetch`. 
We updated the core orchestrator loops, `Executor`, and `CircuitBreaker` interfaces to accept and pass an `accountId` to support sub-account routing.

## Rationale
- **Dependency Hygiene**: Removing the vulnerable and unmaintained retail SDK improves security and aligns with Rule #8.
- **Architectural Alignment**: The B2B Broker API is the correct upstream dependency for a multi-tenant portfolio management system.
- **Simplicity**: A native `fetch` adapter gives us exact control over the endpoints we need (state, prices, trades) without pulling in heavy transitive dependencies or mismatched paradigms.

## Implementation Impact
- `BrokerAdapter` interface updated to require `accountId` on all methods.
- Core orchestrator passes `accountId` to `Executor` and `CircuitBreaker`.
- `alpaca-broker.ts` introduced, implementing Basic Auth for Broker API calls, and falling back to Paper API keys for standard Market Data API calls.

## Validation
- The `npm test` suite was updated to mock the new `accountId` parameters and passes.
- We booted the live agent against the Alpaca Broker API Sandbox environment, successfully authenticating, fetching real sub-account state, and resolving market data prices.
