# Rebalancing Engine Roadmap

Date: 2026-05-02

## 1. Executive Summary

The repository is an offline deterministic TypeScript calculation core with a first-class file-based CLI. Implemented capabilities include valuation, drift, threshold/manual/calendar trigger strategies, full-reset and boundary trade sizing, explicit decimal-backed numeric policy, settled/pending offline cash-flow records, scheduled/recurring offline cash-flow semantics, generic tax-lot allocation metadata, post-trade simulation, explanation, audit records, fixture execution, and CLI workflows.

Major remaining limitations are a full optimizer, jurisdiction-specific tax handling or tax advice, and production surfaces: API, UI, database, persistence, live market data, banking/custody integration, and execution integration.

Recommended next increment after scheduled/recurring cash-flow implementation: keep optimizer, tax, and production surfaces deferred until concrete requirements exist; near-term work can focus on CI, schema validation hardening, or an optimizer PRD refresh if a concrete multi-constraint use case appears.

Productionization should remain deferred until a dedicated PRD defines concrete API contracts, persistence, security, authentication, authorization, observability, deployment, data retention, and operational responsibilities. A full optimizer and jurisdiction-specific tax features also remain deferred until their objective functions, legal boundaries, and explainability requirements are explicit.

## 2. Materials Reviewed

Documents:

- `AGENTS.md`
- `README.md`
- `BUILD_JOURNEY.md`
- `docs/MVP_Implementation_Plan.md`
- `docs/Rebalancing Engine_ PRD, Architecture, Vision.md`
- `docs/Portfolio Rebalancing Meta-Paper Synthesis.md`
- `docs/prd/rebalancing-engine-next-iteration-prd.md`
- `docs/prd/rebalancing-engine-deferred-capabilities-prd.md`
- `docs/prd/rebalancing-engine-cash-flows-prd.md`
- `docs/prd/rebalancing-engine-tax-lots-prd.md`
- `docs/prd/rebalancing-engine-optimizer-feasibility-prd.md`
- `docs/prd/rebalancing-engine-production-boundary-prd.md`
- `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`
- `docs/plans/rebalancing-engine-deferred-capabilities-mvp-plan.md`
- `docs/plans/rebalancing-engine-cash-flows-mvp-plan.md`
- `docs/plans/rebalancing-engine-tax-lots-mvp-plan.md`
- `docs/plans/rebalancing-engine-optimizer-feasibility-plan.md`
- `docs/plans/rebalancing-engine-production-boundary-plan.md`
- `docs/audits/final-mvp-audit.md`
- `docs/audits/next-iteration-mvp-audit.md`
- `docs/audits/deferred-capabilities-audit.md`
- `docs/audits/cash-flows-audit.md`
- `docs/audits/tax-lots-audit.md`
- `docs/audits/optimizer-feasibility-audit.md`
- `docs/audits/production-boundary-audit.md`
- `docs/audits/red-team-audit-current.md`
- `docs/audits/test-case-audit.md`
- `docs/cli/cli-design.md`
- `docs/cli/cli-audit.md`
- `docs/refactoring/refactoring-assessment.md`
- `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`
- `tests/fixtures/README.md`

Code and tests:

- Domain models in `src/models/domain.ts`
- Core valuation, drift, evaluation, trade, simulation, numeric, explanation, and audit modules under `src/core`, `src/explanation`, and `src/audit`
- Strategy modules under `src/strategy`
- CLI parser, commands, rendering, input loading, validation, and help under `src/cli`
- Scenario runner under `src/runner`
- Unit, edge-case, runner, fixture, audit, explanation, and CLI tests under `tests`
- Synthetic scenario and expectation manifests in `tests/fixtures`
- `package.json`, `tsconfig.json`, `jest.config.js`, and `eslint.config.mjs`
- Git status, current branch, and recent commits

Search terms used:

- `future`, `future plan`, `future work`
- `deferred`
- `limitation`, `limitations`
- `next step`, `next steps`
- `roadmap`
- `post-MVP`, `post MVP`
- `out of scope`
- `open question`, `open questions`
- `TODO`, `TBD`
- `not implemented`, `not yet`, `later`, `phase`
- `productionization`
- `API`, `UI`, `database`, `persistence`
- `optimizer`
- `tax`
- `cash flow`, `cash-flow`
- `recurring`, `scheduled`

## 3. Current Capability Baseline

| Capability                         | Current status                               | Evidence                                                                                          | CLI support status                                                                                          | Test coverage status                                                                                              | Notes                                                                        |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Threshold rebalancing              | Implemented                                  | `ThresholdStrategy`, `evaluateRebalance`, threshold fixtures                                      | Supported via scenario/policy input and `inspect strategies`                                                | Unit, fixture, runner, CLI                                                                                        | Defaults when `strategyType` is omitted.                                     |
| Manual forced rebalance            | Implemented                                  | `ManualRebalanceStrategy`                                                                         | Supported via scenario/policy input and `inspect strategies`                                                | Unit, smoke, runner                                                                                               | Trigger-only proof point.                                                    |
| Calendar due-date strategy         | Implemented                                  | `CalendarRebalanceStrategy`; `calendar_due` and `calendar_not_due` fixtures                       | Supported via scenario/policy input and `inspect strategies`                                                | Unit, fixture, runner                                                                                             | Uses explicit input dates only; no scheduler or business-day calendar.       |
| Full-reset proposal generation     | Implemented                                  | `generateTradeProposal`                                                                           | Exposed through `run`, `batch`, JSON/pretty/summary output                                                  | Trade, simulation, runner, CLI                                                                                    | Active default proposal path.                                                |
| Boundary trade sizing              | Implemented                                  | `executionTargetMode: "boundary"`; absolute and relative modes                                    | Exposed through policy input and output metadata                                                            | Trade, audit, explanation, fixture tests                                                                          | Boundary mode is deterministic, not a full optimizer.                        |
| Decimal and rounding policy        | Implemented internally                       | `src/core/numeric.ts`, audit rounding                                                             | Output surfaced through audit/CLI JSON                                                                      | Numeric and audit tests                                                                                           | Public inputs/outputs remain number-based.                                   |
| Settled/pending cash flows         | Implemented for explicit offline records     | `PortfolioState.cashFlows`, `CashFlowSummary`, `PENDING_CASH_FLOW_EXCLUDED`                       | Scenario/explicit portfolio JSON accepted by `validate`, `run`, `batch`; output warnings and audit summary  | Valuation, trades, evaluation, runner, fixture, CLI strict warning tests                                          | `SETTLED` affects valuation/proposals; `PENDING` is excluded but audited.    |
| Scheduled/recurring cash flows     | Implemented for offline planning inputs      | `PortfolioState.cashFlowSchedules`, `policy.evaluationDate`, `src/core/cash-flows.ts`             | Supported through `validate`, `run`, `batch`, JSON/pretty output, and scenario/policy inspection            | Unit, evaluation, fixture, runner, and CLI tests                                                                  | No banking/payment/custody/execution behavior.                               |
| Tax-lot primitives                 | Implemented as generic allocation metadata   | `TaxLot`, `lotAllocations`, sell selection modes                                                  | Scenario/policy input accepted; output includes lot allocations in JSON/pretty                              | Valuation, trade, runner fixture tests                                                                            | Not tax advice and not jurisdiction-specific.                                |
| Jurisdiction-specific tax handling | Not implemented                              | PRD and README explicitly exclude it                                                              | Not supported                                                                                               | No tests                                                                                                          | Requires legal/product input.                                                |
| Full optimizer                     | Not implemented                              | No solver dependency/interface; optimizer PRD defers                                              | Not supported                                                                                               | No tests                                                                                                          | Current proposal engine is rule-based.                                       |
| API                                | Not implemented                              | No server framework or route code                                                                 | Not applicable                                                                                              | No tests                                                                                                          | Deferred to productionization PRD.                                           |
| UI                                 | Not implemented                              | No frontend framework or UI code                                                                  | Not applicable                                                                                              | No tests                                                                                                          | Deferred.                                                                    |
| Database/persistence               | Not implemented                              | No database dependency, schema, migration, or audit store                                         | Not applicable                                                                                              | No tests                                                                                                          | Audit records are returned, not persisted.                                   |
| Live market data                   | Not implemented                              | Static `PriceSnapshot` only                                                                       | File input only                                                                                             | Missing-price tests only                                                                                          | No freshness/timestamp model.                                                |
| Banking/custody integration        | Not implemented                              | Explicitly excluded by cash-flow and production-boundary docs                                     | Not supported                                                                                               | No tests                                                                                                          | Scheduled semantics must not imply payment initiation.                       |
| Execution integration              | Not implemented                              | Proposed trades only; no order routing                                                            | Not supported                                                                                               | Proposal/simulation tests only                                                                                    | STP remains out of scope.                                                    |
| Audit/explanation                  | Implemented                                  | `generateAuditRecord`, `generateExplanation`                                                      | JSON/pretty/summary outputs expose audit, explanation, warnings                                             | Audit and explanation tests                                                                                       | No persistent audit store.                                                   |
| CLI                                | Implemented as first-class offline interface | `src/cli`, package `bin`, README CLI section                                                      | `validate`, `run`, `batch`, `inspect`; scenario stdin for `run`/`validate`; per-scenario batch output files | CLI tests cover help, input modes, output formats, strict mode, output files, stdin, and batch output directories | Future engine capability must include CLI design or documented non-exposure. |
| Fixtures/scenario runner           | Implemented                                  | `tests/fixtures/scenarios.json`, runner manifest validation                                       | `batch` and legacy `scenario:run`                                                                           | Fixture and runner tests                                                                                          | 18 synthetic scenarios currently documented.                                 |
| CI                                 | Not implemented                              | No `.github` workflow outside `node_modules`                                                      | Not applicable                                                                                              | Local scripts only                                                                                                | Future productionization or DX work could add CI.                            |

## 4. Future Plans and Deferred Items Inventory

| Item                                                 | Source(s)                                                                                 | Category                            | Current status                        | Still valid? | Duplicate/conflict?                                                | Recommended roadmap placement                                    | CLI impact                                                               | Dependency                                            | Notes                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------- | ------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------- |
| Scheduled/recurring cash flows                       | README, `BUILD_JOURNEY.md`, cash-flow PRD open questions, production audit recommendation | Scheduled/recurring cash flows      | Implemented for offline MVP           | Yes          | Extends existing cash-flow foundations                             | Complete; revisit only for new recurrence/date requirements      | Implemented in validation, run, batch, inspect, output/audit docs        | Date and recurrence semantics                         | No banking/payment/custody/execution behavior.                      |
| Pending vs scheduled vs realized terminology         | Cash-flow PRD, latest feedback                                                            | Cash-flow semantics                 | Implemented for MVP terminology       | Yes          | Related to scheduled flows                                         | Complete for current scope                                       | Documented in input schema/help/output docs                              | Product terminology decision                          | Double-count prevention uses generated schedule event IDs.          |
| Full transaction-cost optimizer                      | Optimizer PRD/audit, meta paper, next-iteration PRD                                       | Full optimizer                      | Not implemented                       | Yes          | Boundary mode is partial support, not conflict                     | Medium-term PRD first, implementation later                      | Required when implemented; likely new policy fields and output rationale | Objective, constraints, solver policy, explainability | Defer until deterministic rules cannot satisfy a concrete use case. |
| Jurisdiction-specific tax handling                   | Tax-lot PRD, README, deferred docs                                                        | Tax handling                        | Not implemented                       | Yes          | Generic tax-lot allocation is not jurisdictional                   | Long-term / dedicated tax PRD                                    | Required if engine capability is added; disclaimers in CLI/docs          | Legal/regulatory/product input                        | Do not implement as small technical slice.                          |
| Tax-lot primitives beyond metadata                   | Tax-lot PRD risks, optimizer prerequisites                                                | Tax-lot primitives                  | Partially implemented                 | Yes          | Must not become tax advice accidentally                            | Near-term only if scoped generically                             | Required for new lot fields/modes                                        | Product and tax-boundary decisions                    | Existing modes are FIFO/LIFO/HIGHEST_COST/LOWEST_COST.              |
| API wrapper                                          | Production boundary PRD/audit, original architecture doc                                  | API                                 | Not implemented                       | Yes          | Conflicts with current offline-only boundary if done prematurely   | Dedicated productionization PRD                                  | CLI remains supported; API must not replace CLI                          | Contracts, auth, versioning, idempotency              | Defer until concrete consumers exist.                               |
| UI/advisor review app                                | Original PRD, production boundary docs                                                    | UI                                  | Not implemented                       | Yes          | Production surface                                                 | Long-term after productionization PRD                            | CLI remains regression interface                                         | UX, auth, persistence, deployment                     | Not appropriate before API/persistence decisions.                   |
| Database/persistent audit store                      | Original PRD, production boundary docs                                                    | Database/persistence                | Not implemented                       | Yes          | Current audit records are in-memory/output only                    | Dedicated productionization PRD                                  | CLI may need output-to-store decisions later                             | Schema, migration, retention, deletion, privacy       | Avoid freezing schema now.                                          |
| Live market data                                     | Original PRD, production docs, README                                                     | Live market data                    | Not implemented                       | Yes          | Static `PriceSnapshot` is current boundary                         | Long-term / productionization                                    | CLI could accept static snapshots first; live fetch should be separate   | Provider, freshness, retries, licensing               | Price timestamps also remain deferred.                              |
| Banking/custody integration                          | Cash-flow PRD exclusions, production boundary                                             | Banking/custody                     | Not implemented                       | Yes          | Scheduled cash-flow semantics must stay offline                    | Long-term                                                        | CLI should use synthetic/file inputs only                                | Provider contracts, reconciliation, secrets           | Do not add payment initiation.                                      |
| Execution/OMS integration                            | Original PRD, MVP plan, production docs                                                   | Execution integration               | Not implemented                       | Yes          | Proposed trades are not orders                                     | Long-term                                                        | CLI may export proposal files, not execute                               | Approval, idempotency, OMS routing                    | STP explicitly out of MVP.                                          |
| CLI expansion for every new domain capability        | CLI design/audit, latest feedback                                                         | CLI expansion                       | Implemented baseline; future required | Yes          | None                                                               | Standing requirement across all roadmap items                    | Required unless documented otherwise                                     | Help, validation, tests, docs                         | Treat CLI as first-class interface.                                 |
| Strategy proposal hooks                              | Refactoring assessment                                                                    | Strategy expansion                  | Deferred                              | Yes          | Current boundary logic in shared trades is acceptable for one mode | Near-term only if second non-threshold proposal behavior appears | CLI likely unchanged except policy docs                                  | Architecture decision                                 | Do not refactor preemptively.                                       |
| Stale price timestamps                               | Test-case audit, original PRD                                                             | Audit/reproducibility / market data | Not implemented                       | Yes          | Related to production market-data freshness                        | Near/medium-term if static timestamp validation is needed        | Input schema and validation output                                       | Timestamp policy                                      | Could be offline and synthetic; not a live-data integration.        |
| Fixture schema validation independent of calculation | CLI audit                                                                                 | Testing/fixtures                    | Partial; validation runs engine path  | Yes          | No conflict                                                        | Near-term DX hardening                                           | `validate` behavior may change                                           | JSON/schema choice                                    | Keep deterministic and explicit.                                    |
| CI workflow                                          | Build journey/current repo check                                                          | Documentation/developer experience  | Not implemented                       | Yes          | None                                                               | Near-term DX if desired                                          | CLI commands become CI proof points                                      | GitHub Actions decisions                              | No CI files currently present.                                      |
| Performance/scalability                              | Original PRD, production docs                                                             | Performance/scalability             | Not meaningfully implemented          | Valid later  | Not a current bottleneck                                           | Medium/long-term                                                 | Batch CLI may need profiling output                                      | Larger fixtures and benchmarks                        | Defer until scale targets exist.                                    |
| Security/privacy controls                            | Production boundary docs                                                                  | Security/privacy                    | Docs only                             | Yes          | Required before API/persistence                                    | Dedicated productionization PRD                                  | CLI docs should keep synthetic-data guidance                             | Data classification, auth, secrets                    | Financial data is sensitive by default.                             |
| Compliance/governance                                | Original PRD, tax/production boundaries                                                   | Compliance/governance               | Audit/explanation primitives only     | Yes          | Jurisdictional specifics deferred                                  | Medium/long-term with productionization/tax PRDs                 | CLI output/audit contracts matter                                        | Legal/compliance input                                | Current system is calculation support, not advice.                  |

## 5. Roadmap Prioritization

| Candidate                                          | Product value                    | Complexity                              | Risk                          | Testability | CLI impact  | Architecture impact | Recommended priority                                  | Rationale                                                                                                      |
| -------------------------------------------------- | -------------------------------- | --------------------------------------- | ----------------------------- | ----------- | ----------- | ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Option A - Scheduled/recurring cash-flow semantics | High                             | Medium                                  | Medium                        | High        | Medium-high | Medium              | Complete for offline MVP                               | Builds directly on implemented cash-flow records and remains offline.                                          |
| Option B - Dedicated productionization PRD         | Medium now, high later           | Medium for PRD, high for implementation | High if implemented too early | Medium      | Medium      | High                | Near-term PRD only when consumer requirements exist   | Necessary before API/UI/database/live work, but not the best next domain increment without concrete consumers. |
| Option C - Optimizer PRD                           | Medium                           | Medium for PRD, high for implementation | High                          | Medium      | Medium      | High                | Medium-term PRD                                       | Needs objective, constraints, solver, and explanation model first.                                             |
| Option D - Tax-aware PRD                           | Medium for taxable-account users | High                                    | High legal/regulatory risk    | Medium      | Medium      | High                | Long-term or limited generic primitives               | Jurisdictional tax handling requires product/legal input; generic lot metadata already exists.                 |
| Option E - Combined roadmap only                   | Medium                           | Low                                     | Low                           | High        | Low         | Low                 | Complete with this document, but not sufficient alone | Useful cleanup, but a concrete next increment is now clear.                                                    |

Decision:

- Preferred option: Option A - Scheduled/Recurring Cash-Flow Semantics Increment.
- Status: Implemented for the offline deterministic MVP.
- Alternatives considered: productionization PRD, optimizer PRD, tax-aware PRD, and roadmap-only cleanup.
- Rationale: scheduled/recurring cash flows are a domain capability adjacent to implemented cash-flow foundations. They are reversible, deterministic, auditable, and testable offline. Production, optimizer, and tax-specific work remain blocked by higher-risk decisions.

## 6. Recommended Roadmap

### Now / Next Increment

- No larger domain increment is currently selected.
- Near-term candidates are CI workflow setup, fixture/schema validation hardening, static price timestamp semantics, or an optimizer PRD refresh if a concrete multi-constraint use case appears.
- Continue to avoid banking/payment/custody/execution behavior unless a dedicated productionization PRD supplies concrete requirements.

### Near-Term

- Optimizer feasibility PRD refresh only if a concrete multi-constraint use case appears.
- Static price timestamp/freshness semantics, if offline market-data validation becomes necessary.
- Fixture/schema validation hardening for CLI `validate` only if a schema-only workflow becomes necessary; current `validate` behavior intentionally uses the deterministic engine path.
- Strategy proposal hook assessment if a second strategy needs distinct proposal sizing.
- CI workflow using `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and CLI/runner checks.

### Medium-Term

- Full optimizer PRD and possible implementation after objective functions, constraints, solver policy, explainability, and fallback behavior are documented.
- Production API PRD with explicit consumer, request/response contracts, auth, persistence, security, and observability decisions.
- Persistence design for audit records and scenario runs after retention/privacy requirements are known.
- Enhanced generic tax-lot primitives only if they remain non-jurisdictional and non-advisory.

### Long-Term

- UI/advisor review workflow.
- Live market-data integration.
- Banking, custody, and payment integrations.
- OMS/trade-execution integration.
- Jurisdiction-specific tax modules or tax-aware optimization, only with legal/product input.
- Multi-account or household optimization.
- Performance/scalability work against defined volume targets.

### Explicitly Deferred

- Full optimizer implementation: defer until objectives, constraints, and solver dependency policy are explicit.
- Jurisdiction-specific tax handling and tax advice: defer until legal/regulatory/product input is available.
- API/UI/database/persistence/live integrations: defer until a productionization PRD defines security, data, operational, and consumer requirements.
- Banking/custody/execution integration: defer until provider contracts, reconciliation, idempotency, approval, and operational controls are defined.
- Live data freshness and retries: defer until provider and freshness requirements are selected.

## 7. CLI Roadmap

Standing CLI rule:

Any engine capability added in the future must be exposed through the CLI or intentionally not exposed through the CLI, with the decision documented in the relevant PRD, plan, tests, and README/CLI docs.

| Roadmap capability                | CLI support required?                    | Expected command impact                                                                  | Expected flags/options                                                                  | Input fixture/schema impact                                          | Output impact                                                                              | Documentation/tests                                     |
| --------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Scheduled/recurring cash flows    | Yes                                      | `validate`, `run`, `batch`, `inspect scenarios`, `inspect policies`                      | Prefer no override flags initially; schedule data should live in files for auditability | Add schedule/recurrence fields to scenario/portfolio or policy shape | Cash-flow summary, schedule expansion summary, warnings/errors, audit/explanation metadata | CLI help, README, fixture docs, CLI tests, runner tests |
| Optimizer                         | Yes when implemented                     | `run`/`batch` output optimizer metadata; `inspect policies` lists objective/constraints  | No hidden optimizer overrides unless documented                                         | Policy objective/constraints schema                                  | Objective, constraints, selected solution, rejected/fallback rationale                     | CLI docs and JSON contract tests                        |
| Tax-aware enhancements            | Yes if engine-level                      | `validate` must catch tax input errors; `run`/`batch` show lot/tax metadata              | Avoid CLI tax overrides                                                                 | Lot/jurisdiction fields if approved                                  | Disclaimers, warnings, allocations, tax boundary metadata                                  | Legal/product-approved docs and tests                   |
| API/UI/database/live integrations | CLI should remain regression path        | CLI may remain offline and file-based                                                    | No live credentials in CLI unless productionization PRD approves                        | Possible exported request fixtures                                   | Stable offline JSON should continue                                                        | Productionization PRD must state CLI relation           |
| Fixture/schema validation         | Yes if implemented                       | Current `validate` remains engine-path validation; schema-only checks may be added later | Possible `--schema-only` or validation mode later if justified                          | Stronger schema documentation                                        | More precise shape-only validation errors                                                  | CLI tests for failures and exit codes                   |
| CI                                | Yes as commands, not new engine behavior | Use existing `npm` and CLI commands                                                      | None                                                                                    | None                                                                 | CI logs only                                                                               | README/dev docs                                         |

CLI design principles for future increments:

- Policy and scenario files remain the source of truth.
- Avoid hidden command-line overrides that change audited financial inputs.
- JSON output must stay deterministic for automation.
- Summary and pretty output must stay useful for human review.
- Scenario stdin is supported for complete generated scenario payloads; explicit-file stdin and batch stdin remain deferred.
- Batch output directories are supported for regression artifacts, with no overwrite unless `--force` is supplied.
- `--strict` should continue converting warnings into failures.
- Exit-code semantics must remain documented.

## 8. Productionization Readiness

The project is not ready for API/UI/database/live integration implementation. It is ready for a dedicated productionization PRD once a concrete consumer and operating model are known.

Required preconditions:

- Primary consumer and invocation model: library, batch, hosted API, internal app, or external product.
- Stable input/output contracts, including whether decimals are transmitted as strings.
- Persistence needs for inputs, outputs, audit records, explanations, scenario runs, approvals, and user actions.
- Data classification, retention, deletion, and privacy rules.
- Authentication, authorization, tenancy, and secret-management model.
- Observability, logging, monitoring, alerting, and incident response.
- Deployment and environment-promotion model.
- External provider responsibilities for market data, custody, banking, and execution.
- Idempotency, retries, reconciliation, stale-data handling, and failure behavior.
- Regulatory boundary: recommendation support versus advice/execution.

Recommended productionization PRD outline:

1. Product boundary and consumers.
2. API contracts and versioning.
3. Security and identity model.
4. Persistence and audit-retention model.
5. Data privacy and sensitive-data controls.
6. Operational controls, observability, and incident response.
7. Market data, banking, custody, and execution provider boundaries.
8. Deployment, configuration, and CI/CD.
9. CLI coexistence and regression strategy.
10. Acceptance criteria and non-goals.

## 9. Risks and Open Questions

Product risks:

- Scheduled cash-flow users may expect actual payment initiation or bank integration. Default assumption: schedules are offline planning inputs only.
- Recurring withdrawals may imply decumulation advice. Default assumption: the engine only applies configured flows and does not recommend withdrawal amounts.

Architecture risks:

- Embedding schedule data in the wrong object could harden a poor future API shape. Default assumption: make the first model explicit, optional, and reversible.
- Schedule expansion can blur valuation-date versus analysis-window semantics. Default assumption: MVP evaluates applicability relative to a supplied valuation/evaluation date and documents any analysis-window deferral.

Regulatory/tax risks:

- Tax-lot and withdrawal behavior may be interpreted as tax advice. Default assumption: no jurisdiction-specific tax treatment, no tax optimization, no tax advice.

CLI risks:

- Adding schedule flags could create unaudited overrides. Default assumption: schedule inputs live in scenario/portfolio/policy files; CLI validates and renders them.
- Output may become too verbose. Default assumption: JSON carries full details; summary remains concise.

Testing risks:

- Date edge cases can multiply quickly. Default assumption: use ISO dates, explicit validation, and a small recurrence subset first.
- Fixture coverage must include invalid schedules, future schedules, due schedules, recurring deposits, and recurring withdrawals.

Integration risks:

- Productionization work could start accidentally through cash-flow scheduling. Default assumption: no API, persistence, banking, custody, or execution code in the scheduled-flow increment.

Open questions:

- Should weekly/custom recurrence be added later, or are monthly/quarterly/annual sufficient?
- Should schema-only validation be split from engine-path validation for CLI `validate`?
- Should future scheduled flows remain warnings, or become audit-only metadata in a later output contract?
- Should static price timestamp/freshness semantics be the next offline data-integrity increment?

## 10. Recommended Next Action

Recommended next task/prompt:

Run a small hardening increment for fixture/schema validation or add CI using the existing validation commands: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, scenario runner expectation validation, and representative CLI smoke commands. Keep optimizer, tax, API, UI, database, live data, banking/custody, and execution work deferred until dedicated requirements exist.
