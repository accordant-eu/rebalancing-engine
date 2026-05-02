# CLI Design

Date: 2026-05-02

## Assessment

### Existing Entry Points

- Engine entry point: `evaluateRebalance` in `src/core/evaluation.ts` orchestrates valuation, weights, drift, strategy selection, proposal generation, post-trade simulation, explanations, and audit records.
- Strategy discovery: `supportedStrategyTypes` exposes the supported strategy IDs: `calendar`, `manual`, and `threshold`.
- Scenario runner: `src/runner/scenario-runner.ts` loads a fixture file shaped as `{ "scenarios": [...] }`, sorts scenarios by ID, runs each scenario independently, and reports deterministic success/error results.
- Fixture loading: existing fixture loading reads JSON files from disk and trusts the fixture shape at the TypeScript boundary.
- Output structures: successful scenario runs return audit records. Audit records contain inputs, strategy, trigger, drift, proposal warnings, proposed trades, post-trade simulation, explanation, and cash-flow summary when present.
- Scripts: `npm run scenario:run` builds the project and runs the existing fixture batch runner. There is no packaged end-user CLI yet.
- Gaps: users must know source paths and runner argument order, root help is absent, single-scenario execution is awkward, explicit input files are unsupported, output formats are limited to raw JSON, and exit-code semantics are not documented for CLI use.

### CLI User Personas

- Developer running local scenarios while changing engine logic.
- Product or strategy reviewer running synthetic examples without reading TypeScript.
- QA/regression user running scenario suites and expected-status manifests.
- Future automation/CI user requiring deterministic JSON and stable exit codes.
- Future integrator treating the CLI as an offline, file-based interface before any API exists.

### CLI Design Goals

- Discoverable commands with useful root and command help.
- Explicit file inputs and clear validation of incompatible options.
- Deterministic JSON output for tests, CI, and automation.
- Concise human-readable summaries for interactive use.
- Stable output contracts based on existing audit records.
- No hidden live services or external dependencies.
- Compatibility with the existing fixture manifest.
- Helpful user errors without stack traces by default.
- Strict mode that can make warnings fail automation.
- Thin orchestration layer that does not duplicate rebalancing logic.

## Decisions

### Decision: Implement a lightweight in-repo CLI parser

Status: Accepted
Date: 2026-05-02

Context:
The project has no CLI dependency today, and dependency hygiene asks us to avoid new packages unless the need is clear.

Options considered:

1. Add a CLI framework such as Commander or Yargs.
   - Benefits: mature parsing, generated help, standard ergonomics.
   - Costs: new runtime dependency and dependency policy documentation.
   - Risks: unnecessary dependency for a small command set.

2. Implement a lightweight parser in `src/cli`.
   - Benefits: no new dependency, transparent behavior, easy focused tests.
   - Costs: we must maintain help text and option validation ourselves.
   - Risks: parser scope can grow if future CLI needs become complex.

3. Keep using the existing scenario runner only.
   - Benefits: no new surface.
   - Costs: does not satisfy discoverability, single-run, validation, or output-format goals.
   - Risks: users continue relying on source knowledge.

Preferred option:
Option 2.

Rationale:
The MVP CLI needs a small, explicit set of commands and flags. A local parser keeps the dependency footprint low while remaining reversible if the command surface grows.

Implementation impact:
Add `src/cli` modules and a package `bin` entry. Do not change engine logic.

Validation:
Add CLI behavior tests for help, option errors, command execution, output formats, and exit codes.

### Decision: Use verb subcommands around existing scenarios

Status: Accepted
Date: 2026-05-02

Context:
The CLI must validate inputs, run one scenario, run batches, and expose discoverability.

Options considered:

1. Single command with modes such as `--validate` and `--batch`.
   - Benefits: fewer command names.
   - Costs: harder help text and incompatible flag rules.

2. Verb subcommands: `validate`, `run`, `batch`, and `inspect`.
   - Benefits: discoverable, testable, and aligned with CLI best practices.
   - Costs: slightly more parser and help text.

3. Preserve only `scenario-runner`.
   - Benefits: backward compatible.
   - Costs: insufficient user experience.

Preferred option:
Option 2.

Rationale:
Separate commands keep validation, single-run, batch, and inspection workflows clear without changing the existing runner.

Implementation impact:
Expose `rebalance validate`, `rebalance run`, `rebalance batch`, and `rebalance inspect scenarios|strategies|policies`.

Validation:
Each command receives help and behavior tests.

### Decision: Support scenario manifest and explicit input-file modes

Status: Accepted
Date: 2026-05-02

Context:
Existing fixtures use a scenario manifest, while future integrations may have separate portfolio, target, price, and policy files.

Options considered:

1. Scenario manifest only.
   - Benefits: smallest implementation and maximum fixture compatibility.
   - Costs: less useful for integrators with separate files.

2. Explicit files only.
   - Benefits: simple one-scenario contract.
   - Costs: breaks the existing fixture workflow.

3. Support both, with validation that they are mutually exclusive.
   - Benefits: covers local fixtures and future file-based integrations.
   - Costs: more input validation.

Preferred option:
Option 3.

Rationale:
Supporting both modes keeps backward compatibility while adding a practical integration path. Scenario mode remains the recommended demo and regression path.

Implementation impact:
`--scenario <path>` accepts either a single scenario object or a manifest with `scenarios`; manifest input requires `--scenario-id` for `run` when more than one scenario exists. Explicit mode requires `--portfolio`, `--target`, `--prices`, and `--policy`.

Validation:
Tests cover valid scenario mode, explicit mode, missing inputs, and incompatible input combinations.

### Decision: Make human summary the default and JSON opt-in

Status: Accepted
Date: 2026-05-02

Context:
Interactive users benefit from concise summaries, while CI and integrators need JSON.

Options considered:

1. Default to raw JSON.
   - Benefits: automation-friendly.
   - Costs: noisy for demos and local inspection.

2. Default to summary, with `--format json|pretty|summary`.
   - Benefits: ergonomic by default while preserving machine-readable output.
   - Costs: requires renderers and formatting tests.

3. Default to pretty detailed output.
   - Benefits: explanatory.
   - Costs: too verbose for routine commands.

Preferred option:
Option 2.

Rationale:
Summary output is the best interactive default. JSON remains deterministic and separated from logs for automation.

Implementation impact:
Render JSON with stable key ordering where practical. Write command output to stdout or `--output`; write errors to stderr.

Validation:
Tests parse JSON output and assert summary/pretty shape without brittle full snapshots.

### Decision: Use documented exit codes and strict warning semantics

Status: Accepted
Date: 2026-05-02

Context:
Automation needs predictable exit codes, and warnings should be visible without always failing interactive runs.

Options considered:

1. Return only `0` or `1`.
   - Benefits: simple.
   - Costs: usage errors and runtime errors are indistinguishable.

2. Use `0` success, `1` validation/blocking scenario failure, `2` usage error, and `3` runtime/internal error.
   - Benefits: predictable and enough detail for CI.
   - Costs: slightly more implementation.

3. Add many specialized domain exit codes.
   - Benefits: granular.
   - Costs: premature and harder to document.

Preferred option:
Option 2.

Rationale:
Four exit codes are explicit without overfitting early CLI workflows.

Implementation impact:
Warnings are included in all formats. `--strict` converts warnings to exit code `1`; without `--strict`, warnings do not fail successful commands.

Validation:
Tests cover validation failures, usage errors, and strict warning behavior.

### Decision: Keep strategy selection in policy/scenario files

Status: Accepted
Date: 2026-05-02

Context:
The engine already selects strategy from `policy.strategyType`, defaulting omitted strategy to `threshold`.

Options considered:

1. Add `--strategy` override.
   - Benefits: convenient experimentation.
   - Costs: CLI can silently diverge from audited input files.

2. Keep policy/scenario as the source of truth and list strategies via `inspect`.
   - Benefits: preserves auditability and avoids hidden overrides.
   - Costs: users must edit policy files to change strategy.

3. Infer strategy from file names.
   - Benefits: fewer explicit fields.
   - Costs: brittle and not auditable.

Preferred option:
Option 2.

Rationale:
Financial recommendations should be traceable to explicit input files. A CLI override can be reconsidered later if there is a concrete demo need.

Implementation impact:
No `--strategy` flag. `rebalance inspect strategies` lists supported strategies and default behavior.

Validation:
Tests cover strategy listing and existing policy-selected behavior.

## Exit Codes

- `0`: command completed successfully.
- `1`: validation failed, a scenario produced blocking errors, or `--strict` converted warnings into failure.
- `2`: CLI usage error, such as invalid flags, missing required inputs, or incompatible input modes.
- `3`: unexpected runtime/internal error.

## Known Limitations

- The CLI is offline and file-based only.
- `--strategy` overrides are intentionally not supported.
- Stdin input is deferred to avoid complicating the MVP input contract.
- JSON output uses existing audit records as the stable machine-readable recommendation contract.
