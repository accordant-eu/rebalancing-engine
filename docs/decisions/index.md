---
type: Reference
title: Architecture Decision Records
description: Index of all project decisions.
tags: [decisions, adr, index]
timestamp: 2026-06-14T00:00:00Z
---

# Architecture Decision Records

* [ADR-0001: Add thin offline CLI around existing engine and fixture runner](0001-add-thin-offline-cli-around-existing-engine-and-fixture-runner.md) - Accepted
* [ADR-0002: Resolve CLI limitations pragmatically](0002-resolve-cli-limitations-pragmatically.md) - Accepted
* [ADR-0003: Adopt standing decision discipline in repository rules](0003-adopt-standing-decision-discipline-in-repository-rules.md) - Accepted
* [ADR-0004: Push validated commits at reasonable checkpoints](0004-push-validated-commits-at-reasonable-checkpoints.md) - Accepted
* [ADR-0005: Suppress below-minimum trades with structured warnings](0005-suppress-below-minimum-trades-with-structured-warnings.md) - Accepted
* [ADR-0006: Reject negative cash in trade proposal generation](0006-reject-negative-cash-in-trade-proposal-generation.md) - Accepted
* [ADR-0007: Simulate exact proposed trades with sell-side turnover](0007-simulate-exact-proposed-trades-with-sell-side-turnover.md) - Accepted
* [ADR-0008: Use sell-side turnover for MVP simulation](0008-use-sell-side-turnover-for-mvp-simulation.md) - Accepted
* [ADR-0009: Generate deterministic explanations from calculation outputs](0009-generate-deterministic-explanations-from-calculation-outputs.md) - Accepted
* [ADR-0010: Use caller-supplied audit metadata](0010-use-caller-supplied-audit-metadata.md) - Accepted
* [ADR-0011: Report batch scenario errors per scenario](0011-report-batch-scenario-errors-per-scenario.md) - Accepted
* [ADR-0012: Use manual forced rebalance as second strategy](0012-use-manual-forced-rebalance-as-second-strategy.md) - Accepted
* [ADR-0013: Mark offline fixture MVP complete](0013-mark-offline-fixture-mvp-complete.md) - Accepted
* [ADR-0014: Use hybrid multi-strategy architecture next](0014-use-hybrid-multi-strategy-architecture-next.md) - Accepted for next iteration
* [ADR-0015: Prioritize calendar and boundary-target strategy slices](0015-prioritize-calendar-and-boundary-target-strategy-slices.md) - Provisional
* [ADR-0016: Default omitted strategy policy to threshold](0016-default-omitted-strategy-policy-to-threshold.md) - Accepted
* [ADR-0017: Use explicit calendar dates only](0017-use-explicit-calendar-dates-only.md) - Accepted for MVP
* [ADR-0018: Limit boundary targeting to absolute bands first](0018-limit-boundary-targeting-to-absolute-bands-first.md) - Accepted for MVP
* [ADR-0019: Use separate expected-status runner manifest](0019-use-separate-expected-status-runner-manifest.md) - Accepted
* [ADR-0020: Mark active MVP slice sets complete](0020-mark-active-mvp-slice-sets-complete.md) - Accepted
* [ADR-0021: Use a strategy registry for selection](0021-use-a-strategy-registry-for-selection.md) - Accepted
* [ADR-0022: Scope next deferred-capability increment to numeric policy and relative boundaries](0022-scope-next-deferred-capability-increment-to-numeric-policy-and-relative-boundaries.md) - Accepted for next increment
* [ADR-0023: Use `decimal.js` internally with explicit output rounding](0023-use-decimal-js-internally-with-explicit-output-rounding.md) - Accepted
* [ADR-0024: Add policy-selected relative boundary targeting](0024-add-policy-selected-relative-boundary-targeting.md) - Accepted
* [ADR-0025: Defer production surfaces until concrete consumers and operations are defined](0025-defer-production-surfaces-until-concrete-consumers-and-operations-are-defined.md) - Accepted
* [ADR-0026: Prioritize scheduled/recurring cash-flow semantics next](0026-prioritize-scheduled-recurring-cash-flow-semantics-next.md) - Accepted for planning
* [ADR-0027: Require CLI exposure decisions for future engine capabilities](0027-require-cli-exposure-decisions-for-future-engine-capabilities.md) - Accepted
* [ADR-0028: Consolidate user/developer docs around observed behavior](0028-consolidate-user-developer-docs-around-observed-behavior.md) - Accepted
* [ADR-0029: Place scheduled flows on `PortfolioState.cashFlowSchedules`](0029-place-scheduled-flows-on-portfoliostate-cashflowschedules.md) - Accepted
* [ADR-0030: Use explicit ISO date-only evaluation semantics](0030-use-explicit-iso-date-only-evaluation-semantics.md) - Accepted
* [ADR-0031: Apply due schedules as schedule-derived settled cash-flow events in an internal copy](0031-apply-due-schedules-as-schedule-derived-settled-cash-flow-events-in-an-internal-copy.md) - Accepted
* [ADR-0032: Support monthly, quarterly, and annual recurrence only](0032-support-monthly-quarterly-and-annual-recurrence-only.md) - Accepted
* [ADR-0033: Keep scheduled-flow CLI inputs file-based](0033-keep-scheduled-flow-cli-inputs-file-based.md) - Accepted
* [ADR-0034: Add weekly recurrence frequency for cash-flow schedules](0034-add-weekly-recurrence-frequency-for-cash-flow-schedules.md) - Accepted for next increment
* [ADR-0035: Defer schema-only validation mode](0035-defer-schema-only-validation-mode.md) - Deferred
* [ADR-0036: Restrict scheduled cash flows to projection/planning only](0036-restrict-scheduled-cash-flows-to-projection-planning-only.md) - Accepted
* [ADR-0037: Add optional `asOf` timestamp on prices for audit traceability](0037-add-optional-asof-timestamp-on-prices-for-audit-traceability.md) - Accepted for next increment
* [ADR-0038: Document live-agent vision as directional architecture](0038-document-live-agent-vision-as-directional-architecture.md) - Accepted
* [ADR-0039: Use JSONL for persistent audit trails in MVP](0039-use-jsonl-for-persistent-audit-trails.md) - Accepted
* [ADR-0040: Use Pause Strategy for Reconciliation](0040-use-pause-strategy-for-reconciliation.md) - Accepted
* [ADR-0041: Pivot Live Agent to a B2B SaaS Multi-Tenant Architecture](0041-pivot-to-b2b-saas-multi-tenant-architecture.md) - Accepted
* [ADR-0042: Separate Allocation Strategy from Execution Overlays](0042-separate-allocation-strategy-from-execution-overlays.md) - Accepted
* [ADR-0043: Adopt UX-First Thin Slice MVP Methodology for v3](0043-adopt-ux-first-thin-slice-mvp-methodology-for-v3.md) - Accepted
* [ADR-0044: Use npm workspaces for monorepo structure](0044-use-npm-workspaces-for-monorepo.md) - Accepted
* [ADR-0045: Colocate API Server within Live Agent Process](0045-colocate-api-server-within-agent-process.md) - Accepted
* [ADR-0046: Use size-based log rotation and realistic simulation reset in dry-run](0046-use-size-based-rotation-and-simulation-reset.md) - Accepted
* [ADR-0047: Use simple margin constraint for TCO penalty](0047-use-simple-margin-for-tco-penalty.md) - Accepted
* [ADR-0048: Use MultiPortfolioStateManager for in-memory scaling mock](0048-use-multi-portfolio-in-memory-scale.md) - Accepted
* [ADR-0049: Use better-sqlite3 for Persistent State Management](0049-use-sqlite-for-persistent-state-management.md) - Accepted
* [ADR-0050: Use B2B Broker API for Execution](0050-use-b2b-broker-api.md) - Accepted
* [ADR-0051: Use Composite Asset Schema for Instrument Identity](0051-use-composite-asset-schema-for-instrument-identity.md) - Accepted
* [ADR-0052: Use Tenant API Keys for B2B Authentication](0052-use-tenant-api-keys-for-b2b-authentication.md) - Accepted
* [ADR-0053: Defer API Rate Limiting, Granular Scopes, and Standardized Error Backoffs](0053-defer-api-rate-limiting-and-granular-scopes.md) - Deferred
* [ADR-0054: Use Mocked Percentage Slippage Model for TCO Optimization](0054-mocked-friction-model-for-tco-optimization.md) - Accepted
* [ADR-0055: Continuous Broker State Synchronization](0055-continuous-broker-state-sync.md) - Accepted
* [ADR-0056: Deferred Live Spread Fetching for Slippage Modeling](0056-deferred-live-spread-slippage.md) - Accepted
* [ADR-0057: Use Lucide-React for UI Iconography](0057-use-lucide-react-for-ui-iconography.md) - Accepted

&copy; 2026 Johan Hellman. All rights reserved.
