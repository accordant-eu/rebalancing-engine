export const ROOT_HELP = `rebalance

Offline CLI for the generic portfolio rebalancing engine.
Supports offline scheduled and recurring cash-flow inputs from scenario or
portfolio files; it does not initiate payments or custody movements.

Usage:
  rebalance <command> [options]

Commands:
  validate   Validate inputs through the deterministic engine path
  run        Run one rebalancing scenario
  batch      Run multiple scenarios
  inspect    Inspect scenarios, strategies, or policy fields

Global options:
  --format json|pretty|summary   Output format (default: summary)
  --output <path>                Write command output to a file
  --strict                       Treat warnings as failures
  --verbose                      Include stack traces for unexpected errors
  --quiet                        Suppress human-readable success output
  --help                         Show help
  --version                      Show package version

Examples:
  rebalance inspect scenarios --scenarios tests/fixtures/scenarios.json
  rebalance validate --scenario tests/fixtures/scenarios.json
  rebalance run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band
  rebalance batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --format json

Exit codes:
  0 success
  1 validation failed, scenario error, or strict warning failure
  2 usage error
  3 unexpected runtime error
`;

export const VALIDATE_HELP = `rebalance validate

Validate scenario or explicit input files through the same deterministic engine
path as recommendations. Only validation status and warnings are rendered; this
is not a separate schema-only validator.

Usage:
  rebalance validate --scenario <path> [--scenario-id <id>] [options]
  rebalance validate --portfolio <path> --prices <path> --target <path> --policy <path> [options]

Options:
  --scenario <path>       Scenario object or scenario manifest; use - to read from stdin
  --scenario-id <id>      Scenario ID when selecting from a manifest
  --portfolio <path>      PortfolioState JSON file for explicit input mode
  --prices <path>         PriceSnapshot JSON file for explicit input mode
  --target <path>         TargetAllocation JSON file for explicit input mode
  --policy <path>         RebalancingPolicy JSON file for explicit input mode
  --format <format>       json, pretty, or summary
  --output <path>         Write output to a file
  --strict                Return exit code 1 when warnings are present

Examples:
  rebalance validate --scenario tests/fixtures/scenarios.json
  cat scenario.json | rebalance validate --scenario -
  rebalance validate --scenario tests/fixtures/scenarios.json --scenario-id scheduled_deposit_due
  rebalance validate --scenario tests/fixtures/scenarios.json --scenario-id pending_cash_flow --strict
`;

export const RUN_HELP = `rebalance run

Run one rebalancing scenario and render recommendation, trades, warnings,
explanation, and audit data.

Usage:
  rebalance run --scenario <path> [--scenario-id <id>] [options]
  rebalance run --portfolio <path> --prices <path> --target <path> --policy <path> [options]

Options:
  --scenario <path>       Scenario object or scenario manifest; use - to read from stdin
  --scenario-id <id>      Scenario ID when selecting from a manifest
  --portfolio <path>      PortfolioState JSON file for explicit input mode
  --prices <path>         PriceSnapshot JSON file for explicit input mode
  --target <path>         TargetAllocation JSON file for explicit input mode
  --policy <path>         RebalancingPolicy JSON file for explicit input mode
  --format <format>       json, pretty, or summary
  --output <path>         Write output to a file
  --strict                Return exit code 1 when warnings are present

Examples:
  rebalance run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band
  rebalance run --scenario tests/fixtures/scenarios.json --scenario-id recurring_monthly_contribution
  cat scenario.json | rebalance run --scenario -
  rebalance run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format json
`;

export const BATCH_HELP = `rebalance batch

Run multiple scenarios from a manifest file or directory of scenario manifests.

Usage:
  rebalance batch --scenarios <path> [--expectations <path>] [--output-dir <dir>] [options]

Options:
  --scenarios <path>      Scenario manifest file or directory
  --expectations <path>   Expected-status manifest for regression checks
  --output-dir <dir>      Write one deterministic output file per scenario
  --force                 Overwrite existing files in --output-dir
  --format <format>       json, pretty, or summary
  --output <path>         Write output to a file
  --strict                Return exit code 1 when warnings are present

Examples:
  rebalance batch --scenarios tests/fixtures/scenarios.json
  rebalance batch --scenarios tests/fixtures/scenarios.json --output-dir tmp/batch-results
  rebalance batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
`;

export const INSPECT_HELP = `rebalance inspect

Inspect available scenarios, strategies, or policy fields.

Usage:
  rebalance inspect scenarios [--scenarios <path>] [options]
  rebalance inspect strategies [options]
  rebalance inspect policies [options]

Options:
  --scenarios <path>      Scenario manifest file or directory for scenario inspection
  --format <format>       json, pretty, or summary
  --output <path>         Write output to a file

Examples:
  rebalance inspect scenarios --scenarios tests/fixtures/scenarios.json
  rebalance inspect strategies
  rebalance inspect policies
`;
