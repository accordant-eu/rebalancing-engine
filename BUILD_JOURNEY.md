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

| Date       | Decision                                               | Status      | Rationale                                                                                                                                                                     | Evidence                     | Reversibility | Follow-up                                                               |
| :--------- | :----------------------------------------------------- | :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- | :------------ | :---------------------------------------------------------------------- |
| 2026-04-29 | Initialize `BUILD_JOURNEY.md` & `AGENTS.md`            | Accepted    | Establish project hygiene and agent guidelines before coding.                                                                                                                 | N/A                          | High          | Wait for PRD                                                            |
| 2026-04-29 | Tech Stack Selection                                   | Deferred    | PRD / Architecture vision not yet provided.                                                                                                                                   | N/A                          | High          | Await PRD ingestion                                                     |
| 2026-04-29 | Define MVP Scope                                       | Accepted    | PRD dictates an offline, deterministic, cash-aware threshold strategy as MVP.                                                                                                 | MVP Plan                     | Medium        | Await Tech Stack choice                                                 |
| 2026-04-30 | Defer `decimal.js` adoption                            | Deferred    | Float arithmetic is safe for Slices 1–4 (no monetary output). Reconsider at Slice 5 when trade values (monetary) are introduced.                                              | Test-case audit (T-13)       | Medium        | Evaluate before Slice 5                                                 |
| 2026-05-02 | Continue with standard `number` arithmetic for Slice 5 | Provisional | Basic trade proposal generation only computes deterministic fixture-scale estimated values and quantities; no rounding, settlement, or execution precision is introduced yet. | Slice 5 implementation tests | Medium        | Revisit before Slice 6/7 constraint filtering and post-trade simulation |
| 2026-05-02 | Adopt standing decision discipline in agent rules      | Accepted    | Future MVP work needs explicit decision identification, alternatives, trade-offs, documentation, implementation consistency, and validation to prevent hidden assumptions.    | User instruction             | High          | Apply continuously to future work                                       |
| 2026-05-02 | Push validated commits at reasonable checkpoints       | Accepted    | Completed, validated slices and process updates should be shared remotely without requiring a separate push request each time, while avoiding partial or failing pushes.      | User instruction             | High          | Apply after future validated commits                                    |
| 2026-05-02 | Suppress below-minimum trades with structured warnings | Accepted    | Minimum trade-size constraints are non-fatal proposal adjustments; users need visibility into suppressed trades and residual drift will be quantified in Slice 7 simulation.  | Slice 6 implementation       | High          | Include warnings in explanation and audit output                        |
| 2026-05-02 | Reject negative cash in trade proposal generation      | Accepted    | Negative cash makes cash-aware proposal funding ambiguous in the MVP and should not be silently converted into sells or ignored.                                              | Slice 6 implementation       | Medium        | Revisit if withdrawal/deficit funding becomes in scope                  |
| 2026-05-02 | Simulate exact proposed trades with sell-side turnover | Accepted    | MVP simulation should replay proposal quantities exactly, reconcile cash, expose residual drift, and use sell-side turnover per prior audit expectation.                      | Slice 7 implementation       | Medium        | Revisit turnover definition if reporting requirements differ            |

Decision: Adopt standing decision discipline in repository rules

Status: Accepted
Date: 2026-05-02

Context:
The project is entering financial-domain implementation slices where small choices about precision, cash, validation, trade semantics, warnings/errors, fixtures, and documentation can create long-lived inconsistencies. The user made decision discipline a standing instruction for current and future work, so the repository rules need to persist that behavior for future agents.

Options considered:

1. Add the full standing rule to `AGENTS.md` and record the decision in `BUILD_JOURNEY.md`.
   - Benefits: Puts the rule where agents already look first; keeps the decision log current; no new process or directory.
   - Costs: `AGENTS.md` becomes more prescriptive.
   - Risks: Future decisions may still be under-documented if agents ignore the rule.
   - Reversibility: High; the rule can be refined without changing source behavior.

2. Create a new `docs/decisions/` ADR system immediately.
   - Benefits: Richer decision history and cleaner long-form decision records.
   - Costs: Adds process overhead before the project has many decisions.
   - Risks: Premature documentation structure could slow small MVP slices.
   - Reversibility: Medium; easy to add later, but unnecessary files would need cleanup.

3. Rely only on the chat instruction without changing repository files.
   - Benefits: No repository change.
   - Costs: Not durable for future sessions or agents.
   - Risks: High chance of regressions to implicit or undocumented decisions.
   - Reversibility: High, but weak as a project control.

Preferred option:
Option 1: Add the standing decision rule to `AGENTS.md` and record this decision in `BUILD_JOURNEY.md`.

Rationale:
This is the best MVP-compatible trade-off. It keeps the rule close to agent operating instructions, avoids a premature ADR system, and creates a durable decision record without changing runtime behavior.

Implementation impact:

- Code: No source behavior changes.
- Tests: No test changes required because this is process/documentation-only.
- Fixtures: No fixture changes.
- Documentation: `AGENTS.md` now requires explicit decision identification, alternatives, trade-off assessment, documentation, consistency, and validation for meaningful decisions.
- Follow-up: If decision volume grows, consider introducing `docs/decisions/` ADRs.

Validation:
Documentation formatting and repository checks should pass after the update.

Decision: Push validated commits at reasonable checkpoints

Status: Accepted
Date: 2026-05-02

Context:
The user requested pushing the current changes and making automatic push behavior a standing rule. The repository now has completed local commits that passed validation, and future MVP work should avoid accumulating unpushed validated work unnecessarily.

Options considered:

1. Push after every commit automatically.
   - Benefits: Remote is always current.
   - Costs: Can publish overly granular, accidental, or insufficiently reviewed commits.
   - Risks: Higher chance of pushing partial work if a commit is made mid-task.
   - Reversibility: Medium; pushed commits can be reverted, but history is already shared.

2. Push at reasonable validated checkpoints.
   - Benefits: Keeps remote current after completed slices or documentation/process updates while preserving reviewable boundaries.
   - Costs: Requires judgment about what counts as a checkpoint.
   - Risks: A future agent may delay a push if the checkpoint is ambiguous.
   - Reversibility: High; the rule is easy to refine and does not require force-push behavior.

3. Push only when explicitly requested.
   - Benefits: Maximum user control.
   - Costs: Leaves completed validated work local until a follow-up request.
   - Risks: Local commits can be forgotten or unavailable to collaborators.
   - Reversibility: High, but conflicts with the user's requested standing behavior.

Preferred option:
Option 2: Push committed changes at reasonable checkpoints after relevant validation passes.

Rationale:
This balances the user's request for automatic pushing with repository stewardship. It avoids pushing partial or failing work, but ensures completed validated slices and durable process updates reach the remote promptly.

Implementation impact:

- Code: No source behavior changes.
- Tests: No test changes required because this is process/documentation-only.
- Fixtures: No fixture changes.
- Documentation: `AGENTS.md` now instructs agents to push at completed, validated checkpoints and not push partial/failing/ambiguous work.
- Follow-up: Apply this rule after future validated commits; do not force-push unless explicitly requested and justified.

Validation:
Run formatting and repository checks before committing the rule, then push the branch.

Decision: Suppress below-minimum trades with structured warnings

Status: Accepted
Date: 2026-05-02

Context:
Slice 6 introduces minimum trade-size constraints. The engine needs to decide whether below-minimum trades should be errors, silently removed, or visible non-blocking adjustments.

Options considered:

1. Throw an error when a proposed trade is below `minimumTradeSize`.
   - Benefits: Prevents uneconomic proposals from being missed.
   - Costs: Blocks otherwise useful recommendations.
   - Risks: A small residual trade could prevent a portfolio review entirely.
   - Reversibility: Medium; callers would need to change error handling later.

2. Suppress below-minimum trades and emit structured warnings.
   - Benefits: Keeps the proposal usable while preserving auditability and explainability.
   - Costs: Residual drift remains and must be surfaced later.
   - Risks: Consumers must read warnings, not only trades.
   - Reversibility: High; warning schema can be extended without breaking core calculations.

3. Silently drop below-minimum trades.
   - Benefits: Simplest output.
   - Costs: Hides financial decision-making.
   - Risks: Violates auditability and explainability expectations.
   - Reversibility: Low; hidden behavior is hard to diagnose later.

Preferred option:
Option 2: Suppress below-minimum trades and emit structured warnings.

Rationale:
This is deterministic, MVP-compatible, and auditable. It avoids blocking the proposal while making the constraint impact explicit for future simulation, explanation, and audit records.

Implementation impact:

- Code: `TradeProposal` now includes `warnings`; `generateTradeProposal` applies the global `minimumTradeSize` when a policy is supplied.
- Tests: Added coverage for the `min_trade_size_issue` fixture suppressing two small trades and emitting warnings.
- Fixtures: Existing fixture remains valid and is documented in `tests/fixtures/README.md`.
- Documentation: README and build journey now describe Slice 6 behavior.
- Follow-up: Slice 7 should quantify residual drift after suppressed trades; Slice 8/9 should include warnings in explanations and audit records.

Validation:
Run tests, type-check, lint, build, and format after implementation.

Decision: Reject negative cash in trade proposal generation

Status: Accepted
Date: 2026-05-02

Context:
Negative cash becomes meaningful once cash-aware trade proposal logic exists. The MVP has no withdrawal workflow, margin model, or deficit-funding policy, so negative cash cannot be reliably interpreted.

Options considered:

1. Treat negative cash as a hard error during trade proposal generation.
   - Benefits: Prevents ambiguous funding behavior and forces upstream reconciliation.
   - Costs: Cannot generate proposals for cash-deficit accounts yet.
   - Risks: Some real-world accounts with pending sweeps would require preprocessing.
   - Reversibility: High; a later withdrawal/deficit policy can add explicit behavior.

2. Ignore negative cash and continue.
   - Benefits: Simple and permissive.
   - Costs: Produces unreliable proposals because funding is understated.
   - Risks: Silent bad recommendations.
   - Reversibility: Low; consumers may rely on unsafe behavior.

3. Automatically sell overweight assets to cover negative cash.
   - Benefits: Moves toward a cash-deficit workflow.
   - Costs: Adds withdrawal/deficit funding semantics not in the current slice.
   - Risks: Premature execution policy and possible tax/cost implications.
   - Reversibility: Medium; would likely need redesign when withdrawal requirements are known.

Preferred option:
Option 1: Treat negative cash as a hard error during trade proposal generation.

Rationale:
This follows the project bias toward explicit validation over silent fallback behavior. It avoids inventing withdrawal or margin semantics before they are in scope.

Implementation impact:

- Code: `generateTradeProposal` throws on negative cash.
- Tests: Added negative-cash proposal test.
- Fixtures: No persistent negative-cash fixture added; the behavior is tested inline because negative cash is invalid for Slice 6 proposals.
- Documentation: Fixture README documents the negative-cash assumption.
- Follow-up: Revisit if withdrawal handling or deficit funding becomes an MVP or post-MVP requirement.

Validation:
Run tests, type-check, lint, build, and format after implementation.

Decision: Simulate exact proposed trades with sell-side turnover

Status: Accepted
Date: 2026-05-02

Context:
Slice 7 requires post-trade holdings, weights, residual drift, turnover, and reconciliation checks. The engine needs explicit semantics for how simulation applies trades and how turnover is calculated.

Options considered:

1. Apply proposed quantities exactly and validate reconciliation.
   - Benefits: Deterministic, replayable, and directly tied to proposal output.
   - Costs: Does not model execution slippage, rounding, or partial fills.
   - Risks: Fractional quantities remain a simplification until rounding policy exists.
   - Reversibility: High; execution-aware simulation can be layered later.

2. Recompute ideal post-trade state from targets instead of applying trades.
   - Benefits: Simple for full-reset cases.
   - Costs: Hides proposal mistakes and constraint impacts.
   - Risks: Would miss residual drift from suppressed minimum-size trades.
   - Reversibility: Medium; tests would need to be rewritten around replay semantics.

3. Add execution-style rounding and fill simulation now.
   - Benefits: Closer to real trading.
   - Costs: Requires lot-size, fractional-share, order-type, and execution assumptions outside MVP scope.
   - Risks: Premature complexity and misleading precision.
   - Reversibility: Medium; hard to unwind once consumers depend on rounded behavior.

Preferred option:
Option 1: Apply proposed quantities exactly and validate reconciliation.

Rationale:
Exact replay is the best MVP trade-off. It proves proposals can be simulated, preserves residual drift from constraints, and avoids premature execution assumptions.

Implementation impact:

- Code: Added `simulatePostTrade` with post-trade state, valuation, weights, residual drift, and turnover.
- Tests: Added full-reset, cash deployment, suppressed-trade residual drift, oversell rejection, and cash reconciliation tests.
- Fixtures: Existing fixtures are sufficient.
- Documentation: README and build journey now describe Slice 7 simulation.
- Follow-up: Add rounding and execution-fill assumptions only when a later requirement demands them.

Validation:
Run tests, type-check, lint, build, and format after implementation.

Decision: Use sell-side turnover for MVP simulation

Status: Accepted
Date: 2026-05-02

Context:
The MVP needs a turnover estimate. Prior test-audit notes proposed `turnover = sum of sell values / total portfolio value`, while other definitions such as gross traded value are also reasonable.

Options considered:

1. Sell-side turnover: sum of SELL estimated values divided by starting total portfolio value.
   - Benefits: Aligns with prior audit note and highlights secondary-market liquidation volume.
   - Costs: Buy-only cash deployment has zero turnover even though trades occur.
   - Risks: Consumers may confuse turnover with gross trade volume.
   - Reversibility: Medium; a future field can add gross traded value if needed.

2. Gross turnover: sum of all BUY and SELL estimated values divided by starting total portfolio value.
   - Benefits: Captures all operational trading activity.
   - Costs: Counts cash deployment as turnover, which weakens cash-aware comparison.
   - Risks: Could overstate rebalancing friction.
   - Reversibility: Medium; changing semantics later would affect reports.

3. Lower-of-buys-or-sells turnover.
   - Benefits: Common in fund reporting contexts.
   - Costs: Less intuitive for proposal simulation and cash-flow scenarios.
   - Risks: Harder to explain in MVP output.
   - Reversibility: Medium.

Preferred option:
Option 1: Sell-side turnover.

Rationale:
This aligns with the existing audit recommendation and the MVP focus on minimizing unnecessary sales when cash can be deployed.

Implementation impact:

- Code: `simulatePostTrade` reports `turnover` as sell value over starting total portfolio value.
- Tests: Full-reset turnover and buy-only cash deployment turnover are explicitly tested.
- Fixtures: No fixture changes required.
- Documentation: Build journey records the semantic choice.
- Follow-up: Add a separate `grossTradeValue` or `grossTradeRatio` later if reporting requires it.

Validation:
Run tests, type-check, lint, build, and format after implementation.

## 5. Iteration Log

| Iteration | Date       | Goal                            | Scope                     | Actions taken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Files changed                                                                                                                                                                            | Learnings                                                                                                                                                                                                    | Open questions                                                               | Next step                                                          |
| :-------- | :--------- | :------------------------------ | :------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| 1         | 2026-04-29 | Setup Project Hygiene           | Phase 0: Init & Discovery | Inspected repo, created `BUILD_JOURNEY.md`, `AGENTS.md`, and `.gitignore`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `BUILD_JOURNEY.md`, `AGENTS.md`, `.gitignore`, `README.md`                                                                                                                               | Repo is essentially empty with just one research doc. No existing stack to constrain future choices.                                                                                                         | What stack/language will be chosen?                                          | Await PRD for Phase 1.                                             |
| 2         | 2026-04-29 | PRD Planning                    | Phase 1: MVP Plan         | Digested PRD, created `docs/MVP_Implementation_Plan.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `docs/MVP_Implementation_Plan.md`, `BUILD_JOURNEY.md`                                                                                                                                    | PRD demands strict determinism, BIAN models, and strategy isolation. MVP focuses strictly on offline threshold rebalancing.                                                                                  | What is the target programming language for the engine?                      | Await tech stack decision, then start Slice 1.                     |
| 3         | 2026-04-29 | Tech Stack & Scaffolding        | Slice 0                   | Selected TypeScript/Node.js stack. Added TS, Jest, Prettier configs. Set up basic smoke test. Updated `.gitignore` to ignore node_modules/dist/coverage.                                                                                                                                                                                                                                                                                                                                                                                                              | `package.json`, `tsconfig.json`, `jest.config.js`, `.prettierrc`, `.gitignore`, `tests/smoke.test.ts`, `src/core/index.ts`, `BUILD_JOURNEY.md`                                           | TS/Node.js is ideal for deterministic calculations, testability, and standard JSON fixture handling.                                                                                                         | None.                                                                        | Proceed to Slice 1: Domain Fixture Foundation.                     |
| 4         | 2026-04-29 | Domain Fixture Foundation       | Slice 1                   | Created TypeScript interfaces for domain models and wrote JSON fixtures covering all MVP edge cases (on-target, drift breaches, positive cash, min trade size, missing prices, universe/sum errors).                                                                                                                                                                                                                                                                                                                                                                  | `src/models/domain.ts`, `tests/fixtures/scenarios.json`, `tests/fixtures.test.ts`, `BUILD_JOURNEY.md`                                                                                    | Found that standard `number` should suffice for the MVP phase, provided we don't do complex float manipulations. Documented this limitation.                                                                 | Should we add decimal.js later?                                              | Proceed to Slice 2: Portfolio Valuation.                           |
| 5         | 2026-04-29 | Portfolio Valuation             | Slice 2                   | Implemented `calculateValuation` and `calculateCurrentWeights`. Added unit tests verifying positive cash logic and missing price abort logic.                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/core/valuation.ts`, `tests/valuation.test.ts`, `BUILD_JOURNEY.md`                                                                                                                   | Cash must be factored into total portfolio value to ensure weights are diluted accurately. Explicit error is thrown on missing prices.                                                                       | None.                                                                        | Proceed to Slice 3: Target Allocation and Drift.                   |
| 6         | 2026-04-29 | Target Allocation and Drift     | Slice 3                   | Implemented `calculateDrift` and `validateTargetAllocation`. Added tests for out-of-band and out-of-universe scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                               | `src/core/drift.ts`, `tests/drift.test.ts`, `BUILD_JOURNEY.md`                                                                                                                           | Drift calculation explicitly checks and includes assets that are outside the model universe by treating their target weight as zero.                                                                         | None.                                                                        | Proceed to Slice 4: Threshold Trigger Evaluation.                  |
| 7         | 2026-04-29 | Threshold Trigger               | Slice 4                   | Created `StrategyInterface` and `ThresholdStrategy`. Added unit tests showing trigger activates only when bands are breached.                                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/models/domain.ts`, `src/strategy/threshold.ts`, `tests/threshold.test.ts`, `BUILD_JOURNEY.md`                                                                                       | Abstracting the strategy evaluation early keeps the core engine decoupled from specific threshold logic.                                                                                                     | None.                                                                        | Proceed to Slice 5: Basic Trade Proposal Generation.               |
| 8         | 2026-04-29 | Red-Team Audit                  | Phase 2: Audit            | Performed red-team audit of Slices 1-4. Fixed TSConfig `rootDir` issue, added `EPSILON` to handle float precision in drift thresholding, added lint/format scripts. Created formal audit report.                                                                                                                                                                                                                                                                                                                                                                      | `tsconfig.json`, `package.json`, `src/core/drift.ts`, `docs/audits/red-team-audit-current.md`, `BUILD_JOURNEY.md`                                                                        | Float arithmetic needs constant vigilance in JS/TS. Core logic holds up well to edge cases.                                                                                                                  | None.                                                                        | Proceed to Slice 5: Basic Trade Proposal Generation.               |
| 9         | 2026-04-30 | Test-Case Audit                 | Phase 2: Audit            | Performed focused test-case audit of Slices 1–4. Found 12 findings (1 High, 4 Medium, 5 Low, 2 Info). Fixed all High/Medium items: replaced tautological smoke test; added AAPL assertion to `holding_outside_universe`; added `multiple_assets_out_of_band` drift test; corrected fixture description; added `edge-cases.test.ts` covering `min_trade_size_issue`, `positive_cash` drift+trigger, cash-only portfolio, `validateTargetAllocation` edge cases, determinism ordering. Updated README with actual setup and test instructions. No product code changed. | `tests/smoke.test.ts`, `tests/drift.test.ts`, `tests/edge-cases.test.ts` (new), `tests/fixtures/scenarios.json`, `docs/audits/test-case-audit.md` (new), `README.md`, `BUILD_JOURNEY.md` | Smoke tests must exercise real imports to have value. Fixture descriptions must accurately reflect the math — GOOG was on-target in `multiple_assets_out_of_band`. Deferred gaps documented for Slices 5–10. | Should we adopt `decimal.js` before Slice 5?                                 | Proceed to Slice 5: Basic Trade Proposal Generation.               |
| 10        | 2026-05-02 | Basic Trade Proposal Generation | Slice 5                   | Verified repository reality against docs, implemented deterministic full-reset proposal generation, added trade proposal tests, exported core modules, and updated README status.                                                                                                                                                                                                                                                                                                                                                                                     | `src/core/trades.ts`, `src/core/index.ts`, `tests/trades.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                       | Slice 5 can be implemented as pure math over existing valuation results; cash-aware routing and minimum trade suppression must remain separate Slice 6 concerns.                                             | Should `decimal.js` be introduced before constraint filtering or simulation? | Proceed to Slice 6: Cash-Aware Adjustment and Minimum Trade Rules. |
| 11        | 2026-05-02 | Cash-Aware Constraints          | Slice 6                   | Added structured proposal warnings, applied global minimum trade-size suppression, rejected negative cash during proposal generation, documented fixtures, and updated README status.                                                                                                                                                                                                                                                                                                                                                                                 | `src/models/domain.ts`, `src/core/trades.ts`, `tests/trades.test.ts`, `tests/fixtures/README.md`, `README.md`, `BUILD_JOURNEY.md`                                                        | Minimum trade constraints should not abort otherwise useful proposals; warnings provide the bridge to later simulation, explanation, and audit slices.                                                       | Should future policies support per-instrument minimum trade sizes?           | Proceed to Slice 7: Post-Trade Simulation.                         |
| 12        | 2026-05-02 | Post-Trade Simulation           | Slice 7                   | Added exact trade replay simulation with post-trade holdings, valuation, weights, residual drift, sell-side turnover, oversell checks, and cash reconciliation checks.                                                                                                                                                                                                                                                                                                                                                                                                | `src/core/simulation.ts`, `src/core/index.ts`, `tests/simulation.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                        | Simulation exposes residual drift from suppressed trades, which keeps Slice 6 constraint decisions visible instead of hiding them in proposal generation.                                                    | Should future output include gross trade value separately from turnover?     | Proceed to Slice 8: Explanation Output.                            |

### Iteration 10 Detail — 2026-05-02

**Goal:** Resume from the Antigravity handoff, verify the repository against the documented MVP plan, and implement the next smallest validated MVP slice.

**Scope:** Slice 5 only: deterministic basic trade proposal generation using a naive full reset to target weights. Cash routing preference, minimum trade filtering, post-trade simulation, explanations, and audit records remain out of scope.

**Repository status observed:** TypeScript/Node.js project with Jest, TypeScript, ESLint, and Prettier scripts. Branch `main` was clean against `origin/main` before changes. No CI workflow files were present outside `node_modules`. Source implemented valuation, drift, and threshold trigger logic. Tests covered Slices 1–4 with 30 passing tests before this iteration.

**Documentation-versus-reality assessment:** `BUILD_JOURNEY.md`, README, red-team audit, and test-case audit all correctly identified Slice 5 as the next implementation step. README overstated current behavior by saying audit records were produced; audit records are not implemented and were clarified as deferred. `docs/MVP_Implementation_Plan.md` still contains early-snapshot language from before the TypeScript stack existed, so it is useful as a plan but not as current repository status.

**Selected slice:** Slice 5 — Basic Trade Proposal Generation.

**Actions taken:** Added `generateTradeProposal`, a pure deterministic full-reset proposal generator. It validates target allocation sums, computes target dollar values from current total portfolio value, emits sorted BUY/SELL trades, estimates quantities from supplied prices, sells out-of-universe holdings to zero target weight, buys target-only underweights when priced, rejects missing or non-positive prices when a trade is needed, and returns estimated post-trade cash. Exported core modules from `src/core/index.ts`.

**Files changed:** `src/core/trades.ts`, `src/core/index.ts`, `tests/trades.test.ts`, `README.md`, `BUILD_JOURNEY.md`.

**Tests/checks run:** `npm test -- --runInBand` passed (37 tests, 7 suites). `npx tsc --noEmit` passed. `npm run lint` passed. `npm run build` passed.

**Learnings:** Existing valuation results provide enough information to generate full-reset trades without introducing an engine orchestrator yet. The current `TradeProposal` model is adequate for Slice 5, but it is intentionally minimal and does not yet include trigger metadata, turnover, explanations, or audit context.

**Decisions made:** Keep Slice 5 using standard JavaScript `number` arithmetic to avoid adding a dependency before constraint and simulation requirements are known. This is provisional because Slice 6/7 will make rounding and residual behavior more important.

**Decisions deferred:** Decimal arithmetic adoption, trade rounding, minimum trade-size filtering, preferential cash routing, residual cash policy, turnover calculation, and post-trade simulation.

**Open questions:** Should minimum trade size apply globally only, or later support instrument/account-specific overrides? Should Slice 6 still perform full reset after filtering, or intentionally leave residual drift below minimum thresholds?

**Recommended next step:** Implement Slice 6: cash-aware adjustment and minimum trade rules, including tests for cash-first buy behavior and suppression of uneconomic trades in `min_trade_size_issue`.

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
