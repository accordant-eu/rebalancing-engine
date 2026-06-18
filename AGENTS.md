# AI Agent Rules: rebalancing-engine

These rules govern AI-assisted development in this repository. The project is in an early exploratory phase and may evolve into a generic portfolio rebalancing engine. The rules are stack-agnostic and broadly applicable.

## 1. Repository Stewardship

- Inspect before changing.
- Prefer small, reviewable changes.
- Avoid broad rewrites unless explicitly justified.
- Preserve existing conventions unless there is a clear reason to change them.
- Document assumptions and trade-offs.
- Keep generated or temporary files out of source control unless intentionally needed.
- Push committed changes at reasonable checkpoints after relevant validation passes, especially at the end of a completed slice or documentation/process update.
- Do not push partial, failing, exploratory, or user-ambiguous work unless explicitly instructed.
- Before pushing, confirm the working tree state and summarize what commits will be pushed.

## 2. Decision Discipline

- Do not make irreversible architectural decisions without evidence.
- Mark uncertain decisions as provisional.
- Prefer reversible choices during early exploration.
- Record meaningful decisions as ADR files in `docs/decisions/`. Use `docs/decisions/TEMPLATE.md` as the starting point. Add a summary row to the BUILD_JOURNEY decisions table with a link to the ADR.
- Assign the next sequential ADR number. Check existing files to determine the current highest number.
- Separate facts, assumptions, inferences, and decisions.
- Treat decision discipline as a standing instruction for all product, architecture, domain, calculation, testing, tooling, documentation, and implementation work.
- When a meaningful decision arises, explicitly identify it, consider reasonable alternatives, assess trade-offs, choose a preferred option when enough information exists, document the decision, implement it consistently, and validate it.
- Document meaningful decisions using the OKF Decision Record structure: Context, Options considered, Decision, Rationale, Implementation impact, Validation.
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
- All new documents in `docs/` must include OKF-compliant YAML frontmatter with at minimum: `type`, `title`, `description`, and `timestamp`.
- When adding a new file to any `docs/` subdirectory, update the corresponding `index.md` to include the new file.
- When making substantive documentation changes, add an entry to the root `docs/log.md`.
- Keep `BUILD_JOURNEY.md` current for high-level iteration summaries only. Do not embed full decision records—link to ADR files instead.
- Refer to `docs/CONTRIBUTING_DOCS.md` for our documentation conventions.
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
- **MANDATORY**: After completing any significant task, you must update the `BUILD_JOURNEY.md` iteration log table before committing your changes.
- **MANDATORY**: Never use `git add .` or `git commit -a`. When committing changes, you must explicitly pass the specific file paths you modified to `git add` (e.g., `git add src/file1.ts src/file2.ts`) to ensure parallel chat sessions do not accidentally commit each other's work.

## 11. Release and Deployment Handoff

- **Scope Boundary**: Your scope as an AI agent ends at the `main` branch. You do not manage tags, create releases, or trigger deployments. Infrastructure and production environments are strictly managed by human operators (e.g., Rufus).
- **Signaling Readiness**: When a feature or version on `main` is production-ready, you must signal this by opening a GitHub Issue on this repository.
- **Issue Format**:
  - **Label**: `release-ready`
  - **Title**: `Release ready: [brief description of what changed]`
  - **Body**: Include any relevant notes, breaking changes, migration steps, and explicitly enumerate any new environment variables required (referencing `.env.example`).
- **Deployment Feedback**: The operator will review, verify on staging, and trigger the deployment. If issues arise post-deployment, they will report them by opening an issue labelled `deployment-feedback`. Act on these issues when they appear.


&copy; 2026 Johan Hellman. All rights reserved.
