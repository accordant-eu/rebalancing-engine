# Build Journey

This file is the living project journal. It captures the journey from initialization through future implementation.

## 1. Project Context

- **Known Objective:** Prepare the repository for a future buildout of a generic portfolio rebalancing engine.
- **Development Approach:** This project, including its documentation, scaffolding, and future implementations, is built heavily relying on LLM tools and AI-assisted editors.
- **What is Not Yet Known:** The language, framework, database, deployment model, architecture, and exact MVP scope are not yet known.
- **Next Steps:** A PRD / Architecture / Vision document will be provided later. No firm product or architecture decisions should be made before that input is reviewed.

## 2. Current Repository Snapshot

- **Repository state:** Nearly empty repository acting as a container.
- **Languages detected:** None.
- **Frameworks detected:** None.
- **Tooling detected:** None.
- **Tests detected:** None.
- **Documentation detected:** Basic `README.md` and `docs/Portfolio Rebalancing Meta-Paper Synthesis.md`.
- **CI/CD detected:** None.
- **Notable gaps:** Lacks code, CI, testing framework, project structure, and specific configurations.

## 3. Working Assumptions

- The project may become a generic portfolio rebalancing engine.
- The final architecture is not yet known.
- The repository’s existing stack, if any, should be respected unless the PRD suggests otherwise (currently no stack).
- The first implementation phase should probably favor an MVP with short proof cycles.
- The system will likely require deterministic calculations and strong auditability.

## 4. Decisions Log

| Date       | Decision                                    | Status   | Rationale                                                                     | Evidence | Reversibility | Follow-up               |
| :--------- | :------------------------------------------ | :------- | :---------------------------------------------------------------------------- | :------- | :------------ | :---------------------- |
| 2026-04-29 | Initialize `BUILD_JOURNEY.md` & `AGENTS.md` | Accepted | Establish project hygiene and agent guidelines before coding.                 | N/A      | High          | Wait for PRD            |
| 2026-04-29 | Tech Stack Selection                        | Deferred | PRD / Architecture vision not yet provided.                                   | N/A      | High          | Await PRD ingestion     |
| 2026-04-29 | Define MVP Scope                            | Accepted | PRD dictates an offline, deterministic, cash-aware threshold strategy as MVP. | MVP Plan | Medium        | Await Tech Stack choice |
| 2026-04-30 | Defer `decimal.js` adoption                 | Deferred | Float arithmetic is safe for Slices 1–4 (no monetary output). Reconsider at Slice 5 when trade values (monetary) are introduced. | Test-case audit (T-13) | Medium | Evaluate before Slice 5 |

## 5. Iteration Log

| Iteration | Date       | Goal                        | Scope                     | Actions taken                                                                                                                                                                                        | Files changed                                                                                                                                  | Learnings                                                                                                                                    | Open questions                                          | Next step                                            |
| :-------- | :--------- | :-------------------------- | :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------ | :--------------------------------------------------- |
| 1         | 2026-04-29 | Setup Project Hygiene       | Phase 0: Init & Discovery | Inspected repo, created `BUILD_JOURNEY.md`, `AGENTS.md`, and `.gitignore`.                                                                                                                           | `BUILD_JOURNEY.md`, `AGENTS.md`, `.gitignore`, `README.md`                                                                                     | Repo is essentially empty with just one research doc. No existing stack to constrain future choices.                                         | What stack/language will be chosen?                     | Await PRD for Phase 1.                               |
| 2         | 2026-04-29 | PRD Planning                | Phase 1: MVP Plan         | Digested PRD, created `docs/MVP_Implementation_Plan.md`.                                                                                                                                             | `docs/MVP_Implementation_Plan.md`, `BUILD_JOURNEY.md`                                                                                          | PRD demands strict determinism, BIAN models, and strategy isolation. MVP focuses strictly on offline threshold rebalancing.                  | What is the target programming language for the engine? | Await tech stack decision, then start Slice 1.       |
| 3         | 2026-04-29 | Tech Stack & Scaffolding    | Slice 0                   | Selected TypeScript/Node.js stack. Added TS, Jest, Prettier configs. Set up basic smoke test. Updated `.gitignore` to ignore node_modules/dist/coverage.                                             | `package.json`, `tsconfig.json`, `jest.config.js`, `.prettierrc`, `.gitignore`, `tests/smoke.test.ts`, `src/core/index.ts`, `BUILD_JOURNEY.md` | TS/Node.js is ideal for deterministic calculations, testability, and standard JSON fixture handling.                                         | None.                                                   | Proceed to Slice 1: Domain Fixture Foundation.       |
| 4         | 2026-04-29 | Domain Fixture Foundation   | Slice 1                   | Created TypeScript interfaces for domain models and wrote JSON fixtures covering all MVP edge cases (on-target, drift breaches, positive cash, min trade size, missing prices, universe/sum errors). | `src/models/domain.ts`, `tests/fixtures/scenarios.json`, `tests/fixtures.test.ts`, `BUILD_JOURNEY.md`                                          | Found that standard `number` should suffice for the MVP phase, provided we don't do complex float manipulations. Documented this limitation. | Should we add decimal.js later?                         | Proceed to Slice 2: Portfolio Valuation.             |
| 5         | 2026-04-29 | Portfolio Valuation         | Slice 2                   | Implemented `calculateValuation` and `calculateCurrentWeights`. Added unit tests verifying positive cash logic and missing price abort logic.                                                        | `src/core/valuation.ts`, `tests/valuation.test.ts`, `BUILD_JOURNEY.md`                                                                         | Cash must be factored into total portfolio value to ensure weights are diluted accurately. Explicit error is thrown on missing prices.       | None.                                                   | Proceed to Slice 3: Target Allocation and Drift.     |
| 6         | 2026-04-29 | Target Allocation and Drift | Slice 3                   | Implemented `calculateDrift` and `validateTargetAllocation`. Added tests for out-of-band and out-of-universe scenarios.                                                                              | `src/core/drift.ts`, `tests/drift.test.ts`, `BUILD_JOURNEY.md`                                                                                 | Drift calculation explicitly checks and includes assets that are outside the model universe by treating their target weight as zero.         | None.                                                   | Proceed to Slice 4: Threshold Trigger Evaluation.    |
| 7         | 2026-04-29 | Threshold Trigger           | Slice 4                   | Created `StrategyInterface` and `ThresholdStrategy`. Added unit tests showing trigger activates only when bands are breached.                                                                        | `src/models/domain.ts`, `src/strategy/threshold.ts`, `tests/threshold.test.ts`, `BUILD_JOURNEY.md`                                             | Abstracting the strategy evaluation early keeps the core engine decoupled from specific threshold logic.                                     | None.                                                   | Proceed to Slice 5: Basic Trade Proposal Generation. |
| 8         | 2026-04-29 | Red-Team Audit              | Phase 2: Audit            | Performed red-team audit of Slices 1-4. Fixed TSConfig `rootDir` issue, added `EPSILON` to handle float precision in drift thresholding, added lint/format scripts. Created formal audit report. | `tsconfig.json`, `package.json`, `src/core/drift.ts`, `docs/audits/red-team-audit-current.md`, `BUILD_JOURNEY.md`                              | Float arithmetic needs constant vigilance in JS/TS. Core logic holds up well to edge cases.                                                  | None.                                                   | Proceed to Slice 5: Basic Trade Proposal Generation. |
| 9         | 2026-04-30 | Test-Case Audit             | Phase 2: Audit            | Performed focused test-case audit of Slices 1–4. Found 12 findings (1 High, 4 Medium, 5 Low, 2 Info). Fixed all High/Medium items: replaced tautological smoke test; added AAPL assertion to `holding_outside_universe`; added `multiple_assets_out_of_band` drift test; corrected fixture description; added `edge-cases.test.ts` covering `min_trade_size_issue`, `positive_cash` drift+trigger, cash-only portfolio, `validateTargetAllocation` edge cases, determinism ordering. Updated README with actual setup and test instructions. No product code changed. | `tests/smoke.test.ts`, `tests/drift.test.ts`, `tests/edge-cases.test.ts` (new), `tests/fixtures/scenarios.json`, `docs/audits/test-case-audit.md` (new), `README.md`, `BUILD_JOURNEY.md` | Smoke tests must exercise real imports to have value. Fixture descriptions must accurately reflect the math — GOOG was on-target in `multiple_assets_out_of_band`. Deferred gaps documented for Slices 5–10. | Should we adopt `decimal.js` before Slice 5? | Proceed to Slice 5: Basic Trade Proposal Generation. |

## 6. Scope of Work

### In Scope for This Initialization

- Repository discovery.
- Documentation scaffolding.
- Generic development rules.
- Basic project hygiene.
- Non-invasive tooling review.
- Identification of gaps.

### Out of Scope for This Initialization

- Implementing rebalancing logic.
- Choosing final architecture.
- Designing final data model.
- Introducing major dependencies.
- Creating production APIs.
- Building execution/integration layers.
- Making investment methodology decisions.

## 7. Learnings and Observations

- The repository is completely unopinionated at this stage. It contains one major markdown document (`Portfolio Rebalancing Meta-Paper Synthesis.md`) which suggests significant background research has been done on rebalancing, but no code has been written.
- Because there is no existing code, there are no constraints on the future technology choices.
- Any tooling introduced at this stage should be language-agnostic (like simple git ignores and markdown docs).

## 8. Open Questions (Pending PRD)

- What is the intended implementation stack (language, framework, runtime)?
- Is this a library, service, application, or platform component?
- What are the first MVP workflows?
- What data sources are assumed?
- What level of auditability is required?
- Will execution integration be in scope?
- What test fixtures or sample portfolios are available?
- What regulatory/compliance constraints matter?
- What performance/scalability expectations exist?

## 9. Proposed Future Work Plan (Provisional)

- **Phase 0:** Repository initialization and discovery (Current).
- **Phase 1:** PRD ingestion and requirement extraction.
- **Phase 2:** MVP scope confirmation.
- **Phase 3:** Domain model and test fixture design.
- **Phase 4:** Offline calculation prototype.
- **Phase 5:** Trade proposal prototype.
- **Phase 6:** Explainability, auditability, and review workflow.
- **Phase 7:** Second-strategy extensibility proof point.

## 10. Best-Practice Rules Initialized

- Generic AI-assisted development rules have been initialized in `AGENTS.md`. These cover Repository Stewardship, Decision Discipline, Implementation Discipline, Testing, Documentation, Security, Data Integrity, Dependency Hygiene, Tooling, and Agent Behavior.

## 11. PRD Ingestion Checklist

When the PRD / Architecture document is provided, the agent should complete the following checklist:

- [ ] Extract product goals.
- [ ] Extract MVP scope.
- [ ] Extract non-goals.
- [ ] Extract user roles.
- [ ] Extract workflows.
- [ ] Extract domain entities.
- [ ] Extract shared data structures.
- [ ] Extract common functions.
- [ ] Extract strategy-specific modules.
- [ ] Extract non-functional requirements.
- [ ] Extract auditability and explainability requirements.
- [ ] Extract testing requirements.
- [ ] Identify decisions already made by the PRD.
- [ ] Identify open questions.
- [ ] Convert requirements into implementation phases.
- [ ] Convert MVP scope into epics and tasks.
- [ ] Identify proof points for each cycle.
