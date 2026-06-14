---
type: Reference
title: Cli Reference
description: Documentation for cli reference
tags: [cli]
timestamp: 2026-06-14T00:00:00Z
---

# CLI Reference

Date: 2026-05-02

The package binary is `rebalance` after build. During development, use `npm run cli -- <command>`; that script builds first and then runs `dist/cli/index.js`.

```bash
npm run cli -- --help
```

Global options:

- `--format json|pretty|summary`: output format, default `summary`.
- `--output <path>`: write command output to a file.
- `--strict`: return exit code `1` when warnings are present.
- `--verbose`: include stack traces for unexpected errors.
- `--quiet`: suppress human-readable success output. JSON is still emitted.
- `--help`: show help.
- `--version`: show package version.

Exit codes:

- `0`: command completed successfully.
- `1`: validation failed, a scenario produced blocking errors, batch expectations failed, or `--strict` converted warnings into failure.
- `2`: usage error, such as missing required inputs or unknown flags.
- `3`: unexpected runtime/internal error.

## `rebalance validate`

Purpose: load scenario or explicit input files and run the same deterministic engine path as recommendations. It reports validation status and warnings. It is not a schema-only validator.

Syntax:

```bash
rebalance validate --scenario <path> [--scenario-id <id>] [options]
rebalance validate --portfolio <path> --prices <path> --target <path> --policy <path> [options]
```

Required inputs:

- Scenario mode: `--scenario <path>`; use `--scenario-id` to select one scenario from a manifest.
- Explicit mode: all of `--portfolio`, `--prices`, `--target`, and `--policy`.

Options:

- `--scenario <path>`: single scenario object or manifest; `-` reads a complete scenario payload from stdin.
- `--scenario-id <id>`: select one scenario from a manifest.
- `--portfolio <path>`: `PortfolioState` JSON file.
- `--prices <path>`: `PriceSnapshot` JSON file.
- `--target <path>`: `TargetAllocation` JSON file.
- `--policy <path>`: `RebalancingPolicy` JSON file.
- `--format json|pretty|summary`
- `--output <path>`
- `--strict`

Examples:

```bash
npm run cli -- validate --scenario tests/fixtures/scenarios.json
npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_due
npm run cli -- validate --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_future --strict
cat scenario.json | npm run cli -- validate --scenario -
```

Output:

- `summary`: aggregate status, scenario counts, warning count, and invalid scenario errors.
- `pretty`: currently same as summary for validate.
- `json`: deterministic JSON containing `command`, `status`, `summary`, and per-scenario validation results.

Common errors:

- `Use either --scenario or explicit input files, not both.`
- `Provide --scenario or explicit input files.`
- `Scenario ID not found in <path>: <id>`
- `Stdin is supported only for --scenario -, not explicit input files.`
- Engine errors such as missing prices, invalid cash flows, invalid target allocation, unsupported strategy, or unsupported recurrence frequency.

## `rebalance run`

Purpose: run one scenario and render the recommendation, trades, warnings, explanation, and audit data.

Syntax:

```bash
rebalance run --scenario <path> [--scenario-id <id>] [options]
rebalance run --portfolio <path> --prices <path> --target <path> --policy <path> [options]
```

Required inputs are the same as `validate`. When `--scenario` points to a manifest with more than one scenario, `--scenario-id` is required.

Options:

- `--scenario <path>`: single scenario object or manifest; `-` reads a complete scenario payload from stdin.
- `--scenario-id <id>`
- `--portfolio <path>`
- `--prices <path>`
- `--target <path>`
- `--policy <path>`
- `--format json|pretty|summary`
- `--output <path>`
- `--strict`

Examples:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id calendar_due --format pretty
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_monthly_contribution --format json
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json --output tmp/recommendation.json
cat scenario.json | npm run cli -- run --scenario - --format json
```

Output:

- `summary`: scenario ID, success/error status, strategy, trigger status, reason, trade count, warning count, scheduled cash-flow counts when present, and turnover.
- `pretty`: summary plus account, execution target, trades, warnings, scheduled cash-flow summary, explanation, and turnover.
- `json`: deterministic wrapper around the scenario result. Successful runs include rounded audit outputs under `result.auditRecord.outputs`.

Common errors:

- `Scenario manifest contains <n> scenarios. Provide --scenario-id to run one scenario.`
- Missing price or invalid non-positive price.
- Unsupported strategy.
- Calendar strategy without `policy.calendar`.
- Missing `evaluationDate` when `cashFlowSchedules` are supplied.

## `rebalance batch`

Purpose: run multiple scenarios from a manifest file or a directory of manifests. Optionally validate results against an expected-status manifest.

Syntax:

```bash
rebalance batch --scenarios <path> [--expectations <path>] [--output-dir <dir>] [options]
```

Required inputs:

- `--scenarios <path>`: scenario manifest file or directory.

Options:

- `--expectations <path>`: expected-status manifest such as `tests/fixtures/scenario-expectations.json`.
- `--output-dir <dir>`: write one deterministic output file per scenario.
- `--force`: overwrite existing files in `--output-dir`.
- `--format json|pretty|summary`
- `--output <path>`: write aggregate batch output to a file.
- `--strict`

Examples:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --output-dir tmp/batch-results
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --output-dir tmp/batch-results --force --format pretty
```

Output:

- Aggregate output is rendered to stdout or `--output`.
- Per-scenario output files use sanitized scenario IDs.
- Per-scenario files default to JSON when `--format` is omitted.
- Per-scenario files use `.json` for JSON and `.txt` for pretty or summary.
- Existing per-scenario files are rejected unless `--force` is used.

Common errors:

- `Provide --scenarios <path>.`
- `Stdin is supported only for --scenario -, not --scenarios.`
- `No scenario manifests found in directory: <path>`
- `Batch output file already exists: <path>. Use --force to overwrite.`
- Expectation mismatches when statuses or expected error text differ.

## `rebalance inspect`

Purpose: inspect available scenarios, strategies, or policy fields.

Syntax:

```bash
rebalance inspect scenarios [--scenarios <path>] [options]
rebalance inspect strategies [options]
rebalance inspect policies [options]
```

Subjects:

- `scenarios`: lists scenario IDs and descriptions. Shows scheduled cash-flow count when present. Defaults to `tests/fixtures/scenarios.json` when available.
- `strategies`: lists supported strategy IDs and marks the default.
- `policies`: lists top-level policy fields and short descriptions.

Options:

- `--scenarios <path>` for scenario inspection.
- `--format json|pretty|summary`
- `--output <path>`

Examples:

```bash
npm run cli -- inspect scenarios --scenarios tests/fixtures/scenarios.json
npm run cli -- inspect strategies
npm run cli -- inspect policies --format json
```

Common errors:

- `Unknown inspect subject: <subject>`
- `Provide --scenarios <path>.`
- `File not found: <path>`

## Stdin Support

Only complete scenario payloads can be read from stdin:

```bash
cat scenario.json | npm run cli -- run --scenario -
cat scenario.json | npm run cli -- validate --scenario -
```

Unsupported stdin forms:

- `--portfolio -`
- `--prices -`
- `--target -`
- `--policy -`
- `batch --scenarios -`

## Strategy Discovery and Selection

Discover strategies:

```bash
npm run cli -- inspect strategies
```

Select a strategy by setting `policy.strategyType` in the input file. Omitted `strategyType` defaults to `threshold`. There is intentionally no CLI `--strategy` override because CLI overrides would diverge from audited scenario/policy files.


&copy; 2026 Johan Hellman. All rights reserved.
