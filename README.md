# rebalancing-engine

Generic deterministic portfolio rebalancing engine in TypeScript/Node.js. The project is an offline calculation core with a CLI and synthetic fixtures; it has no live market data, no banking/custody integration, no execution integration, no API, no UI, and no persistence layer.

## Current Status

Implemented for offline synthetic scenarios:

- Portfolio valuation from holdings, cash, settled cash flows, and prices.
- Current weights and drift against target allocations.
- Threshold, calendar due-date, and manual forced-rebalance trigger strategies.
- Full-reset trade proposals.
- Absolute and relative boundary proposal modes.
- Minimum-trade warnings.
- Decimal-backed internal calculation helpers and centralized output rounding.
- Settled and pending cash-flow records.
- Scheduled and recurring cash-flow schedules for offline planning.
- Generic tax-lot allocation metadata on sell trades.
- Post-trade simulation, residual drift, turnover, explanations, and audit records.
- Fixture runner and `rebalance` CLI workflows.

Explicitly out of scope today:

- Jurisdiction-specific tax advice or tax optimization.
- Live market data.
- Banking, custody, payment initiation, trade execution, or OMS integration.
- API, UI, database, persistence, auth, deployment, or operations.
- Full optimizer or solver-backed transaction-cost optimization.
- Business-day, holiday, time-zone, settlement-calendar, or production scheduling semantics.

See the roadmap in [docs/roadmap/rebalancing-engine-roadmap.md](docs/roadmap/rebalancing-engine-roadmap.md).

## Quick Start

Prerequisites:

- Node.js >= 18
- npm >= 9

Install dependencies:

```bash
npm install
```

Run the test suite:

```bash
npm test
```

Build:

```bash
npm run build
```

Inspect strategies:

```bash
npm run cli -- inspect strategies
```

Validate fixtures:

```bash
npm run cli -- validate --scenario tests/fixtures/scenarios.json
```

Run one scenario:

```bash
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id one_asset_out_of_band --format pretty
```

Run batch scenarios against expected statuses:

```bash
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json
```

## Common Commands

```bash
npm test
npm test -- --runInBand tests/cli.test.ts
npx tsc --noEmit
npm run lint
npm run build
npm run scenario:run
node dist/runner/scenario-runner.js tests/fixtures/scenarios.json tests/fixtures/scenario-expectations.json
```

`npm run cli -- ...` builds first and then runs `dist/cli/index.js`.

## CLI

The package binary is named `rebalance` after `npm run build`.

Commands:

- `rebalance validate`: validate scenario or explicit input files through the engine path.
- `rebalance run`: run one scenario.
- `rebalance batch`: run many scenarios from a manifest file or directory.
- `rebalance inspect`: inspect scenarios, strategies, or policy fields.

Examples:

```bash
npm run cli -- --help
npm run cli -- inspect scenarios --scenarios tests/fixtures/scenarios.json
npm run cli -- inspect policies
npm run cli -- run --scenario tests/fixtures/scenarios.json --scenario-id recurring_monthly_contribution --format json
npm run cli -- batch --scenarios tests/fixtures/scenarios.json --expectations tests/fixtures/scenario-expectations.json --output-dir tmp/batch-results --force
```

Input modes:

- Scenario mode: `--scenario <path>` reads one scenario or a `{ "scenarios": [...] }` manifest.
- Stdin scenario mode: `--scenario -` is supported for `validate` and `run`.
- Explicit file mode: `--portfolio`, `--prices`, `--target`, and `--policy` assemble one scenario.

Strategy selection is in `policy.strategyType`; omitted strategy defaults to `threshold`. There is no CLI `--strategy` override so audited input files remain the source of truth.

Output formats:

- `summary`: concise human output, default.
- `pretty`: detailed human output for single runs.
- `json`: deterministic machine-readable output.

Exit codes:

- `0`: success.
- `1`: validation failure, scenario error, batch expectation mismatch, or strict warning failure.
- `2`: usage error.
- `3`: unexpected runtime/internal error.

Full reference: [docs/cli/cli-reference.md](docs/cli/cli-reference.md).

## Documentation

- [User guide](docs/guides/user-guide.md): how to use the engine and CLI.
- [CLI reference](docs/cli/cli-reference.md): command syntax, options, output, and errors.
- [Examples](docs/examples.md): copy-pasteable CLI examples.
- [Developer guide](docs/guides/developer-guide.md): repository structure, architecture, tests, and workflows.
- [Strategy extension guide](docs/guides/adding-rebalancing-strategies.md): how to add or extend strategies safely.
- [Architecture overview](docs/architecture/overview.md): high-level system boundaries and flow.
- [Fixture guide](tests/fixtures/README.md): synthetic scenarios and assumptions.
- [Build journey](BUILD_JOURNEY.md): decision log and iteration history.
- [AGENTS.md](AGENTS.md): repository rules for AI-assisted development.

Planning, audit, and roadmap material lives under [docs/](docs).

## Project Structure

```text
src/
  audit/        Audit record generation and output rounding
  cli/          Offline CLI parser, commands, input loading, rendering, help
  core/         Valuation, drift, cash flows, trades, simulation, orchestration
  explanation/  Deterministic recommendation explanations
  models/       Domain interfaces
  runner/       Scenario runner and expectation validation
  strategy/     Threshold, calendar, and manual trigger strategies
tests/
  fixtures/     Synthetic scenario and expectation manifests
docs/
  audits/       Audit reports
  cli/          CLI design and reference
  guides/       User and developer guides
  plans/        Implementation plans
  prd/          Product requirement docs
  roadmap/      Roadmap
```

## Development Discipline

Keep changes small and testable. For meaningful domain, architecture, API, CLI, fixture, audit, explanation, or documentation decisions, record the decision and options considered in `BUILD_JOURNEY.md`. New engine behavior should be exposed through the CLI or explicitly documented as not exposed.
