# AI Agent Rules: rebalancing-engine

These rules govern AI-assisted development in this repository. The project is in an early exploratory phase and may evolve into a generic portfolio rebalancing engine. The rules are stack-agnostic and broadly applicable.

## 1. Repository Stewardship

- Inspect before changing.
- Prefer small, reviewable changes.
- Avoid broad rewrites unless explicitly justified.
- Preserve existing conventions unless there is a clear reason to change them.
- Document assumptions and trade-offs.
- Keep generated or temporary files out of source control unless intentionally needed.

## 2. Decision Discipline

- Do not make irreversible architectural decisions without evidence.
- Mark uncertain decisions as provisional.
- Prefer reversible choices during early exploration.
- Record meaningful decisions in `BUILD_JOURNEY.md`.
- Separate facts, assumptions, inferences, and decisions.
- Treat decision discipline as a standing instruction for all product, architecture, domain, calculation, testing, tooling, documentation, and implementation work.
- When a meaningful decision arises, explicitly identify it, consider reasonable alternatives, assess trade-offs, choose a preferred option when enough information exists, document the decision, implement it consistently, and validate it.
- Document meaningful decisions using this structure: Decision, Status, Date, Context, Options considered, Preferred option, Rationale, Implementation impact, Validation.
- Defer a decision only when it is genuinely premature, blocked, post-MVP, or lacks necessary stakeholder/integration information. Document the default behavior, revisit point, risk, and whether it blocks current work.
- Prefer deterministic, explicit, testable, MVP-compatible, reversible choices over silent fallback behavior, broad abstractions, or undocumented assumptions.

## 3. Implementation Discipline

- Build incrementally.
- Keep modules cohesive and loosely coupled.
- Separate domain logic from integration concerns.
- Prefer deterministic, testable core logic.
- Avoid premature abstraction, but avoid obvious dead ends.
- Keep public interfaces explicit and documented.
- Treat errors and edge cases intentionally.

## 4. Testing Discipline

- Add or update tests with meaningful logic changes.
- Prefer tests that validate behavior over implementation details.
- Include edge cases and failure modes.
- Maintain reproducible fixtures.
- Do not silently weaken or remove tests.
- If tests cannot be run, document why and what should be run.

## 5. Documentation Discipline

- Update documentation when behavior, setup, assumptions, or architecture changes.
- Keep `BUILD_JOURNEY.md` current.
- Explain why changes were made, not only what changed.
- Keep setup instructions practical and tested where possible.
- Document known gaps rather than hiding them.

## 6. Security and Privacy

- Do not commit secrets, credentials, tokens, private keys, or real personal data.
- Use environment variables or secret managers for sensitive configuration.
- Keep sample data synthetic unless explicitly approved.
- Minimize logging of sensitive data.
- Treat financial data as sensitive by default.

## 7. Data and Domain Integrity

- Preserve traceability of inputs, calculations, and outputs.
- Prefer deterministic calculations for financial logic.
- Make rounding, precision, and valuation assumptions explicit.
- Avoid silent fallback behavior in financial calculations.
- Keep auditability and reproducibility in mind from the start.

## 8. Dependency Hygiene

- Avoid adding dependencies before confirming need.
- Prefer well-maintained, widely used packages.
- Document why a new dependency is introduced.
- Avoid dependencies for trivial functionality.
- Respect existing dependency management conventions.

## 9. Tooling and Automation

- Use existing linting, formatting, type-checking, testing, and CI tools where present.
- Do not introduce heavy tooling unless justified.
- Prefer commands that are easy for humans and agents to run.
- Document common commands.

## 10. AI-Agent Behavior

- State assumptions before acting on them.
- Do not invent missing requirements.
- Ask for clarification only when blocked.
- Otherwise make a conservative, reversible choice and document it.
- Keep changes scoped to the current task.
- Provide a concise summary of changes, tests, and open questions after each iteration.
