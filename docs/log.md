---
type: Reference
title: Knowledge Base Log
description: Log of major documentation updates
tags: [log, index]
timestamp: 2026-06-14T00:00:00Z
---

# Knowledge Base Log

| Date | Change | Scope | Description |
|------|--------|-------|-------------|
| 2026-10-23 | `docs/decisions/0073-saas-commercial-funnel-and-white-label-theming.md` | Major | Recorded ADR-0073: SaaS Commercial Funnel, Interactive Marketing Sandbox, Zero-Touch Partner Onboarding, and White-Label Theming (Slice 6). |
| 2026-10-23 | `docs/iterations/2026-10-23-saas-commercial-funnel-and-white-label-theming.md` | Minor | Documented SaaS Commercial Funnel, Sandbox & White-Label Theming implementation (Iteration 117). |
| 2026-10-23 | `docs/decisions/0072-direct-margin-and-leveraged-mandates.md` | Major | Recorded ADR-0072: Direct Margin & Leveraged Mandates with Maintenance Buffer Constraints (Slice 5). |
| 2026-10-23 | `docs/iterations/2026-10-23-direct-margin-and-leveraged-mandates.md` | Minor | Documented Direct Margin & Leveraged Mandates implementation (Iteration 116). |
| 2026-10-23 | `docs/decisions/0071-multi-custodian-interactive-brokers-adapter.md` | Major | Recorded ADR-0071: Multi-Custodian Interactive Brokers (IBKR) Adapter and Broker Factory (Slice 4). |
| 2026-10-23 | `docs/iterations/2026-10-23-multi-custodian-ibkr-adapter.md` | Minor | Documented Multi-Custodian Interactive Brokers (IBKR) Adapter implementation (Iteration 115). |
| 2026-10-16 | `docs/decisions/0067-holistic-audit-remediation-and-domain-invariants.md` | Major | Recorded ADR-0067 establishing decisions for corporate action dividend valuation, depositAllocationMode, and calendar scheduler trigger handoff. |
| 2026-10-16 | `docs/plans/holistic-review-remediation-plan.md` | Major | Added 6-chunk dependency-ordered remediation plan for the 2026-10-16 holistic codebase review. |
| 2026-10-16 | `docs/audits/holistic-codebase-review-2026-10-16.md` | Major | Completed holistic codebase and architecture review across ADRs, PRDs, roadmap, core math, live agent, API security, frontend personas, documentation, and test coverage. |
| 2026-10-15 | `docs/iterations/2026-10-15-docker-node-24-runtime-alignment.md` | Minor | Documented Docker Node 24 runtime alignment, build-time SQLite verification, and CI Docker validation (Iteration 107). |
| 2026-10-15 | `docs/decisions/0066-align-docker-runtime-with-node-24-engine-specification.md` | Major | Recorded ADR-0066: Align Docker Runtime with Node 24 Engine Specification (resolving Issue #124). |
| 2026-09-10 | `docs/iterations/2026-09-10-repository-hygiene-remediation.md` | Minor | Documented comprehensive repository hygiene remediation across tooling, CI, ADRs, linter, and dependencies (Iteration 106). |

| 2026-09-10 | `docs/decisions/0065-adopt-mandate-archetypes-and-quality-evaluation-pipeline.md` | Major | Reconciled ADR-0048 conflict by numbering Mandate Archetypes & Quality Evaluation Pipeline as ADR-0065. |
| 2026-09-10 | `docs/iterations/2026-09-10-mandate-scheduler-observability-ui.md` | Minor | Implemented Mandate Scheduler & Batch Queue UI Observability widgets and status endpoints. |
| 2026-09-10 | `docs/decisions/0064-automated-recurring-mandate-scheduler.md` | Major | Recorded ADR-0064 for Automated Recurring Mandate Scheduler Service. |
| 2026-09-10 | `docs/iterations/2026-09-10-mandate-scheduler.md` | Minor | Implemented MandateSchedulerService, calendar math, auto-advance, and REST scan endpoint. |
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
| 2026-10-16 | `docs/iterations/2026-10-16-holistic-codebase-review.md` | Major | Documented comprehensive review across ADRs 0001-0066, PRDs, roadmaps, domain math, security, and test coverage. |
| 2026-10-16 | `docs/iterations/2026-10-16-audit-remediation.md` | Major | Documented 6-chunk remediation addressing domain invariants, SQLite persistence, scheduler lifecycle, API security, and frontend alignment. |
| 2026-10-18 | `docs/iterations/2026-10-18-dependabot-merges.md` | Minor | Merged Dependabot PRs #129, #130, #131, #132, and #133 for jest-dom, vitejs, prettier, @types/node, and framer-motion. |
| 2026-10-19 | `docs/iterations/2026-10-19-issue-134-feedback-remediation.md` | Major | Remediated Issue #134 feedback: added unauthenticated `/health` endpoints, Docker `HEALTHCHECK`, default tenant seeding, dry-run circuit breaker reset (ADR-0068). |
| 2026-10-19 | `docs/iterations/2026-10-19-persona-e2e-testing-automation.md` | Minor | Automated persona E2E browser verification suite across Advisor, Compliance, Tenant Admin, and Superadmin workflows (Slice 2). |
| 2026-10-19 | `docs/decisions/0069-streaming-execution-fills-and-out-of-order-reconciliation.md` | Major | Recorded ADR-0069: Streaming Execution Fills and Out-of-Order Reconciliation (Slice 3). |
| 2026-10-19 | `docs/iterations/2026-10-19-streaming-execution-fills.md` | Major | Implemented WebSocket streaming trade updates, idempotent out-of-order shadow ledger reconciliation, and fill telemetry emission (Slice 3). |
| 2026-10-23 | `docs/decisions/0070-pin-node-24-image-and-cumulative-fill-reconciliation.md` | Major | Recorded ADR-0070: Pin Node 24 Image to 24.22.1 and Cumulative Fill Reconciliation Alignment (Issue #139 & #137 review). |
| 2026-10-23 | `docs/iterations/2026-10-23-operational-and-security-hardening.md` | Minor | Pinned Dockerfile to Node 24.22.1 (CVE-2026-111497), aligned Alpaca trade fill quantity mapping, and merged Vite 8.3.5. |
| 2026-10-23 | `docs/decisions/0071-multi-custodian-interactive-brokers-adapter.md` | Major | Recorded ADR-0071: Multi-Custodian Interactive Brokers (IBKR) Adapter and Broker Factory (Slice 4). |
| 2026-10-23 | `docs/iterations/2026-10-23-multi-custodian-ibkr-adapter.md` | Major | Implemented `IbkrBrokerAdapter`, `BrokerAdapterFactory`, multi-custodian sync, SQLite contract mapping, and UI support for Interactive Brokers. |

&copy; 2026 Johan Hellman. All rights reserved.


