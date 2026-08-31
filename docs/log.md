---
type: Reference
title: Knowledge Base Log
description: Log of major documentation updates
tags: [log, index]
timestamp: 2026-06-14T00:00:00Z
---

# Knowledge Base Log

| Date | Change |
|------|--------|
| 2026-08-31 | `docs/iterations/2026-08-31-pr-merges-and-dependency-upgrades.md` | Minor | Merged Dependabot PRs (#113-#117) and verified test suite health across 45 suites. |
| 2026-08-17 | `docs/decisions/0063-tax-advantaged-account-wrappers.md` | Major | Recorded ADR-0063 for Tax-Advantaged Account Wrappers & Policy Routing (ISA, SIPP, IRA, 401k). |
| 2026-08-17 | `docs/iterations/2026-08-17-pr-merge-and-state-simplifications.md` | Minor | Merged Dependabot PRs (#98-#102) and resolved/merged PR #111 (Issue #109 discriminated unions). |
| 2026-08-14 | `docs/decisions/0062-composable-exclusion-and-concentration-overlays.md` | Major | Recorded ADR-0062 for ExclusionListOverlay and HoldingConcentrationCapOverlay in execution pipeline. |
| 2026-08-14 | `docs/iterations/2026-08-14-cross-feature-hardening.md` | Minor | Implemented cross-feature multi-component tests (Split -> TLH, Fan-Out -> Circuit Breakers) and EOD broker resilience. |
| 2026-08-14 | `docs/iterations/2026-08-14-audit-mitigation.md` | Major | Executed test suite audit mitigation plan resolving all P0-P3 gaps, adding broker sync tests, and unmocking log rotation. |
| 2026-08-14 | `docs/audits/documentation-driven-test-suite-audit.md` | Major | Completed independent documentation-driven test suite audit, traceability matrix, and prioritized backlog. |
| 2026-08-14 | `docs/iterations/2026-08-14-batch-evaluator.md` | Minor | Documented Model Portfolio Fan-Out Queue Worker, throttled batch evaluation, and queue REST endpoints. |
| 2026-08-14 | `docs/iterations/2026-08-14-corporate-actions.md` | Minor | Documented Corporate Actions Processor, stock splits, dividends, mergers, and tax-lot basis preservation. |
| 2026-08-14 | `docs/iterations/2026-08-14-uk-tax-rules.md` | Minor | Documented HMRC UK Capital Gains rules, Section 104 average cost pooling, and UkBedAndBreakfastOverlay. |
| 2026-08-13 | `docs/iterations/2026-08-13-jurisdiction-matrix.md` | Minor | Documented test matrix gaps closure for zero-constraint jurisdictions and failure modes (Issue #92). |
| 2026-08-13 | `docs/iterations/2026-08-13-security-hardening.md` | Minor | Documented Stream Ticket auth (Issue #105) and Oracle Adapter circuit breaker & sanitization (Issue #106). |
| 2026-08-12 | `docs/iterations/2026-08-12-telemetry.md` | Minor | Documented Real-Time Telemetry & Event Streaming implementation for Command Center. |
| 2026-07-29 | `architecture/personas.md` | Minor | Documented UI/UX Access Control rules and progressive disclosure boundaries for new SharedWorkspaceLayout. |
| 2026-07-31 | `architecture/engine-architecture.md` | Minor | Added documentation for the new Dynamic Optimization Layer and Projected Gradient Descent solver. |
| 2026-06-20 | Added `docs/architecture/personas.md` to formally document user personas, RBAC rules, and Command Center UX logic. |
| 2026-06-18 | Added `docs/plans/tyr-agent-api-integration-plan.md` to map out the API enrichment for the Týr agent integration. |
| 2026-06-19 | Added `docs/api/mandate-schema.md` to formally document the Model Mandate JSON payload for external B2B agents. |
| 2026-06-17 | Added `docs/plans/architecture-review-and-mitigation-plan.md` to identify anti-patterns and sequence mitigations. |
| 2026-06-17 | Added `docs/plans/dynamic-targeting-plan.md` to map out the asynchronous optimizer architecture. |
| 2026-06-18 | Added | [Asset, Tenant API, and Broker Statistics Enhancements](./plans/asset-tenant-api-plan.md) | Detailed plan for expanding asset schemas to multi-exchange listings, tenant API keys, and grouping broker metrics. |
| 2026-06-18 | Added | [Superadmin Dashboard UI](./plans/superadmin-dashboard-ui-plan.md) | Detailed plan for the superadmin dashboard React UI covering tenant, models, broker, and sysops management. |
| 2026-06-17 | Added `docs/plans/target-sum-flexibility-plan.md` to analyze target sum logic for cash buffers and margin. |
| 2026-06-14 | Restructured documentation into an OKF-compliant bundle with extracted Architecture Decision Records (ADRs). |
| 2026-06-14 | Rewrote `README.md` to formally document the completed Live Agent v2.0 MVP capabilities, including the Orchestrator, live Alpaca polling, Circuit Breakers, and persistent JSONL audit trails. |
| 2026-06-14 | Added `docs/roadmap/v3-exploration.md` to map out scaling architectures and future feature requirements (TCO, TLH, Dashboard). |
| 2026-06-14 | Created formal `docs/plans/live-agent-v3-mvp-plan.md` to sequence the implementation of Tranches 5-9. |
| 2026-06-14 | Extracted formal decisions from the v3 exploration phase into ADRs 0041, 0042, and 0043. |
| 2026-07-20 | Migrated scheduling configuration from domain interfaces to `CalendarAdapter` strategy execution context. |
| 2026-07-28 | Removed global event bus from core evaluations. Replaced with local domain models (`AuditRecord`, `TriggerRecord`) to ensure pure, deterministic side-effect-free testing in `src/core/evaluation.ts`. |
| 2026-08-03 | Added `docs/prd/execution-overlays-tlh-prd.md` detailing the jurisdiction-agnostic Execution Overlays architecture for Tax-Loss Harvesting and Wash Sale Lockouts. |
| 2026-06-13 | Add `decisions/0048-use-multi-portfolio-in-memory-scale.md` |
| 2026-06-13 | Add `decisions/0049-use-sqlite-for-persistent-state-management.md` |
| 2026-06-15 | Add `decisions/0050-use-b2b-broker-api.md` |
| 2026-08-10 | `decisions/0058-generalized-trade-optimizer-interface.md` | Major | Established `TradeOptimizerInterface` abstraction layer and US Tax-Aware Optimizer module contract (Issue #103). |
| 2026-08-12 | `core/oracle-adapter.ts` | Major | Implemented `OracleTaxOptimizerAdapter` HTTP RPC client, fallback resilience, `evaluateRebalanceAsync`, and `us_taxable_tlh_rebalance` fixture. |
| 2026-08-12 | `orchestrator/circuit-breaker.ts` | Major | Completed Tranche 3 of Issue #103: Circuit breaker safety for tax trades, audit enrichment with tax cost attribution, and REST API jurisdiction validation. |

&copy; 2026 Johan Hellman. All rights reserved.
