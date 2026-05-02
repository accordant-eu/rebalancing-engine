# Build Journey

This file is the living project journal. It captures the journey from initialization through future implementation.

## 1. Project Context

- **Known Objective:** Maintain and extend a generic portfolio rebalancing engine MVP.
- **Development Approach:** This project, including its documentation, scaffolding, and future implementations, is built heavily relying on LLM tools and AI-assisted editors.
- **What is Known:** The MVP is a TypeScript/Node.js offline calculation core using deterministic synthetic fixtures.
- **What is Not Yet Known:** Production integration model, deployment model, live data interfaces, execution routing, and post-MVP policy breadth remain undecided.
- **Next Steps:** Treat the decimal/rounding and relative-boundary increment as complete, then reassess richer cash-flow workflows as the next likely post-MVP increment.

## 2. Current Repository Snapshot

- **Repository state:** MVP offline calculation core implemented for deterministic synthetic fixtures.
- **Languages detected:** TypeScript on Node.js.
- **Frameworks detected:** Jest test framework; no application framework.
- **Tooling detected:** TypeScript compiler, Jest, ESLint, Prettier, npm scripts.
- **Tests detected:** Unit, fixture, edge-case, scenario runner, explanation, audit, and strategy tests.
- **Documentation detected:** README, build journey, MVP plan, PRD/architecture document, fixture README, and audit reports.
- **CI/CD detected:** None.
- **Notable gaps:** No CI workflow, no richer cash-flow workflow, no tax lots, no full optimizer, and no live integrations/API/UI/database.

## 3. Working Assumptions

- The project is a generic portfolio rebalancing engine MVP.
- The current architecture is an offline TypeScript calculation core with no live integrations.
- The repository’s existing TypeScript/Node.js stack should be respected unless a documented post-MVP decision changes it.
- Future implementation should continue with short, validated proof cycles.
- The system requires deterministic calculations, explicit validation, and strong auditability.

## 4. Decisions Log

| Date       | Decision                                                                           | Status                      | Rationale                                                                                                                                                                                                                | Evidence                       | Reversibility | Follow-up                                                               |
| :--------- | :--------------------------------------------------------------------------------- | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------- | :------------ | :---------------------------------------------------------------------- |
| 2026-04-29 | Initialize `BUILD_JOURNEY.md` & `AGENTS.md`                                        | Accepted                    | Establish project hygiene and agent guidelines before coding.                                                                                                                                                            | N/A                            | High          | Wait for PRD                                                            |
| 2026-04-29 | Tech Stack Selection                                                               | Deferred                    | PRD / Architecture vision not yet provided.                                                                                                                                                                              | N/A                            | High          | Await PRD ingestion                                                     |
| 2026-04-29 | Define MVP Scope                                                                   | Accepted                    | PRD dictates an offline, deterministic, cash-aware threshold strategy as MVP.                                                                                                                                            | MVP Plan                       | Medium        | Await Tech Stack choice                                                 |
| 2026-04-30 | Defer `decimal.js` adoption                                                        | Deferred                    | Float arithmetic is safe for Slices 1–4 (no monetary output). Reconsider at Slice 5 when trade values (monetary) are introduced.                                                                                         | Test-case audit (T-13)         | Medium        | Evaluate before Slice 5                                                 |
| 2026-05-02 | Continue with standard `number` arithmetic for Slice 5                             | Provisional                 | Basic trade proposal generation only computes deterministic fixture-scale estimated values and quantities; no rounding, settlement, or execution precision is introduced yet.                                            | Slice 5 implementation tests   | Medium        | Revisit before Slice 6/7 constraint filtering and post-trade simulation |
| 2026-05-02 | Adopt standing decision discipline in agent rules                                  | Accepted                    | Future MVP work needs explicit decision identification, alternatives, trade-offs, documentation, implementation consistency, and validation to prevent hidden assumptions.                                               | User instruction               | High          | Apply continuously to future work                                       |
| 2026-05-02 | Push validated commits at reasonable checkpoints                                   | Accepted                    | Completed, validated slices and process updates should be shared remotely without requiring a separate push request each time, while avoiding partial or failing pushes.                                                 | User instruction               | High          | Apply after future validated commits                                    |
| 2026-05-02 | Suppress below-minimum trades with structured warnings                             | Accepted                    | Minimum trade-size constraints are non-fatal proposal adjustments; users need visibility into suppressed trades and residual drift will be quantified in Slice 7 simulation.                                             | Slice 6 implementation         | High          | Include warnings in explanation and audit output                        |
| 2026-05-02 | Reject negative cash in trade proposal generation                                  | Accepted                    | Negative cash makes cash-aware proposal funding ambiguous in the MVP and should not be silently converted into sells or ignored.                                                                                         | Slice 6 implementation         | Medium        | Revisit if withdrawal/deficit funding becomes in scope                  |
| 2026-05-02 | Simulate exact proposed trades with sell-side turnover                             | Accepted                    | MVP simulation should replay proposal quantities exactly, reconcile cash, expose residual drift, and use sell-side turnover per prior audit expectation.                                                                 | Slice 7 implementation         | Medium        | Revisit turnover definition if reporting requirements differ            |
| 2026-05-02 | Generate deterministic explanations from outputs                                   | Accepted                    | Explanation text must stay faithful to trigger, proposal, warning, and simulation outputs rather than duplicating calculation logic.                                                                                     | Slice 8 implementation         | High          | Include explanations in audit records                                   |
| 2026-05-02 | Use caller-supplied audit metadata                                                 | Accepted                    | Audit record IDs and timestamps must be deterministic in tests and should come from orchestration, not pure calculation helpers.                                                                                         | Slice 9 implementation         | High          | CLI/runner should supply stable metadata                                |
| 2026-05-02 | Report batch scenario errors per scenario                                          | Accepted                    | The offline runner should process all fixtures and report expected invalid scenarios without aborting the whole batch.                                                                                                   | Slice 10 implementation        | High          | Use same pattern for future batch workflows                             |
| 2026-05-02 | Use manual forced rebalance as second strategy                                     | Accepted                    | A manual strategy proves Strategy extensibility without introducing calendar/date policy semantics before they are required.                                                                                             | Slice 11 implementation        | High          | Revisit calendar strategy after MVP if needed                           |
| 2026-05-02 | Mark offline fixture MVP complete                                                  | Accepted                    | Slices 0-12 are implemented, tested, documented, and audited for the offline deterministic fixture scope.                                                                                                                | Final MVP audit                | Medium        | Continue with post-MVP hardening and production-readiness decisions     |
| 2026-05-02 | Use hybrid multi-strategy architecture next                                        | Accepted for next iteration | Preserve the common calculation core, add explicit strategy identifiers, use pluggable modules, and add a light orchestration layer instead of separate endpoints or a single broad policy interpreter.                  | Strategy traceability review   | High          | Start with policy schema and strategy orchestration                     |
| 2026-05-02 | Prioritize calendar and boundary-target strategy slices                            | Provisional                 | Calendar is the clearest missing PRD/Meta Paper carry-forward; boundary targeting is the smallest transaction-cost-aware proof point without full optimization.                                                          | Next-iteration PRD/plan        | Medium        | Validate calendar semantics and boundary math before implementation     |
| 2026-05-02 | Default omitted strategy policy to threshold                                       | Accepted                    | Existing fixtures and callers must remain backward compatible while new policies can opt into calendar or manual strategies.                                                                                             | Multi-strategy implementation  | High          | Keep threshold default documented in fixture docs                       |
| 2026-05-02 | Use explicit calendar dates only                                                   | Accepted for MVP            | Calendar strategy should be deterministic and avoid system time, scheduler, holiday, or business-day assumptions in the first implementation.                                                                            | Calendar strategy tests        | High          | Revisit frequency-derived dates later                                   |
| 2026-05-02 | Limit boundary targeting to absolute bands first                                   | Accepted for MVP            | Absolute-band boundary targeting proves transaction-cost-aware execution without adding relative-boundary ambiguity or full optimization.                                                                                | Boundary fixture/tests         | Medium        | Revisit relative-boundary support if needed                             |
| 2026-05-02 | Use separate expected-status runner manifest                                       | Accepted                    | Expected scenario outcomes should be validated without embedding runner assertions in the scenario input data itself.                                                                                                    | Runner manifest tests          | High          | Keep manifest aligned when fixtures change                              |
| 2026-05-02 | Mark active MVP slice sets complete                                                | Accepted                    | Original MVP slices 0-12 and next-iteration slices 0-8 are implemented and validated for offline deterministic fixtures; remaining items are post-MVP backlog, not unfinished slices.                                    | Slice reconciliation           | Medium        | Revisit if scope is expanded by a new PRD/plan                          |
| 2026-05-02 | Use a strategy registry for selection                                              | Accepted                    | A registry makes supported strategies explicit and discoverable while avoiding a premature broader strategy execution abstraction.                                                                                       | Refactoring assessment         | High          | Add proposal hooks only when a second strategy needs distinct sizing    |
| 2026-05-02 | Scope next deferred-capability increment to numeric policy and relative boundaries | Accepted for next increment | Numeric precision affects trust and all financial output; relative-boundary targeting extends existing boundary mode coherently, while cash flows, tax lots, optimizer, and production surfaces need separate decisions. | Deferred capabilities PRD/plan | High          | Implement in small validated slices                                     |
| 2026-05-02 | Use `decimal.js` internally with explicit output rounding                          | Accepted                    | Decimal arithmetic removes avoidable binary float artifacts while preserving number-based public interfaces; rounding is centralized and applied only at explanation/audit boundaries.                                   | Numeric policy slice           | Medium        | Revisit decimal string APIs before production integrations              |
| 2026-05-02 | Add policy-selected relative boundary targeting                                    | Accepted                    | Relative-boundary mode extends existing relative drift and boundary execution support without changing absolute-boundary defaults or adding optimizer complexity.                                                        | Relative-boundary slice        | High          | Revisit richer cash flows next                                          |
| 2026-05-02 | Model explicit offline cash flows as portfolio-state adjustments                   | Accepted for next increment | Optional cash-flow records make deposits, withdrawals, and pending flows traceable while preserving the offline deterministic engine and avoiding live banking or optimizer scope.                                       | Cash flows PRD/plan            | High          | Implement settled and pending flow semantics                            |

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

Decision: Generate deterministic explanations from calculation outputs

Status: Accepted
Date: 2026-05-02

Context:
Slice 8 requires human-readable explanation output. The project needs to choose whether explanations should be generated by recomputing decision logic, by static templates over calculation outputs, or by a more flexible natural-language layer.

Options considered:

1. Template explanations derived from trigger, proposal, warning, and simulation outputs.
   - Benefits: Deterministic, testable, faithful to audited outputs, and simple for MVP.
   - Costs: Text is less polished than a richer narrative system.
   - Risks: Future consumers may want localized or role-specific explanations.
   - Reversibility: High; templates can be expanded or replaced behind the same output contract.

2. Recompute explanation-specific reasoning from portfolio inputs.
   - Benefits: Could produce detailed rationale from raw data.
   - Costs: Duplicates calculation logic.
   - Risks: Explanation could contradict proposal or simulation behavior.
   - Reversibility: Medium; duplicated logic would need removal later.

3. Use generative natural-language output.
   - Benefits: Potentially more fluent.
   - Costs: Non-deterministic unless heavily constrained; harder to test and audit.
   - Risks: Hallucinated or non-reproducible financial rationale.
   - Reversibility: High technically, but not suitable for current compliance needs.

Preferred option:
Option 1: Template explanations derived from existing calculation outputs.

Rationale:
This aligns with determinism, auditability, and behavior-focused tests. It prevents a second reasoning path from drifting away from the actual calculation outputs.

Implementation impact:

- Code: Added `generateExplanation` under `src/explanation`.
- Tests: Added no-op, triggered proposal, and suppressed-trade warning explanation tests.
- Fixtures: Existing scenarios cover explanation paths.
- Documentation: README and build journey now describe deterministic explanation output.
- Follow-up: Slice 9 should include explanation output in the audit record.

Validation:
Run tests, type-check, lint, build, and format after implementation.

Decision: Use caller-supplied audit metadata

Status: Accepted
Date: 2026-05-02

Context:
Slice 9 requires audit records with event identity and timestamp behavior suitable for deterministic tests and replay. The project needs to decide whether the audit module should generate IDs/timestamps internally or receive them from orchestration.

Options considered:

1. Generate event IDs and timestamps inside `generateAuditRecord`.
   - Benefits: Convenient for callers.
   - Costs: Adds non-determinism to a pure audit helper.
   - Risks: Tests and replay require injection or mocking later.
   - Reversibility: Medium; API would need to change to regain determinism.

2. Require callers to supply `eventId` and `createdAt`.
   - Benefits: Deterministic, testable, and keeps orchestration concerns outside pure domain logic.
   - Costs: Callers must provide metadata.
   - Risks: Callers can supply duplicate IDs unless a higher-level runner enforces uniqueness.
   - Reversibility: High; convenience wrappers can be added later.

3. Generate deterministic hashes from inputs.
   - Benefits: Stable IDs without caller input.
   - Costs: Requires canonical hashing and a new dependency or custom serializer.
   - Risks: Premature complexity and possible hash semantics changes.
   - Reversibility: Medium.

Preferred option:
Option 2: Require callers to supply `eventId` and `createdAt`.

Rationale:
This preserves deterministic pure logic and leaves uniqueness/time policy to a future runner or integration layer.

Implementation impact:

- Code: Added `generateAuditRecord` and `serializeAuditRecord` under `src/audit`; removed the stale domain-level `AuditRecord` type.
- Tests: Added audit capture, deterministic serialization, and replay checks.
- Fixtures: Existing scenarios are sufficient.
- Documentation: README and build journey now describe audit support.
- Follow-up: Slice 10 runner should supply stable audit metadata for fixture execution.

Validation:
Run tests, type-check, lint, build, and format after implementation.

Decision: Report batch scenario errors per scenario

Status: Accepted
Date: 2026-05-02

Context:
Slice 10 adds a batch scenario runner. Existing fixtures intentionally include invalid cases such as missing prices and invalid target allocations, so the runner needs clear batch failure semantics.

Options considered:

1. Abort the entire batch on the first scenario error.
   - Benefits: Simple control flow.
   - Costs: Hides later scenario results.
   - Risks: Less useful for fixture audit and regression review.
   - Reversibility: High.

2. Return per-scenario success/error results.
   - Benefits: Runs all fixtures, preserves expected invalid-case coverage, and produces complete reviewable output.
   - Costs: Consumers must inspect statuses.
   - Risks: A CI wrapper must decide whether expected errors are acceptable.
   - Reversibility: High; stricter modes can be added later.

3. Skip invalid scenarios.
   - Benefits: Keeps output success-only.
   - Costs: Hides important failure-mode fixtures.
   - Risks: Weakens validation of error behavior.
   - Reversibility: Medium.

Preferred option:
Option 2: Return per-scenario success/error results.

Rationale:
This best fits the MVP fixture harness because invalid scenarios are intentional and should remain visible without blocking other scenarios from being evaluated.

Implementation impact:

- Code: Added `runScenarios`, `runScenario`, fixture loading, and CLI output under `src/runner`.
- Tests: Added runner determinism and success/error classification tests.
- Fixtures: Existing invalid fixtures are now part of batch output.
- Documentation: README documents `npm run scenario:run`.
- Follow-up: Final hardening can add an expected-status manifest if batch output becomes a CI gate.

Validation:
Run tests, type-check, lint, build, format, and `npm run scenario:run`.

Decision: Use manual forced rebalance as second strategy

Status: Accepted
Date: 2026-05-02

Context:
Slice 11 needs a second strategy proof point to validate architecture extensibility. The plan suggested a calendar strategy, but any simple second trigger mode can prove shared core reuse if it remains isolated from valuation, drift, proposal, simulation, explanation, and audit logic.

Options considered:

1. Calendar strategy.
   - Benefits: Mentioned in the MVP plan and common in rebalancing workflows.
   - Costs: Requires date/time inputs, schedule policy semantics, and deterministic clock handling.
   - Risks: Introduces premature temporal policy decisions.
   - Reversibility: Medium; date fields would become part of public strategy inputs.

2. Manual forced-rebalance strategy.
   - Benefits: Proves Strategy extensibility with minimal new domain assumptions.
   - Costs: Less sophisticated than calendar scheduling.
   - Risks: Does not validate date/time handling.
   - Reversibility: High; calendar can still be added later.

3. Cash-flow trigger strategy.
   - Benefits: Closely related to cash-aware MVP behavior.
   - Costs: Requires cash-flow event modeling not currently present.
   - Risks: Premature expansion of input schema.
   - Reversibility: Medium.

Preferred option:
Option 2: Manual forced-rebalance strategy.

Rationale:
Manual forced rebalance is the smallest useful proof point. It validates that strategies can differ only in trigger logic while reusing shared core workflow functions.

Implementation impact:

- Code: Added `ManualRebalanceStrategy` and strategy barrel exports.
- Tests: Added manual strategy tests proving trigger behavior and reuse of shared proposal, simulation, and explanation logic.
- Fixtures: Existing fixtures are sufficient.
- Documentation: README and build journey now list the second strategy.
- Follow-up: Calendar strategy can be added post-MVP once date/time policy is specified.

Validation:
Run tests, type-check, lint, build, format, and `npm run scenario:run`.

Decision: Mark offline fixture MVP complete

Status: Accepted
Date: 2026-05-02

Context:
Slice 12 requires final hardening and an audit of the implemented MVP. The repository now contains deterministic fixture loading, valuation, drift calculation, threshold and manual trigger strategies, trade proposal generation, minimum-trade warnings, post-trade simulation, explanations, audit records, and a batch scenario runner.

Options considered:

1. Mark the MVP complete for the offline deterministic fixture scope.
   - Benefits: Accurately reflects the implemented and tested capability boundary.
   - Costs: Requires clear limitation documentation so "MVP complete" is not mistaken for production readiness.
   - Risks: Readers may overgeneralize fixture-scope validation to live integrations.
   - Reversibility: Medium; future audit findings can reopen specific slices.

2. Keep the MVP open until production hardening is complete.
   - Benefits: Avoids any ambiguity about production readiness.
   - Costs: Blurs the boundary between MVP calculation-core completion and post-MVP production work.
   - Risks: Makes progress tracking less useful and may encourage scope creep.
   - Reversibility: High.

3. Mark only Slices 0-11 complete and leave Slice 12 deferred.
   - Benefits: Conservative if final validation is not yet complete.
   - Costs: Inaccurate once final checks and audit documentation pass.
   - Risks: Leaves the repository in a misleading partially finished state.
   - Reversibility: High.

Preferred option:
Option 1: Mark the MVP complete for the offline deterministic fixture scope.

Rationale:
This is the clearest boundary. The implemented system satisfies the documented MVP slices for offline deterministic scenarios, while final documentation explicitly separates that from production readiness.

Implementation impact:

- Code: No runtime changes.
- Tests: Full test, type-check, lint, build, format, and scenario-runner checks remain the validation basis.
- Fixtures: No fixture changes.
- Documentation: Added final MVP audit, updated README status, and refreshed build journey status.
- Follow-up: Begin post-MVP hardening with expected-status manifests, stricter fixture schema validation, decimal/rounding policy evaluation, CI, and calendar strategy design if needed.

Validation:
Run tests, type-check, lint, build, format, and `npm run scenario:run`.

Decision: Use hybrid multi-strategy architecture next

Status: Accepted for next iteration
Date: 2026-05-02

Context:
The full-chain strategy traceability review found that the current MVP has a tested common calculation core and trigger-only strategy modules, but `RebalancingPolicy` does not select a strategy and the scenario runner hard-codes `ThresholdStrategy`. The next iteration needs real multi-strategy support without implementing full tax, optimizer, live-data, or execution systems.

Options considered:

1. Wrapper/meta-orchestration layer only.
   - Benefits: Centralizes strategy selection and workflow metadata.
   - Costs: Can become too broad if it owns strategy logic.
   - Risks: May hide strategy assumptions.
   - Reversibility: High if kept internal.

2. Separate endpoints or interfaces per strategy.
   - Benefits: Simple for isolated demos.
   - Costs: Duplicates valuation, simulation, explanation, and audit wiring.
   - Risks: Divergent contracts and weaker cross-strategy traceability.
   - Reversibility: Medium.

3. Common strategy interface with pluggable modules only.
   - Benefits: Matches the current `StrategyInterface`.
   - Costs: Current interface only handles triggers, not proposal targeting.
   - Risks: Boundary-target, tax-aware, and optimizer logic could leak into core helpers.
   - Reversibility: High.

4. Policy-driven single engine.
   - Benefits: One entry point for consumers.
   - Costs: Encourages large conditional logic inside one engine.
   - Risks: Strategy behavior becomes implicit and harder to audit.
   - Reversibility: Medium.

5. Hybrid approach: common calculation core plus pluggable strategy modules plus a light orchestration layer.
   - Benefits: Preserves validated core functions while making strategy selection explicit and testable.
   - Costs: Requires policy metadata, a selector/registry, and orchestration tests.
   - Risks: Strategy interface evolution must be controlled.
   - Reversibility: High because the orchestrator can remain an internal adapter.

Preferred option:
Option 5: Hybrid approach.

Rationale:
This is the smallest architecture that supports explicit strategy selection, calendar strategy, and boundary-target threshold behavior while preserving the validated MVP core. It avoids premature API endpoint design and avoids concentrating all future strategy behavior in one policy interpreter.

Implementation impact:

- Code: Future slices should add strategy identifiers to `RebalancingPolicy`, a selector/registry, and a light evaluation orchestrator.
- Tests: Add strategy selection, conformance, runner, explanation, and audit tests.
- Fixtures: Add mixed strategy fixtures.
- Documentation: Reflect the architecture in the next-iteration PRD and MVP plan.
- Follow-up: Revisit the strategy interface when proposal targeting becomes strategy-specific.

Validation:
The next iteration should first prove backward-compatible threshold behavior, then add calendar and boundary-target fixtures through the shared runner.

Decision: Prioritize calendar and boundary-target strategy slices

Status: Provisional
Date: 2026-05-02

Context:
The traceability review found that threshold and manual strategies are implemented, while calendar strategy remains the clearest missing PRD/Meta Paper carry-forward. The review also found that full transaction-cost-aware optimal control is too large for the next iteration, but boundary-target execution is a smaller transaction-cost-aware proof point explicitly supported by the research.

Options considered:

1. Implement calendar strategy first, then boundary-target threshold execution.
   - Benefits: Calendar is low-complexity, research-backed, and explicitly expected by the PRD/MVP plan; boundary mode proves transaction-cost-aware extensibility next.
   - Costs: Calendar is less attractive than threshold for many automated portfolios.
   - Risks: Calendar date semantics must be specified carefully.
   - Reversibility: High.

2. Implement full transaction-cost-aware optimal control next.
   - Benefits: Strong institutional evidence and high long-term value.
   - Costs: Requires cost models, covariance/risk inputs, optimizer decisions, and explainability controls.
   - Risks: Major overreach for the current offline fixture MVP.
   - Reversibility: Low to medium.

3. Implement tax-aware/direct-indexing next.
   - Benefits: High value for taxable HNW use cases.
   - Costs: Requires tax lots, wash-sale logic, jurisdictional assumptions, and proxy instruments.
   - Risks: High correctness and compliance risk.
   - Reversibility: Low.

4. Implement dynamic/regime/ML next.
   - Benefits: Research upside.
   - Costs: Requires data/model governance and has weak interpretability.
   - Risks: Overfitting and poor auditability.
   - Reversibility: Low.

Preferred option:
Option 1: Calendar strategy first, then boundary-target threshold execution.

Rationale:
This sequence fills the clearest strategy carry-forward gap and then extends the existing threshold engine toward transaction-cost-aware behavior without claiming full optimal control. It remains deterministic, fixture-testable, and reversible.

Implementation impact:

- Code: Add calendar strategy after strategy selection/orchestration; add boundary execution mode after policy schema support exists.
- Tests: Add due/not-due calendar fixtures, boundary proposal math, residual drift simulation, and audit/explanation coverage.
- Fixtures: Add `calendar_due`, `calendar_not_due`, and `threshold_boundary_target`.
- Documentation: Keep tax-aware, full optimizer, ML, private-market, and digital-asset work deferred.

Validation:
Calendar must be deterministic from supplied evaluation dates. Boundary targeting must produce lower trade value than full reset and leave post-trade drift inside tolerance bands.

Decision: Default omitted strategy policy to threshold

Status: Accepted
Date: 2026-05-02

Context:
The repository already has fixtures, tests, docs, and callers that rely on threshold behavior without a strategy selector. The next iteration adds explicit strategy identifiers, but existing MVP behavior must remain stable.

Options considered:

1. Require `strategyType` on every policy immediately.
   - Benefits: Forces explicit configuration.
   - Costs: Breaks all existing fixtures and callers.
   - Risks: Creates unnecessary migration churn for no behavioral gain.
   - Reversibility: Medium.

2. Default omitted `strategyType` to `threshold`.
   - Benefits: Preserves existing behavior while enabling explicit strategy selection.
   - Costs: A policy can still be implicit.
   - Risks: Consumers may rely on defaults longer than intended.
   - Reversibility: High; strict validation can be added later.

3. Infer strategy from other policy fields.
   - Benefits: Reduces one field in simple cases.
   - Costs: Hidden behavior and ambiguous policies.
   - Risks: Violates auditability and explicit decision discipline.
   - Reversibility: Low.

Preferred option:
Option 2: Default omitted `strategyType` to `threshold`.

Rationale:
This keeps the next iteration backward compatible and makes the default strategy explicit in code and docs without forcing fixture churn.

Implementation impact:

- Code: Strategy selector resolves missing strategy to threshold.
- Tests: Existing threshold tests remain valid; runner tests cover mixed explicit strategies.
- Fixtures: Existing threshold fixtures can remain concise; new fixtures use explicit strategy fields.
- Documentation: Fixture README documents the default.

Validation:
Existing threshold tests and scenario runner tests pass with omitted strategy type.

Decision: Use explicit calendar dates only

Status: Accepted for MVP
Date: 2026-05-02

Context:
Calendar strategy was the clearest missing Meta Paper/PRD carry-forward, but full scheduling semantics can quickly expand into business calendars, holidays, persistence windows, frequency-derived dates, and system-clock behavior.

Options considered:

1. Use system time to decide whether a rebalance is due.
   - Benefits: Simple for runtime operation.
   - Costs: Non-deterministic tests and audit replay.
   - Risks: Violates deterministic fixture requirements.
   - Reversibility: Medium.

2. Require caller-supplied `evaluationDate` and `nextRebalanceDate`.
   - Benefits: Deterministic, auditable, and fixture-friendly.
   - Costs: Caller must calculate the next date.
   - Risks: Date-generation responsibility is deferred.
   - Reversibility: High.

3. Implement frequency-derived next dates, holidays, and business-day rolling now.
   - Benefits: More complete calendar behavior.
   - Costs: Adds date policy complexity not needed for the proof point.
   - Risks: Premature assumptions and extra test surface.
   - Reversibility: Medium.

Preferred option:
Option 2: Require caller-supplied dates.

Rationale:
This proves calendar strategy support while preserving deterministic replay and keeping date-policy assumptions outside the calculation core.

Implementation impact:

- Code: `CalendarRebalanceStrategy` reads `policy.calendar.evaluationDate` and `policy.calendar.nextRebalanceDate`.
- Tests: Added due, not-due, missing-config, runner, and audit coverage.
- Fixtures: Added `calendar_due` and `calendar_not_due`.
- Documentation: Calendar limitations are documented.

Validation:
Calendar due/not-due tests and mixed scenario runner tests pass.

Decision: Limit boundary targeting to absolute bands first

Status: Accepted for MVP
Date: 2026-05-02

Context:
The traceability review recommended boundary-target execution as the smallest transaction-cost-aware proof point. The existing drift model supports both absolute and relative tolerance breaches, but boundary execution can become ambiguous when multiple tolerances apply.

Options considered:

1. Implement absolute-band boundary targeting first.
   - Benefits: Deterministic, easy to explain, and directly testable.
   - Costs: Relative-boundary policies remain deferred.
   - Risks: Users may expect relative tolerance to influence boundary mode immediately.
   - Reversibility: High.

2. Implement absolute and relative boundary targeting together.
   - Benefits: More complete tolerance support.
   - Costs: Requires policy decisions when absolute and relative boundaries conflict.
   - Risks: Larger blast radius and possible hidden assumptions.
   - Reversibility: Medium.

3. Defer all boundary targeting until full optimal control.
   - Benefits: Avoids partial transaction-cost-aware behavior.
   - Costs: Misses a small, high-value proof point.
   - Risks: Strategy architecture remains trigger-only longer.
   - Reversibility: High.

Preferred option:
Option 1: Implement absolute-band boundary targeting first.

Rationale:
Absolute-band boundary mode demonstrates reduced-turnover execution while keeping the math explicit and auditable. Full optimal control and relative-boundary conflict resolution remain later-stage decisions.

Implementation impact:

- Code: `generateTradeProposal` supports `executionTargetMode: "boundary"` and trades breached positions to `targetWeight +/- absoluteDriftTolerance`.
- Tests: Added boundary trade sizing and post-trade residual drift tests.
- Fixtures: Added `threshold_boundary_target`.
- Documentation: Boundary mode is documented as not full optimal control.

Validation:
Boundary fixture produces lower sell-side turnover than full reset and leaves post-trade drift inside absolute tolerance.

Decision: Use separate expected-status runner manifest

Status: Accepted
Date: 2026-05-02

Context:
The next-iteration MVP plan called for mixed-strategy scenario runner support and left expected-status handling as an optional runner hardening item. The runner already reports per-scenario errors, but fixture regression checks need to distinguish expected invalid scenarios from unexpected failures without making the scenario input data harder to scan.

Options considered:

1. Embed expected statuses directly in `tests/fixtures/scenarios.json`.
   - Benefits: Expectations sit next to scenario inputs.
   - Costs: Mixes test-runner assertions with domain scenario data.
   - Risks: Fixture file becomes harder to reuse as plain input data.
   - Reversibility: High.

2. Use a separate expected-status manifest.
   - Benefits: Keeps scenario inputs clean, lets runner validation remain optional, and gives invalid scenarios explicit expected error text.
   - Costs: Manifest must stay aligned when fixtures change.
   - Risks: Stale manifest entries can create false failures or miss new scenarios unless tests check both directions.
   - Reversibility: High.

3. Keep expected statuses only in Jest assertions.
   - Benefits: No additional fixture file.
   - Costs: CLI users cannot validate batch output against expected results.
   - Risks: Scenario runner can drift from documented expected behavior outside tests.
   - Reversibility: High.

Preferred option:
Option 2: Use a separate expected-status manifest.

Rationale:
This preserves reusable scenario input data while giving the CLI and tests a deterministic way to validate success/error expectations. The manifest is easy to remove or replace if a richer fixture schema is needed later.

Implementation impact:

- Code: `scenario-runner` accepts an optional expectations path, validates status and expected error text, and exits non-zero on mismatches.
- Tests: Added manifest success and mismatch coverage plus invalid strategy fixture coverage.
- Fixtures: Added `tests/fixtures/scenario-expectations.json`.
- Documentation: README and fixture README describe manifest validation.
- Follow-up: Keep manifest entries aligned with fixture additions and removals.

Validation:
Jest runner tests pass, the scenario runner validates 12 manifest entries with zero mismatches, and invalid strategy scenarios remain isolated per scenario.

Decision: Mark active MVP slice sets complete

Status: Accepted
Date: 2026-05-02

Context:
After implementing the original MVP and the next-iteration multi-strategy MVP, the user requested continuing until the full set of slices defined in the MVP approach had been implemented. Repository inspection showed that the remaining items were documented post-MVP deferrals, while some historical docs and TODO comments still described completed capabilities as future work.

Options considered:

1. Treat deferred post-MVP items as additional implicit MVP slices.
   - Benefits: Pushes more capability into the engine immediately.
   - Costs: Expands scope beyond the accepted PRD and MVP plans.
   - Risks: Adds production assumptions for decimal arithmetic, optimization, tax lots, cash-flow workflows, live integrations, and APIs without fresh requirements.
   - Reversibility: Medium.

2. Treat the active slice sets as complete and reconcile stale documentation/tests.
   - Benefits: Preserves the documented scope boundary, removes ambiguity, and keeps deferred work behind explicit future decisions.
   - Costs: Does not add new strategy breadth beyond the current MVP slice set.
   - Risks: Future readers may still consult historical audits without reading the current completion note.
   - Reversibility: High.

3. Create a new MVP expansion plan immediately for all deferred strategies.
   - Benefits: Gives a path for broader post-MVP work.
   - Costs: Planning work without a current implementation ask or product decision.
   - Risks: Prematurely prioritizes large features that were intentionally deferred.
   - Reversibility: High.

Preferred option:
Option 2: Treat the active original MVP and next-iteration MVP slice sets as complete for offline deterministic fixtures, then reconcile stale documentation and old TODO comments.

Rationale:
The implemented behavior satisfies the slice plans as written. Production precision, tax lots, optimizers, richer cash flows, APIs, UI, persistence, and live integrations are meaningful future products, but they are not unfinished slices in the accepted MVP approach.

Implementation impact:

- Code: No new strategy behavior; updated trade proposal comments to match current behavior.
- Tests: Converted stale edge-case TODO comments into executable assertions for already implemented proposal behavior.
- Fixtures: No fixture schema change.
- Documentation: Added explicit completion evidence and removed stale future-scope references for completed manifest/calendar/minimum-trade work.
- Follow-up: Start a new scoped plan before implementing deferred post-MVP capabilities.

Validation:
The final validation gate should rerun format, Jest, type-check, lint, build, scenario runner, manifest validation, and diff whitespace checks.

Decision: Use a strategy registry for selection

Status: Accepted
Date: 2026-05-02

Context:
The refactoring assessment found that `evaluateRebalance` is the main public orchestration API, but strategy selection was hidden in a switch and supported strategies were not directly discoverable. The next refactor should improve extension clarity without adding new strategy behavior or changing financial outputs.

Options considered:

1. Keep the switch-based selector.
   - Benefits: Minimal code and already working.
   - Costs: Supported strategies are not exposed as data.
   - Risks: Future additions may keep spreading strategy-selection knowledge through code paths.
   - Reversibility: High.

2. Use a registry of stateless strategy instances.
   - Benefits: Makes supported strategies explicit and easy to inspect; keeps the existing `StrategyInterface`; avoids changing strategy behavior.
   - Costs: Future strategies still require registry updates.
   - Risks: Registry instances must remain stateless or be replaced with factories.
   - Reversibility: High.

3. Introduce a broader strategy execution abstraction with proposal hooks now.
   - Benefits: Prepares for future strategies with custom proposal generation.
   - Costs: Premature abstraction because only threshold boundary mode currently needs special proposal sizing.
   - Risks: Adds interface surface before requirements justify it.
   - Reversibility: Medium.

Preferred option:
Option 2: Use a registry of stateless strategy instances and expose supported strategy identifiers.

Rationale:
This is the smallest behavior-preserving improvement to strategy-selection clarity. It supports the existing hybrid architecture while deferring proposal hooks until a second strategy needs materially different sizing behavior.

Implementation impact:

- Code: `src/core/evaluation.ts` now resolves strategies through `STRATEGY_REGISTRY`, exposes `supportedStrategyTypes`, and keeps `selectStrategy` explicit for unsupported identifiers.
- Tests: Added direct `evaluateRebalance` characterization coverage for threshold default behavior, calendar no-trigger metadata, supported strategy listing, and unsupported strategy errors.
- Fixtures: No fixture changes.
- Documentation: Refactoring assessment and build journey record the decision and completed slice.
- Follow-up: Revisit strategy proposal hooks only when another strategy needs proposal behavior that cannot remain cleanly shared.

Validation:
Focused evaluation tests, full Jest suite, TypeScript, ESLint, build, scenario runner, expected-status manifest validation, formatting, and diff whitespace checks should pass before commit.

Decision: Scope next deferred-capability increment to numeric policy and relative boundaries

Status: Accepted for next increment
Date: 2026-05-02

Context:
The original offline deterministic MVP and next-iteration multi-strategy MVP are implemented, tested, documented, committed, and pushed. Remaining work is post-MVP: decimal / rounding policy, relative-boundary targeting, richer cash flows, tax lots, full optimizer, and live integrations / API / UI / database. The next increment needs to improve correctness and usefulness without blindly expanding into incoherent or production-heavy scope.

Options considered:

1. Correctness and policy semantics increment: decimal / rounding policy plus relative-boundary targeting.
   - Benefits: Addresses financial correctness and extends existing boundary mode using already available relative drift concepts.
   - Costs: Requires numeric helper and serialization decisions before adding user-facing workflows.
   - Risks: Decimal migration can cause small output changes if rounding boundaries are unclear.
   - Reversibility: High if public interfaces remain number-based for now.

2. Practical portfolio workflow increment: decimal / rounding policy plus richer cash flows.
   - Benefits: Directly improves real portfolio workflow usefulness.
   - Costs: Cash-flow semantics affect valuation, trigger logic, proposal funding, warnings, explanations, and audit records at once.
   - Risks: Could silently encode withdrawal or pending-flow assumptions too early.
   - Reversibility: Medium.

3. Tax-aware foundations increment: decimal / rounding policy plus basic tax-lot primitives.
   - Benefits: Opens taxable-account workflows.
   - Costs: Requires lot data structures and sell-selection policy decisions.
   - Risks: Easy to imply jurisdiction-specific tax advice or optimizer behavior.
   - Reversibility: Medium.

4. Multi-capability expansion increment: decimal policy, relative boundaries, richer cash flows, and limited tax lots.
   - Benefits: Broad post-MVP progress.
   - Costs: Too many domain surfaces change at once.
   - Risks: High architecture and testing risk.
   - Reversibility: Low-medium.

5. Productionization increment: API wrapper, persistence layer, and integration boundaries.
   - Benefits: Makes the engine easier to expose externally.
   - Costs: Adds infrastructure before domain behavior is stable enough.
   - Risks: Security, operational, and testing burden without current product need.
   - Reversibility: Medium.

Preferred option:
Option 1: Implement numeric policy and relative-boundary targeting first.

Rationale:
Numeric policy is the clearest correctness prerequisite for any later financial workflow. Relative-boundary targeting is the smallest coherent strategy-policy extension because trigger logic already calculates relative drift and execution already has boundary mode. Richer cash flows should be the next separate workflow increment after numeric and boundary semantics are stable. Tax lots, optimizer, and production surfaces remain deferred because they need clearer objectives and larger domain decisions.

Implementation impact:

- Code: Add explicit numeric/rounding helpers, deterministic audit serialization rounding, and relative boundary band mode.
- Tests: Add precision-sensitive tests, deterministic serialization tests, and relative-boundary trade/fixture coverage.
- Fixtures: Add a relative-boundary scenario and manifest entry.
- Documentation: Add deferred-capabilities PRD and MVP plan; update README, fixture docs, audit report, and this build journey as slices complete.
- Follow-up: Reassess richer cash flows after this increment is validated.

Validation:
Run the full test suite, TypeScript build, ESLint, scenario runner, manifest validation, and formatting before each focused commit.

Decision: Use `decimal.js` internally with explicit output rounding

Status: Accepted
Date: 2026-05-02

Context:
The deferred-capabilities PRD selected numeric precision and rounding policy as the first implementation slice. Existing code used JavaScript `number` arithmetic directly, which produced binary floating-point artifacts in drift, valuation, simulation, scenario output, and audit records. The engine still needs backward-compatible number-based public interfaces in this increment.

Options considered:

1. Keep JavaScript `number` arithmetic and only round display output.
   - Benefits: Smallest code change and no dependency.
   - Costs: Internal calculations still carry avoidable binary artifacts.
   - Risks: Undermines the correctness goal of the deferred slice.
   - Reversibility: High.

2. Use `decimal.js` internally while keeping public interfaces number-based.
   - Benefits: Improves arithmetic determinism and preserves compatibility with fixtures and callers.
   - Costs: Adds a runtime dependency and still converts outputs to numbers.
   - Risks: A later production API may need decimal strings for exact wire contracts.
   - Reversibility: Medium.

3. Convert all public monetary, quantity, and weight fields to decimal strings.
   - Benefits: Stronger production-grade wire precision.
   - Costs: Broad breaking API and fixture change.
   - Risks: Premature migration before API/integration requirements exist.
   - Reversibility: Low-medium.

Preferred option:
Option 2: Use `decimal.js` internally with explicit output rounding boundaries.

Rationale:
This option materially improves calculation correctness without breaking the existing MVP public shape. It also creates a central numeric policy that can later support decimal-string APIs if production integrations require them.

Implementation impact:

- Dependency: Added `decimal.js`.
- Code: Added `src/core/numeric.ts`; valuation, drift, trade proposal, simulation, threshold explanation formatting, and audit serialization use the central numeric helpers.
- Tests: Added precision-sensitive valuation/trade tests and deterministic rounded audit serialization coverage.
- Documentation: README, deferred-capabilities PRD/plan, and build journey document the policy.
- Follow-up: Revisit decimal string inputs/outputs before live API or database work.

Validation:
Jest, TypeScript build, ESLint, scenario runner, and manifest validation pass after implementation.

Decision: Add policy-selected relative boundary targeting

Status: Accepted
Date: 2026-05-02

Context:
The next deferred-capabilities increment selected relative-boundary targeting after numeric policy. The engine already calculated relative drift and supported threshold boundary execution, but boundary sizing only used absolute bands. The implementation needed to preserve absolute-boundary behavior while allowing policies to opt into relative boundaries.

Options considered:

1. Keep only absolute boundary execution.
   - Benefits: No behavior change.
   - Costs: Leaves selected policy semantics unimplemented.
   - Risks: Relative drift can trigger a rebalance but cannot drive boundary-sized execution.
   - Reversibility: High.

2. Add `boundaryBandMode?: "absolute" | "relative"` as a threshold boundary execution option.
   - Benefits: Backward-compatible default, explicit policy shape, and small implementation surface.
   - Costs: Relative mode remains tied to threshold boundary execution rather than becoming a broader optimizer.
   - Risks: Callers must understand that trigger tolerances and boundary sizing are related but distinct policy fields.
   - Reversibility: High.

3. Replace existing tolerance fields with a larger tolerance-band schema.
   - Benefits: Cleaner long-term schema for combining absolute and relative tolerances.
   - Costs: Breaking fixture/API migration for limited immediate value.
   - Risks: Premature schema churn.
   - Reversibility: Medium.

Preferred option:
Option 2: Add policy-selected relative boundary targeting.

Rationale:
This is the smallest coherent extension of the existing boundary mode. Absolute boundary remains the default for backward compatibility. Relative boundary mode requires an explicit `relativeDriftTolerance`, uses `targetWeight +/- targetWeight * relativeDriftTolerance`, and rejects zero-target instruments that require a boundary trade because relative bands are undefined around zero.

Implementation impact:

- Code: Added `BoundaryBandMode`, `RebalancingPolicy.boundaryBandMode`, trade proposal/audit metadata, and relative boundary sizing validation.
- Tests: Added unit coverage for relative boundary trades, missing tolerance, zero-target invalid behavior, simulation, explanation, audit metadata, fixtures, and runner manifest.
- Fixtures: Added `threshold_relative_boundary_target`.
- Documentation: README, fixture docs, deferred-capabilities PRD/plan, and build journey now describe relative-boundary behavior.
- Follow-up: Richer cash flows remain the next likely practical workflow increment.

Validation:
Jest, TypeScript build, ESLint, scenario runner, and 13-entry manifest validation pass after implementation.

## 5. Iteration Log

| Iteration | Date       | Goal                             | Scope                      | Actions taken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Files changed                                                                                                                                                                                                                                                   | Learnings                                                                                                                                                                                                                                     | Open questions                                                                                                                     | Next step                                                                                                |
| :-------- | :--------- | :------------------------------- | :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| 1         | 2026-04-29 | Setup Project Hygiene            | Phase 0: Init & Discovery  | Inspected repo, created `BUILD_JOURNEY.md`, `AGENTS.md`, and `.gitignore`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `BUILD_JOURNEY.md`, `AGENTS.md`, `.gitignore`, `README.md`                                                                                                                                                                                                      | Repo is essentially empty with just one research doc. No existing stack to constrain future choices.                                                                                                                                          | What stack/language will be chosen?                                                                                                | Await PRD for Phase 1.                                                                                   |
| 2         | 2026-04-29 | PRD Planning                     | Phase 1: MVP Plan          | Digested PRD, created `docs/MVP_Implementation_Plan.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `docs/MVP_Implementation_Plan.md`, `BUILD_JOURNEY.md`                                                                                                                                                                                                           | PRD demands strict determinism, BIAN models, and strategy isolation. MVP focuses strictly on offline threshold rebalancing.                                                                                                                   | What is the target programming language for the engine?                                                                            | Await tech stack decision, then start Slice 1.                                                           |
| 3         | 2026-04-29 | Tech Stack & Scaffolding         | Slice 0                    | Selected TypeScript/Node.js stack. Added TS, Jest, Prettier configs. Set up basic smoke test. Updated `.gitignore` to ignore node_modules/dist/coverage.                                                                                                                                                                                                                                                                                                                                                                                                              | `package.json`, `tsconfig.json`, `jest.config.js`, `.prettierrc`, `.gitignore`, `tests/smoke.test.ts`, `src/core/index.ts`, `BUILD_JOURNEY.md`                                                                                                                  | TS/Node.js is ideal for deterministic calculations, testability, and standard JSON fixture handling.                                                                                                                                          | None.                                                                                                                              | Proceed to Slice 1: Domain Fixture Foundation.                                                           |
| 4         | 2026-04-29 | Domain Fixture Foundation        | Slice 1                    | Created TypeScript interfaces for domain models and wrote JSON fixtures covering all MVP edge cases (on-target, drift breaches, positive cash, min trade size, missing prices, universe/sum errors).                                                                                                                                                                                                                                                                                                                                                                  | `src/models/domain.ts`, `tests/fixtures/scenarios.json`, `tests/fixtures.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                           | Found that standard `number` should suffice for the MVP phase, provided we don't do complex float manipulations. Documented this limitation.                                                                                                  | Should we add decimal.js later?                                                                                                    | Proceed to Slice 2: Portfolio Valuation.                                                                 |
| 5         | 2026-04-29 | Portfolio Valuation              | Slice 2                    | Implemented `calculateValuation` and `calculateCurrentWeights`. Added unit tests verifying positive cash logic and missing price abort logic.                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/core/valuation.ts`, `tests/valuation.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                                                          | Cash must be factored into total portfolio value to ensure weights are diluted accurately. Explicit error is thrown on missing prices.                                                                                                        | None.                                                                                                                              | Proceed to Slice 3: Target Allocation and Drift.                                                         |
| 6         | 2026-04-29 | Target Allocation and Drift      | Slice 3                    | Implemented `calculateDrift` and `validateTargetAllocation`. Added tests for out-of-band and out-of-universe scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                               | `src/core/drift.ts`, `tests/drift.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                                                                  | Drift calculation explicitly checks and includes assets that are outside the model universe by treating their target weight as zero.                                                                                                          | None.                                                                                                                              | Proceed to Slice 4: Threshold Trigger Evaluation.                                                        |
| 7         | 2026-04-29 | Threshold Trigger                | Slice 4                    | Created `StrategyInterface` and `ThresholdStrategy`. Added unit tests showing trigger activates only when bands are breached.                                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/models/domain.ts`, `src/strategy/threshold.ts`, `tests/threshold.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                                              | Abstracting the strategy evaluation early keeps the core engine decoupled from specific threshold logic.                                                                                                                                      | None.                                                                                                                              | Proceed to Slice 5: Basic Trade Proposal Generation.                                                     |
| 8         | 2026-04-29 | Red-Team Audit                   | Phase 2: Audit             | Performed red-team audit of Slices 1-4. Fixed TSConfig `rootDir` issue, added `EPSILON` to handle float precision in drift thresholding, added lint/format scripts. Created formal audit report.                                                                                                                                                                                                                                                                                                                                                                      | `tsconfig.json`, `package.json`, `src/core/drift.ts`, `docs/audits/red-team-audit-current.md`, `BUILD_JOURNEY.md`                                                                                                                                               | Float arithmetic needs constant vigilance in JS/TS. Core logic holds up well to edge cases.                                                                                                                                                   | None.                                                                                                                              | Proceed to Slice 5: Basic Trade Proposal Generation.                                                     |
| 9         | 2026-04-30 | Test-Case Audit                  | Phase 2: Audit             | Performed focused test-case audit of Slices 1–4. Found 12 findings (1 High, 4 Medium, 5 Low, 2 Info). Fixed all High/Medium items: replaced tautological smoke test; added AAPL assertion to `holding_outside_universe`; added `multiple_assets_out_of_band` drift test; corrected fixture description; added `edge-cases.test.ts` covering `min_trade_size_issue`, `positive_cash` drift+trigger, cash-only portfolio, `validateTargetAllocation` edge cases, determinism ordering. Updated README with actual setup and test instructions. No product code changed. | `tests/smoke.test.ts`, `tests/drift.test.ts`, `tests/edge-cases.test.ts` (new), `tests/fixtures/scenarios.json`, `docs/audits/test-case-audit.md` (new), `README.md`, `BUILD_JOURNEY.md`                                                                        | Smoke tests must exercise real imports to have value. Fixture descriptions must accurately reflect the math — GOOG was on-target in `multiple_assets_out_of_band`. Deferred gaps documented for Slices 5–10.                                  | Should we adopt `decimal.js` before Slice 5?                                                                                       | Proceed to Slice 5: Basic Trade Proposal Generation.                                                     |
| 10        | 2026-05-02 | Basic Trade Proposal Generation  | Slice 5                    | Verified repository reality against docs, implemented deterministic full-reset proposal generation, added trade proposal tests, exported core modules, and updated README status.                                                                                                                                                                                                                                                                                                                                                                                     | `src/core/trades.ts`, `src/core/index.ts`, `tests/trades.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                                              | Slice 5 can be implemented as pure math over existing valuation results; cash-aware routing and minimum trade suppression must remain separate Slice 6 concerns.                                                                              | Should `decimal.js` be introduced before constraint filtering or simulation?                                                       | Proceed to Slice 6: Cash-Aware Adjustment and Minimum Trade Rules.                                       |
| 11        | 2026-05-02 | Cash-Aware Constraints           | Slice 6                    | Added structured proposal warnings, applied global minimum trade-size suppression, rejected negative cash during proposal generation, documented fixtures, and updated README status.                                                                                                                                                                                                                                                                                                                                                                                 | `src/models/domain.ts`, `src/core/trades.ts`, `tests/trades.test.ts`, `tests/fixtures/README.md`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                               | Minimum trade constraints should not abort otherwise useful proposals; warnings provide the bridge to later simulation, explanation, and audit slices.                                                                                        | Should future policies support per-instrument minimum trade sizes?                                                                 | Proceed to Slice 7: Post-Trade Simulation.                                                               |
| 12        | 2026-05-02 | Post-Trade Simulation            | Slice 7                    | Added exact trade replay simulation with post-trade holdings, valuation, weights, residual drift, sell-side turnover, oversell checks, and cash reconciliation checks.                                                                                                                                                                                                                                                                                                                                                                                                | `src/core/simulation.ts`, `src/core/index.ts`, `tests/simulation.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                               | Simulation exposes residual drift from suppressed trades, which keeps Slice 6 constraint decisions visible instead of hiding them in proposal generation.                                                                                     | Should future output include gross trade value separately from turnover?                                                           | Proceed to Slice 8: Explanation Output.                                                                  |
| 13        | 2026-05-02 | Explanation Output               | Slice 8                    | Added deterministic explanation generation from trigger, proposal, warning, and simulation outputs, with tests for no-op, rebalance, and suppressed-trade residual drift cases.                                                                                                                                                                                                                                                                                                                                                                                       | `src/explanation/explanation.ts`, `src/explanation/index.ts`, `tests/explanation.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                               | Explanation output should be assembled from already-computed facts to avoid contradictory financial rationale.                                                                                                                                | Should explanations later support localization or audience-specific wording?                                                       | Proceed to Slice 9: Audit and Reproducibility Record.                                                    |
| 14        | 2026-05-02 | Audit and Reproducibility Record | Slice 9                    | Added audit record generation and stable JSON serialization capturing inputs, drift, trigger, proposal, simulation, and explanation outputs. Added replay tests.                                                                                                                                                                                                                                                                                                                                                                                                      | `src/audit/audit.ts`, `src/audit/index.ts`, `src/models/domain.ts`, `tests/audit.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                               | Audit records should receive metadata from orchestration to preserve deterministic pure helpers and fixture replay.                                                                                                                           | Should event IDs later be content-addressed hashes?                                                                                | Proceed to Slice 10: Batch Scenario Runner / Test Harness.                                               |
| 15        | 2026-05-02 | Batch Scenario Runner            | Slice 10                   | Added an offline fixture runner and `npm run scenario:run` command that evaluates all scenarios into success/error JSON results with audit records for successful scenarios.                                                                                                                                                                                                                                                                                                                                                                                          | `src/runner/scenario-runner.ts`, `src/runner/index.ts`, `tests/scenario-runner.test.ts`, `tests/smoke.test.ts`, `package.json`, `README.md`, `BUILD_JOURNEY.md`                                                                                                 | Batch output makes existing invalid fixtures useful as deterministic error-path checks instead of special cases that must be excluded.                                                                                                        | Should the runner later support expected-status manifests and output files?                                                        | Proceed to Slice 11: Second Strategy Proof Point.                                                        |
| 16        | 2026-05-02 | Second Strategy Proof Point      | Slice 11                   | Added manual forced-rebalance strategy isolated to trigger logic and tests proving shared valuation, proposal, simulation, and explanation functions work unchanged.                                                                                                                                                                                                                                                                                                                                                                                                  | `src/strategy/manual.ts`, `src/strategy/index.ts`, `tests/manual-strategy.test.ts`, `tests/smoke.test.ts`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                      | Strategy extensibility can be proven without adding calendar/date policy decisions before the MVP requires them.                                                                                                                              | Should calendar scheduling be post-MVP or part of a later MVP extension?                                                           | Proceed to Slice 12: MVP Hardening and Final Audit.                                                      |
| 17        | 2026-05-02 | MVP Hardening and Final Audit    | Slice 12                   | Added final MVP audit documentation, refreshed README status, reconciled build journey project context with the implemented repository, and recorded the decision to mark the offline fixture MVP complete.                                                                                                                                                                                                                                                                                                                                                           | `docs/audits/final-mvp-audit.md`, `README.md`, `BUILD_JOURNEY.md`                                                                                                                                                                                               | The MVP is complete for offline deterministic fixtures, but production readiness still requires decimal/rounding policy, CI, richer validation, and integration decisions.                                                                    | Which post-MVP hardening item should be prioritized first?                                                                         | Begin post-MVP hardening.                                                                                |
| 18        | 2026-05-02 | Full-Chain Strategy Traceability | Planning and architecture  | Reviewed the Meta Paper, PRD, MVP plan, build journey, audits, README, fixtures, source, tests, runner, package config, git status, and recent commits. Classified strategy carry-forward from research to implementation. Created a full-chain traceability report, next-iteration PRD, and next-iteration MVP implementation plan. Recorded hybrid multi-strategy architecture and next-scope decisions.                                                                                                                                                            | `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`, `docs/prd/rebalancing-engine-next-iteration-prd.md`, `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`, `BUILD_JOURNEY.md`                                                     | The Meta Paper taxonomy is five primary clusters, with cash-flow routing and boundary execution as cross-cutting design implications. Threshold and manual are implemented; calendar and boundary-target are the safest next strategy slices. | Calendar schedule semantics and boundary relative-band support need decisions before implementation.                               | Implement Slice 0/1 of the next-iteration plan: baseline lock and explicit strategy policy identifiers.  |
| 19        | 2026-05-02 | Multi-Strategy Next Iteration    | Next-iteration MVP         | Implemented policy-driven strategy selection, calendar due-date strategy, threshold boundary-target execution, mixed-strategy runner fixtures, strategy/execution metadata in audit output, documentation updates, and a next-iteration audit.                                                                                                                                                                                                                                                                                                                        | `src/models/domain.ts`, `src/core/evaluation.ts`, `src/core/trades.ts`, `src/strategy/calendar.ts`, `src/runner/scenario-runner.ts`, tests, fixtures, README, fixture README, `docs/audits/next-iteration-mvp-audit.md`, `BUILD_JOURNEY.md`                     | Explicit strategy selection is now implemented; calendar is deterministic from input dates; boundary mode proves reduced-turnover execution without full optimal control.                                                                     | Should relative-boundary targeting, expected-status manifests, or decimal/rounding policy be next?                                 | Harden runner manifests and decide decimal/rounding policy before broader strategy work.                 |
| 20        | 2026-05-02 | Complete Next-Iteration Slices   | Slice completion hardening | Added expected-status manifest validation to the scenario runner, added an invalid-strategy fixture, covered manifest success and mismatch behavior in tests, updated runner usage docs, refreshed the next-iteration audit, and recorded the final runner-manifest decision.                                                                                                                                                                                                                                                                                         | `src/runner/scenario-runner.ts`, `tests/fixtures/scenario-expectations.json`, `tests/fixtures/scenarios.json`, `tests/scenario-runner.test.ts`, `tests/fixtures.test.ts`, README, fixture README, `docs/audits/next-iteration-mvp-audit.md`, `BUILD_JOURNEY.md` | Separate expected-status manifests keep scenario inputs reusable while making CLI validation explicit. Unsupported strategy policies now have fixture-level and runner-level regression coverage.                                             | Decimal/rounding policy, relative-boundary targeting, richer cash-flow workflows, and live integrations remain post-MVP decisions. | Decide decimal/rounding policy before adding relative-boundary targeting or broader cash-flow workflows. |
| 21        | 2026-05-02 | Reconcile Slice Completion       | Documentation and tests    | Verified the original MVP and next-iteration MVP slice lists against implementation, removed stale future-scope references for already completed manifest/calendar coverage, added explicit next-plan completion evidence, and converted old edge-case TODO comments into executable assertions.                                                                                                                                                                                                                                                                      | `tests/edge-cases.test.ts`, `src/core/trades.ts`, README, final MVP audit, traceability report, next-iteration MVP plan, test-case audit, `BUILD_JOURNEY.md`                                                                                                    | The active slice set is complete; remaining items are explicitly deferred post-MVP capabilities rather than unimplemented slices.                                                                                                             | Decimal/rounding policy, relative-boundary targeting, richer cash-flow workflows, and live integrations remain post-MVP decisions. | Decide decimal/rounding policy before adding new strategy breadth.                                       |
| 22        | 2026-05-02 | Refactoring Assessment           | Refactoring hardening      | Created a repository-aware refactoring assessment, added direct high-level evaluation characterization tests, and replaced switch-based strategy selection with an explicit registry of stateless strategies.                                                                                                                                                                                                                                                                                                                                                         | `docs/refactoring/refactoring-assessment.md`, `src/core/evaluation.ts`, `tests/evaluation.test.ts`, `BUILD_JOURNEY.md`                                                                                                                                          | The best near-term refactor is API/extension clarity, not financial semantics or new strategy breadth. Direct orchestration tests protect the public evaluation path.                                                                         | Decimal/rounding policy, strategy proposal hooks, schema validation, and CI remain deferred.                                       | Decide decimal/rounding policy before adding broader monetary behavior.                                  |

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

### Iteration 18 Detail — 2026-05-02

**Goal:** Perform a full-chain traceability review from Meta Paper to PRD, MVP plan, implementation, tests, fixtures, audits, and documentation, then draft the next-iteration PRD and MVP plan for missing strategies.

**Scope:** Documentation, architecture analysis, strategy prioritization, and decision logging only. No missing strategies were implemented.

**Materials reviewed:** `AGENTS.md`, README, `BUILD_JOURNEY.md`, Meta Paper, PRD/Architecture/Vision document, MVP implementation plan, final MVP audit, red-team audit, test-case audit, source modules under `src/`, tests under `tests/`, fixtures, scenario runner, `package.json`, git status, and recent commits.

**Chain reviewed:** Research taxonomy -> PRD carry-forward -> MVP plan scope -> implementation reality -> gap and prioritization analysis.

**Strategies identified:** Calendar-based, threshold/tolerance-band and hybrid, transaction-cost-aware optimal control, tax-aware/direct-indexing, dynamic/regime-switching/ML, cash-flow routing, boundary execution target, factor/style calendar reconstitution, private-market denominator-effect handling, digital-asset extreme-volatility policy, manual forced rebalance, and no-rebalance/monitoring-only behavior.

**Strategies implemented:** Threshold/tolerance-band rebalancing, cash-aware positive-cash full-reset proposal behavior, minimum trade-size suppression, manual forced rebalance trigger, and threshold no-trigger monitoring behavior.

**Strategies missing or partial:** Calendar strategy is missing. Boundary-target execution is missing. Hybrid monitoring cadence is only structurally represented by batch execution. Cash-flow routing is partial and does not cover withdrawals, pending flows, or negative-cash funding. Transaction-cost-aware optimal control, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market handling, and digital-asset policy are not implemented.

**Architecture decision made:** Accepted for the next iteration: use a hybrid architecture with the existing common calculation core, pluggable strategy modules, explicit strategy identifiers, and a light orchestration/registry layer.

**Documents created/updated:** Created `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`, `docs/prd/rebalancing-engine-next-iteration-prd.md`, and `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`. Updated `BUILD_JOURNEY.md`.

**Decisions made:** Use hybrid multi-strategy architecture next. Prioritize calendar strategy and threshold boundary-target execution as the next missing strategy slices.

**Decisions deferred:** Calendar frequency/date semantics, whether calendar ignores drift permanently or only for the first slice, whether boundary targeting supports relative bands immediately, whether manual forced rebalance is a product-supported strategy, decimal arithmetic adoption, full optimizer design, tax-lot/direct-indexing design, dynamic/ML strategy design, and live integration architecture.

**Tests/checks run:** Documentation drafting stage completed after source/test inspection. Final validation for this iteration should run formatting and the existing test/build/scenario checks before committing.

**Learnings:** The repository should not claim generic multi-strategy support until policy-driven strategy selection exists. Manual forced rebalance proves module reuse, but it does not satisfy the PRD/MVP plan's calendar strategy carry-forward. Boundary-target execution is the smallest practical transaction-cost-aware increment; full no-trade-region optimization remains too large for the next slice.

**Recommended next step:** Implement next-iteration Slice 0 and Slice 1: lock current regression behavior, then add explicit strategy identifiers and backward-compatible policy schema support.

### Iteration 19 Detail — 2026-05-02

**Goal:** Implement `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md` using the repository rules and the hybrid multi-strategy architecture selected in the traceability review.

**Scope:** Next-iteration MVP only: explicit strategy identifiers, policy-driven orchestration, calendar strategy, threshold boundary-target execution, mixed-strategy fixtures, explanation/audit metadata, docs, and validation. Full optimal control, tax-aware/direct-indexing, ML/regime logic, live integrations, UI, persistence, multi-currency, and production execution remain out of scope.

**Actions taken:** Added `strategyType`, `executionTargetMode`, and calendar policy fields. Added `evaluateRebalance` orchestration and strategy selection. Added `CalendarRebalanceStrategy`. Updated the runner to use orchestration instead of hard-coded threshold. Added boundary-target trade sizing for threshold policies. Added calendar and boundary fixtures. Extended audit output with strategy and execution target metadata. Updated README, fixture docs, and added next-iteration audit documentation.

**Files changed:** `src/models/domain.ts`, `src/core/evaluation.ts`, `src/core/index.ts`, `src/core/trades.ts`, `src/strategy/calendar.ts`, `src/strategy/index.ts`, `src/strategy/manual.ts`, `src/strategy/threshold.ts`, `src/explanation/explanation.ts`, `src/audit/audit.ts`, `src/runner/scenario-runner.ts`, tests, fixtures, README, fixture README, `docs/audits/next-iteration-mvp-audit.md`, and `BUILD_JOURNEY.md`.

**Strategies implemented:** Threshold remains default and supports full-reset and boundary target modes. Calendar strategy triggers from caller-supplied dates. Manual strategy remains selectable through orchestration. No-trigger monitoring behavior remains available when strategy conditions are not met.

**Strategies still missing or partial:** Full transaction-cost-aware no-trade-region optimization, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market denominator-effect handling, digital-asset policy, pending cash-flow routing, withdrawals, and negative-cash funding.

**Decisions made:** Default omitted strategy policy to threshold. Use caller-supplied calendar dates only. Limit boundary targeting to absolute tolerance bands for the next-iteration MVP.

**Decisions deferred:** Relative-boundary targeting, frequency-derived next dates, business-day/holiday calendars, manual actor/request metadata, strategy-specific proposal hooks beyond boundary mode, decimal arithmetic, and production integration architecture.

**Tests/checks run:** Baseline tests passed before implementation. After implementation, Jest passed with 69 tests across 13 suites before documentation finalization. Final validation should include tests, type-check, lint, build, scenario runner, expected-status manifest validation, format, and diff whitespace checks before commit.

**Learnings:** The light orchestration layer removes hard-coded strategy selection without disturbing the core calculation functions. Calendar strategy is straightforward when date generation is kept outside the core. Boundary-target mode lowers turnover and leaves intentional residual drift inside tolerance, which makes explanation and audit metadata important.

**Recommended next step:** Decide decimal/rounding policy before implementing relative-boundary targeting or broader cash-flow workflows.

### Iteration 20 Detail — 2026-05-02

**Goal:** Finish the remaining next-iteration MVP plan hardening item so all documented slices, including optional expected-status runner validation, are complete.

**Scope:** Runner and fixture regression hardening only. No new rebalancing strategy behavior, optimizer logic, tax logic, live integrations, UI, persistence, or execution routing.

**Actions taken:** Added optional expected-status manifest loading and validation to the scenario runner. Added `invalid_strategy` as a deterministic per-scenario error fixture. Added `scenario-expectations.json` covering all 12 scenarios. Added tests for successful manifest validation and mismatch reporting. Updated README, fixture docs, and the next-iteration audit to include manifest validation.

**Files changed:** `src/runner/scenario-runner.ts`, `tests/fixtures/scenario-expectations.json`, `tests/fixtures/scenarios.json`, `tests/scenario-runner.test.ts`, `tests/fixtures.test.ts`, `README.md`, `tests/fixtures/README.md`, `docs/audits/next-iteration-mvp-audit.md`, and `BUILD_JOURNEY.md`.

**Strategies implemented:** No new strategy behavior was added in this iteration. Threshold, calendar, manual, no-trigger monitoring, and boundary-target threshold execution remain the implemented next-iteration strategy set.

**Strategies still missing or partial:** Full transaction-cost-aware no-trade-region optimization, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market denominator-effect handling, digital-asset policy, pending cash-flow routing, withdrawals, negative-cash funding, and relative-boundary targeting remain outside the next-iteration MVP.

**Decisions made:** Use a separate expected-status runner manifest instead of embedding expected results in scenario input fixtures.

**Decisions deferred:** Decimal arithmetic, trade rounding, relative-boundary targeting, frequency-derived calendar dates, business-day/holiday calendars, richer cash-flow semantics, full optimizer design, tax-lot/direct-indexing design, dynamic/ML strategy design, and live integration architecture.

**Tests/checks run:** `npm run format` passed. `npm test -- --runInBand` passed with 69 tests across 13 suites. `npx tsc --noEmit` passed. `npm run lint` passed. `npm run build` passed. `npm run scenario:run` passed with nine successful scenario audit records and three expected per-scenario errors. `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json` passed with 12 checked scenarios and zero mismatches. `git diff --check` passed.

**Learnings:** Keeping expected statuses outside the scenario input file preserves fixture readability and makes the runner more useful as a CLI regression tool. The unsupported-strategy path is now covered as an executable fixture instead of only a unit-level behavior.

**Recommended next step:** Decide decimal/rounding policy, then choose whether the next implementation slice should be relative-boundary targeting or richer cash-flow workflows.

### Iteration 21 Detail — 2026-05-02

**Goal:** Proceed until the full set of slices defined in the MVP approach is implemented, then verify that repository documentation and tests no longer describe completed slice work as future work.

**Scope:** Slice-completion reconciliation across the original MVP plan and the next-iteration MVP plan. This included documentation cleanup and additional assertions for previously documented edge-case TODOs. No deferred post-MVP strategies or production integrations were added.

**Actions taken:** Confirmed the original MVP slices 0-12 and next-iteration slices 0-8 are implemented for the offline deterministic fixture scope. Added explicit completion evidence to the next-iteration MVP plan. Updated README, final MVP audit, traceability report, and test-case audit language that still referred to expected-status manifests, calendar strategy support, or minimum-trade enforcement as future work. Converted old edge-case TODO comments into executable assertions for minimum-trade suppression, cash-funded buy-only proposals, and on-target no-trade proposals. Updated the trade proposal comment to describe current full-reset, boundary, and minimum-trade behavior.

**Files changed:** `tests/edge-cases.test.ts`, `src/core/trades.ts`, `README.md`, `docs/audits/final-mvp-audit.md`, `docs/audits/test-case-audit.md`, `docs/strategy-traceability/full-chain-rebalancing-strategy-review.md`, `docs/plans/rebalancing-engine-next-iteration-mvp-plan.md`, and `BUILD_JOURNEY.md`.

**Strategies implemented:** No new strategy behavior was added in this iteration. The implemented slice set remains threshold/tolerance-band, manual forced rebalance, calendar due-date, no-trigger monitoring, and threshold boundary-target execution.

**Strategies still missing or partial:** Full transaction-cost-aware no-trade-region optimization, tax-aware/direct-indexing, dynamic/regime/ML, factor-specific reconstitution, private-market denominator-effect handling, digital-asset policy, pending cash-flow routing, withdrawals, negative-cash funding, and relative-boundary targeting remain outside the implemented MVP slice set.

**Decisions made:** Treat the original MVP and next-iteration MVP slice sets as complete for offline deterministic fixtures. Treat the remaining strategy breadth and production-readiness items as post-MVP work requiring separate scope and decisions.

**Decisions deferred:** Decimal arithmetic, trade rounding, relative-boundary targeting, frequency-derived calendar dates, business-day/holiday calendars, richer cash-flow semantics, full optimizer design, tax-lot/direct-indexing design, dynamic/ML strategy design, live integration architecture, API design, UI, database persistence, and CI workflow design.

**Tests/checks run:** `npm run format` passed. `npm test -- --runInBand` passed with 72 tests across 13 suites. `npx tsc --noEmit` passed. `npm run lint` passed. `npm run build` passed. `npm run scenario:run` passed with nine successful scenario audit records and three expected per-scenario errors. `node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json` passed with 12 checked scenarios and zero mismatches. `git diff --check` passed.

**Learnings:** The implementation had already completed the active slices, but historical docs and TODO comments created ambiguity. Keeping the plan as an implementation artifact with explicit completion evidence makes the boundary between MVP slices and post-MVP backlog clearer.

**Recommended next step:** Decide decimal/rounding policy before adding new strategy breadth such as relative-boundary targeting or richer cash-flow workflows.

### Iteration 22 Detail — 2026-05-02

**Goal:** Perform a repository-aware refactoring review and implement only safe, high-value behavior-preserving refactoring.

**Scope:** Refactoring assessment, public orchestration characterization, and strategy selection clarity. No new rebalancing strategies, financial semantics, live integrations, UI, database persistence, or production execution flows were added.

**Materials reviewed:** `AGENTS.md`, `BUILD_JOURNEY.md`, README, PRD/architecture docs, MVP and next-iteration plans, strategy traceability report, audit reports, fixture docs, source modules, tests, fixtures, package/config files, git status, and recent commits.

**Refactoring findings:** The repository is healthy for offline deterministic fixtures. Highest-priority friction was that the happy-path `evaluateRebalance` API lacked direct characterization tests. Medium-priority friction was that strategy selection was switch-based and supported identifiers were not directly discoverable. Larger financial, schema, and strategy-extension changes remain deferred because they would change semantics or add feature scope.

**Decisions made:** Use a registry of stateless strategy instances for selection, expose supported strategy identifiers, and keep this pass behavior-preserving. Defer decimal/rounding migration and strategy proposal hooks.

**Refactors implemented:** Added `supportedStrategyTypes`, moved strategy selection to an explicit registry, kept unsupported strategy errors explicit, and added high-level evaluation tests covering threshold default behavior, calendar no-trigger metadata, supported strategy listing, and unsupported strategy rejection.

**Files changed:** `docs/refactoring/refactoring-assessment.md`, `src/core/evaluation.ts`, `tests/evaluation.test.ts`, `BUILD_JOURNEY.md`.

**Tests/checks run:** Baseline before code changes: `npm test -- --runInBand` passed with 72 tests across 13 suites; `npx tsc --noEmit` passed; `npm run lint` passed. Focused after code changes: `npm test -- --runInBand tests/evaluation.test.ts` passed with 4 tests; `npx tsc --noEmit` passed; `npm run lint` passed. Final validation should rerun the full gate before commit.

**Results:** Public orchestration behavior is now directly protected, and supported strategy identifiers are discoverable without changing financial outputs.

**Learnings:** The current architecture does not need broader abstraction yet. A registry improves extension clarity while keeping strategy proposal hooks deferred until a concrete non-threshold proposal behavior appears.

**Decisions deferred:** Decimal arithmetic, trade rounding, strategy proposal hooks, relative-boundary targeting, richer cash-flow semantics, fixture schema validation, price timestamp/staleness policy, CI workflow, API design, UI, database persistence, live integrations, and production execution routing.

**Open questions:** Should the next hardening slice decide decimal/rounding policy, add result-contract documentation, or introduce CI?

**Recommended next step:** Decide decimal/rounding policy before adding broader monetary behavior or additional strategy breadth.

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
