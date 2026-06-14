---
type: Implementation Plan
title: Mvp Implementation Plan
description: Documentation for mvp implementation plan
tags: [root]
timestamp: 2026-06-14T00:00:00Z
---

# MVP Implementation Plan: Generic Portfolio Rebalancing Engine

## 1. Executive Summary

The MVP implementation path for the generic portfolio rebalancing engine will focus strictly on a deterministic, cash-aware, tolerance-band strategy for liquid long-only assets. The objective is to build a mathematically sound core engine that separates pure drift calculations from strategy-specific execution logic using the Strategy pattern.
The first proof point will be the generation of an accurate, deterministic drift calculation and a basic trade proposal using synthetic fixtures without any live market data integrations.
The main implementation risk is premature abstraction (e.g., building complex optimal control logic or tax lot accounting) before the core evaluation engine is solid.
Integrations with Order Management Systems (OMS) or core banking platforms are fully deferred. Validation will rely on a Determinism-Faithfulness Assurance Harness (DFAH) using rigorous, static JSON fixtures to ensure perfect reproducibility.

## 2. Repository Snapshot

- **Current Stack:** The repository is currently language and framework agnostic. No existing code, build tools, or test frameworks are present.
- **Current Structure:** Empty structure with a `docs/` folder containing the PRD and meta-paper synthesis. Root contains `README.md`, `BUILD_JOURNEY.md`, `AGENTS.md`, and `.gitignore`.
- **Current Testing/Tooling:** None.
- **Documentation State:** Baseline project rules (`AGENTS.md`) and living journal (`BUILD_JOURNEY.md`) are initialized. PRD is available.
- **Constraints:** Must respect existing agent rules, avoid major dependencies without justification, and maintain deterministic calculations.
- **Opportunities:** A clean slate allows for a test-driven, decoupled architecture from day one.

## 3. PRD Interpretation

- **MVP Objective:** Create a scalable computational core that automates alignment of portfolios with strategic mandates via cash-aware tolerance-band rebalancing.
- **In-Scope:** Deterministic drift detection, cash routing, threshold logic, minimum trade constraints, natural language explainability, immutable JSON audit trails.
- **Out-of-Scope:** Automated STP execution, intraday trading, tax-lot (HIFO) optimization, direct indexing, multi-currency, derivatives, ML models.
- **Main Workflows:** Ingest state -> Value & calculate drift -> Evaluate via Strategy -> Generate cash-aware proposal -> Apply constraints -> Emit simulation & audit log.
- **Main Domain Concepts:** PortfolioState, TargetAllocation, PriceSnapshot, DriftMeasurement, RebalancingPolicy, TradeProposal, AuditRecord.
- **Non-functional:** Determinism, reproducibility, batch scalability, idempotency, failure handling (stale pricing).
- **Audit/Explainability:** Core requirement for MiFID II compliance. Every evaluation must yield an immutable JSON log and plain-language rationale.

## 4. Assumptions and Open Questions

### Assumptions

- The implementation language (TBD) supports strict functional/deterministic constructs and precise decimal arithmetic (e.g., Python with `decimal`, TypeScript, Go, or Java).
- Upstream systems (in future phases) will provide clean, reconciled EOD holdings and prices.
- Corporate actions are handled upstream.
- All MVP instruments settle in a single base currency.

### Open Questions

- **Implementation Stack:** What is the target programming language and framework for this engine? (Why: Needed before Slice 1. Default: Python or TypeScript if not answered. Blocks MVP planning: Yes, before coding starts).
- **Missing/Stale Price Policy:** Should an account evaluation be strictly aborted if _any_ price is missing, or can it proceed by excluding the asset? (Why: Dictates error handling logic. Default: Abort evaluation. Blocks MVP: No).
- **Minimum Trade Size Definition:** Is this defined globally, per-asset, or per-account? (Why: Needed for constraint engine. Default: Global configuration in RebalancingPolicy. Blocks MVP: No).

## 5. MVP Scope Boundary

### MVP Includes

- Offline portfolio-state input (JSON fixtures).
- Static price snapshot ingestion.
- Static target allocation tracking.
- Deterministic absolute and relative drift calculation.
- Threshold-based rebalance triggers.
- Cash-aware buy/sell candidate generation.
- Minimum trade-size filtering.
- Before/after allocation simulation.
- Natural-language explanation output.
- Immutable JSON audit record generation.
- Comprehensive synthetic unit/integration tests.

### MVP Excludes

- Live API integrations (OMS, core banking).
- Live market data feeds.
- Automated straight-through processing (STP).
- Tax-lot (HIFO) accounting.
- Direct indexing algorithms.
- Multi-currency conversion.
- Intraday pricing algorithms.
- Optimal control/stochastic boundary optimization.
- UI/Frontend development.

## 6. Delivery Strategy

The delivery will aggressively isolate pure domain logic from side effects. We will begin with an offline calculation engine (Slice 1-4) relying entirely on synthetic JSON fixtures. This removes integration risk and allows us to focus on mathematical correctness and determinism.
By building the explanation and audit features (Slices 8-9) directly into the core engine rather than as afterthoughts, we ensure compliance is structurally guaranteed.
The architecture will use the Strategy pattern for trigger evaluation, but we will not introduce a second strategy until the core foundation is fully validated.

## 7. Slice-by-Slice MVP Plan

### Slice 0 — PRD Alignment and Repository Planning

- **Goal:** Translate PRD into repository-specific implementation plan.
- **Scope:** Document generation.
- **Validation:** MVP plan approved, `BUILD_JOURNEY.md` updated.

### Slice 1 — Domain Fixture Foundation

- **Goal:** Create synthetic sample portfolios, target allocations, price snapshots, and policy fixtures.
- **Scope:** Define minimal JSON schemas for `PortfolioState`, `TargetAllocation`, `PriceSnapshot`, `RebalancingPolicy`. Create fixtures representing on-target, drift breaches, positive cash, and missing prices.
- **Out of scope:** Core logic implementation.
- **Validation:** Fixtures are valid JSON and cover defined edge cases.

### Slice 2 — Portfolio Valuation and Weight Calculation

- **Goal:** Calculate market values and current weights from holdings, cash, and prices.
- **Scope:** `calculateMarketValues`, `calculateCurrentWeights` functions.
- **Validation:** Correct valuation against fixtures, handles cash, detects missing prices cleanly.

### Slice 3 — Target Allocation and Drift Calculation

- **Goal:** Compare current weights to target allocation and calculate absolute/relative drift.
- **Scope:** `calculateDrift` function returning `DriftMeasurement` arrays.
- **Validation:** Correct mathematical drift, flags un-modeled assets.

### Slice 4 — Threshold Trigger Evaluation

- **Goal:** Determine whether a rebalance is needed based on tolerance bands.
- **Scope:** `ThresholdStrategyModule` (trigger logic only).
- **Validation:** Only triggers when absolute or relative bands are breached.

### Slice 5 — Basic Trade Proposal Generation

- **Goal:** Generate deterministic buy/sell proposals to reset to target allocation.
- **Scope:** `TradeProposalGenerator` (naive reset).
- **Validation:** Trades reduce drift mathematically.

### Slice 6 — Cash-Aware Adjustment and Minimum Trade Rules

- **Goal:** Improve proposals to use cash inflows and avoid uneconomic trades.
- **Scope:** `routeCashInflows` and `applyMinimumConstraints`.
- **Validation:** Cash is deployed before sells; trivial trades are dropped.

### Slice 7 — Post-Trade Simulation

- **Goal:** Calculate expected post-trade holdings, turnover, and residual drift.
- **Scope:** Simulation engine.
- **Validation:** Before/after delta matches trade proposals.

### Slice 8 — Explanation Output

- **Goal:** Generate human-readable explanations for recommendations.
- **Scope:** `ExplanationService`.
- **Validation:** Clear strings explaining trigger rationale and constraint impacts.

### Slice 9 — Audit and Reproducibility Record

- **Goal:** Emit a structured JSON recommendation record capturing the full context.
- **Scope:** `AuditRecord` serialization.
- **Validation:** Audit output contains exact inputs, policy, and outputs for replay.

### Slice 10 — Batch Scenario Runner / Test Harness

- **Goal:** Run the engine over multiple synthetic scenarios systematically.
- **Scope:** Determinism-Faithfulness Assurance Harness (DFAH).
- **Validation:** Bulk execution of fixtures yields perfect, deterministic outputs.

### Slice 11 — Second Strategy Proof Point

- **Goal:** Add a `CalendarStrategyModule` to validate architecture extensibility.
- **Scope:** New strategy implementation bypassing drift thresholds.
- **Validation:** Core engine orchestrates new strategy without refactoring shared valuation/drift logic.

## 8. Dependency Graph

| Slice               | Depends On | Parallelizable |
| ------------------- | ---------- | -------------- |
| 1. Fixtures         | None       | Yes            |
| 2. Valuation        | 1          | No             |
| 3. Drift            | 2          | No             |
| 4. Trigger          | 3          | No             |
| 5. Basic Trades     | 4          | No             |
| 6. Cash/Constraints | 5          | No             |
| 7. Simulation       | 6          | No             |
| 8. Explanation      | 4, 6       | Yes (with 7)   |
| 9. Audit Record     | 7, 8       | No             |
| 10. Batch Runner    | 9          | No             |
| 11. Second Strategy | 4          | Yes (after 4)  |

## 9. Architecture Evolution Plan

- **Early Abstractions:** Portfolio valuation, drift calculation, and audit logging will be abstracted immediately as they are universal.
- **Simplicity:** Target execution will default to a naive "full reset" in early slices.
- **Later Abstractions:** Complex execution targeting (e.g., boundary optimization) will be deferred until after the second strategy proof point.
- **Isolation:** Strategy-specific logic (e.g., threshold evaluation) will be strictly confined to Strategy classes implementing a common interface.

## 10. Proposed Repository Structure (Provisional - Language Agnostic)

```text
/
├── .gitignore
├── README.md
├── BUILD_JOURNEY.md
├── AGENTS.md
├── docs/
├── src/
│   ├── core/           # Valuation, drift math, audit serialization
│   ├── strategy/       # Threshold, Calendar modules
│   ├── constraints/    # Minimum trade rules, exclusions
│   ├── explanation/    # Natural language generation
│   ├── models/         # BIAN-aligned entity interfaces
│   └── engine/         # Main orchestrator/workflow loop
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/       # JSON portfolios, policies, prices
```

## 11. Data Structures and Interfaces to Introduce

- **Account:** Root entity tracking portfolio state.
- **PortfolioState:** Snapshot of holdings and cash.
- **TargetAllocation:** The strategic model weights.
- **PriceSnapshot:** Reference market data.
- **RebalancingPolicy:** Configuration (thresholds, min trade size).
- **DriftMeasurement:** Output of drift calculation.
- **TradeProposal:** Actionable list of `ProposedTrade`s.
- **AuditRecord:** Complete immutable JSON log of the transaction.
- **StrategyInterface:** Contract for `evaluate(state, policy, drift)`.

## 12. Test Strategy

- **Unit Tests:** High coverage for pure mathematical functions (`calculateDrift`, `routeCash`).
- **Fixture Tests:** Core engine run against predefined JSON edge cases (positive cash, out of bands).
- **Determinism Tests:** DFAH running the identical scenario 1,000 times asserting zero variance in the `TradeProposal`.
- **Minimum Requirement:** Each slice requires 100% pass rate on relevant tests before advancing.

## 13. Validation Gates

- **Gate A (Fixture Quality):** Valid JSON schemas mapping to BIAN models.
- **Gate B (Math Correctness):** Valuation and drift calculations pass unit tests.
- **Gate C (Deterministic Proposals):** Trades reduce drift and utilize cash correctly.
- **Gate D (Compliance):** Audit logs and explanations are accurate and complete.
- **Gate E (Extensibility):** Strategy 2 (Calendar) added without breaking core.

## 14. Risks and Mitigations

- **Over-engineering:** Building optimization engines early. _Mitigation:_ Strict adherence to threshold strategy in MVP.
- **Float Precision Issues:** Financial calculations yielding rounding errors. _Mitigation:_ Use strict decimal types/libraries from the start.
- **Leaky Abstractions:** Strategy logic bleeding into the core engine. _Mitigation:_ Code reviews strictly enforcing the Strategy interface.

## 15. Backlog

- **MVP Must-Have:** Fixtures, Valuation, Drift, Threshold Trigger, Cash Routing, Proposals, Audit Logs.
- **MVP Should-Have:** Basic CLI/Harness for bulk testing.
- **Post-MVP Near-Term:** REST API endpoints, UI integration.
- **Later-Stage:** Optimal control regions, HIFO tax harvesting.

## 16. Documentation Plan

- `BUILD_JOURNEY.md` updated after each slice completion.
- Markdown documentation for the Strategy Interface to guide future quant development.
- Fixtures documented with specific READMEs explaining the "why" of the edge case.

## 18. Final Recommendation

- **First Slice:** Commence Slice 1 (Domain Fixture Foundation).
- **Why:** Establishing the strict JSON schemas and synthetic data allows the mathematical core to be built entirely offline without external dependencies.
- **Avoid:** Do not select a language or framework without user confirmation. Do not build any web servers or databases in the first pass. Focus purely on data structures and pure functions.


&copy; 2026 Johan Hellman. All rights reserved.
