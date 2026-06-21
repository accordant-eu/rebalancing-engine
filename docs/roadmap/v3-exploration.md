---
type: Reference
title: Live Agent v3.0 Exploration & Scaling
description: A working document for exploring and discussing future features, scaling architectures, and multi-portfolio support.
tags: [roadmap, exploration, draft]
timestamp: 2026-06-14T14:35:00Z
---

# Live Agent v3.0: Exploration & Scaling Discussion

**Status:** WORK IN PROGRESS (Draft / Discussion Document)

This document is a scratchpad to map out the goals, interdependencies, and sequence of high-level areas for the next evolution of the rebalancing engine. It captures active discussions, pros/cons, and conceptual architectures before they are crystallized into a formal roadmap.

---

## 1. Friction Optimization (Beyond just "TCO")

**Goal:** Ensure the engine only trades when mathematically justified by the net-of-cost outcome.
**Discussion:**
- **The Scope of "Costs":** We must look at total friction, not just explicit broker commissions. Friction includes:
  1. **Explicit Costs:** Fixed fee per trade, basis points per order.
  2. **Implicit Costs (Slippage):** Bid/ask spread, market impact based on order size vs. liquidity.
  3. **Tax Impact (Capital Gains):** Triggering a massive short-term capital gain to fix a 0.5% drift is actively harmful to the after-tax portfolio value.
- **Proposed Approach:** Introduce a unified "Friction Penalty Function." We can start with purely mocked models (e.g., a hardcoded flat % slippage or fixed $ cost) to prove the pipeline works, before integrating complex cap-gains logic or live level-2 spread data.

## 2. Advanced Strategy vs. Tax-Loss Harvesting (TLH)

**Goal:** Separate the concepts of "what to hold" (Allocation Strategy) from "how to trade it efficiently" (Execution Overlay).
**Discussion:**
- **Advanced Strategy Support:** This refers to dynamic targeting. Instead of static weights, the engine rebalances to a dynamically calculated spot on the Efficient Frontier, or uses Value-at-Risk (VaR) or momentum-based targets.
- **Tax-Loss Harvesting (TLH):** This is an execution overlay. It is orthogonal to the allocation strategy. TLH opportunistically realizes capital losses to offset gains elsewhere, subject to wash-sale rules. 
- **Interdependencies:** Both require an extremely robust tax-lot tracking foundation (which we have started, but needs expansion for basis/duration tracking).

## 3. Scaling Architecture: The Multi-Portfolio Challenge

**Goal:** Scale the engine to gracefully handle thousands of portfolios reacting to a live market firehose.
**Discussion Points:**
- **The "Process-per-Portfolio" Idea:** Conceptually, having each portfolio act as a stand-alone subscriber to the price hose is the **Actor Model**. While we cannot literally spawn 10,000 OS-level processes, we *can* spawn 10,000 lightweight asynchronous "Actors" within a Node.js cluster. This guarantees ultra-low latency "time-to-respond" to market ticks.
- **State Management:** To support thousands of portfolios without querying a remote database on every tick, we need persistent in-memory storage. **SQLite** (running with Write-Ahead Logging or in `:memory:` mode with periodic disk flushing) is the perfect middle-ground. It provides relational querying for the UI but acts at memory speed for the engine.

## 4. Agent Dashboard & Command Center

**Goal:** Provide macro-observability over the entire agent ecosystem.
**Discussion:**
- **Aggregate Focus:** When managing thousands of portfolios, individual portfolio views become secondary to systemic health.
- **Metrics to Surface:**
  - Global Portfolio Health Scores (e.g., a distribution curve of how "out of balance" the book is).
  - "Near-Miss" Visualizations: How many portfolios are within `0.1%` of triggering a massive wave of orders?
  - Aggregated execution volumes and API rate-limit pressures.
- **Interdependencies:** This heavily relies on the SQLite multi-portfolio foundation (Point 3). The UI needs a structured way to query the global state rapidly.
## 5. Portfolio Mandate & Lifecycle Management

**Goal:** Establish how portfolios are born, configured, and maintained.
**Discussion:**
- **The "Mandate" Definition:** A portfolio is not just balances; it's a living mandate. The mandate must include the target allocation policy, friction tolerances (TCO/drift limits), and eligibility flags (e.g., "ESG Only" or "No TLH").
- **Initial Setup (Onboarding):** We need an API or bulk-upload mechanism to ingest new portfolios. When a portfolio is loaded, it must undergo a rigorous "Validation Check" before being armed for live trading.
- **Maintenance Lifecycle:** Mandates change. Target weights shift over time (e.g., target-date funds) or due to client requests. The system must support atomic, versioned updates to a portfolio's mandate so the engine always evaluates against the exact, temporally-correct policy.

## 6. Authentication, Authorization & Provenance

**Goal:** Strictly control and audit who can change what, separating operational oversight from financial mandate authority.
**Discussion:**
- **Role-Based Access Control (RBAC):**
  - *Sysadmins/Ops:* Can start/stop the Orchestrator, view error logs, and monitor API rate limits. Cannot change target weights or manually trigger trades.
  - *Portfolio Managers (Advisors):* Can propose changes to the target allocation mandates or adjust rebalancing parameters.
  - *Compliance/Approvers:* May be required in a "Maker-Checker" workflow. A PM proposes a mandate change; it remains pending until Compliance approves it.
- **Change Propagation & Audit Trails:**
  - Every change to a portfolio's settings (e.g., changing absolute drift tolerance from 5% to 3%) must be logged immutably.
  - The JSONL audit trail must be expanded to link the exact *version* of the mandate that was used to evaluate a trade. If a bad trade occurs, we must have provenance proving exactly who authorized the mandate and when it was modified.
- **B2B Partner API Access (Machine-to-Machine):**
  - **API-First Design:** The Command Center UI will simply be one consumer of the underlying API. We must assume wealth management partners will want to integrate their own CRMs (e.g., Salesforce) or proprietary portals directly into the engine.
  - **Scoped API Keys:** Partners will require API keys with granular scopes (e.g., `read:drift` vs `write:mandates`). 
  - **M2M Rate Limiting:** Partner API traffic must be strictly rate-limited and isolated from the core Orchestrator execution loop to ensure heavy read-queries don't starve the engine's ability to execute live trades.

## 7. Additional Operational Considerations

**Goal:** Anticipate edge-cases that cause catastrophic failures or systemic desyncs in production environments.
**Discussion:**
- **Corporate Actions & Dividends:** Stock splits, mergers, and spin-offs are incredibly dangerous for an autonomous agent. If a 4-for-1 split occurs, the price drops 75%. If the agent receives the new price *before* the broker updates the portfolio's share quantity, the agent will perceive a massive underweight drift and execute erroneous buy orders. We must integrate a Corporate Action feed to pause trading on affected tickers on ex-dates.
- **Market Hours & Calendars:** The engine must be fully aware of exchange holidays, early closures, and weekends. Evaluating drift on stale Friday prices over the weekend, or reacting to wide after-hours bid/ask spreads, will lead to highly suboptimal triggers.
- **End-of-Day (EOD) Reconciliation:** While we currently pause during open orders, we must also implement a rigorous EOD daily batch job. This job will query the broker's official "settled" ledger and compare it against our internal SQLite shadow ledger to detect settlement failures, broken trades, or unmatched cash flows.
- **Disaster Recovery (DR) & Dead-Letter Queues:** If the Orchestrator server suffers a catastrophic hardware failure mid-evaluation, the system must recover gracefully on reboot without duplicating orders. Message queues must use "at-least-once" delivery with idempotency checks on execution.

## 8. Multi-Tenancy & SaaS Architecture

**Goal:** Safely host multiple independent advisory firms (tenants) within a single deployed instance of the engine.
**Discussion:**
- **Tenant Isolation:** A tenant (e.g., Wealth Firm A) must have zero visibility into the portfolios of Tenant B. This requires strict row-level security or tenant-ID partitioning in the SQLite/database layer.
- **Broker Connections:** Different tenants use different custodians. The `BrokerAdapter` architecture must support dynamic injection of broker credentials per tenant (or even per portfolio).
- **Broker Templates & Limitations:** We should provide "Supported Broker Templates" (e.g., Alpaca, Interactive Brokers). If a tenant brings a custom broker, we define the minimum API requirements (ability to query positions, fetch live prices, submit market/limit orders).
- **Configuration Overrides:** Tenants should be able to define firm-wide defaults (e.g., "Firm A never allows drift > 5%"), which override the global engine defaults, but can be further overridden at the individual portfolio mandate level.

## 9. Model Portfolios & Mandate Propagation

**Goal:** Efficiently manage thousands of portfolios that all track the same underlying strategy without manually updating each one.
**Discussion:**
- **The "Model" Abstraction:** Instead of defining target weights (e.g., 60% SPY / 40% AGG) on 10,000 individual portfolios, the PM defines a single **Model Portfolio**.
- **Mandate Inheritance:** Individual portfolios subscribe to the Model. The portfolio's mandate says: "Track Model X, subject to Client Y's specific tax restrictions and cash buffers."
- **Update Propagation (Fan-out):** When the Investment Committee changes Model X to 65% SPY / 35% AGG:
  1. The new Model is versioned and approved (via Maker-Checker RBAC).
  2. A background propagation job fans out the new target weights to all 10,000 subscribed portfolios.
  3. The engine detects massive drift across 10,000 portfolios and gracefully queues evaluation events, respecting broker rate limits.

## 10. SaaS Go-To-Market & Partner Onboarding

**Goal:** Define the frictionless funnel from a prospective partner to a fully integrated, trading tenant.
**Discussion:**
- **The Marketing Sandbox:** A public marketing site should feature an interactive "Sandbox Mode." Prospective wealth managers can input a dummy target allocation and instantly see how the engine would handle drift, friction, and TCO over a historical backtest. This acts as a powerful lead-generation tool powered by a headless, ephemeral instance of the core engine.
- **Automated Provisioning:** Partner onboarding should be zero-touch. When a firm signs up (and passes necessary broker-dealer or KYC checks), an automated deployment pipeline instantly provisions their isolated Tenant DB partition, issues their initial Admin RBAC credentials, and generates their scoped M2M API keys.
- **White-Label UI Options:** While API-First is the priority, many smaller advisory firms lack developer resources. We should offer the React/Vite Command Center (built in Tranche 7) as a configurable White-Label product. Partners can inject their own logos and brand colors and embed the dashboard via iframe or map it to a custom subdomain (e.g., `rebalance.partner-firm.com`).

## 11. Margin and Leverage (Target Sums > 100%)

**Goal:** Safely support investment mandates that require leveraged positions (total weights exceeding 100%) while avoiding cascading margin calls or runaway execution.
**Discussion:**
- **Current Restriction:** ADR-0006 strictly prohibits the engine from generating trades that result in negative cash. The `cashBuffer` feature (Option 1B) supports allocations `< 100%`, but explicitly going `> 100%` requires borrowing.
- **Implementation Complexity:** Allowing a negative cash target means evaluating margin requirements, maintenance excess, and broker-specific borrowing power. If a portfolio uses $10,000 in equity to buy $15,000 of assets, a 10% market dip could trigger an automated broker liquidation that the agent would aggressively try to "fix" by re-leveraging, causing an infinite liquidation spiral.
- **Future Integration:** To support leverage, the engine will need a dedicated `MarginConstraint` interface that queries the broker's real-time maintenance margin API before committing any buy orders that dip into negative cash.

## 12. Asynchronous Broker Fills (WebSockets)

**Goal:** Process trade execution confirmations instantly via WebSockets instead of synchronous API polling.
**Discussion:**
- **Current Approach:** The MVP uses synchronous polling (e.g., `hasOpenOrders` loop) to ensure safety before deploying more capital.
- **Scaling Complexity:** Relying on HTTP polling across thousands of portfolios will trigger rate limits and introduce massive latency.
- **Future Integration:** To achieve real-time reconciliation at scale, the engine must implement a robust WebSocket or Webhook ingestion pipeline that receives execution fills, calculates partial executions, and asynchronously updates the internal `Holdings` and `Portfolios` tables. This requires managing disconnected streams, re-connection logic, and handling out-of-order execution events.

---

## Proposed Sequencing (For Discussion)

1. **The Multi-Portfolio Foundation:** Transition the `LiveStateManager` into a multi-tenant SQLite foundation. Build a simulation script for 1,000 synthetic portfolios to prove the plumbing.
2. **Friction Optimization (Mocked):** Inject the basic TCO/slippage model into the core to prevent the engine from generating micro-churn across the 1,000 portfolios.
3. **The Command Center:** Build the macro-observability UI to query the SQLite state.
4. **Advanced Strategies & TLH:** With a safe, multi-tenant, observable engine in place, we can begin experimenting with dynamic targeting and wash-sale constraint overlays.


&copy; 2026 Johan Hellman. All rights reserved.
